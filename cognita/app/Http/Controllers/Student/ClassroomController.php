<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\CallSession;
use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Models\User;
use App\Services\BoardSessions;
use App\Services\ClassroomAccess;
use App\Services\CoursePayments;
use App\Services\DrawPermissions;
use App\Support\HumanTime;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student's own view of the classes they joined with a key.
 *
 * The index is the searchable full list; the show page is one class with the
 * student's attendance, the class key and the PDFs the instructor has attached.
 * Neither page can see a class the student has not joined.
 */
class ClassroomController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly BoardSessions $rooms,
        private readonly DrawPermissions $draw,
        private readonly CoursePayments $payments,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $student */
        $student = $request->user();

        $this->authorize('viewAny', Classroom::class);

        $classrooms = $this->access->forStudent($student);
        $ids = $this->ids($classrooms);
        $liveIds = $this->rooms->liveAmong($ids);
        $summaries = $this->attendanceSummaries($student, $ids);
        $documents = $this->documentCounts($ids);

        $term = mb_strtolower(trim((string) $request->query('q', '')));
        $courseId = $request->integer('course') ?: null;
        $liveOnly = $request->boolean('live');

        $filtered = $classrooms->filter(function (Classroom $classroom) use ($term, $courseId, $liveOnly, $liveIds): bool {
            $live = in_array((int) $classroom->getKey(), $liveIds, true);

            if ($courseId !== null && (int) $classroom->course_id !== $courseId) {
                return false;
            }

            if ($liveOnly && ! $live) {
                return false;
            }

            if ($term === '') {
                return true;
            }

            $haystack = mb_strtolower(implode(' ', array_filter([
                $classroom->name,
                $classroom->join_code,
                $classroom->course?->title,
                $classroom->instructor?->name,
            ])));

            return str_contains($haystack, $term);
        });

        $courses = $classrooms
            ->filter(static fn (Classroom $classroom): bool => $classroom->course !== null)
            ->groupBy(static fn (Classroom $classroom): int => (int) $classroom->course_id)
            ->map(static fn (Collection $group, int $id): array => [
                'id' => $id,
                'title' => (string) $group->first()->course?->title,
                'classes' => $group->count(),
            ])
            ->sortBy('title')
            ->values()
            ->all();

        return Inertia::render('Student/Classrooms', [
            'filters' => [
                'q' => (string) $request->query('q', ''),
                'course' => $courseId,
                'live' => $liveOnly,
            ],
            'stats' => [
                'classes' => $classrooms->count(),
                'courses' => count($courses),
                'live' => count($liveIds),
                'materials' => array_sum($documents),
            ],
            'courses' => $courses,
            'classrooms' => $filtered
                ->map(function (Classroom $classroom) use ($liveIds, $summaries, $documents, $student): array {
                    $id = (int) $classroom->getKey();
                    $summary = $summaries[$id] ?? $this->emptySummary();

                    return [
                        'id' => $id,
                        'name' => $classroom->name,
                        'join_code' => $classroom->join_code,
                        'course' => $classroom->course?->title,
                        'instructor' => $classroom->instructor?->name,
                        'members' => (int) $classroom->enrollments_count,
                        'live' => in_array($id, $liveIds, true),
                        'last_attended' => $this->lastAttendedLabel($summary['last_on']),
                        'sessions' => $summary['sessions'],
                        'time_in_class' => HumanTime::duration($summary['seconds']),
                        'days' => $summary['days'],
                        'materials' => (int) ($documents[$id] ?? 0),
                        'payment' => $this->payments->stateFor($classroom, $student),
                        'call_url' => route('call.show', ['classroom' => $id]),
                        'class_url' => route('student.classes.show', ['classroom' => $id]),
                    ];
                })
                ->values()
                ->all(),
        ]);
    }

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $student */
        $student = $request->user();

        $this->authorize('view', $classroom);

        $classroom->load(['course:id,title,is_paid,price_cents,currency,payment_url,payment_instructions', 'instructor:id,name']);
        $classroom->loadCount('enrollments');

        $records = AttendanceRecord::query()
            ->where('classroom_id', $classroom->getKey())
            ->where('user_id', $student->getKey())
            ->orderByDesc('joined_at')
            ->get();

        $board = $classroom->board()->first();

        $summary = [
            'sessions' => $records->count(),
            'seconds' => (int) $records->sum(static fn (AttendanceRecord $record): int => $record->seconds()),
            'days' => $records->pluck('attended_on')->map(static fn ($day): string => $day->toDateString())->unique()->count(),
            'last_on' => $records->first()?->attended_on?->toDateString(),
        ];

        $documents = $classroom->documents()
            ->latest()
            ->get()
            ->map(static fn (ClassDocument $document): array => [
                'id' => (int) $document->getKey(),
                'name' => $document->name,
                'pages' => (int) $document->pages,
                'size' => (int) $document->size,
                'added' => HumanTime::ago($document->created_at),
                'url' => route('board.documents.show', [
                    'classroom' => $classroom->getKey(),
                    'document' => $document->getKey(),
                ]),
            ])
            ->values()
            ->all();

        $session = $this->rooms->live($classroom);
        $live = $session !== null;
        $sessionState = $this->rooms->stateGiven(
            $classroom,
            $session,
            $session === null ? $this->rooms->nextScheduled($classroom) : null,
        );

        return Inertia::render('Student/Classroom', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course' => $classroom->course?->title,
                'instructor' => $classroom->instructor?->name,
                'members' => (int) $classroom->enrollments_count,
                'live' => $live,
                'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                'board' => [
                    'surface' => $board?->surface->value ?? 'canvas',
                    'has_document' => (bool) $board?->hasDocument(),
                    'can_draw' => $this->draw->permits((int) $classroom->getKey(), (int) $student->getKey()),
                ],
                'class_days' => (int) AttendanceRecord::query()
                    ->where('classroom_id', $classroom->getKey())
                    ->distinct()
                    ->count('attended_on'),
            ],
            'summary' => [
                ...$summary,
                'time_in_class' => HumanTime::duration($summary['seconds']),
                'last_attended' => $this->lastAttendedLabel($summary['last_on']),
            ],
            'recent' => $records
                ->take(8)
                ->map(static fn (AttendanceRecord $record): array => [
                    'id' => (int) $record->getKey(),
                    'when' => HumanTime::dayAt($record->joined_at),
                    'duration' => HumanTime::duration($record->seconds()),
                    'live' => $record->left_at === null
                        && $record->last_seen_at !== null
                        && $record->last_seen_at->getTimestamp() >= now()->subSeconds(180)->getTimestamp(),
                ])
                ->values()
                ->all(),
            'materials' => $documents,
            'payment' => $this->payments->stateFor($classroom, $student),
            'session_state' => $sessionState,
            'sessions' => $this->sessions($classroom),
        ]);
    }

    /**
     * The sessions of one class for the student who may enter them.
     *
     * A session that is over cannot be rejoined, so it is listed with that
     * state and no way in.
     *
     * @return list<array{id: int, title: string|null, description: string|null, state: string, starts_at: string|null, ends_at: string|null, when: string, until: string, materials: list<array{id: int, name: string, pages: int, size: int, url: string}>}>
     */
    private function sessions(Classroom $classroom): array
    {
        return $this->rooms->history($classroom)
            ->map(static fn (CallSession $session): array => [
                'id' => (int) $session->getKey(),
                'title' => $session->title,
                'description' => $session->description,
                'state' => $session->state(),
                'starts_at' => $session->starts_at?->toIso8601String(),
                'ends_at' => $session->ends_at?->toIso8601String(),
                'when' => HumanTime::dayAt($session->starts_at),
                'until' => HumanTime::until($session->starts_at),
                'materials' => $session->materials->map->materialReference()->values()->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * Per-class attendance totals for one student, keyed by class id.
     *
     * @param  list<int>  $ids
     * @return array<int, array{sessions: int, seconds: int, days: int, last_on: string|null}>
     */
    private function attendanceSummaries(User $student, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return AttendanceRecord::query()
            ->where('user_id', $student->getKey())
            ->whereIn('classroom_id', $ids)
            ->get()
            ->groupBy(static fn (AttendanceRecord $record): int => (int) $record->classroom_id)
            ->map(static fn (Collection $records): array => [
                'sessions' => $records->count(),
                'seconds' => (int) $records->sum(static fn (AttendanceRecord $record): int => $record->seconds()),
                'days' => $records->pluck('attended_on')->map(static fn ($day): string => $day->toDateString())->unique()->count(),
                'last_on' => $records->sortByDesc('attended_on')->first()?->attended_on?->toDateString(),
            ])
            ->all();
    }

    /**
     * How many PDFs each class holds, keyed by class id.
     *
     * @param  list<int>  $ids
     * @return array<int, int>
     */
    private function documentCounts(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return ClassDocument::query()
            ->whereIn('classroom_id', $ids)
            ->groupBy('classroom_id')
            ->selectRaw('classroom_id, count(*) as total')
            ->toBase()
            ->get()
            ->mapWithKeys(static fn (object $row): array => [(int) $row->classroom_id => (int) $row->total])
            ->all();
    }

    /** @param  Collection<int, Classroom>  $classrooms */
    private function ids(Collection $classrooms): array
    {
        return $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();
    }

    /** @return array{sessions: int, seconds: int, days: int, last_on: string|null} */
    private function emptySummary(): array
    {
        return ['sessions' => 0, 'seconds' => 0, 'days' => 0, 'last_on' => null];
    }

    private function lastAttendedLabel(?string $date): string
    {
        return HumanTime::lastAttended($date);
    }
}
