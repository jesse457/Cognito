<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Enums\ContentType;
use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonController extends Controller
{
    /**
     * Lesson payload for enrolled students. Quiz answer keys are stripped so the
     * browser can never see the correct option before submitting.
     */
    public function show(Request $request, Lesson $lesson): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $lesson->loadMissing('module.course', 'knowledgeComponents');

        $courseId = $lesson->module?->course_id;

        $enrolled = $courseId !== null && $user->enrollments()->where('course_id', $courseId)->exists();

        abort_unless($enrolled || $user->isStaff() || $user->isInstructor(), 403, 'You must be enrolled in this course.');

        $questions = [];

        if ($lesson->content_type === ContentType::Quiz) {
            $decoded = json_decode((string) $lesson->content_body, true);
            $raw = is_array($decoded) ? ($decoded['questions'] ?? []) : [];

            $questions = array_map(static fn (array $question): array => [
                'id' => $question['id'] ?? null,
                'question' => $question['question'] ?? '',
                'options' => $question['options'] ?? [],
                'difficulty' => $question['difficulty'] ?? 'medium',
                'knowledge_component' => $question['knowledge_component'] ?? '',
            ], is_array($raw) ? $raw : []);
        }

        return response()->json([
            'data' => [
                'id' => $lesson->getKey(),
                'title' => $lesson->title,
                'content_type' => $lesson->content_type?->value,
                'content_url' => $lesson->content_url,
                'content_body' => $lesson->content_type === ContentType::Quiz ? null : $lesson->content_body,
                'sequence_order' => $lesson->sequence_order,
                'course_id' => $courseId,
                'module' => [
                    'id' => $lesson->module?->getKey(),
                    'title' => $lesson->module?->title,
                ],
                'knowledge_components' => $lesson->knowledgeComponents->map(fn ($component): array => [
                    'id' => $component->getKey(),
                    'name' => $component->name,
                    'slug' => $component->slug,
                ])->values()->all(),
                'questions' => $questions,
            ],
        ]);
    }
}
