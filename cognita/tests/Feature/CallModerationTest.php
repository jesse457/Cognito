<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CallModerationTest extends TestCase
{
    use RefreshDatabase;

    private function membership(User $student, Classroom $classroom): void
    {
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);
    }

    public function test_the_instructor_can_remove_an_enrolled_student_from_the_call(): void
    {
        Http::fake(['*' => Http::response('{}', 200)]);

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $identity = "user-{$student->id}-tabaaa1";
        $url = "/classes/{$classroom->id}/call/participants/{$identity}/remove";

        $this->actingAs($instructor)
            ->postJson($url)
            ->assertOk()
            ->assertJsonPath('data.identity', $identity)
            ->assertJsonPath('data.removed', true);

        Http::assertSent(function (Request $request) use ($classroom, $identity): bool {
            if (! str_ends_with($request->url(), '/twirp/livekit.RoomService/RemoveParticipant')) {
                return false;
            }

            if ($request['room'] !== $classroom->roomName() || $request['identity'] !== $identity) {
                return false;
            }

            $authorization = $request->header('Authorization')[0] ?? '';
            $token = str_replace('Bearer ', '', $authorization);
            [$header, $body] = explode('.', $token);
            $claims = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

            return $claims['video']['roomAdmin'] === true
                && $claims['video']['room'] === $classroom->roomName();
        });
    }

    public function test_students_cannot_remove_other_participants(): void
    {
        Http::fake();

        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $this->membership($student, $classroom);
        $this->membership($classmate, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$classmate->id}-tabbbb2/remove")
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_an_instructor_cannot_remove_someone_who_is_not_enrolled(): void
    {
        Http::fake();

        $instructor = User::factory()->instructor()->create();
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$outsider->id}-tabccc3/remove")
            ->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_a_malformed_identity_is_rejected(): void
    {
        Http::fake();

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/not-a-participant/remove")
            ->assertUnprocessable();

        Http::assertNothingSent();
    }
}
