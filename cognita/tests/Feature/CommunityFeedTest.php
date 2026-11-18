<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Group;
use App\Models\Question;
use App\Models\QuestionVote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityFeedTest extends TestCase
{
    use RefreshDatabase;

    private function group(User $creator, array $members = []): Group
    {
        $group = Group::factory()->create(['creator_id' => $creator->getKey()]);
        $group->members()->syncWithoutDetaching(
            collect([$creator, ...$members])->mapWithKeys(
                fn (User $user): array => [$user->getKey() => ['joined_at' => now()]],
            )->all(),
        );

        return $group;
    }

    public function test_the_feed_shows_general_posts_and_group_questions(): void
    {
        $student = User::factory()->student()->create();
        $general = Question::factory()->general()->create(['title' => 'General question']);
        $group = $this->group($student);
        $grouped = Question::factory()->create(['group_id' => $group->getKey(), 'title' => 'Group question']);

        $this->actingAs($student)
            ->get(route('questions.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Community/Feed')
                ->where('stats.posts', 2)
                ->where('posts.total', 2)
                ->where('posts.data.0.title', $grouped->title)
                ->where('posts.data.1.title', $general->title)
                ->where('groups.0.id', $group->getKey())
            );
    }

    public function test_the_feed_can_be_filtered_to_general_posts_or_one_group(): void
    {
        $student = User::factory()->student()->create();
        $general = Question::factory()->general()->create(['title' => 'General question']);
        $group = $this->group($student);
        $grouped = Question::factory()->create(['group_id' => $group->getKey(), 'title' => 'Group question']);

        $this->actingAs($student)
            ->get(route('questions.index', ['scope' => 'general']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.posts', 1)
                ->where('posts.data.0.id', $general->getKey())
            );

        $this->actingAs($student)
            ->get(route('questions.index', ['scope' => 'group', 'group' => $group->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.posts', 1)
                ->where('posts.data.0.id', $grouped->getKey())
                ->where('posts.data.0.group.name', $group->name)
            );
    }

    public function test_a_student_can_read_group_questions_without_joining_the_group(): void
    {
        $outsider = User::factory()->student()->create();
        $group = $this->group(User::factory()->instructor()->create());
        $question = Question::factory()->create(['group_id' => $group->getKey()]);

        $this->actingAs($outsider)
            ->get(route('questions.show', ['question' => $question]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Community/Post')
                ->where('question.group.id', $group->getKey())
            );
    }

    public function test_a_general_post_is_open_to_every_signed_in_learner(): void
    {
        $post = Question::factory()->general()->create();
        $reader = User::factory()->student()->create();

        $this->actingAs($reader)
            ->get(route('questions.show', ['question' => $post]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('question.group', null));
    }

    public function test_a_member_can_post_in_a_group_and_tags_are_normalised(): void
    {
        $student = User::factory()->student()->create();
        $group = $this->group($student);

        $response = $this->actingAs($student)->post(route('questions.store'), [
            'group_id' => $group->getKey(),
            'title' => 'How do I start this?',
            'body' => 'I have read the notes but I am stuck on the first step.',
            'tags' => '#Momentum, Energy, momentum',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('questions', [
            'group_id' => $group->getKey(),
            'user_id' => $student->getKey(),
            'title' => 'How do I start this?',
        ]);
        $this->assertSame(
            ['momentum', 'energy'],
            Question::query()->where('title', 'How do I start this?')->firstOrFail()->tags,
        );
    }

    public function test_a_non_member_cannot_post_in_a_group(): void
    {
        $outsider = User::factory()->student()->create();
        $group = $this->group(User::factory()->instructor()->create());

        $this->actingAs($outsider)->post(route('questions.store'), [
            'group_id' => $group->getKey(),
            'title' => 'Let me in',
            'body' => 'I would like to post here.',
        ])->assertForbidden();

        $this->assertDatabaseMissing('questions', ['title' => 'Let me in']);
    }

    public function test_question_votes_switch_between_up_down_and_clear(): void
    {
        $author = User::factory()->student()->create();
        $voter = User::factory()->student()->create();
        $post = Question::factory()->general()->create(['user_id' => $author->getKey()]);
        $endpoint = route('questions.vote', ['question' => $post]);

        $this->actingAs($voter)->postJson($endpoint, ['value' => 1])->assertJsonPath('data.score', 1);
        $this->actingAs($voter)->postJson($endpoint, ['value' => -1])->assertJsonPath('data.score', -1);
        $this->actingAs($voter)->postJson($endpoint, ['value' => 0])->assertJsonPath('data.score', 0);

        $this->assertDatabaseMissing('question_votes', ['question_id' => $post->getKey(), 'user_id' => $voter->getKey()]);
    }

    public function test_you_cannot_vote_on_your_own_post(): void
    {
        $author = User::factory()->student()->create();
        $post = Question::factory()->general()->create(['user_id' => $author->getKey()]);

        $this->actingAs($author)
            ->postJson(route('questions.vote', ['question' => $post]), ['value' => 1])
            ->assertForbidden();
    }

    public function test_answers_can_be_accepted_and_only_by_the_author(): void
    {
        $author = User::factory()->student()->create();
        $post = Question::factory()->general()->create(['user_id' => $author->getKey()]);
        $answer = Answer::factory()->create(['question_id' => $post->getKey()]);
        $stranger = User::factory()->student()->create();

        $this->actingAs($stranger)
            ->postJson(route('answers.accept', ['answer' => $answer]))
            ->assertForbidden();

        $this->actingAs($author)
            ->postJson(route('answers.accept', ['answer' => $answer]))
            ->assertJsonPath('data.accepted_answer_id', $answer->getKey());

        $this->assertTrue($answer->fresh()->is_accepted);

        $this->actingAs($author)
            ->postJson(route('answers.accept', ['answer' => $answer]))
            ->assertJsonPath('data.accepted_answer_id', null);

        $this->assertFalse($answer->fresh()->is_accepted);
    }

    public function test_top_and_unanswered_sorts_work_on_the_feed(): void
    {
        $student = User::factory()->student()->create();
        $quiet = Question::factory()->general()->create(['title' => 'Quiet question']);
        $popular = Question::factory()->general()->create(['title' => 'Popular question']);
        QuestionVote::query()->create([
            'question_id' => $popular->getKey(),
            'user_id' => $student->getKey(),
            'value' => 1,
        ]);
        Answer::factory()->create(['question_id' => $quiet->getKey()]);

        $this->actingAs($student)
            ->get(route('questions.index', ['sort' => 'top']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('posts.data.0.id', $popular->getKey()));

        $this->actingAs($student)
            ->get(route('questions.index', ['sort' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('posts.total', 1)
                ->where('posts.data.0.id', $popular->getKey())
            );
    }

    public function test_search_respects_the_selected_group(): void
    {
        $student = User::factory()->student()->create();
        $group = $this->group($student);
        $inside = Question::factory()->create([
            'group_id' => $group->getKey(),
            'title' => 'Friction on a rolling wheel',
        ]);
        Question::factory()->general()->create(['title' => 'Friction in free fall']);

        $this->actingAs($student)
            ->get(route('questions.index', ['q' => 'friction', 'scope' => 'group', 'group' => $group->getKey()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('posts.total', 1)
                ->where('posts.data.0.id', $inside->getKey())
            );
    }

    public function test_administrators_cannot_use_the_community(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get(route('questions.index'))->assertForbidden();
    }
}
