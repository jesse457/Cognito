<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PostMedia;
use App\Models\Question;
use App\Models\User;
use App\Support\MediaDisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_media_is_written_to_the_media_disk_and_not_the_app_disk(): void
    {
        config(['filesystems.media_disk' => 'media-test']);
        Storage::fake('media-test');
        Storage::fake('local');

        $student = User::factory()->student()->create();

        $response = $this->actingAs($student)
            ->post('/questions', [
                'title' => 'Where does the photo go?',
                'body' => 'Asking with a picture attached.',
                'media' => [UploadedFile::fake()->image('diagram.png', 40, 40)],
            ]);

        $response->assertRedirect();

        $media = PostMedia::query()->firstOrFail();

        $this->assertSame('media-test', $media->disk);
        Storage::disk('media-test')->assertExists($media->path);
        Storage::disk('local')->assertMissing($media->path);
    }

    public function test_a_photo_is_served_through_the_access_checked_route(): void
    {
        Storage::fake(MediaDisk::name());

        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->post('/questions', [
                'title' => 'A public question',
                'body' => 'With a picture.',
                'media' => [UploadedFile::fake()->image('open.png', 20, 20)],
            ])
            ->assertRedirect();

        $media = PostMedia::query()->firstOrFail();

        $this->actingAs($student)
            ->get("/questions/media/{$media->id}")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_a_photo_is_not_served_to_an_administrator(): void
    {
        Storage::fake(MediaDisk::name());

        $student = User::factory()->student()->create();
        $admin = User::factory()->admin()->create();

        $question = Question::query()->create([
            'group_id' => null,
            'user_id' => $student->getKey(),
            'title' => 'A community post',
            'body' => 'With a picture.',
        ]);

        $media = $question->media()->create([
            'user_id' => $student->getKey(),
            'name' => 'open.png',
            'path' => 'community/questions/'.$question->getKey().'/open.png',
            'disk' => MediaDisk::name(),
            'mime' => 'image/png',
            'size' => 10,
        ]);

        Storage::disk(MediaDisk::name())->put($media->path, 'bytes');

        $this->actingAs($admin)
            ->get("/questions/media/{$media->id}")
            ->assertForbidden();
    }
}
