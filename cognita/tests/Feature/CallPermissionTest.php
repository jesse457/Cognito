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

class CallPermissionTest extends TestCase
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

    public function test_the_instructor_can_open_a_students_microphone_for_this_call(): void
    {
        Http::fake(['*' => Http::response('{}', 200)]);

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $identity = "user-{$student->id}-tabaaa1";

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/{$identity}/permission", ['can_talk' => true])
            ->assertOk()
            ->assertJsonPath('data.identity', $identity)
            ->assertJsonPath('data.can_talk', true);

        Http::assertSent(function (Request $request) use ($classroom, $identity): bool {
            if (! str_ends_with($request->url(), '/twirp/livekit.RoomService/UpdateParticipant')) {
                return false;
            }

            if ($request['room'] !== $classroom->roomName() || $request['identity'] !== $identity) {
                return false;
            }

            $permission = $request['permission'];

            if ($permission['canPublish'] !== true || $permission['canPublishData'] !== true) {
                return false;
            }

            if ($permission['canSubscribe'] !== true || $permission['canPublishSources'] !== ['MICROPHONE', 'SCREEN_SHARE', 'SCREEN_SHARE_AUDIO']) {
                return false;
            }

            $authorization = $request->header('Authorization')[0] ?? '';
            $token = str_replace('Bearer ', '', $authorization);
            [, $body] = explode('.', $token);
            $claims = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

            return $claims['video']['roomAdmin'] === true
                && $claims['video']['room'] === $classroom->roomName();
        });
    }

    public function test_the_instructor_can_close_a_students_microphone_again(): void
    {
        Http::fake(['*' => Http::response('{}', 200)]);

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $identity = "user-{$student->id}-tabaaa1";

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/{$identity}/permission", ['can_talk' => false])
            ->assertOk()
            ->assertJsonPath('data.can_talk', false);

        Http::assertSent(function (Request $request): bool {
            if (! str_ends_with($request->url(), '/twirp/livekit.RoomService/UpdateParticipant')) {
                return false;
            }

            $permission = $request['permission'];

            return $permission['canPublish'] === false
                && $permission['canPublishData'] === true
                && $permission['canSubscribe'] === true;
        });
    }

    public function test_students_cannot_open_their_own_or_another_students_microphone(): void
    {
        Http::fake();

        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $this->membership($student, $classroom);
        $this->membership($classmate, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$classmate->id}-tabbbb2/permission", [
                'can_talk' => true,
            ])
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_another_instructor_cannot_change_this_class_permission(): void
    {
        Http::fake();

        $owner = User::factory()->instructor()->create();
        $other = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $owner->id]);
        $this->membership($student, $classroom);

        $this->actingAs($other)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$student->id}-tabccc3/permission", [
                'can_talk' => true,
            ])
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_an_instructor_cannot_change_someone_who_is_not_enrolled(): void
    {
        Http::fake();

        $instructor = User::factory()->instructor()->create();
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$outsider->id}-tabddd4/permission", [
                'can_talk' => true,
            ])
            ->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_a_malformed_identity_is_rejected(): void
    {
        Http::fake();

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/not-a-participant/permission", [
                'can_talk' => true,
            ])
            ->assertUnprocessable();

        Http::assertNothingSent();
    }

    public function test_the_permission_change_requires_an_explicit_boolean(): void
    {
        Http::fake();

        $instructor = User::factory()->instructor()->create();
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);
        $this->membership($student, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/participants/user-{$student->id}-tabeee5/permission")
            ->assertUnprocessable();

        Http::assertNothingSent();
    }
}
