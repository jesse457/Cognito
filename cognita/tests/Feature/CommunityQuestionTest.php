<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Classroom;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityQuestionTest extends TestCase
{
    use RefreshDatabase;

    private function communityQuestion(User $author, array $overrides = []): Question
    {
        return Question::factory()->create(array_merge([
            'classroom_id' => null,
            'visibility' => Question::VISIBILITY_COMMUNITY,
            'user_id' => $author->getKey(),
            'title' => 'How do I choose a coordinate direction?',
            'body' => 'I keep flipping the sign halfway through a momentum problem.',
            'tags' => ['momentum'],
        ], $overrides));
    }

    public function test_the_community_board_is_open_to_a_student_who_has_not_joined_a_class(): void
    {
        $student = User::factory()->student()->create();
        $author = User::factory()->instructor()->create();
        $this->communityQuestion($author, ['title' => 'Visible to everyone']);

        $classroom = Classroom::factory()->create();
        Question::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'visibility' => Question::VISIBILITY_CLASSROOM,
            'title' => 'Still private to the class',
        ]);

        $this->actingAs($student)
            ->get('/questions?scope=community')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Questions/Index')
                ->has('questions.data', 1)
                ->where('questions.data.0.title', 'Visible to everyone')
                ->where('questions.data.0.visibility', 'community')
                ->where('questions.data.0.classroom', null)
                ->where('filters.scope', 'community')
                ->where('canAsk', true)
                ->where('stats.questions', 1)
            );

        $this->actingAs($student)
            ->get('/questions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('questions.data', 0)
                ->where('canAsk', false)
            );
    }

    public function test_a_student_without_a_class_can_ask_a_community_question(): void
    {
        $student = User::factory()->student()->create();

        $response = $this->actingAs($student)->post('/questions', [
            'scope' => 'community',
            'title' => 'What is the best way to revise momentum?',
            'body' => 'I have the notes but I do not know where to start.',
            'tags' => 'revision, momentum',
        ]);

        $question = Question::query()->firstOrFail();

        $response->assertRedirect(route('questions.show', ['question' => $question->getKey()]));
        $this->assertNull($question->classroom_id);
        $this->assertSame(Question::VISIBILITY_COMMUNITY, $question->visibility);
        $this->assertSame($student->getKey(), (int) $question->user_id);
    }

    public function test_any_signed_in_student_can_answer_vote_and_accept_on_a_community_question(): void
    {
        $asker = User::factory()->student()->create();
        $answerer = User::factory()->student()->create();
        $question = $this->communityQuestion($asker);

        $this->actingAs($answerer)
            ->get("/questions/{$question->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Questions/Show')
                ->where('question.visibility', 'community')
                ->where('question.classroom', null)
            );

        $this->actingAs($answerer)
            ->post("/questions/{$question->id}/answers", ['body' => 'Pick one direction and keep it for the whole problem.'])
            ->assertRedirect(route('questions.show', ['question' => $question->id]));

        $answer = Answer::query()->firstOrFail();

        $this->actingAs($answerer)
            ->postJson("/questions/{$question->id}/vote", ['value' => 1])
            ->assertOk()
            ->assertJsonPath('data.score', 1);

        $this->actingAs($asker)
            ->postJson("/answers/{$answer->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.accepted_answer_id', $answer->id);

        $this->assertTrue($answer->fresh()->is_accepted);
    }

    public function test_a_community_question_cannot_be_used_to_read_a_private_class_thread(): void
    {
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $question = Question::factory()->create([
            'classroom_id' => $classroom->getKey(),
            'visibility' => Question::VISIBILITY_CLASSROOM,
        ]);

        $this->actingAs($outsider)
            ->get("/questions/{$question->id}")
            ->assertForbidden();

        $this->actingAs($outsider)
            ->post("/questions/{$question->id}/answers", ['body' => 'Not allowed.'])
            ->assertForbidden();
    }
}
