<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionBoardTest extends TestCase
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

    private function question(Classroom $classroom, User $author, array $overrides = []): Question
    {
        return Question::factory()->create(array_merge([
            'classroom_id' => $classroom->getKey(),
            'user_id' => $author->getKey(),
            'title' => 'Why does the normal force change in a lift?',
            'body' => 'I thought the normal force always cancelled mg.',
            'tags' => ['forces'],
        ], $overrides));
    }

    public function test_the_board_lists_only_questions_from_joined_classes(): void
    {
        $instructor = User::factory()->instructor()->create();
        $mine = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $other = Classroom::factory()->create();

        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $this->enroll($student, $mine);

        $this->question($mine, $classmate, ['title' => 'Mine to read']);
        $this->question($other, User::factory()->student()->create(), ['title' => 'Not mine to read']);

        $this->actingAs($student)
            ->get('/questions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Questions/Index')
                ->has('questions.data', 1)
                ->where('questions.data.0.title', 'Mine to read')
                ->where('stats.questions', 1)
                ->where('canAsk', true)
                ->where('classrooms.0.id', $mine->id)
            );
    }

    public function test_an_instructor_sees_only_the_questions_in_classes_they_teach(): void
    {
        $instructor = User::factory()->instructor()->create();
        $mine = Classroom::factory()->create(['instructor_id' => $instructor->getKey()]);
        $other = Classroom::factory()->create();

        $this->question($mine, User::factory()->student()->create(), ['title' => 'Taught by me']);
        $this->question($other, User::factory()->student()->create(), ['title' => 'Taught by someone else']);

        $this->actingAs($instructor)
            ->get('/questions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('questions.data', 1)
                ->where('questions.data.0.title', 'Taught by me')
                ->where('classrooms.0.id', $mine->id)
            );
    }

    public function test_a_student_without_classes_gets_an_empty_board_and_cannot_ask(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get('/questions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Questions/Index')
                ->has('questions.data', 0)
                ->has('classrooms', 0)
                ->where('canAsk', false)
                ->where('stats.questions', 0)
            );
    }

    public function test_classmates_can_vote_on_answers(): void
    {
        $asker = User::factory()->student()->create();
        $answerer = User::factory()->student()->create();
        $voter = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($asker, $classroom);
        $this->enroll($answerer, $classroom);
        $this->enroll($voter, $classroom);

        $question = $this->question($classroom, $asker);
        $answer = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $answerer->getKey(),
            'body' => 'An answer worth voting on.',
        ]);

        $this->actingAs($voter)
            ->postJson("/answers/{$answer->id}/vote", ['value' => 1])
            ->assertOk()
            ->assertJsonPath('data.score', 1)
            ->assertJsonPath('data.vote', 1);

        $this->actingAs($voter)
            ->postJson("/answers/{$answer->id}/vote", ['value' => -1])
            ->assertOk()
            ->assertJsonPath('data.score', -1)
            ->assertJsonPath('data.vote', -1);

        $this->actingAs($voter)
            ->postJson("/answers/{$answer->id}/vote", ['value' => 0])
            ->assertOk()
            ->assertJsonPath('data.score', 0)
            ->assertJsonPath('data.vote', 0);

        $this->assertDatabaseMissing('answer_votes', [
            'answer_id' => $answer->id,
            'user_id' => $voter->id,
        ]);
    }

    public function test_a_member_can_ask_a_question_and_tags_are_normalised(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->enroll($student, $classroom);

        $response = $this->actingAs($student)->post('/questions', [
            'classroom_id' => $classroom->getKey(),
            'title' => 'How do I spot an elastic collision?',
            'body' => 'I know momentum is conserved either way.',
            'tags' => '#Momentum, Energy, momentum',
        ]);

        $question = Question::query()->firstOrFail();

        $response
            ->assertRedirect(route('questions.show', ['question' => $question->getKey()]))
            ->assertSessionHas('success');

        $this->assertSame($student->getKey(), (int) $question->user_id);
        $this->assertSame(['momentum', 'energy'], $question->tags);
    }

    public function test_a_tag_that_is_only_punctuation_is_rejected(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->enroll($student, $classroom);

        $this->actingAs($student)
            ->post('/questions', [
                'classroom_id' => $classroom->getKey(),
                'title' => 'A valid title',
                'body' => 'A valid body.',
                'tags' => '??, ok',
            ])
            ->assertSessionHasErrors('tags.0');

        $this->assertDatabaseCount('questions', 0);
    }

    public function test_an_outsider_cannot_ask_or_read_in_a_class(): void
    {
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $question = $this->question($classroom, User::factory()->student()->create());

        $this->actingAs($outsider)
            ->post('/questions', [
                'classroom_id' => $classroom->getKey(),
                'title' => 'Let me in',
                'body' => 'This should not be stored.',
            ])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->get("/questions/{$question->id}")
            ->assertForbidden();

        $this->assertDatabaseCount('questions', 1);
    }

    public function test_a_classmate_can_answer_but_an_outsider_cannot(): void
    {
        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->question($classroom, $author);

        $this->actingAs($classmate)
            ->post("/questions/{$question->id}/answers", ['body' => 'Use both conservation laws.'])
            ->assertRedirect(route('questions.show', ['question' => $question->id]));

        $this->assertDatabaseHas('answers', [
            'question_id' => $question->id,
            'user_id' => $classmate->id,
            'body' => 'Use both conservation laws.',
        ]);

        $answer = Answer::query()->firstOrFail();

        $this->actingAs($outsider)
            ->post("/questions/{$question->id}/answers", ['body' => 'Nope.'])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->postJson("/answers/{$answer->id}/vote", ['value' => 1])
            ->assertForbidden();

        $this->assertDatabaseCount('answers', 1);
    }

    public function test_question_votes_switch_between_up_and_down_and_clear(): void
    {
        $author = User::factory()->student()->create();
        $voter = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($voter, $classroom);

        $question = $this->question($classroom, $author);

        $this->actingAs($voter)
            ->postJson("/questions/{$question->id}/vote", ['value' => 1])
            ->assertOk()
            ->assertJsonPath('data.score', 1)
            ->assertJsonPath('data.vote', 1);

        $this->actingAs($voter)
            ->postJson("/questions/{$question->id}/vote", ['value' => -1])
            ->assertOk()
            ->assertJsonPath('data.score', -1)
            ->assertJsonPath('data.vote', -1);

        $this->assertDatabaseHas('question_votes', [
            'question_id' => $question->id,
            'user_id' => $voter->id,
            'value' => -1,
        ]);

        $this->actingAs($voter)
            ->postJson("/questions/{$question->id}/vote", ['value' => 0])
            ->assertOk()
            ->assertJsonPath('data.score', 0)
            ->assertJsonPath('data.vote', 0);

        $this->assertDatabaseMissing('question_votes', [
            'question_id' => $question->id,
            'user_id' => $voter->id,
        ]);
    }

    public function test_you_cannot_vote_on_your_own_question_or_answer(): void
    {
        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->question($classroom, $author);
        $answer = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $author->getKey(),
            'body' => 'My own attempt.',
        ]);

        $this->actingAs($author)
            ->postJson("/questions/{$question->id}/vote", ['value' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vote');

        $this->actingAs($author)
            ->postJson("/answers/{$answer->id}/vote", ['value' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vote');
    }

    public function test_the_asker_can_accept_one_answer_and_toggle_it_off(): void
    {
        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->question($classroom, $author);
        $first = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'First answer.',
        ]);
        $second = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'Second answer.',
        ]);

        $this->actingAs($author)
            ->postJson("/answers/{$first->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.accepted_answer_id', $first->id);

        $this->assertTrue($first->fresh()->is_accepted);

        $this->actingAs($author)
            ->postJson("/answers/{$second->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.accepted_answer_id', $second->id);

        $this->assertFalse($first->fresh()->is_accepted);
        $this->assertTrue($second->fresh()->is_accepted);

        $this->actingAs($author)
            ->postJson("/answers/{$second->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.accepted_answer_id', null);

        $this->assertFalse($second->fresh()->is_accepted);
    }

    public function test_only_the_asker_can_accept_an_answer(): void
    {
        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->question($classroom, $author);
        $answer = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'An answer.',
        ]);

        $this->actingAs($classmate)
            ->postJson("/answers/{$answer->id}/accept")
            ->assertForbidden();

        $this->assertFalse($answer->fresh()->is_accepted);
    }

    public function test_the_show_page_puts_the_accepted_answer_first(): void
    {
        $author = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($author, $classroom);
        $this->enroll($classmate, $classroom);

        $question = $this->question($classroom, $author);
        $recent = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'Newest but not accepted.',
        ]);
        $accepted = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'Accepted.',
            'is_accepted' => true,
        ]);

        $this->actingAs($author)
            ->get("/questions/{$question->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Questions/Show')
                ->where('acceptedAnswerId', $accepted->id)
                ->where('answers.0.id', $accepted->id)
                ->where('answers.1.id', $recent->id)
            );
    }

    public function test_top_sort_puts_voted_questions_before_unvoted_ones(): void
    {
        $asker = User::factory()->student()->create();
        $voterOne = User::factory()->student()->create();
        $voterTwo = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($asker, $classroom);
        $this->enroll($voterOne, $classroom);
        $this->enroll($voterTwo, $classroom);

        $quiet = $this->question($classroom, $asker, ['title' => 'Quiet question']);
        $popular = $this->question($classroom, $asker, ['title' => 'Popular question']);

        foreach ([$voterOne, $voterTwo] as $voter) {
            $this->actingAs($voter)
                ->postJson("/questions/{$popular->id}/vote", ['value' => 1])
                ->assertOk();
        }

        $this->actingAs($asker)
            ->get('/questions?sort=top')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('questions.data.0.id', $popular->id)
                ->where('questions.data.1.id', $quiet->id)
            );
    }

    public function test_the_show_page_sorts_unaccepted_answers_by_score(): void
    {
        $asker = User::factory()->student()->create();
        $answerer = User::factory()->student()->create();
        $voter = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->enroll($asker, $classroom);
        $this->enroll($answerer, $classroom);
        $this->enroll($voter, $classroom);

        $question = $this->question($classroom, $asker);
        $unvoted = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $answerer->getKey(),
            'body' => 'No votes yet.',
        ]);
        $upvoted = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $answerer->getKey(),
            'body' => 'One vote.',
        ]);

        $this->actingAs($voter)
            ->postJson("/answers/{$upvoted->id}/vote", ['value' => 1])
            ->assertOk();

        $this->actingAs($asker)
            ->get("/questions/{$question->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('answers.0.id', $upvoted->id)
                ->where('answers.1.id', $unvoted->id)
            );
    }

    public function test_search_and_unanswered_sort_only_match_the_viewers_classes(): void
    {
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $other = Classroom::factory()->create();

        $this->enroll($student, $classroom);

        $unanswered = $this->question($classroom, $classmate, [
            'title' => 'Why does friction point forward?',
            'body' => 'A rolling wheel question.',
        ]);
        $this->question($classroom, $classmate, [
            'title' => 'Momentum sign convention',
            'body' => 'Which direction is positive?',
        ])->answers()->create([
            'user_id' => $classmate->getKey(),
            'body' => 'Choose one direction before you start.',
        ]);
        $this->question($other, User::factory()->student()->create(), [
            'title' => 'A question I should never find',
            'body' => 'Friction and momentum outside my class.',
        ]);

        $this->actingAs($student)
            ->get('/questions?q=friction&sort=unanswered')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('questions.data', 1)
                ->where('questions.data.0.id', $unanswered->id)
            );

        $this->actingAs($student)
            ->get('/questions?classroom='.$other->id)
            ->assertNotFound();
    }

    public function test_semantic_search_returns_answer_matches_without_leaking_other_classes(): void
    {
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $other = Classroom::factory()->create();

        $this->enroll($student, $classroom);

        $question = $this->question($classroom, $classmate, [
            'title' => 'Sign convention for momentum',
            'body' => 'Which direction should I call positive?',
        ]);

        $answer = Answer::query()->create([
            'question_id' => $question->getKey(),
            'user_id' => $classmate->getKey(),
            'body' => 'Use the direction of the initial velocity as positive.',
        ]);

        $otherQuestion = $this->question($other, User::factory()->student()->create(), [
            'title' => 'A momentum question from another class',
            'body' => 'This should never appear in the search.',
        ]);

        Answer::query()->create([
            'question_id' => $otherQuestion->getKey(),
            'user_id' => $otherQuestion->user_id,
            'body' => 'Use the direction of the initial velocity as positive.',
        ]);

        $this->actingAs($student)
            ->get('/questions?q=initial velocity positive')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('search.mode', 'semantic')
                ->where('search.answers.0.question_id', $question->id)
                ->where('search.answers.0.answer_id', $answer->id)
                ->has('questions.data', 1)
                ->where('questions.data.0.id', $question->id)
                ->where('questions.data.0.match_kind', 'answer')
                ->where('stats.unanswered', 0)
                ->where('stats.unaccepted', 1)
            );
    }

    public function test_related_threads_are_semantic_and_stay_in_the_same_scope(): void
    {
        $student = User::factory()->student()->create();
        $classmate = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $other = Classroom::factory()->create();

        $this->enroll($student, $classroom);

        $question = $this->question($classroom, $classmate, [
            'title' => 'Momentum after a collision',
            'body' => 'How do I use conservation of momentum after two carts collide?',
            'tags' => ['momentum'],
        ]);

        $similar = $this->question($classroom, $classmate, [
            'title' => 'Conservation of momentum in a collision',
            'body' => 'The total momentum before and after the collision is the same.',
            'tags' => ['momentum'],
        ]);

        $this->question($other, User::factory()->student()->create(), [
            'title' => 'Momentum in a class I cannot see',
            'body' => 'Conservation of momentum after a collision, but in another class.',
            'tags' => ['momentum'],
        ]);

        $this->actingAs($student)
            ->get("/questions/{$question->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('related', 1)
                ->where('related.0.id', $similar->id)
            );
    }

    public function test_administrators_cannot_use_the_question_board(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/questions')
            ->assertForbidden();
    }
}
