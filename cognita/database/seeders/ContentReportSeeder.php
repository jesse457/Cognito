<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Two sample moderation queue rows: one still-open spam report against the
 * seeded course, and one already-resolved misinformation report.
 *
 * Idempotent by (reportable_type, reportable_id, reason): the schema has no
 * unique constraint on reports, so the guard is an explicit lookup.
 */
class ContentReportSeeder extends Seeder
{
    public function run(): void
    {
        $course = Course::query()->where('title', CourseSeeder::COURSE_TITLE)->first();

        if ($course === null) {
            return;
        }

        $reporter = User::query()
            ->where('email', UserSeeder::STUDENT_EMAILS[0])
            ->first()
            ?? User::query()->where('role', UserRole::Student->value)->orderBy('id')->first();

        $moderator = User::query()
            ->where('role', UserRole::Moderator->value)
            ->orderBy('id')
            ->first();

        if ($reporter === null) {
            return;
        }

        // Morph aliases, never FQCNs — see config('cognita.morph_map').
        $alias = (string) array_search(Course::class, config('cognita.morph_map', []), true);

        $this->upsertReport(
            reportableType: $alias !== '' ? $alias : 'course',
            reportableId: (int) $course->getKey(),
            reporterId: (int) $reporter->getKey(),
            reason: ReportReason::Spam,
            attributes: [
                'details' => 'The course description is full of promotional links to an unrelated site.',
                'status' => ReportStatus::Open,
                'resolution_note' => null,
                'resolved_by' => null,
                'resolved_at' => null,
            ],
        );

        $this->upsertReport(
            reportableType: $alias !== '' ? $alias : 'course',
            reportableId: (int) $course->getKey(),
            reporterId: (int) $reporter->getKey(),
            reason: ReportReason::Misinformation,
            attributes: [
                'details' => 'A lesson claims gravity is 12 m/s² near the Earth\'s surface.',
                'status' => ReportStatus::Resolved,
                'resolution_note' => 'Corrected the lesson text to 9.81 m/s² and notified the instructor.',
                'resolved_by' => $moderator?->getKey(),
                'resolved_at' => now(),
            ],
        );
    }

    /**
     * Create the report only when that (target, reason) pair has none yet.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function upsertReport(
        string $reportableType,
        int $reportableId,
        int $reporterId,
        ReportReason $reason,
        array $attributes,
    ): void {
        $exists = ContentReport::query()
            ->where('reportable_type', $reportableType)
            ->where('reportable_id', $reportableId)
            ->where('reason', $reason->value)
            ->exists();

        if ($exists) {
            return;
        }

        ContentReport::query()->create($attributes + [
            'reporter_id' => $reporterId,
            'reportable_type' => $reportableType,
            'reportable_id' => $reportableId,
            'reason' => $reason,
        ]);
    }
}
