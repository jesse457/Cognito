<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClassAccessService;
use App\Services\CohortAnalyticsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * On-demand cohort analytics snapshot for one class.
 *
 * The snapshot materialises the student by knowledge-component matrix that the
 * KT engine already produced into `cohort_analytics_snapshots`, so the heatmap
 * does not re-aggregate on every page load. When the feature flag is off the
 * service returns null and the console reports it as a flash error rather than
 * a 500.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly CohortAnalyticsService $cohortAnalytics,
    ) {}

    public function snapshot(Request $request, int $class): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        $snapshot = $this->cohortAnalytics->snapshot($instructor, $class);

        if ($snapshot === null) {
            return back()->with('error', 'Analytics snapshots are unavailable while the instructor portal is disabled.');
        }

        return back()->with(
            'success',
            sprintf('Analytics snapshot saved for %s.', $snapshot->snapshot_date?->toDateString() ?? now()->toDateString()),
        );
    }
}
