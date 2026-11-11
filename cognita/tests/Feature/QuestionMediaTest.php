<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\PostMedia;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class QuestionMediaTest extends TestCase
{
    use RefreshDatabase;

    private function enroll(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    private function ask(User $author, Classroom $classroom, array $media = []): Question
    {
        $this->actingAs($author)->post('/questions', [
            'scope' => 'class',
            'classroom_id' => $classroom->getKey(),
            'title' => 'Which force is missing from my diagram?',
            'body' => 'I have attached the free-body diagram I drew.',
            'media' => $media,
        ])->assertRedirect();

        return Question::query()->latest('id')->firstOrFail();
    }

    public function test_question_photos_are_private_to_the_class(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->ask($author, $classroom, [
            UploadedFile::fake()->image('free-body.png', 800, 600),
        ]);

        $media = PostMedia::query()->firstOrFail();

        $this->assertSame($question->getKey(), (int) $media->mediable_id);
        $this->assertSame('image/png', $media->mime);
        Storage::disk('local')->assertExists($media->path);

        $url = route('questions.media.show', ['media' => $media->getKey()], absolute: false);

        $this->actingAs($classmate)
            ->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $this->actingAs($outsider)
            ->get($url)
            ->assertForbidden();

        auth()->logout();

        $this->get($url)->assertRedirect(route('login'));
    }

    public function test_community_photos_are_open_to_every_signed_in_member(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $otherStudent = User::factory()->student()->create();
        $instructor = User::factory()->instructor()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($author)->post('/questions', [
            'scope' => 'community',
            'title' => 'How do I read this phase diagram?',
            'body' => 'The photo shows the region I am stuck in.',
            'media' => [UploadedFile::fake()->image('phase.jpg', 900, 700)],
        ])->assertRedirect();

        $media = PostMedia::query()->firstOrFail();
        $url = route('questions.media.show', ['media' => $media->getKey()], absolute: false);

        $this->actingAs($otherStudent)->get($url)->assertOk();
        $this->actingAs($instructor)->get($url)->assertOk();
        $this->actingAs($admin)->get($url)->assertForbidden();
    }

    public function test_answer_photos_are_stored_and_returned_with_the_thread(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->ask($author, $classroom);

        $this->actingAs($classmate)
            ->post("/questions/{$question->id}/answers", [
                'body' => 'Here is the corrected diagram.',
                'media' => [UploadedFile::fake()->image('corrected.webp', 640, 480)],
            ])
            ->assertRedirect(route('questions.show', ['question' => $question->id]));

        $answer = Answer::query()->firstOrFail();
        $media = PostMedia::query()->firstOrFail();

        $this->assertSame($answer->getKey(), (int) $media->mediable_id);
        Storage::disk('local')->assertExists($media->path);

        $this->actingAs($author)
            ->get("/questions/{$question->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('question.media', 0)
                ->has('answers.0.media', 1)
                ->where('answers.0.media.0.url', route('questions.media.show', [
                    'media' => $media->getKey(),
                ], absolute: false))
            );
    }

    public function test_only_images_and_at_most_five_per_post_are_accepted(): void
    {
        Storage::fake('local');

        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->enroll($student, $classroom);

        $this->actingAs($student)
            ->post('/questions', [
                'classroom_id' => $classroom->getKey(),
                'title' => 'A photo of my notes',
                'body' => 'It is a text file, not a picture.',
                'media' => [UploadedFile::fake()->create('notes.txt', 4, 'text/plain')],
            ])
            ->assertSessionHasErrors('media.0');

        $images = [];

        for ($index = 0; $index < 6; $index++) {
            $images[] = UploadedFile::fake()->image("page-{$index}.png", 100, 100);
        }

        $this->actingAs($student)
            ->post('/questions', [
                'classroom_id' => $classroom->getKey(),
                'title' => 'Too many photos',
                'body' => 'Six pages is more than the limit.',
                'media' => $images,
            ])
            ->assertSessionHasErrors('media');

        $this->assertDatabaseCount('questions', 0);
        $this->assertDatabaseCount('post_media', 0);
    }
}
