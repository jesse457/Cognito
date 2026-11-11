<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassroomRequest;
use App\Http\Requests\UpdateClassroomRequest;
use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Class management: create a class, keep its key, open its live group call.
 */
class ClassroomController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly AttendanceTracker $attendance,
        private readonly BoardSessions $rooms,
    ) {}

    /**
     * Every class the instructor owns, with the filters that make a long list
     * usable: a text search, a course and the live/idle state.
     */
    public function index(Request $request): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $classrooms = $this->access->forInstructor($instructor);
        $classrooms->loadCount('documents');
        $ids = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $liveIds = $this->rooms->liveAmong($ids);
        $inCall = $this->attendance->presentNowByClassroom($ids);
        $history = $this->roomHistory($ids);

        $term = mb_strtolower(trim((string) $request->query('q', '')));
        $courseId = $request->integer('course') ?: null;
        $status = (string) $request->query('status', 'all');

        $filtered = $classrooms->filter(function (Classroom $classroom) use ($term, $courseId, $status, $liveIds): bool {
            $live = in_array((int) $classroom->getKey(), $liveIds, true);

            if ($courseId !== null && (int) $classroom->course_id !== $courseId) {
                return false;
            }

            if ($status === 'live' && ! $live) {
                return false;
            }

            if ($status === 'idle' && $live) {
                return false;
            }

            if ($term === '') {
                return true;
            }

            $haystack = mb_strtolower(implode(' ', array_filter([
                $classroom->name,
                $classroom->join_code,
                $classroom->course?->title,
            ])));

            return str_contains($haystack, $term);
        });

        $courses = $instructor->courses()
            ->withCount('classrooms')
            ->orderBy('title')
            ->get()
            ->map(static fn ($course): array => [
                'id' => (int) $course->getKey(),
                'title' => $course->title,
                'classes' => (int) $course->classrooms_count,
            ])
            ->values()
            ->all();

        return Inertia::render('Instructor/Classrooms', [
            'filters' => [
                'q' => (string) $request->query('q', ''),
                'course' => $courseId,
                'status' => in_array($status, ['all', 'live', 'idle'], true) ? $status : 'all',
            ],
            'stats' => [
                'classes' => $classrooms->count(),
                'students' => (int) $classrooms->sum('enrollments_count'),
                'live' => count($liveIds),
                'unassigned' => $classrooms->whereNull('course_id')->count(),
            ],
            'courses' => $courses,
            'classrooms' => $filtered
                ->map(function (Classroom $classroom) use ($liveIds, $inCall, $history): array {
                    $id = (int) $classroom->getKey();

                    return [
                        'id' => $id,
                        'name' => $classroom->name,
                        'join_code' => $classroom->join_code,
                        'course' => $classroom->course?->title,
                        'members' => (int) $classroom->enrollments_count,
                        'materials' => (int) $classroom->documents_count,
                        'live' => in_array($id, $liveIds, true),
                        'in_call' => (int) ($inCall[$id] ?? 0),
                        'last_session' => $this->lastSessionLabel($classroom, $liveIds, $history),
                        'call_url' => route('call.show', ['classroom' => $id]),
                        'class_url' => route('instructor.classes.show', ['classroom' => $id]),
                        'attendance_url' => route('instructor.classes.attendance', ['classroom' => $id]),
                    ];
                })
                ->values()
                ->all(),
        ]);
    }

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClassroom($instructor, $classroom);

        $classroom->load(['course:id,title', 'board', 'enrollments.student:id,name,email']);

        $date = $this->attendance->date($request->query('date'));
        $report = $this->attendance->report($classroom, $date);
        $attendanceByStudent = collect($report['rows'])->keyBy('id');

        return Inertia::render('Instructor/Classroom', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => $classroom->name,
                'join_code' => $classroom->join_code,
                'course_id' => $classroom->course_id === null ? null : (int) $classroom->course_id,
                'course' => $classroom->course?->title,
                'created_at' => $classroom->created_at?->toDateString(),
                'call_url' => route('call.show', ['classroom' => $classroom->getKey()]),
                'board' => [
                    'surface' => $classroom->board?->surface->value ?? 'canvas',
                    'students_can_annotate' => (bool) $classroom->board?->students_can_annotate,
                    'has_document' => (bool) $classroom->board?->hasDocument(),
                ],
            ],
            'students' => $classroom->enrollments
                ->sortBy(fn ($enrollment): string => (string) $enrollment->student?->name)
                ->map(static fn ($enrollment): array => [
                    'id' => (int) $enrollment->student_id,
                    'name' => (string) $enrollment->student?->name,
                    'email' => (string) $enrollment->student?->email,
                    'joined_at' => $enrollment->joined_at?->toDateString(),
                    'can_draw' => (bool) $enrollment->can_draw,
                    'attendance_status' => (string) ($attendanceByStudent->get($enrollment->student_id)['status'] ?? 'Absent'),
                ])
                ->values()
                ->all(),
            'attendance' => [
                'date' => $report['date'],
                'date_label' => $report['date_label'],
                'present' => $report['present'],
                'absent' => $report['absent'],
            ],
            'courses' => $instructor->courses()
                ->orderBy('title')
                ->get(['id', 'title'])
                ->map(static fn ($course): array => ['id' => (int) $course->getKey(), 'title' => $course->title])
                ->values()
                ->all(),
        ]);
    }

    public function updateDrawing(Request $request, Classroom $classroom, User $student): JsonResponse|RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClassroom($instructor, $classroom);

        /** @var array{can_draw: bool} $data */
        $data = $request->validate([
            'can_draw' => ['required', 'boolean'],
        ]);

        $enrollment = $classroom->enrollments()
            ->where('student_id', $student->getKey())
            ->firstOrFail();

        $enrollment->update(['can_draw' => (bool) $data['can_draw']]);

        $board = $classroom->board()->firstOrCreate([], [
            'surface' => 'canvas',
            'title' => 'Canvas',
        ]);

        if ($data['can_draw'] && ! $board->students_can_annotate) {
            $board->update(['students_can_annotate' => true]);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => [
                    'student_id' => (int) $student->getKey(),
                    'can_draw' => (bool) $enrollment->can_draw,
                    'board' => $board->refresh()->state(),
                ],
            ]);
        }

        return back()->with('success', 'Drawing access updated.');
    }

    public function store(StoreClassroomRequest $request): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        /** @var array{name: string, course_id?: int|null} $data */
        $data = $request->validated();

        $classroom = Classroom::query()->create([
            'instructor_id' => $instructor->getKey(),
            'course_id' => $data['course_id'] ?? null,
            'name' => $data['name'],
        ]);

        return redirect()
            ->route('instructor.classes.show', ['classroom' => $classroom->getKey()])
            ->with('success', 'Class created. Share its key with your students.');
    }

    public function update(UpdateClassroomRequest $request, Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom($request->user(), $classroom);

        /** @var array{name: string, course_id?: int|null} $data */
        $data = $request->validated();

        $classroom->update([
            'name' => $data['name'],
            'course_id' => $data['course_id'] ?? null,
        ]);

        return back()->with('success', 'Class updated.');
    }

    public function destroy(Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom(request()->user(), $classroom);

        $classroom->delete();

        return redirect()
            ->route('instructor.dashboard')
            ->with('success', 'Class deleted.');
    }

    /** Rotate the join key, for example after it leaked into the wrong group chat. */
    public function rotateKey(Classroom $classroom): RedirectResponse
    {
        $this->access->assertInstructorOwnsClassroom(request()->user(), $classroom);

        $classroom->forceFill(['join_code' => Classroom::generateJoinCode()])->save();

        return back()->with('success', 'A new class key was generated.');
    }

    /**
     * The last time each class had a room open.
     *
     * @param  list<int>  $classroomIds
     * @return Collection<int, object{classroom_id: int, last_seen_at: string}>
     */
    private function roomHistory(array $classroomIds): Collection
    {
        if ($classroomIds === []) {
            return collect();
        }

        return CallSession::query()
            ->whereIn('classroom_id', $classroomIds)
            ->groupBy('classroom_id')
            ->selectRaw('classroom_id, max(last_seen_at) as last_seen_at')
            ->toBase()
            ->get()
            ->keyBy(static fn (object $row): int => (int) $row->classroom_id);
    }

    /**
     * @param  list<int>  $liveIds
     * @param  Collection<int, object{classroom_id: int, last_seen_at: string}>  $history
     */
    private function lastSessionLabel(Classroom $classroom, array $liveIds, Collection $history): string
    {
        if (in_array((int) $classroom->getKey(), $liveIds, true)) {
            return 'Room is open';
        }

        $row = $history->get((int) $classroom->getKey());

        if ($row === null) {
            return 'Not opened yet';
        }

        return 'Last open '.HumanTime::ago(Carbon::parse((string) $row->last_seen_at));
    }
}
