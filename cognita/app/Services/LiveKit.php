<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Classroom;
use App\Models\User;

/**
 * Mints short-lived, voice-scoped LiveKit access tokens.
 *
 * The LiveKit server is configured under services.livekit. Tokens are signed
 * locally (a plain HS256 JWT) so the PHP app needs no LiveKit SDK: the grant is
 * limited to one room, one microphone and a short TTL.
 */
class LiveKit
{
    public function configured(): bool
    {
        return filled(config('services.livekit.url'))
            && filled(config('services.livekit.api_key'))
            && filled(config('services.livekit.api_secret'));
    }

    public function assertConfigured(): void
    {
        abort_unless($this->configured(), 503, 'Live calls are not configured on this server.');
    }

    /**
     * @return array{url: string, token: string, room: string, identity: string, role: string, expires_at: string}
     */
    public function token(User $user, Classroom $classroom, string $role): array
    {
        $this->assertConfigured();

        $ttl = max(60, min((int) config('services.livekit.token_ttl', 3600), 21600));
        $now = now();
        $room = $classroom->roomName();
        $identity = 'user-'.$user->getKey();

        $token = $this->encode([
            'iss' => (string) config('services.livekit.api_key'),
            'sub' => $identity,
            'name' => $user->name,
            'nbf' => $now->getTimestamp(),
            'exp' => $now->copy()->addSeconds($ttl)->getTimestamp(),
            'video' => [
                'roomJoin' => true,
                'room' => $room,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
                'canPublishSources' => ['microphone'],
                'roomAdmin' => $role === ClassroomAccess::ROLE_HOST,
                'hidden' => false,
                'recorder' => false,
            ],
            'metadata' => json_encode([
                'role' => $role,
                'classroom_id' => (int) $classroom->getKey(),
                'classroom_name' => $classroom->name,
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
