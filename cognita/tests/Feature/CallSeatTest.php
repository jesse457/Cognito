<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CallSeat;
use App\Models\Classroom;
use App\Models\User;
use App\Services\CallSeats;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class CallSeatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['calls.enforce_seats' => true]);
    }

    private function seats(): CallSeats
    {
        return app(CallSeats::class);
    }

    public function test_a_second_browser_cannot_take_an_account_already_in_the_call(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $first = Str::random(40);

        $this->seats()->claim($classroom, $instructor, $first);

        try {
            $this->seats()->claim($classroom, $instructor, Str::random(40));
            $this->fail('A second session should not have been allowed to claim the seat.');
        } catch (HttpException $error) {
            $this->assertSame(409, $error->getStatusCode());
            $this->assertStringContainsString('already in this call', $error->getMessage());
        }

        $this->assertSame(1, CallSeat::query()->count());
        $this->assertSame($first, CallSeat::query()->value('session_id'));
    }

    public function test_the_same_browser_session_can_rejoin_and_keep_its_seat(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $session = Str::random(40);

        $this->seats()->claim($classroom, $instructor, $session);
        $this->seats()->claim($classroom, $instructor, $session);

        $this->assertSame(1, CallSeat::query()->count());
        $this->assertSame($session, CallSeat::query()->value('session_id'));
    }

    public function test_leaving_releases_the_seat_for_another_browser(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $first = Str::random(40);
        $second = Str::random(40);

        $this->seats()->claim($classroom, $instructor, $first);
        $this->seats()->release($classroom, $instructor, $first);

        $this->assertDatabaseCount('call_seats', 0);

        $this->seats()->claim($classroom, $instructor, $second);

        $this->assertSame($second, CallSeat::query()->value('session_id'));
    }

    public function test_a_stale_seat_can_be_taken_over_after_the_grace_period(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->seats()->claim($classroom, $instructor, Str::random(40));

        CallSeat::query()->update([
            'last_seen_at' => now()->subSeconds(CallSeats::STALE_SECONDS + 5),
        ]);

        $second = Str::random(40);
        $this->seats()->claim($classroom, $instructor, $second);

        $this->assertSame($second, CallSeat::query()->value('session_id'));
    }

    public function test_ending_the_class_clears_every_seat(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->seats()->claim($classroom, $instructor, Str::random(40));

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/session/end")
            ->assertOk();

        $this->assertDatabaseCount('call_seats', 0);
    }

    public function test_the_token_endpoint_refuses_a_second_session_when_enforced(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertStatus(409);
    }

    public function test_the_token_endpoint_claims_a_seat(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk();

        $this->assertDatabaseCount('call_seats', 1);
        $this->assertDatabaseHas('call_seats', [
            'classroom_id' => $classroom->getKey(),
            'user_id' => $instructor->getKey(),
        ]);
    }
}
