<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\ClassroomAccess;
use App\Support\HumanTime;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every student across the instructor's classes, in one roster.
 *
 * The class page answers "who is in this room?"; this page answers "who am I
 * teaching, and how are they doing?" — classes shared, calls joined in the last
 * month, time in class, and whether they are in a call right now.
 */
class StudentController extends Controller
{
    private const HISTORY_DAYS = 30;

    public function __construct(
        private readonly ClassroomAccess $access,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $classrooms = $this->access->forInstructor($instructor);
        $ids = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $classroomFilter = $request->integer('classroom') ?: null;

        if ($classroomFilter !== null && ! in_array($classroomFilter, $ids, true)) {
            $classroomFilter = null;
        }

        $scopeIds = $classroomFilter === null ? $ids : [$classroomFilter];
        $term = trim((string) $request->query('q', ''));

        $students = User::query()
            ->where('role', UserRole::Student->value)
            ->whereHas('enrollments', fn ($query) => $query->whereIn('classroom_id', $scopeIds))
            ->with([
                'enrollments' => fn ($query) => $query->whereIn('classroom_id', $ids)->with('classroom:id,name'),
            ])
            ->when($term !== '', fn ($query) => $query->where(
                fn ($search) => $search
                    ->whereLike('name', '%'.$term.'%', caseSensitive: false)
                    ->orWhereLike('email', '%'.$term.'%', caseSensitive: false),
            ))
            ->orderBy('name')
            ->get();

        $studentIds = $students->pluck('id')->map(static fn ($id): int => (int) $id)->all();

        $windowStart = now()->subDays(self::HISTORY_DAYS - 1)->startOfDay();

        $attendance = AttendanceRecord::query()
            ->whereIn('user_id', $studentIds)
            ->whereIn('classroom_id', $ids)
            ->where('attended_on', '>=', $windowStart->toDateString())
            ->get()
            ->groupBy(static fn (AttendanceRecord $record): int => (int) $record->user_id);

        $presentNow = AttendanceRecord::query()
            ->whereIn('classroom_id', $ids)
            ->whereNull('left_at')
            ->where('last_seen_at', '>=', now()->subSeconds(AttendanceTracker::PRESENT_WINDOW_SECONDS))
            ->distinct()
            ->pluck('user_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        return Inertia::render('Instructor/Students', [
            'filters' => [
                'q' => $term,
                'classroom' => $classroomFilter,
            ],
            'stats' => [
                'students' => User::query()
                    ->where('role', UserRole::Student->value)
                    ->whereHas('enrollments', fn ($query) => $query->whereIn('classroom_id', $ids))
                    ->count(),
                'seats' => (int) $classrooms->sum('enrollments_count'),
                'in_call' => count($presentNow),
                'active_week' => AttendanceRecord::query()
                    ->whereIn('classroom_id', $ids)
                    ->where('attended_on', '>=', now()->subDays(6)->toDateString())
                    ->distinct()
                    ->count('user_id'),
            ],
            'classrooms' => $classrooms
                ->map(static fn (Classroom $classroom): array => [
                    'id' => (int) $classroom->getKey(),
                    'name' => $classroom->name,
                    'members' => (int) $classroom->enrollments_count,
                ])
                ->values()
                ->all(),
            'students' => $students
                ->map(function (User $student) use ($attendance, $presentNow): array {
                    /** @var Collection<int, AttendanceRecord> $own */
                    $own = $attendance->get((int) $student->getKey(), collect());
                    $seconds = (int) $own->sum(static fn (AttendanceRecord $record): int => $record->seconds());
                    $last = $own->sortByDesc('last_seen_at')->first();

                    return [
                        'id' => (int) $student->getKey(),
                        'name' => (string) $student->name,
                        'email' => (string) $student->email,
                        'initials' => $student->initials(),
                        'classes' => $student->enrollments
                            ->map(static fn ($enrollment): array => [
                                'id' => (int) $enrollment->classroom_id,
                                'name' => (string) $enrollment->classroom?->name,
                                'url' => route('instructor.classes.show', [
                                    'classroom' => $enrollment->classroom_id,
                                ]),
                            ])
                            ->values()
                            ->all(),
                        'sessions' => $own->count(),
                        'days' => $own->pluck('attended_on')->map(static fn ($day): string => $day->toDateString())->unique()->count(),
                        'time_in_class' => HumanTime::duration($seconds),
                        'last_seen' => HumanTime::ago($last?->last_seen_at),
                        'present' => in_array((int) $student->getKey(), $presentNow, true),
                        'attended_today' => $own->contains(
                            static fn (AttendanceRecord $record): bool => $record->attended_on?->isToday() === true,
                        ),
                    ];
                })
                ->values()
                ->all(),
        ]);
    }
}
