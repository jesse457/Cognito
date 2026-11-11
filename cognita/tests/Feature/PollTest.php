<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CallSession;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Poll;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PollTest extends TestCase
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

    private function live(Classroom $classroom, ?User $host = null): CallSession
    {
        return CallSession::query()->create([
            'classroom_id' => $classroom->getKey(),
            'token' => Str::random(20),
            'opened_by' => $host?->getKey(),
            'last_seen_at' => now(),
        ]);
    }

    private function createPoll(User $host, Classroom $classroom, array $overrides = []): int
    {
        $response = $this->actingAs($host)->postJson("/classes/{$classroom->id}/call/polls", array_merge([
            'kind' => Poll::KIND_OPEN,
            'question' => 'Which step is still unclear?',
            'duration' => 60,
        ], $overrides))->assertCreated();

        return (int) $response->json('data.id');
    }

    public function test_the_instructor_can_open_a_timed_open_answer_poll_and_a_student_can_answer(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom);

        $this->actingAs($student)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertOk()
            ->assertJsonPath('data.polls.0.id', $pollId)
            ->assertJsonPath('data.polls.0.kind', 'open')
            ->assertJsonPath('data.polls.0.is_open', true)
            ->assertJsonPath('data.polls.0.can_respond', true)
            ->assertJsonPath('data.polls.0.my_response', null);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'body' => 'The sign change after the collision.',
            ])
            ->assertOk()
            ->assertJsonPath('data.my_response.body', 'The sign change after the collision.')
            ->assertJsonPath('data.total_responses', 1)
            ->assertJsonPath('data.responses.0', 'The sign change after the collision.');

        $this->actingAs($instructor)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertOk()
            ->assertJsonPath('data.polls.0.total_responses', 1)
            ->assertJsonPath('data.polls.0.can_close', true)
            ->assertJsonPath('data.polls.0.can_respond', false);
    }

    public function test_a_student_can_change_a_choice_answer_and_counts_stay_one_per_person(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom, [
            'kind' => Poll::KIND_CHOICE,
            'question' => 'Which equation applies first?',
            'options' => ['Momentum', 'Kinetic energy', 'Both at once'],
        ]);

        $options = $this->actingAs($student)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->json('data.polls.0.options');

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'option_id' => $options[0]['id'],
            ])
            ->assertOk()
            ->assertJsonPath('data.my_response.option_id', $options[0]['id'])
            ->assertJsonPath('data.options.0.count', 1)
            ->assertJsonPath('data.options.1.count', 0);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'option_id' => $options[1]['id'],
            ])
            ->assertOk()
            ->assertJsonPath('data.my_response.option_id', $options[1]['id'])
            ->assertJsonPath('data.options.0.count', 0)
            ->assertJsonPath('data.options.1.count', 1)
            ->assertJsonPath('data.total_responses', 1);
    }

    public function test_results_are_visible_to_students_who_have_not_answered(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $studentOne = User::factory()->student()->create();
        $studentTwo = User::factory()->student()->create();
        $this->enroll($studentOne, $classroom);
        $this->enroll($studentTwo, $classroom);
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom, [
            'kind' => Poll::KIND_CHOICE,
            'question' => 'Which equation applies first?',
            'options' => ['Momentum', 'Kinetic energy'],
        ]);

        $options = $this->actingAs($studentOne)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->json('data.polls.0.options');

        $this->actingAs($studentOne)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'option_id' => $options[0]['id'],
            ])
            ->assertOk();

        $this->actingAs($studentTwo)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertOk()
            ->assertJsonPath('data.polls.0.my_response', null)
            ->assertJsonPath('data.polls.0.total_responses', 1)
            ->assertJsonPath('data.polls.0.options.0.count', 1)
            ->assertJsonPath('data.polls.0.options.1.count', 0);
    }

    public function test_a_poll_stops_accepting_answers_when_its_timer_runs_out(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom);

        Poll::query()->whereKey($pollId)->update(['ends_at' => now()->subSecond()]);

        $this->actingAs($student)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertOk()
            ->assertJsonPath('data.polls.0.is_open', false)
            ->assertJsonPath('data.polls.0.can_respond', false)
            ->assertJsonPath('data.polls.0.seconds_remaining', 0);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'body' => 'Too late.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('poll');
    }

    public function test_the_instructor_can_close_a_poll_early(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/close")
            ->assertOk()
            ->assertJsonPath('data.is_open', false)
            ->assertJsonPath('data.can_close', false);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'body' => 'Too late.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('poll');
    }

    public function test_only_the_instructor_can_create_and_close_polls(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $classroom);
        $this->live($classroom, $instructor);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls", [
                'kind' => Poll::KIND_OPEN,
                'question' => 'Can I create this?',
                'duration' => 60,
            ])
            ->assertForbidden();

        $pollId = $this->createPoll($instructor, $classroom);

        $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/close")
            ->assertForbidden();
    }

    public function test_an_outsider_cannot_see_or_answer_a_poll(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $outsider = User::factory()->student()->create();
        $this->live($classroom, $instructor);

        $pollId = $this->createPoll($instructor, $classroom);

        $this->actingAs($outsider)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertForbidden();

        $this->actingAs($outsider)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'body' => 'Not in this class.',
            ])
            ->assertForbidden();
    }

    public function test_a_poll_cannot_be_created_before_the_class_starts(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/polls", [
                'kind' => Poll::KIND_OPEN,
                'question' => 'No live room yet.',
                'duration' => 60,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('poll');
    }

    public function test_opening_a_new_poll_closes_the_previous_open_one(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $this->live($classroom, $instructor);

        $first = $this->createPoll($instructor, $classroom, ['question' => 'First?']);
        $second = $this->createPoll($instructor, $classroom, ['question' => 'Second?']);

        $this->assertFalse(Poll::query()->findOrFail($first)->isOpen());
        $this->assertTrue(Poll::query()->findOrFail($second)->isOpen());

        $this->actingAs($instructor)
            ->getJson("/classes/{$classroom->id}/call/polls")
            ->assertOk()
            ->assertJsonPath('data.polls.0.id', $second)
            ->assertJsonPath('data.polls.1.id', $first);
    }

    public function test_choice_polls_need_two_options_and_the_instructor_cannot_vote(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $this->live($classroom, $instructor);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/polls", [
                'kind' => Poll::KIND_CHOICE,
                'question' => 'One option only?',
                'duration' => 60,
                'options' => ['Only one'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('options');

        $pollId = $this->createPoll($instructor, $classroom, [
            'kind' => Poll::KIND_CHOICE,
            'options' => ['One', 'Two'],
        ]);

        $optionId = Poll::query()->findOrFail($pollId)->options()->firstOrFail()->getKey();

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/polls/{$pollId}/respond", [
                'option_id' => $optionId,
            ])
            ->assertForbidden();
    }

    public function test_a_poll_from_another_class_cannot_be_reached_through_this_class(): void
    {
        $instructor = User::factory()->instructor()->create();
        $first = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $second = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $student = User::factory()->student()->create();
        $this->enroll($student, $second);
        $this->live($first, $instructor);
        $this->live($second, $instructor);

        $pollId = $this->createPoll($instructor, $first);

        $this->actingAs($student)
            ->postJson("/classes/{$second->id}/call/polls/{$pollId}/respond", [
                'body' => 'Wrong room.',
            ])
            ->assertNotFound();
    }
}
