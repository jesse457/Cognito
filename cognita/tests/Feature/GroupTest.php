<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Group;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_learner_can_create_a_group_and_becomes_its_first_member(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->post(route('community.groups.store'), [
                'name' => 'Exam revision',
                'description' => 'Working through past papers together.',
            ])
            ->assertRedirect();

        $group = Group::query()->where('name', 'Exam revision')->firstOrFail();

        $this->assertSame($student->getKey(), (int) $group->creator_id);
        $this->assertTrue($group->hasMember($student));
        $this->assertDatabaseHas('group_members', [
            'group_id' => $group->getKey(),
            'user_id' => $student->getKey(),
        ]);
    }

    public function test_a_group_name_is_required(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->post(route('community.groups.store'), ['name' => ''])
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('groups', 0);
    }

    public function test_a_student_can_join_and_leave_a_group(): void
    {
        $creator = User::factory()->student()->create();
        $group = Group::factory()->create(['creator_id' => $creator->getKey()]);
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->post(route('community.groups.join', ['group' => $group]))
            ->assertRedirect();
        $this->assertTrue($group->fresh()->hasMember($student));

        $this->actingAs($student)
            ->delete(route('community.groups.leave', ['group' => $group]))
            ->assertRedirect();
        $this->assertFalse($group->fresh()->hasMember($student));
    }

    public function test_the_creator_cannot_leave_their_own_group(): void
    {
        $creator = User::factory()->student()->create();
        $group = Group::factory()->create(['creator_id' => $creator->getKey()]);
        $group->members()->attach($creator, ['joined_at' => now()]);

        $this->actingAs($creator)
            ->delete(route('community.groups.leave', ['group' => $group]))
            ->assertForbidden();

        $this->assertTrue($group->fresh()->hasMember($creator));
    }

    public function test_the_group_page_lists_its_members_and_posts(): void
    {
        $creator = User::factory()->student()->create();
        $group = Group::factory()->create(['creator_id' => $creator->getKey()]);
        $group->members()->attach($creator, ['joined_at' => now()]);
        $post = Question::factory()->create(['group_id' => $group->getKey()]);

        $this->actingAs($creator)
            ->get(route('community.groups.show', ['group' => $group]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Community/Group')
                ->where('group.id', $group->getKey())
                ->where('group.joined', true)
                ->where('members.0.id', $creator->getKey())
                ->where('posts.data.0.id', $post->getKey())
            );
    }
}
