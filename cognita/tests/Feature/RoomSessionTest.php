<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A room is a time and a token — never a canvas.
 *
 * These tests are the rule in executable form. The server tracks *which* room a
 * class is in, so every browser can be told to start drawing on a clean board at
 * the same moment, and it stores nothing else: no strokes, no snapshots, no
 * per-room ink of any kind. Everything durable about the board — the surface and
 * the PDF on it — survives a room.
 */
class RoomSessionTest extends TestCase
{
    use RefreshDatabase;

    private function classroom(): array
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        return [$instructor, $classroom];
    }

    private function touch(User $user, Classroom $classroom): array
    {
        return $this->actingAs($user)
            ->postJson("/classes/{$classroom->id}/call/session/touch")
            ->assertOk()
            ->json('data');
    }

    private function leave(User $user, Classroom $classroom): void
    {
        $this->actingAs($user)
            ->postJson("/classes/{$classroom->id}/call/session/leave")
            ->assertOk();
    }

    public function test_only_ending_the_class_starts_a_new_room(): void
    {
        [$instructor, $classroom] = $this->classroom();
        Http::fake(['*' => Http::response(null, 404)]);

        $first = $this->touch($instructor, $classroom);

        // Leaving without ending the class keeps the same lesson and its board.
        $this->leave($instructor, $classroom);
        $second = $this->touch($instructor, $classroom);

        $this->assertSame($first['session'], $second['session']);
        $this->assertNull($classroom->callSessions()->firstOrFail()->ended_at);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertOk();

        $third = $this->touch($instructor, $classroom);

        $this->assertNotSame($second['session'], $third['session']);
        $this->assertSame([], $third['board']['strokes']);
    }

    public function test_no_drawings_are_stored_anywhere(): void
    {
        [$instructor, $classroom] = $this->classroom();

        $this->touch($instructor, $classroom);

        // The board endpoint is the only write path, and it refuses ink.
        $this->actingAs($instructor)
            ->patchJson("/classes/{$classroom->id}/board", [
                'strokes' => [
                    ['id' => 1, 'tool' => 'pen', 'color' => '#0b57d0', 'width' => 0.004, 'page' => 1, 'points' => [[0.2, 0.2], [0.3, 0.4]]],
                ],
            ])
            ->assertStatus(422);

        $this->assertFalse(
            Schema::hasColumn('call_sessions', 'strokes'),
            'call_sessions must not have anywhere to keep ink.',
        );
        $this->assertFalse(
            Schema::hasColumn('class_boards', 'strokes'),
            'class_boards must not have anywhere to keep ink.',
        );
    }

    public function test_ending_a_room_marks_it_closed_and_never_reuses_it(): void
    {
        [$instructor, $classroom] = $this->classroom();
        Http::fake(['*' => Http::response(null, 404)]);

        $this->touch($instructor, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertOk();

        $this->assertDatabaseCount('call_sessions', 1);
        $this->assertNotNull($classroom->callSessions()->firstOrFail()->ended_at);

        Http::assertSent(function (Request $request) use ($classroom): bool {
            if (! str_ends_with($request->url(), '/twirp/livekit.RoomService/DeleteRoom')) {
                return false;
            }

            if ($request['room'] !== $classroom->roomName()) {
                return false;
            }

            $authorization = $request->header('Authorization')[0] ?? '';
            $token = str_replace('Bearer ', '', $authorization);
            [, $body] = explode('.', $token);
            $claims = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

            // LiveKit gates DeleteRoom behind roomCreate, not roomAdmin.
            return $claims['video']['roomCreate'] === true
                && $claims['video']['roomAdmin'] === true
                && $claims['video']['room'] === $classroom->roomName();
        });

        $this->touch($instructor, $classroom);

        $this->assertDatabaseCount('call_sessions', 2);
    }

    public function test_a_quiet_room_stays_open_until_the_instructor_ends_it(): void
    {
        [$instructor, $classroom] = $this->classroom();

        $first = $this->touch($instructor, $classroom);

        // A tab that vanished without leaving: the lesson is still the same one
        // when the instructor's network comes back.
        $this->travel(10)->minutes();

        $second = $this->touch($instructor, $classroom);

        $this->assertSame($first['session'], $second['session']);
        $this->assertDatabaseCount('call_sessions', 1);
        $this->assertNull($classroom->callSessions()->firstOrFail()->ended_at);
    }

    public function test_a_short_reconnect_keeps_the_same_room(): void
    {
        [$instructor, $classroom] = $this->classroom();

        $first = $this->touch($instructor, $classroom);

        $this->travel(20)->seconds();
        $second = $this->touch($instructor, $classroom);

        $this->assertSame($first['session'], $second['session']);
        $this->assertDatabaseCount('call_sessions', 1);
    }

    public function test_only_the_host_opens_a_room(): void
    {
        [$instructor, $classroom] = $this->classroom();
        $student = User::factory()->student()->create();
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);

        $waiting = $this->touch($student, $classroom);

        $this->assertNull($waiting['session']);
        $this->assertFalse($waiting['live']);

        $opened = $this->touch($instructor, $classroom);
        $joined = $this->touch($student, $classroom);

        $this->assertSame($opened['session'], $joined['session']);
        $this->assertTrue($joined['live']);
    }

    public function test_a_student_leaving_does_not_end_the_room(): void
    {
        [$instructor, $classroom] = $this->classroom();
        $student = User::factory()->student()->create();
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);

        $room = $this->touch($instructor, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/leave")
            ->assertOk()
            ->assertJsonPath('data.live', true);

        $this->assertSame($room['session'], $this->touch($instructor, $classroom)['session']);
    }

    public function test_the_host_can_start_a_fresh_room_without_ending_the_call(): void
    {
        [$instructor, $classroom] = $this->classroom();
        $student = User::factory()->student()->create();
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);

        $first = $this->touch($instructor, $classroom);

        $restarted = $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/restart")
            ->assertOk()
            ->json('data');

        $this->assertNotSame($first['session'], $restarted['session']);
        $this->assertSame([], $restarted['board']['strokes']);
        $this->assertDatabaseCount('call_sessions', 1);
        $this->assertNull($classroom->callSessions()->firstOrFail()->ended_at);

        // The student is still in the call and simply follows the new board.
        $this->assertSame($restarted['session'], $this->touch($student, $classroom)['session']);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/restart")
            ->assertForbidden();

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertForbidden();
    }

    public function test_the_pdf_on_the_board_outlives_the_room(): void
    {
        Storage::fake('local');

        [$instructor, $classroom] = $this->classroom();

        $this->actingAs($instructor)->postJson("/classes/{$classroom->id}/board/document", [
            'document' => UploadedFile::fake()->createWithContent('week-1.pdf', '%PDF-1.4 week one'),
        ])->assertOk();

        $this->touch($instructor, $classroom);
        $this->leave($instructor, $classroom);

        $next = $this->touch($instructor, $classroom);

        $this->assertSame('week-1.pdf', $next['board']['document']['name']);
        $this->assertSame('pdf', $next['board']['surface']);
        $this->assertSame([], $next['board']['strokes']);
    }

    public function test_a_joiner_is_told_the_room_and_the_blank_canvas(): void
    {
        [$instructor, $classroom] = $this->classroom();
        $student = User::factory()->student()->create();
        Enrollment::query()->create([
            'classroom_id' => $classroom->getKey(),
            'student_id' => $student->getKey(),
            'joined_at' => now(),
        ]);

        $room = $this->touch($instructor, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.session', $room['session'])
            ->assertJsonPath('data.board.strokes', [])
            ->assertJsonPath('data.role', 'participant');
    }
}
