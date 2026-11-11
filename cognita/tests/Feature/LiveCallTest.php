<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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
        $this->assertTrue($claims['video']['canPublish']);
        $this->assertSame(['microphone', 'screen_share', 'screen_share_audio'], $claims['video']['canPublishSources']);
        $this->assertStringContainsString('"role":"host"', $claims['metadata']);
    }

    public function test_a_student_token_joins_muted_and_can_still_use_the_board(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();
        $this->membership($student, $classroom);

        $response = $this->actingAs($student)
            ->postJson("/classes/{$classroom->id}/call/token")
            ->assertOk()
            ->assertJsonPath('data.role', 'participant');

        [, $body] = explode('.', $response->json('data.token'));
        $claims = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

        $this->assertFalse($claims['video']['canPublish']);
        $this->assertTrue($claims['video']['canPublishData']);
        $this->assertTrue($claims['video']['canSubscribe']);
        $this->assertStringContainsString('"role":"participant"', $claims['metadata']);
    }

    public function test_each_browser_tab_gets_its_own_participant_identity(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $first = $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token", ['session' => 'tabaaa1'])
            ->assertOk()
            ->json('data.identity');

        $second = $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token", ['session' => 'tabbbb2'])
            ->assertOk()
            ->json('data.identity');

        // A shared identity makes LiveKit kick the older session, which shows up
        // as a call that connects and then drops.
        $this->assertNotSame($first, $second);
        $this->assertStringStartsWith('user-'.$instructor->id, (string) $first);
    }

    public function test_a_malformed_session_is_ignored(): void
    {
        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->postJson("/classes/{$classroom->id}/call/token", ['session' => '../../etc/passwd'])
            ->assertOk()
            ->assertJsonPath('data.identity', 'user-'.$instructor->id);
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

    /**
     * The address must follow whoever opened the page: a laptop, a phone on the
     * LAN and a tunnel all get a URL they can actually reach. This is the check
     * that fails when someone hard-codes ws://192.168.x.x in .env.
     */
    public function test_the_call_address_follows_the_request_host(): void
    {
        config([
            'services.livekit.url' => 'ws://192.0.2.1:7880',
            'services.livekit.url_mode' => 'auto',
            'services.livekit.port' => 7880,
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->post('http://192.168.1.50/classes/'.$classroom->id.'/call/token')
            ->assertOk()
            ->assertJsonPath('data.url', 'ws://192.168.1.50:7880');

        $this->actingAs($instructor)
            ->post('http://10.4.4.9/classes/'.$classroom->id.'/call/token')
            ->assertOk()
            ->assertJsonPath('data.url', 'ws://10.4.4.9:7880');
    }

    /**
     * Behind the local TLS front the browser loads https, so it must be handed
     * wss:// on the same origin. Anything else is blocked as mixed content and
     * the call never connects.
     */
    public function test_a_secure_page_gets_a_secure_address_on_its_own_origin(): void
    {
        config([
            'services.livekit.url_mode' => 'auto',
            'services.livekit.secure_port' => 0,
            'services.livekit.tls_port' => 8443,
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '8443'])
            ->post('http://192.168.1.50/classes/'.$classroom->id.'/call/token')
            ->assertOk()
            ->assertJsonPath('data.url', 'wss://192.168.1.50:8443');
    }

    public function test_a_plain_http_page_is_pointed_at_the_secure_origin(): void
    {
        config([
            'services.livekit.url_mode' => 'auto',
            'services.livekit.tls_port' => 8443,
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->get('http://192.168.1.50/classes/'.$classroom->id.'/call')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('realtime.signalUrl', 'ws://192.168.1.50:7880')
                ->where('realtime.secureUrl', 'https://192.168.1.50:8443/classes/'.$classroom->id.'/call')
            );
    }

    public function test_the_secure_origin_is_not_advertised_once_the_page_is_secure(): void
    {
        config([
            'services.livekit.url_mode' => 'auto',
            'services.livekit.tls_port' => 8443,
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '8443'])
            ->get('http://192.168.1.50/classes/'.$classroom->id.'/call')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('realtime.signalUrl', 'wss://192.168.1.50:8443')
                ->where('realtime.secureUrl', null)
            );
    }

    /** A pinned address is for hosted LiveKit; it must survive a different host. */
    public function test_a_fixed_address_wins_over_the_request_host(): void
    {
        config([
            'services.livekit.url' => 'wss://livekit.example.com',
            'services.livekit.url_mode' => 'fixed',
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->post('http://192.168.1.50/classes/'.$classroom->id.'/call/token')
            ->assertOk()
            ->assertJsonPath('data.url', 'wss://livekit.example.com');
    }

    /** Without keys the page still renders; it just says calls are off. */
    public function test_the_page_reports_missing_credentials_instead_of_crashing(): void
    {
        config([
            'services.livekit.api_key' => '',
            'services.livekit.api_secret' => '',
        ]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->get("/classes/{$classroom->id}/call")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('realtime.configured', false));
    }

    /** The health endpoint answers the same question the browser asks. */
    public function test_the_doctor_endpoint_reports_every_layer(): void
    {
        config([
            'services.livekit.url_mode' => 'auto',
            'services.livekit.tls_port' => 8443,
        ]);

        // LiveKit answers a rejected token with 401; faking it keeps the test
        // off the network and about the report shape.
        Http::fake(['*' => Http::response(null, 401)]);

        $instructor = User::factory()->instructor()->create();
        $classroom = Classroom::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->getJson('http://192.168.1.50/classes/'.$classroom->id.'/call/doctor')
            ->assertOk()
            ->assertJsonPath('data.url', 'ws://192.168.1.50:7880')
            ->assertJsonPath('data.secure_url', 'https://192.168.1.50:8443/classes/'.$classroom->id.'/call')
            ->assertJsonPath('data.checks.0.key', 'configuration')
            ->assertJsonPath('data.checks.1.key', 'signal')
            ->assertJsonPath('data.checks.2.key', 'credentials')
            ->assertJsonPath('data.checks.3.key', 'media');
    }

    public function test_the_doctor_endpoint_is_for_members_only(): void
    {
        $outsider = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->actingAs($outsider)
            ->getJson("/classes/{$classroom->id}/call/doctor")
            ->assertForbidden();
    }
}
