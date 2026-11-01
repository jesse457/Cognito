<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\ClassEnrollment;
use App\Models\User;
use App\Services\LiveCallService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console entry point. Staff and instructors are redirected to their surface;
 * everyone else gets a page explaining that the student experience is the API,
 * plus any live class voice rooms they can join.
 */
class HomeController extends Controller
{
    public function __construct(private readonly LiveCallService $liveCalls) {}

    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user === null) {
            return redirect()->route('login');
        }

        if ($user->isStaff()) {
            return redirect()->route('panel.admin.dashboard');
        }

        if ($user->isInstructor() && config('features.instructor_path')) {
            return redirect()->route('panel.instructor.dashboard');
        }

        return Inertia::render('Home', [
            'role' => $user->role->label(),
            'liveClasses' => $this->liveClasses($user),
        ]);
    }

    /**
     * Active classes the signed-in student can join a voice call for.
     *
     * @return list<array{id: int, name: string, description: string|null, instructor: string|null, url: string}>
     */
    private function liveClasses(User $user): array
    {
        if (! $this->liveCalls->enabled() || ! $this->liveCalls->configured()) {
            return [];
        }

        return ClassEnrollment::query()
            ->where('student_id', $user->getKey())
            ->where('status', EnrollmentStatus::Active->value)
            ->whereHas('privateClass', function ($query): void {
                $query->where('status', ClassStatus::Active->value);
            })
            ->with('privateClass.instructor:id,name,display_name')
            ->get()
            ->map(function (ClassEnrollment $enrollment): ?array {
                $class = $enrollment->privateClass;

                if ($class === null) {
                    return null;
                }

                return [
                    'id' => (int) $class->getKey(),
                    'name' => $class->name,
                    'description' => $class->description,
                    'instructor' => $class->instructor?->displayLabel(),
                    'url' => route('live-calls.show', ['class' => $class->getKey()]),
                ];
            })
            ->filter()
            ->sortBy('name')
            ->values()
            ->all();
    }
}
