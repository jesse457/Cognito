<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Admin;

use App\Enums\CourseStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\ModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Course takedowns. Courses are AI generated; staff intervene to remove
 * misleading content and to restore it after review.
 */
class CourseController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    public function index(Request $request): Response
    {
        Gate::authorize('remove', new Course);

        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();

        $courses = Course::query()
            ->withCount(['modules', 'lessons', 'enrollments'])
            ->with(['creator:id,name,display_name', 'removedBy:id,name,display_name'])
            ->when($search !== '', fn ($query) => $query->where('title', 'ilike', '%'.$search.'%'))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Course $course): array => [
                'id' => $course->getKey(),
                'title' => $course->title,
                'status' => $course->status->value,
                'status_label' => $course->status->label(),
                'is_ai_generated' => $course->is_ai_generated,
                'modules_count' => $course->modules_count,
                'lessons_count' => $course->lessons_count,
                'enrollments_count' => $course->enrollments_count,
                'creator' => $course->creator?->displayLabel(),
                'removed_by' => $course->removedBy?->displayLabel(),
                'removal_reason' => $course->removal_reason,
                'created_at' => $course->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Courses/Index', [
            'courses' => $courses,
            'filters' => ['search' => $search, 'status' => $status],
            'statuses' => array_map(static fn (CourseStatus $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
            ], CourseStatus::cases()),
        ]);
    }

    public function remove(Request $request, int $course): RedirectResponse
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();
        $model = Course::query()->findOrFail($course);

        Gate::forUser($actor)->authorize('remove', $model);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $this->moderation->removeCourse($actor, $model, $validated['reason']);

        return back()->with('success', "“{$model->title}” was removed and the action was audited.");
    }

    public function restore(Request $request, int $course): RedirectResponse
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();
        $model = Course::query()->findOrFail($course);

        Gate::forUser($actor)->authorize('restore', $model);

        $this->moderation->restoreCourse($actor, $model);

        return back()->with('success', "“{$model->title}” was restored to the catalogue.");
    }
}
