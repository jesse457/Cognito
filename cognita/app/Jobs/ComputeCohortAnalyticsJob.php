<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\CohortAnalyticsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Scheduled cohort analytics for every active private class.
 *
 * Feature-flagged: while `features.instructor_path` is off the job returns
 * before touching the database, so enabling the flag remains the only switch
 * that starts instructor-scoped query traffic.
 */
class ComputeCohortAnalyticsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120, 300];

    /** Seconds a worker may spend before the job is considered timed out. */
    public int $timeout = 120;

    public function handle(CohortAnalyticsService $cohortAnalytics): void
    {
        if (! config('features.instructor_path')) {
            Log::info('instructor.analytics.job_skipped', [
                'event' => 'instructor.analytics.job_skipped',
                'reason' => 'feature_disabled',
                'job' => self::class,
            ]);

            return;
        }

        $count = $cohortAnalytics->snapshotAll();

        Log::info('instructor.analytics.job_completed', [
            'event' => 'instructor.analytics.job_completed',
            'job' => self::class,
            'classes_snapshotted' => $count,
        ]);
    }
}
