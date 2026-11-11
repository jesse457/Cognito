/**
 * A small window onto the real WebRTC connection behind a LiveKit room.
 *
 * LiveKit keeps its peer connections private, so the call page records every one
 * that is created while it is mounted. That is enough to answer the question the
 * UI could otherwise only guess at: which network path was chosen, is it UDP or
 * a TCP fallback, and are audio packets actually arriving? When a call connects
 * but nobody can be heard, the answer is usually in here.
 */

interface Recorder {
    connections: RTCPeerConnection[];
}

const RECORDER = '__cognitaConnections';

function recorder(): Recorder | null {
    const scope = window as unknown as Record<string, Recorder | undefined>;

    return scope[RECORDER] ?? null;
}

/**
 * Start recording peer connections. Returns a function that puts the original
 * constructor back; call it when the page unmounts.
 */
export function watchPeerConnections(): () => void {
    if (typeof window === 'undefined' || typeof window.RTCPeerConnection !== 'function') {
        return () => {};
    }

    if (recorder() !== null) {
        return () => {};
    }

    const scope = window as unknown as Record<string, unknown>;
    const Original = window.RTCPeerConnection;

    scope[RECORDER] = { connections: [] };

    const Wrapped = function (this: unknown, ...args: unknown[]) {
        const connection = new (Original as unknown as new (...rest: unknown[]) => RTCPeerConnection)(...args);
        recorder()?.connections.push(connection);

        return connection;
    } as unknown as typeof RTCPeerConnection;

    Wrapped.prototype = Original.prototype;
    Object.setPrototypeOf(Wrapped, Original);
    window.RTCPeerConnection = Wrapped;

    return () => {
        window.RTCPeerConnection = Original;
        delete scope[RECORDER];
    };
}

export interface MediaPath {
    /** udp | tcp, or null while ICE has not settled. */
    protocol: string | null;
    /** "direct" when the server was reachable, "relay" when TURN was needed. */
    route: 'direct' | 'relay' | 'unknown';
    remote: string | null;
    local: string | null;
    packetsIn: number;
    packetsOut: number;
    connected: boolean;
}

/**
 * The selected candidate pair of the most advanced connection, plus the audio
 * packet counters. Null when no connection has been made yet.
 */
export async function describeMediaPath(): Promise<MediaPath | null> {
    const connections = recorder()?.connections ?? [];

    if (connections.length === 0) {
        return null;
    }

    const paths: MediaPath[] = [];

    for (const connection of connections) {
        if (connection.connectionState === 'closed') {
            continue;
        }

        const path: MediaPath = {
            protocol: null,
            route: 'unknown',
            remote: null,
            local: null,
            packetsIn: 0,
            packetsOut: 0,
            connected: connection.connectionState === 'connected',
        };

        let pairId: string | null = null;

        try {
            const report = await connection.getStats();

            report.forEach((row: Record<string, unknown>) => {
                const type = row.type;

                if (type === 'candidate-pair' && (row.selected === true || row.nominated === true) && row.state === 'succeeded') {
                    pairId = String(row.id);
                }

                if (type === 'inbound-rtp' && row.kind === 'audio') {
                    path.packetsIn += Number(row.packetsReceived ?? 0);
                }

                if (type === 'outbound-rtp' && row.kind === 'audio') {
                    path.packetsOut += Number(row.packetsSent ?? 0);
                }
            });

            if (pairId !== null) {
                const pair = report.get(pairId) as Record<string, unknown> | undefined;

                for (const id of [pair?.localCandidateId, pair?.remoteCandidateId]) {
                    const candidate = typeof id === 'string' ? (report.get(id) as Record<string, unknown> | undefined) : undefined;

                    if (candidate === undefined) {
                        continue;
                    }

                    const where = String(candidate.address ?? '') + ':' + String(candidate.port ?? '');
                    const type = String(candidate.candidateType ?? '');

                    if (candidate.id === pair?.localCandidateId) {
                        path.local = where;
                    } else {
                        path.remote = where;
                        path.protocol = String(candidate.protocol ?? '') || null;
                        path.route = type === 'relay' ? 'relay' : 'direct';
                    }
                }
            }
        } catch {
            continue;
        }

        paths.push(path);
    }

    if (paths.length === 0) {
        return null;
    }

    // The subscriber connection (the one with media arriving) is the interesting
    // one once more than one person is in the room.
    return paths.sort((a, b) => b.packetsIn - a.packetsIn)[0];
}

/** "udp direct 192.168.1.20:7882 · 812 packets in" */
export function describeMediaPathText(path: MediaPath | null): string | null {
    if (path === null || path.remote === null) {
        return null;
    }

    const protocol = (path.protocol ?? 'udp').toUpperCase();
    const route = path.route === 'relay' ? 'via TURN relay' : 'direct';

    return protocol + ' ' + route + ' ' + path.remote;
}
