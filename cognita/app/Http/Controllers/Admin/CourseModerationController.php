<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReasonRequest;
use App\Models\Course;
use App\Models\User;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin course removal / restoration.
 */
final class CourseModerationController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    public function remove(ReasonRequest $request, int $course): JsonResponse
    {
        $actor = $this->actor($request);
        $model = Course::query()->findOrFail($course);

        $removed = $this->moderation->removeCourse($actor, $model, $request->reason());

        return response()->json(['data' => $this->describe($removed)]);
    }

    public function restore(Request $request, int $course): JsonResponse
    {
        $actor = $this->actor($request);
        $model = Course::query()->findOrFail($course);

        $restored = $this->moderation->restoreCourse($actor, $model);

        return response()->json(['data' => $this->describe($restored)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function describe(Course $course): array
    {
        return [
            'id' => $course->getKey(),
            'title' => $course->title,
            'status' => $course->status->value,
            'status_label' => $course->status->label(),
            'removed_by' => $course->removed_by,
            'removal_reason' => $course->removal_reason,
            'instructor_id' => $course->instructor_id,
            'updated_at' => $course->updated_at?->toIso8601String(),
        ];
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401, 'Unauthenticated.');

        return $user;
    }
}
