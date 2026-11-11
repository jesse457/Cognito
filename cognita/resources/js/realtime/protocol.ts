/**
 * The wire format shared by every transport.
 *
 * Board edits, presence frames and comments are plain JSON on three topics.
 * Keeping the codec here — and free of any vendor SDK — is what lets the same
 * messages travel over LiveKit's data channel, a BroadcastChannel in the local
 * adapter, or whatever replaces them later.
 */
import type { BoardState, BoardStroke, BoardSurface } from '@/types';

export const BOARD_TOPIC = 'cognita.board';
export const PRESENCE_TOPIC = 'cognita.presence';
export const CALL_TOPIC = 'cognita.call';

/** A presence frame older than this is ignored, so stale cursors disappear. */
export const PRESENCE_STALE_MS = 15_000;

export type CallRole = 'host' | 'participant';

export type BoardMessage =
    | { type: 'state'; board: BoardState }
    | { type: 'stroke'; stroke: BoardStroke }
    | { type: 'page'; page: number }
    | { type: 'clear'; surface: BoardSurface; page: number }
    | { type: 'undo'; id: number }
    | { type: 'zoom'; zoom: number }
    /**
     * "Show me the board."
     *
     * Ink is never stored, so somebody who joins mid-lesson has nothing to read
     * it from. They ask, and the host answers with a `state` frame.
     */
    | { type: 'ask' };

export interface PresenceFrame {
    type: 'presence';
    identity: string;
    name: string;
    role: CallRole;
    surface: BoardSurface;
    page: number;
    tool: string;
    cursor: [number, number] | null;
    boardOpen: boolean;
    hidden: boolean;
    handRaised: boolean;
    ts: number;
}

export interface CallMessage {
    type: 'comment';
    id: string;
    body: string;
    at: number;
}

/** Who sent a frame, as far as the transport can tell. */
export interface FrameSender {
    identity: string | null;
    name: string | null;
    role: CallRole | null;
}

export const UNKNOWN_SENDER: FrameSender = { identity: null, name: null, role: null };

const BOARD_TYPES = ['state', 'stroke', 'page', 'clear', 'undo', 'zoom', 'ask'];

const SESSION_IDENTITY = /^user-\d+-[a-z0-9]{6,16}$/;

export function encodeFrame(payload: unknown): Uint8Array<ArrayBuffer> {
    return new TextEncoder().encode(JSON.stringify(payload)) as Uint8Array<ArrayBuffer>;
}

export function decodeBoardMessage(raw: ArrayBuffer | Uint8Array): BoardMessage | null {
    const parsed = decodeJson<BoardMessage>(raw);

    if (parsed === null || !BOARD_TYPES.includes(parsed.type)) {
        return null;
    }

    return parsed;
}

export function decodePresence(raw: ArrayBuffer | Uint8Array): PresenceFrame | null {
    const parsed = decodeJson<PresenceFrame>(raw);

    if (parsed === null || parsed.type !== 'presence' || !SESSION_IDENTITY.test(parsed.identity ?? '')) {
        return null;
    }

    return {
        ...parsed,
        surface: parsed.surface === 'pdf' ? 'pdf' : 'canvas',
        cursor: Array.isArray(parsed.cursor) && parsed.cursor.length === 2 ? parsed.cursor : null,
        handRaised: parsed.handRaised === true,
    };
}

export function decodeCallMessage(raw: ArrayBuffer | Uint8Array): CallMessage | null {
    const parsed = decodeJson<CallMessage>(raw);

    if (parsed === null || parsed.type !== 'comment') {
        return null;
    }

    if (typeof parsed.id !== 'string' || parsed.id === '') {
        return null;
    }

    const body = (parsed.body ?? '').trim().slice(0, 500);

    if (body === '') {
        return null;
    }

    return {
        type: 'comment',
        id: parsed.id.slice(0, 64),
        body,
        at: Number.isFinite(parsed.at) ? parsed.at : Date.now(),
    };
}

/** `user-12-ab12cd34` belongs to user 12; a bare `user-12` still works. */
export function userIdFromIdentity(identity: string | null): number | null {
    const match = /^user-(\d+)(?:-[a-z0-9]{6,16})?$/.exec(identity ?? '');

    return match === null ? null : Number(match[1]);
}

export function roleFromMetadata(metadata: string | undefined | null): CallRole | null {
    if (!metadata) {
        return null;
    }

    try {
        const parsed = JSON.parse(metadata) as { role?: string };

        return parsed.role === 'host' || parsed.role === 'participant' ? parsed.role : null;
    } catch {
        return null;
    }
}

function decodeJson<T>(raw: ArrayBuffer | Uint8Array): T | null {
    try {
        const text = new TextDecoder().decode(raw as Uint8Array);

        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}
