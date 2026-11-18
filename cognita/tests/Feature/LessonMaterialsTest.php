<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LessonMaterialsTest extends TestCase
{
    use RefreshDatabase;

    private function lessonWithCourse(): Lesson
    {
        $course = Course::factory()->create();
        $section = Section::query()->create([
            'course_id' => $course->getKey(),
            'title' => 'Week 1',
            'position' => 1,
        ]);

        return $section->lessons()->create([
            'title' => 'The first lesson',
            'content' => 'Notes for the lesson.',
            'position' => 1,
        ]);
    }

    public function test_an_instructor_uploads_a_file_to_a_lesson(): void
    {
        Storage::fake('local');
        config(['filesystems.media_disk' => 'local']);

        $instructor = User::factory()->instructor()->create();
        $lesson = $this->lessonWithCourse();
        $lesson->section->course->update(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->post(route('instructor.courses.materials.store', ['course' => $lesson->section->course_id]), [
                'lesson_id' => $lesson->getKey(),
                'title' => 'Lesson notes',
                'document' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf'),
            ])
            ->assertRedirect();

        $material = CourseMaterial::query()->firstOrFail();

        $this->assertSame($lesson->getKey(), (int) $material->lesson_id);
        $this->assertSame((int) $lesson->section->course_id, (int) $material->course_id);
        $this->assertSame('Lesson notes', $material->title);
        Storage::disk('local')->assertExists($material->path);
    }

    public function test_a_file_cannot_be_uploaded_without_a_lesson(): void
    {
        Storage::fake('local');
        config(['filesystems.media_disk' => 'local']);

        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->post(route('instructor.courses.materials.store', ['course' => $course]), [
                'title' => 'Course-wide file',
                'document' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf'),
            ])
            ->assertSessionHasErrors('lesson_id');

        $this->assertDatabaseCount('course_materials', 0);
    }

    public function test_a_student_sees_lesson_files_with_a_viewable_kind(): void
    {
        Storage::fake('local');
        config(['filesystems.media_disk' => 'local']);

        $lesson = $this->lessonWithCourse();
        $course = $lesson->section->course;
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();
        Enrollment::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
        ]);

        CourseMaterial::query()->create([
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson->getKey(),
            'title' => 'Diagram.pdf',
            'path' => 'courses/'.$course->getKey().'/diagram.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size' => 50,
        ]);

        $this->actingAs($student)
            ->get(route('community.lessons.show', ['lesson' => $lesson]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('lesson.materials', 1)
                ->where('lesson.materials.0.kind', 'pdf')
                ->where('lesson.materials.0.lesson_id', $lesson->getKey())
                ->where('lesson.materials.0.title', 'Diagram.pdf')
            );
    }

    public function test_a_video_file_is_streamed_with_byte_ranges(): void
    {
        Storage::fake('local');
        config(['filesystems.media_disk' => 'local']);

        $lesson = $this->lessonWithCourse();
        $course = $lesson->section->course;
        $classroom = Classroom::factory()->forCourse($course)->create();
        $student = User::factory()->student()->create();
        Enrollment::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
        ]);

        $material = CourseMaterial::query()->create([
            'course_id' => $course->getKey(),
            'lesson_id' => $lesson->getKey(),
            'title' => 'Lesson.mp4',
            'path' => 'courses/'.$course->getKey().'/lesson.mp4',
            'disk' => 'local',
            'mime_type' => 'video/mp4',
            'size' => 10,
        ]);
        Storage::disk('local')->put($material->path, '0123456789');

        $this->actingAs($student)
            ->get(route('course-materials.show', ['material' => $material]), ['Range' => 'bytes=2-5'])
            ->assertStatus(206)
            ->assertHeader('Content-Range', 'bytes 2-5/10')
            ->assertHeader('Accept-Ranges', 'bytes')
            ->assertHeader('Content-Length', '4');
    }

    public function test_the_feed_includes_photo_urls_for_viewing(): void
    {
        Storage::fake('local');
        config(['filesystems.media_disk' => 'local']);

        $student = User::factory()->student()->create();
        $post = Question::factory()->general()->create(['user_id' => $student->getKey()]);
        $media = $post->media()->create([
            'user_id' => $student->getKey(),
            'name' => 'diagram.png',
            'path' => 'community/questions/'.$post->getKey().'/diagram.png',
            'disk' => 'local',
            'mime' => 'image/png',
            'size' => 10,
        ]);
        Storage::disk('local')->put($media->path, 'bytes');

        $this->actingAs($student)
            ->get(route('questions.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('posts.data.0.media_count', 1)
                ->where('posts.data.0.media.0.id', $media->getKey())
                ->where('posts.data.0.media.0.url', route('questions.media.show', ['media' => $media->getKey()], absolute: false))
            );
    }
}
