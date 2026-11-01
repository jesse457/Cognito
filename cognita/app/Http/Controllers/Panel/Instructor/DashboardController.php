<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClassDashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Instructor portal landing page: the cross-class KPI block plus one summary
 * card per class.
 *
 * Every figure comes from ClassDashboardService, which reads the mastery rows
 * written by the KT engine. The console never estimates mastery itself.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly ClassDashboardService $dashboard) {}

    public function index(Request $request): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        return Inertia::render('Instructor/Dashboard', [
            'dashboard' => $this->dashboard->forInstructor($instructor),
            'threshold' => (float) config('features.at_risk_threshold'),
        ]);
    }
}
