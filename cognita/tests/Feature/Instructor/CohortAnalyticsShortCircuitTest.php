<?php

declare(strict_types=1);

namespace Tests\Feature\Instructor;

use App\Jobs\ComputeCohortAnalyticsJob;
use App\Services\CohortAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Feature test 16 — with the instructor flag off, the scheduled analytics job
 * short-circuits BEFORE touching the database.
 */
class CohortAnalyticsShortCircuitTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_job_performs_zero_queries_when_the_flag_is_off(): void
    {
        config(['features.instructor_path' => false]);

        $service = app(CohortAnalyticsService::class);

        DB::flushQueryLog();
        DB::enableQueryLog();

        (new ComputeCohortAnalyticsJob)->handle($service);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertSame([], $queries, 'The cohort analytics job must not query the database when the instructor path is disabled.');
        $this->assertDatabaseCount('cohort_analytics_snapshots', 0);
    }

    public function test_the_cohort_service_itself_short_circuits_when_the_flag_is_off(): void
    {
        config(['features.instructor_path' => false]);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $written = app(CohortAnalyticsService::class)->snapshotAll();

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertSame(0, $written);
        $this->assertSame([], $queries);
    }
}
