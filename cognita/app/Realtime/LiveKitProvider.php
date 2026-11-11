<?php

declare(strict_types=1);

namespace App\Realtime;

use App\Contracts\RealtimeProvider;
use App\Models\Classroom;
use App\Models\User;
use App\Services\LiveKit;
use Illuminate\Http\Request;

/**
 * LiveKit is the provider this build ships with.
 *
 * The adapter is deliberately thin: App\Services\LiveKit owns the vendor detail
 * (HS256 grants, address detection, the STUN probe), and this class only maps
 * that onto the provider contract so the rest of the app never sees it.
 */
final class LiveKitProvider implements RealtimeProvider
{
    public function __construct(private readonly LiveKit $liveKit) {}

    public function driver(): string
    {
        return 'livekit';
    }

    public function configured(): bool
    {
        return $this->liveKit->configured();
    }

    public function assertConfigured(): void
    {
        $this->liveKit->assertConfigured();
    }

    public function signalUrl(?Request $request = null): string
    {
        return $this->liveKit->signalUrl($request);
    }

    public function secureUrl(Request $request, ?string $path = null): ?string
    {
        return $this->liveKit->secureUrl($request, $path);
    }

    public function room(Classroom $classroom): string
    {
        return $classroom->roomName();
    }

    public function grant(
        User $user,
        Classroom $classroom,
        string $role,
        ?string $session = null,
        ?Request $request = null,
    ): array {
        return $this->liveKit->token($user, $classroom, $role, $session, $request);
    }

    public function removeParticipant(Classroom $classroom, string $identity, ?Request $request = null): void
    {
        $this->liveKit->removeParticipant($classroom, $identity, $request);
    }

    public function endRoom(Classroom $classroom, ?Request $request = null): void
    {
        $this->liveKit->endRoom($classroom, $request);
    }

    public function setMicrophonePermission(
        Classroom $classroom,
        string $identity,
        bool $allowed,
        ?Request $request = null,
    ): void {
        $this->liveKit->setMicrophonePermission($classroom, $identity, $allowed, $request);
    }

    public function diagnose(?Request $request = null, ?string $pagePath = null): array
    {
        return $this->liveKit->diagnose($request, $pagePath);
    }
}
