<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ClassStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassEnrollment;
use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Issues LiveKit access tokens for a class group voice room.
 *
 * Classes are the authorization boundary: the owning instructor joins as the
 * room administrator, active class members join as regular participants, and
 * everyone else is refused. Tokens are voice-only and scoped to one room.
 */
class LiveCallService
{
    public const ROLE_HOST = 'host';

    public const ROLE_PARTICIPANT = 'participant';

    public function enabled(): bool
    {
        return (bool) config('features.live_calls');
    }

    public function configured(): bool
    {
        return filled(config('services.livekit.url'))
            && filled(config('services.livekit.api_key'))
            && filled(config('services.livekit.api_secret'));
    }

    public function assertEnabled(): void
    {
        abort_unless($this->enabled(), 404);
    }

    public function assertConfigured(): void
    {
        abort_unless($this->configured(), 503, 'Live calls are not configured on this server.');
    }

    /**
     * Resolve the class and the caller's role in its voice room.
     *
     * @return array{class: PrivateClass, role: string}
     */
    public function authorize(User $user, int $classId): array
    {
        $this->assertEnabled();

        $class = PrivateClass::query()
            ->with('instructor:id,name,display_name')
            ->find($classId);

        if ($class === null || $class->status !== ClassStatus::Active) {
            abort(404, 'Class not found.');
        }

        $role = $this->roleFor($user, $class);

        if ($role === null) {
            Log::warning('live_call.access_denied', [
                'event' => 'live_call.access_denied',
                'user_id' => $user->getKey(),
                'class_id' => $class->getKey(),
            ]);

            abort(403, 'You do not have access to this class voice call.');
        }

        return ['class' => $class, 'role' => $role];
    }

    public function roleFor(User $user, PrivateClass $class): ?string
    {
        if ((int) $class->instructor_id === (int) $user->getKey()) {
            return self::ROLE_HOST;
        }

        $enrolled = ClassEnrollment::query()
            ->where('class_id', $class->getKey())
            ->where('student_id', $user->getKey())
            ->where('status', EnrollmentStatus::Active->value)
            ->exists();

        return $enrolled ? self::ROLE_PARTICIPANT : null;
    }

    public function roomFor(PrivateClass $class): string
    {
        return sprintf(
            '%s-%d',
            (string) config('services.livekit.room_prefix', 'cognita-class'),
            $class->getKey(),
        );
    }

    /**
     * @return array{url: string, token: string, room: string, identity: string, role: string, expires_at: string}
     */
    public function token(User $user, PrivateClass $class, string $role): array
    {
        $this->assertConfigured();

        $ttl = max(60, min((int) config('services.livekit.token_ttl', 3600), 21600));
        $now = now();
        $room = $this->roomFor($class);
        $identity = 'user-'.$user->getKey();
        $isHost = $role === self::ROLE_HOST;

        $token = $this->encode([
            'iss' => (string) config('services.livekit.api_key'),
            'sub' => $identity,
            'name' => $user->displayLabel(),
            'nbf' => $now->getTimestamp(),
            'exp' => $now->copy()->addSeconds($ttl)->getTimestamp(),
            'video' => [
                'roomJoin' => true,
                'room' => $room,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
                'canPublishSources' => ['microphone'],
                'roomAdmin' => $isHost,
                'hidden' => false,
                'recorder' => false,
            ],
            'metadata' => json_encode([
                'role' => $role,
                'class_id' => (int) $class->getKey(),
                'class_name' => $class->name,
            ], JSON_THROW_ON_ERROR),
        ]);

        return [
            'url' => (string) config('services.livekit.url'),
            'token' => $token,
            'room' => $room,
            'identity' => $identity,
            'role' => $role,
            'expires_at' => $now->copy()->addSeconds($ttl)->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function encode(array $payload): string
    {
        $header = $this->base64Url(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $body = $this->base64Url(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $signature = hash_hmac(
            'sha256',
            $header.'.'.$body,
            (string) config('services.livekit.api_secret'),
            true,
        );

        return $header.'.'.$body.'.'.$this->base64Url($signature);
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
