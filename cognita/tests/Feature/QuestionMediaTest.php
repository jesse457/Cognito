<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Group;
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

    private function ask(User $author, array $media = [], ?Group $group = null): Question
    {
        $this->actingAs($author)->post('/questions', [
            'group_id' => $group?->getKey(),
            'title' => 'How do I read this diagram?',
            'body' => 'The photo shows the part I am stuck on.',
            'media' => $media,
        ])->assertRedirect();

        return Question::query()->latest('id')->firstOrFail();
    }

    public function test_general_post_photos_are_open_to_every_signed_in_learner(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $otherStudent = User::factory()->student()->create();
        $instructor = User::factory()->instructor()->create();
        $admin = User::factory()->admin()->create();

        $question = $this->ask($author, [UploadedFile::fake()->image('phase.jpg', 900, 700)]);
        $media = PostMedia::query()->firstOrFail();
        $url = route('questions.media.show', ['media' => $media->getKey()], absolute: false);

        $this->assertSame($question->getKey(), (int) $media->mediable_id);
        Storage::disk('local')->assertExists($media->path);

        $this->actingAs($otherStudent)->get($url)->assertOk()->assertHeader('Content-Type', 'image/jpeg');
        $this->actingAs($instructor)->get($url)->assertOk();
        $this->actingAs($admin)->get($url)->assertForbidden();

        auth()->logout();

        $this->get($url)->assertRedirect(route('login'));
    }

    public function test_group_post_photos_are_readable_by_any_learner(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $outsider = User::factory()->student()->create();
        $group = Group::factory()->create(['creator_id' => $author->getKey()]);
        $group->members()->attach($author, ['joined_at' => now()]);

        $this->ask($author, [UploadedFile::fake()->image('group.png', 800, 600)], $group);
        $media = PostMedia::query()->firstOrFail();

        $this->actingAs($outsider)
            ->get(route('questions.media.show', ['media' => $media->getKey()], absolute: false))
            ->assertOk();
    }

    public function test_answer_photos_are_stored_and_returned_with_the_thread(): void
    {
        Storage::fake('local');

        $author = User::factory()->student()->create();
        $answerer = User::factory()->student()->create();
        $question = $this->ask($author);

        $this->actingAs($answerer)
            ->post("/questions/{$question->getKey()}/answers", [
                'body' => 'Here is the corrected diagram.',
                'media' => [UploadedFile::fake()->image('corrected.webp', 640, 480)],
            ])
            ->assertRedirect(route('questions.show', ['question' => $question->getKey()]));

        $answer = Answer::query()->firstOrFail();
        $media = PostMedia::query()->firstOrFail();

        $this->assertSame($answer->getKey(), (int) $media->mediable_id);
        Storage::disk('local')->assertExists($media->path);

        $this->actingAs($author)
            ->get("/questions/{$question->getKey()}")
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

        $this->actingAs($student)
            ->post('/questions', [
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
                'title' => 'Too many photos',
                'body' => 'Six pages is more than the limit.',
                'media' => $images,
            ])
            ->assertSessionHasErrors('media');

        $this->assertDatabaseCount('questions', 0);
        $this->assertDatabaseCount('post_media', 0);
    }
}
