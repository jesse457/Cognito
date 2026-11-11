/**
 * The sentences the call page shows when something fails.
 *
 * They live away from the transports because they are about *this product*, not
 * about a vendor: the same wording is used no matter who serves the call.
 */
import type { JoinPhase } from './types';

export const JOIN_PHASE_LABEL: Record<JoinPhase, string> = {
    permission: 'Waiting for microphone permission…',
    signal: 'Contacting the call server…',
    media: 'Negotiating the audio connection…',
};

export function microphoneError(caught: unknown): string {
    if (caught instanceof DOMException) {
        if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(caught.name)) {
            return 'Microphone access is blocked for this site. Allow it in the browser settings, or open this page over HTTPS.';
        }

        if (caught.name === 'NotFoundError') {
            return 'No microphone was found on this device.';
        }

        if (['NotReadableError', 'TrackStartError'].includes(caught.name)) {
            return 'The microphone is busy in another app.';
        }
    }

    return 'The microphone could not be started.';
}

export function screenShareError(caught: unknown): string {
    if (caught instanceof DOMException) {
        if (caught.name === 'NotAllowedError' || caught.name === 'PermissionDeniedError') {
            return 'Screen sharing was cancelled or blocked by the browser.';
        }

        if (caught.name === 'NotFoundError') {
            return 'No screen or window was available to share.';
        }

        if (caught.name === 'NotReadableError' || caught.name === 'TrackStartError') {
            return 'The screen is busy in another app.';
        }
    }

    return 'Screen sharing could not be started.';
}

export function joinError(caught: unknown, signalUrl: string): string {
    const raw = caught instanceof Error ? caught.message : String(caught);

    if (/could not connect pc|failed to establish|pc connection|ice|timeout|answer within/i.test(raw)) {
        return (
            `The call server at ${signalUrl} answered, but no audio path could be established. ` +
            'UDP 7882 / 3478 is blocked between this device and that address.'
        );
    }

    return raw === '' ? 'Could not join the call.' : raw;
}

/** LiveKit's disconnect reasons, said in plain language. */
export function disconnectReasonMessage(reason: string | undefined): string | null {
    switch (reason) {
        case 'DUPLICATE_IDENTITY':
            return 'This class was just opened somewhere else on this account. Rejoin here to take the seat back.';
        case 'PARTICIPANT_REMOVED':
            return 'You were removed from the call.';
        case 'ROOM_DELETED':
        case 'ROOM_CLOSED':
            return 'The instructor ended the class. Rejoin when they start a new session.';
        case 'SERVER_SHUTDOWN':
            return 'The call server restarted. Rejoin to continue.';
        case 'SIGNAL_CLOSE':
            return 'The connection to the call server was lost. Rejoin to continue.';
        case 'CONNECTION_TIMEOUT':
        case 'MEDIA_FAILURE':
            return 'The audio connection could not be established: the call server never received media from this device. UDP 7882 or 3478 is blocked between this device and the server.';
        case 'JOIN_FAILURE':
        case 'STATE_MISMATCH':
            return 'The call server rejected this session. Reload the page and rejoin.';
        default:
            return null;
    }
}
