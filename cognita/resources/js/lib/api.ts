/**
 * The app's own call endpoints.
 *
 * These are ours, not the provider's: whatever serves the call, joining means
 * asking this app for a grant, the room, and the board as it stands. Swapping
 * the provider changes what is inside the grant, not the shape of this call.
 */
import { leaveBeacon, requestData, sendQuietly } from '@/lib/http';
import type { CallRole } from '@/realtime/protocol';
import type { AttendanceSession } from '@/realtime/types';
import type { BoardState } from '@/types';

export interface CallGrant {
    url: string;
    token: string;
    room: string;
    identity: string;
    role: CallRole;
    expires_at: string;
    session: string | null;
    board: BoardState | null;
    attendance: AttendanceSession | null;
}

export interface RoomState {
    session: string | null;
    live: boolean;
    board: BoardState | null;
    attendance: AttendanceSession | null;
}

export interface DoctorCheck {
    key: string;
    label: string;
    ok: boolean;
    detail: string;
}

export interface DoctorReport {
    url: string;
    secure_url: string | null;
    checks: DoctorCheck[];
}

export function requestGrant(tokenUrl: string, session: string): Promise<CallGrant> {
    return requestData<CallGrant>(tokenUrl, { method: 'POST', json: { session } });
}

/** Join, or keep the room warm. Called on connect and on a timer. */
export function touchRoom(url: string): Promise<RoomState> {
    return requestData<RoomState>(url, { method: 'POST', json: {} });
}

/** Leaving ends only this browser's call, never the class session. */
export function leaveRoom(url: string): void {
    leaveBeacon(url);
}

export function restartRoom(url: string): Promise<RoomState> {
    return requestData<RoomState>(url, { method: 'POST', json: {} });
}

/** The instructor's deliberate end: closes the session and disconnects everyone. */
export function endClass(url: string): Promise<{ live: false; ended_at: string }> {
    return requestData<{ live: false; ended_at: string }>(url, { method: 'POST', json: {} });
}

export async function requestDoctor(url: string): Promise<DoctorReport | null> {
    try {
        return await requestData<DoctorReport>(url);
    } catch {
        return null;
    }
}

export function pingAttendance(session: AttendanceSession): void {
    void sendQuietly(session.ping_url, { method: 'POST', json: {} });
}

export function leaveAttendance(session: AttendanceSession): void {
    leaveBeacon(session.leave_url);
}
