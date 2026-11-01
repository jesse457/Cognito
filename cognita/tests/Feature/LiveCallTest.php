<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LiveCallTest extends TestCase
{
    use RefreshDatabase;

    private User $instructor;

    private PrivateClass $class;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        $this->instructor = User::factory()->instructor()->create();
        $this->class = PrivateClass::factory()->forInstructor($this->instructor)->create();
        $this->student = User::factory()->student()->create();

        ClassEnrollment::factory()
            ->forClass($this->class)
            ->forStudent($this->student)
            ->create();
    }

    public function test_the_instructor_can_open_the_call_page(): void
    {
        $this->actingAs($this->instructor)
            ->get("/live-calls/{$this->class->getKey()}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LiveCall/Room')
                ->where('class.id', $this->class->getKey())
                ->where('class.name', $this->class->name)
                ->where('role', 'host')
                ->where('configured', true)
                ->where('room', 'cognita-class-'.$this->class->getKey()));
    }

    public function test_the_instructor_receives_a_host_token(): void
    {
        $response = $this->actingAs($this->instructor)
            ->postJson("/live-calls/{$this->class->getKey()}/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'host')
            ->assertJsonPath('data.room', 'cognita-class-'.$this->class->getKey())
            ->assertJsonPath('data.identity', 'user-'.$this->instructor->getKey())
            ->assertJsonStructure([
                'data' => ['url', 'token', 'room', 'identity', 'role', 'expires_at'],
            ]);

        $payload = $this->decodeToken((string) $response->json('data.token'));

        $this->assertSame('user-'.$this->instructor->getKey(), $payload['sub']);
        $this->assertSame($this->instructor->displayLabel(), $payload['name']);
        $this->assertTrue($payload['video']['roomJoin']);
        $this->assertTrue($payload['video']['roomAdmin']);
        $this->assertSame(['microphone'], $payload['video']['canPublishSources']);

        $metadata = json_decode((string) $payload['metadata'], true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame($this->class->getKey(), $metadata['class_id']);
        $this->assertSame('host', $metadata['role']);
    }

    public function test_an_enrolled_student_receives_a_participant_token(): void
    {
        $response = $this->actingAs($this->student)
            ->postJson("/live-calls/{$this->class->getKey()}/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant');

        $payload = $this->decodeToken((string) $response->json('data.token'));

        $this->assertSame('user-'.$this->student->getKey(), $payload['sub']);
        $this->assertFalse($payload['video']['roomAdmin']);

        $metadata = json_decode((string) $payload['metadata'], true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('participant', $metadata['role']);
    }

    public function test_a_student_outside_the_class_is_forbidden(): void
    {
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider)
            ->postJson("/live-calls/{$this->class->getKey()}/token")
            ->assertForbidden();
    }

    public function test_a_removed_student_is_forbidden(): void
    {
        $removed = User::factory()->student()->create();

        ClassEnrollment::factory()
            ->forClass($this->class)
            ->forStudent($removed)
            ->removed()
            ->create();

        $this->actingAs($removed)
            ->postJson("/live-calls/{$this->class->getKey()}/token")
            ->assertForbidden();
    }

    public function test_an_archived_class_has_no_voice_room(): void
    {
        $archived = PrivateClass::factory()->forInstructor($this->instructor)->archived()->create();

        $this->actingAs($this->instructor)
            ->get("/live-calls/{$archived->getKey()}")
            ->assertNotFound();

        $this->actingAs($this->instructor)
            ->postJson("/live-calls/{$archived->getKey()}/token")
            ->assertNotFound();
    }

    public function test_the_api_issues_a_token_to_an_enrolled_student(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson("/api/classes/{$this->class->getKey()}/live-call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant')
            ->assertJsonPath('data.identity', 'user-'.$this->student->getKey());
    }

    public function test_tokens_are_unavailable_until_livekit_is_configured(): void
    {
        config(['services.livekit.api_secret' => null]);

        $this->actingAs($this->student)
            ->get("/live-calls/{$this->class->getKey()}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('configured', false));

        $this->actingAs($this->student)
            ->postJson("/live-calls/{$this->class->getKey()}/token")
            ->assertStatus(503);
    }

    public function test_the_feature_flag_hides_the_call_page(): void
    {
        config(['features.live_calls' => false]);

        $this->actingAs($this->instructor)
            ->get("/live-calls/{$this->class->getKey()}")
            ->assertNotFound();
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeToken(string $token): array
    {
        [$header, $payload, $signature] = explode('.', $token);

        $expected = rtrim(strtr(base64_encode(hash_hmac(
            'sha256',
            $header.'.'.$payload,
            (string) config('services.livekit.api_secret'),
            true,
        )), '+/', '-_'), '=');

        $this->assertSame($expected, $signature);

        $json = base64_decode(strtr($payload, '-_', '+/'), true);
        $this->assertIsString($json);

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }
}
