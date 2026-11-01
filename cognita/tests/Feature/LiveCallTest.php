<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveCallTest extends TestCase
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

    public function test_the_instructor_opens_the_call_as_host(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create([
            'instructor_id' => $instructor->id,
            'name' => 'Physics Cohort A',
        ]);

        $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('LiveCall/Room')
                ->where('role', 'host')
                ->where('classroom.name', 'Physics Cohort A')
                ->where('board.surface', 'canvas')
                ->where('canManageBoard', true)
            );
    }

    public function test_a_joined_student_sees_a_view_only_board_until_allowed(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('role', 'participant')
                ->where('canManageBoard', false)
                ->where('canEditBoard', false)
            );

        $classroom->board->update(['students_can_annotate' => true]);

        $this->actingAs($student)
            ->get("/classes/{$classroom->id}/call")
            ->assertInertia(fn ($page) => $page->where('canEditBoard', true));
    }

    public function test_the_token_endpoint_mints_a_voice_token_scoped_to_the_room(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $response = $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'host')
            ->assertJsonPath('data.room', $classroom->roomName());

        $token = $response->json('data.token');
        $this->assertIsString($token);
        $this->assertSame(3, count(explode('.', $token)));

        [, $body] = explode('.', $token);
        $claims = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

        $this->assertTrue($claims['video']['roomJoin']);
        $this->assertSame($classroom->roomName(), $claims['video']['room']);
        $this->assertSame(['microphone'], $claims['video']['canPublishSources']);
        $this->assertStringContainsString('"role":"host"', $claims['metadata']);
    }

    public function test_non_members_get_no_token(): void
    {
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->actingAs($outsider)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertForbidden();
    }

    public function test_the_call_page_requires_sign_in(): void
    {
        $classroom = Classroom::factory()->create();

        $this->get("/classes/{$classroom->id}/call")->assertRedirect(route('login'));
    }
}
