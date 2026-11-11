<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Everything the classroom asks of a realtime backend.
 *
 * The app talks to "the call server" through this contract only. No controller,
 * no Inertia prop and no browser component names a vendor: the page is handed a
 * driver name plus a token URL, and the browser picks the adapter that matches.
 *
 * Swapping LiveKit for Jitsi, Daily, a WebRTC SFU of your own or a plain
 * BroadcastChannel in development is then two steps:
 *
 *   1. write a class that implements this interface (see app/Realtime),
 *   2. name it in config/realtime.php.
 */
interface RealtimeProvider
{
    /** Short name the browser uses to choose its client adapter. */
    public function driver(): string;

    /** Whether this provider has the credentials it needs to mint a token. */
    public function configured(): bool;

    public function assertConfigured(): void;

    /** The address a browser dials to reach the call server for this request. */
    public function signalUrl(?Request $request = null): string;

    /** A secure address to offer a visitor whose plain-HTTP page cannot use a microphone. */
    public function secureUrl(Request $request, ?string $path = null): ?string;

    /** The room identifier that holds one class call. */
    public function room(Classroom $classroom): string;

    /**
     * A short-lived grant for one participant of one class call.
     *
     * @return array{url: string, token: string, room: string, identity: string, role: string, expires_at: string}
     */
    public function grant(
        User $user,
        Classroom $classroom,
        string $role,
        ?string $session = null,
        ?Request $request = null,
    ): array;

    /** Remove one participant session from a room using the server API. */
    public function removeParticipant(Classroom $classroom, string $identity, ?Request $request = null): void;

    /** Close the call server's room, disconnecting everyone in it. */
    public function endRoom(Classroom $classroom, ?Request $request = null): void;

    /**
     * Open or close one participant's microphone for the current call only.
     *
     * This is runtime state at the provider, never something the app stores:
     * the next time that person joins, they start with the role default again.
     */
    public function setMicrophonePermission(
        Classroom $classroom,
        string $identity,
        bool $allowed,
        ?Request $request = null,
    ): void;

    /**
     * A plain-language health report, in layers: configuration, signal,
     * credentials, media.
     *
     * @return array{url: string, secure_url: string|null, checks: list<array{key: string, label: string, ok: bool, detail: string}>}
     */
    public function diagnose(?Request $request = null, ?string $pagePath = null): array;
}
