<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Enums\LessonStatus;
use App\Enums\LessonType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLessonRequest;
use App\Http\Requests\StoreSectionRequest;
use App\Http\Requests\UpdateLessonRequest;
use App\Http\Requests\UpdateSectionRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** The self-paced course outline: sections, lessons and their files. */
class CurriculumController extends Controller
{
    public function show(Request $request, Course $course): Response
    {
        $this->authorize('manageCurriculum', $course);

        $course->load([
            'sections.lessons.materials',
            'materials.lesson:id,title',
        ]);

        return Inertia::render('Instructor/Curriculum', [
            'course' => [
                'id' => (int) $course->getKey(),
                'title' => $course->title,
                'description' => $course->description,
                'status' => $course->status?->value,
                'status_label' => $course->status?->label(),
                'is_paid' => $course->requiresPayment(),
                'price_label' => $course->requiresPayment() ? $course->priceLabel() : null,
            ],
            'sections' => $course->sections
                ->map(fn (Section $section): array => [
                    'id' => (int) $section->getKey(),
                    'title' => $section->title,
                    'description' => $section->description,
                    'position' => (int) $section->position,
                    'lessons' => $section->lessons
                        ->map(fn (Lesson $lesson): array => [
                            'id' => (int) $lesson->getKey(),
                            'title' => $lesson->title,
                            'type' => $lesson->type->value,
                            'type_label' => $lesson->type->label(),
                            'status' => $lesson->status->value,
                            'status_label' => $lesson->status->label(),
                            'content' => $lesson->content,
                            'video_url' => $lesson->video_url,
                            'duration_minutes' => $lesson->duration_minutes,
                            'position' => (int) $lesson->position,
                            'materials_count' => $lesson->materials->count(),
                        ])
                        ->values()
                        ->all(),
                ])
                ->values()
                ->all(),
            'materials' => $course->materials
                ->map(static fn ($material): array => [
                    'id' => (int) $material->getKey(),
                    'title' => $material->title,
                    'lesson_id' => $material->lesson_id === null ? null : (int) $material->lesson_id,
                    'lesson_title' => $material->lesson?->title,
                    'mime_type' => $material->mime_type,
                    'size_label' => $material->sizeLabel(),
                    'url' => route('course-materials.show', ['material' => $material->getKey()]),
                ])
                ->values()
                ->all(),
            'lessonTypes' => array_map(static fn (LessonType $type): array => [
                'value' => $type->value,
                'label' => $type->label(),
            ], LessonType::cases()),
            'lessonStatuses' => array_map(static fn (LessonStatus $status): array => [
                'value' => $status->value,
                'label' => $status->label(),
            ], LessonStatus::cases()),
        ]);
    }

    public function storeSection(StoreSectionRequest $request, Course $course): RedirectResponse
    {
        $this->authorize('manageCurriculum', $course);

        /** @var array{title: string, description?: string|null, position?: int|null} $data */
        $data = $request->validated();

        $course->sections()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'position' => $data['position'] ?? (int) $course->sections()->max('position') + 1,
        ]);

        return back()->with('success', 'Section added.');
    }

    public function updateSection(UpdateSectionRequest $request, Section $section): RedirectResponse
    {
        $this->authorize('update', $section);

        /** @var array{title: string, description?: string|null, position?: int|null} $data */
        $data = $request->validated();

        $section->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'position' => $data['position'] ?? $section->position,
        ]);

        return back()->with('success', 'Section updated.');
    }

    public function destroySection(Section $section): RedirectResponse
    {
        $this->authorize('delete', $section);

        $section->delete();

        return back()->with('success', 'Section and its lessons removed.');
    }

    public function storeLesson(StoreLessonRequest $request, Section $section): RedirectResponse
    {
        $this->authorize('create', [Lesson::class, $section]);

        /** @var array{title: string, type: string, status: string, content?: string|null, video_url?: string|null, duration_minutes?: int|null, position?: int|null} $data */
        $data = $request->validated();

        $section->lessons()->create([
            'title' => $data['title'],
            'type' => LessonType::from($data['type']),
            'status' => LessonStatus::from($data['status']),
            'content' => $data['content'] ?? null,
            'video_url' => $data['video_url'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'position' => $data['position'] ?? (int) $section->lessons()->max('position') + 1,
        ]);

        return back()->with('success', 'Lesson added.');
    }

    public function updateLesson(UpdateLessonRequest $request, Lesson $lesson): RedirectResponse
    {
        $this->authorize('update', $lesson);

        /** @var array{title: string, type: string, status: string, content?: string|null, video_url?: string|null, duration_minutes?: int|null, position?: int|null} $data */
        $data = $request->validated();

        $lesson->update([
            'title' => $data['title'],
            'type' => LessonType::from($data['type']),
            'status' => LessonStatus::from($data['status']),
            'content' => $data['content'] ?? null,
            'video_url' => $data['video_url'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'position' => $data['position'] ?? $lesson->position,
        ]);

        return back()->with('success', 'Lesson updated.');
    }

    public function destroyLesson(Lesson $lesson): RedirectResponse
    {
        $this->authorize('delete', $lesson);

        $lesson->delete();

        return back()->with('success', 'Lesson removed.');
    }
}
