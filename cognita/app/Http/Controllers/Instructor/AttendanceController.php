<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\BoardSessions;
use App\Services\ClassroomAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The attendance register for one class and one day.
 *
 * It is its own page rather than a card on the class screen because this is where
 * an instructor goes *after* a lesson: one row per enrolled student, who turned up,
 * how long they stayed, and the two downloads the office asks for.
 *
 * Nothing here is marked by hand. {@see AttendanceTracker} opens a record when a
 * student's call token is issued, keeps it warm while their browser is in the
 * call, and closes it when they leave — so this page only ever reads.
 */
class AttendanceController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly AttendanceTracker $attendance,
    ) {}

    /**
     * Attendance across every class for one day, plus a seven-day trend.
     *
     * This is the "was anybody there?" view; the per-class register remains the
     * place to see names, first joined, last seen and the downloads.
     */
    public function index(Request $request, BoardSessions $rooms): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $classrooms = $this->access->forInstructor($instructor);
        $ids = $classrooms->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $date = $this->attendance->date($request->query('date'));
        $liveIds = $rooms->liveAmong($ids);

        $records = AttendanceRecord::query()
            ->whereIn('classroom_id', $ids)
            ->whereDate('attended_on', $date)
            ->get()
            ->groupBy(static fn (AttendanceRecord $record): int => (int) $record->classroom_id);

        $rows = $classrooms
            ->map(function (Classroom $classroom) use ($records, $liveIds, $date): array {
                $id = (int) $classroom->getKey();
                $present = $records->get($id, collect())->pluck('user_id')->unique()->count();
                $members = (int) $classroom->enrollments_count;
                $absent = max(0, $members - $present);

                return [
                    'id' => $id,
                    'name' => $classroom->name,
                    'course' => $classroom->course?->title,
                    'members' => $members,
                    'present' => $present,
                    'absent' => $absent,
                    'rate' => $members > 0 ? (int) round($present / $members * 100) : null,
                    'live' => in_array($id, $liveIds, true),
                    'class_url' => route('instructor.classes.show', ['classroom' => $id]),
                    'attendance_url' => route('instructor.classes.attendance', [
                        'classroom' => $id,
                        'date' => $date,
                    ]),
                    'call_url' => route('call.show', ['classroom' => $id]),
                ];
            })
            ->sortByDesc('present')
            ->values()
            ->all();

        $students = (int) $classrooms->sum('enrollments_count');
        $present = (int) array_sum(array_column($rows, 'present'));
        $absent = (int) array_sum(array_column($rows, 'absent'));

        return Inertia::render('Instructor/AttendanceOverview', [
            'filters' => ['date' => $date],
            'stats' => [
                'classes' => $classrooms->count(),
                'students' => $students,
                'present' => $present,
                'absent' => $absent,
                'rate' => $students > 0 ? (int) round($present / $students * 100) : null,
            ],
            'report' => [
                'date' => $date,
                'date_label' => Carbon::createFromFormat('Y-m-d', $date)->format('D, j M Y'),
                'today' => now()->toDateString(),
                'rows' => $rows,
                'trend' => $this->trend($ids, $date, $students),
            ],
        ]);
    }

    public function show(Request $request, Classroom $classroom): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClassroom($instructor, $classroom);

        $classroom->load('course:id,title');

        $date = $this->attendance->date($request->query('date'));
        $report = $this->attendance->report($classroom, $date);

        return Inertia::render('Instructor/Attendance', [
            'classroom' => [
                'id' => (int) $classroom->getKey(),
                'name' => (string) $classroom->name,
                'join_code' => (string) $classroom->join_code,
                'course' => $classroom->course?->title,
                'classUrl' => route('instructor.classes.show', ['classroom' => $classroom]),
                'callUrl' => route('call.show', ['classroom' => $classroom]),
            ],
            'report' => [
                'date' => $report['date'],
                'date_label' => $report['date_label'],
                'present' => $report['present'],
                'absent' => $report['absent'],
                'total' => count($report['rows']),
                'rows' => $report['rows'],
                'exports' => [
                    'xlsx' => route('instructor.classes.attendance.export', [
                        'classroom' => $classroom,
                        'format' => 'xlsx',
                        'date' => $report['date'],
                    ]),
                    'pdf' => route('instructor.classes.attendance.export', [
                        'classroom' => $classroom,
                        'format' => 'pdf',
                        'date' => $report['date'],
                    ]),
                ],
            ],
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Seven days ending on the selected date, with the number of distinct
     * students present each day.
     *
     * @param  list<int>  $classroomIds
     * @return list<array{date: string, label: string, day: string, present: int, total: int, rate: int|null}>
     */
    private function trend(array $classroomIds, string $date, int $total): array
    {
        $end = Carbon::createFromFormat('Y-m-d', $date)->startOfDay();
        $start = $end->copy()->subDays(6);

        $counts = $classroomIds === []
            ? collect()
            : AttendanceRecord::query()
                ->whereIn('classroom_id', $classroomIds)
                ->whereBetween('attended_on', [$start->toDateString(), $end->toDateString()])
                ->selectRaw('attended_on, count(distinct user_id) as present')
                ->groupBy('attended_on')
                ->toBase()
                ->get()
                ->mapWithKeys(static fn (object $row): array => [
                    (string) $row->attended_on => (int) $row->present,
                ]);

        $days = [];

        for ($offset = 0; $offset < 7; $offset++) {
            $day = $start->copy()->addDays($offset);
            $present = (int) $counts->get($day->toDateString(), 0);

            $days[] = [
                'date' => $day->toDateString(),
                'label' => $day->format('D'),
                'day' => $day->format('j M'),
                'present' => $present,
                'total' => $total,
                'rate' => $total > 0 ? (int) round($present / $total * 100) : null,
            ];
        }

        return $days;
    }
}
