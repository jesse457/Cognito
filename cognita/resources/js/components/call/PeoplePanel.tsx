import {
    Check,
    Crown,
    HandPalm,
    LockSimple,
    Microphone,
    MicrophoneSlash,
    UserMinus,
    X,
} from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import { SURFACE_LABEL } from '@/lib/board';
import { cn, pluralize } from '@/lib/utils';
import type { CallParticipant } from '@/realtime';
import type { BoardSurface, RoomStudent } from '@/types';

interface PeoplePanelProps {
    open: boolean;
    participants: CallParticipant[];
    hands: Set<string>;
    students: RoomStudent[];
    canManage: boolean;
    canManageAudio: boolean;
    selectedDrawers: number;
    boardSurface: BoardSurface;
    drawBusy: number | null;
    kicking: string | null;
    permissionBusy: string | null;
    mediaPath: string | null;
    onClose: () => void;
    onToggleStudentDrawing: (student: RoomStudent) => void;
    onSetTalkPermission: (participant: CallParticipant, allowed: boolean) => void;
    onRemove: (participant: CallParticipant) => void;
}

/** Who is in the call, and — for the host — who is allowed to draw. */
export default function PeoplePanel({
    open,
    participants,
    hands,
    students,
    canManage,
    canManageAudio,
    selectedDrawers,
    boardSurface,
    drawBusy,
    kicking,
    permissionBusy,
    mediaPath,
    onClose,
    onToggleStudentDrawing,
    onSetTalkPermission,
    onRemove,
}: PeoplePanelProps) {
    if (!open) {
        return null;
    }

    const raised = participants.filter(
        (participant) => !participant.isLocal && participant.role !== 'host' && hands.has(participant.identity),
    );

    return (
        <aside className="call-panel panel-in" aria-label="Participants">
            <div className="flex items-center justify-between border-b border-stage-line px-3 py-2.5">
                <p className="text-[12px] font-semibold text-stage-ink">
                    Participants{' '}
                    <span className="font-normal text-stage-ink/45">
                        {pluralize(Math.max(participants.length, 1), 'person', 'people')}
                    </span>
                </p>
                <button type="button" onClick={onClose} className="call-control h-7 min-w-7 px-1" aria-label="Close participants">
                    <X size={14} aria-hidden="true" />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {canManageAudio && raised.length > 0 ? (
                    <div className="mb-2 rounded-lg border border-stage-warn/30 bg-stage-warn/10 p-2">
                        <p className="text-[10.5px] font-medium text-stage-warn">
                            Raised hands
                        </p>
                        <ul className="mt-1.5 space-y-1">
                            {raised.map((participant) => (
                                <li key={participant.identity} className="flex items-center gap-2">
                                    <HandPalm size={13} weight="fill" className="shrink-0 text-stage-warn" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-[12px] text-stage-ink/85">
                                        {participant.name}
                                    </span>
                                    {participant.canPublish ? (
                                        <span className="text-[10px] font-medium text-stage-live">Can talk</span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onSetTalkPermission(participant, true)}
                                            disabled={permissionBusy === participant.identity}
                                            className="rounded-md bg-stage-warn/15 px-2 py-0.5 text-[10.5px] font-medium text-stage-warn transition hover:bg-stage-warn/25 disabled:opacity-50"
                                        >
                                            {permissionBusy === participant.identity ? 'Opening…' : 'Allow to talk'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <ul className="space-y-0.5">
                    {participants.map((participant) => (
                        <li key={participant.identity} className="call-panel-item">
                            <Avatar name={participant.name} size="sm" tone="stage" />
                            <span className="min-w-0 flex-1 truncate text-[12px]">
                                {participant.name}
                                {participant.isLocal ? ' (you)' : ''}
                            </span>
                            {hands.has(participant.identity) ? (
                                <HandPalm size={13} weight="fill" className="shrink-0 text-stage-warn" aria-label="Hand raised" />
                            ) : null}
                            {participant.role === 'host' ? (
                                <Crown size={13} weight="fill" className="shrink-0 text-stage-ink/70" aria-label="Instructor" />
                            ) : !participant.canPublish ? (
                                <LockSimple
                                    size={13}
                                    className="shrink-0 text-stage-ink/35"
                                    aria-label="Microphone not allowed"
                                />
                            ) : canManageAudio && !participant.isLocal ? (
                                <button
                                    type="button"
                                    onClick={() => onSetTalkPermission(participant, false)}
                                    disabled={permissionBusy === participant.identity}
                                    className={cn(
                                        'rounded-full p-1 transition hover:bg-stage-ink/10 disabled:opacity-40',
                                        participant.micEnabled
                                            ? 'text-stage-live hover:text-stage-warn'
                                            : 'text-stage-ink/40 hover:text-stage-warn',
                                    )}
                                    title={`Take back ${participant.name}'s microphone permission`}
                                    aria-label={`Take back ${participant.name}'s microphone permission`}
                                >
                                    {participant.micEnabled ? (
                                        <Microphone size={13} aria-hidden="true" />
                                    ) : (
                                        <MicrophoneSlash size={13} aria-hidden="true" />
                                    )}
                                </button>
                            ) : !participant.micEnabled ? (
                                <MicrophoneSlash size={13} className="shrink-0 text-stage-ink/40" aria-label="Muted" />
                            ) : null}
                            {canManage && !participant.isLocal ? (
                                <button
                                    type="button"
                                    onClick={() => onRemove(participant)}
                                    disabled={kicking === participant.identity}
                                    className="rounded-full p-1 text-stage-ink/40 transition hover:bg-stage-ink/10 hover:text-stage-danger disabled:opacity-40"
                                    title={`Remove ${participant.name} from the call`}
                                    aria-label={`Remove ${participant.name} from the call`}
                                >
                                    <UserMinus size={13} aria-hidden="true" />
                                </button>
                            ) : null}
                        </li>
                    ))}
                </ul>

                {canManage ? (
                    <div className="border-t border-stage-line p-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11px] font-semibold tracking-[0.08em] text-stage-ink/55 uppercase">Drawing access</p>
                            <span className="text-[10px] text-stage-ink/40">
                                {selectedDrawers}/{students.length} selected
                            </span>
                        </div>

                        <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
                            {students.length === 0 ? (
                                <p className="px-1.5 py-2 text-[11px] text-stage-ink/40">No students have joined this class yet.</p>
                            ) : (
                                students.map((student) => (
                                    <label
                                        key={student.id}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12px] text-stage-ink/75 hover:bg-stage-ink/5',
                                            drawBusy === student.id && 'opacity-50',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={student.can_draw}
                                            disabled={drawBusy === student.id}
                                            onChange={() => onToggleStudentDrawing(student)}
                                            className="h-3.5 w-3.5 rounded border-stage-ink/25 bg-transparent text-stage-live focus:ring-stage-live/50"
                                        />
                                        <span className="min-w-0 flex-1 truncate">{student.name}</span>
                                        {student.can_draw ? (
                                            <Check size={12} className="text-stage-live" aria-hidden="true" />
                                        ) : null}
                                    </label>
                                ))
                            )}
                        </div>

                        <p className="mt-2 text-[10px] leading-relaxed text-stage-ink/35">
                            Tick a student to hand them the pen. It lasts for this lesson only and is
                            never written down.
                        </p>
                    </div>
                ) : null}

                <div className="border-t border-stage-line p-2 text-[11px] leading-relaxed text-stage-ink/45">
                    Board: <span className="text-stage-ink/70">{SURFACE_LABEL[boardSurface]}</span>
                    {selectedDrawers > 0 ? ` · ${selectedDrawers} may draw` : ' · view only for students'}
                    <span className="mt-1 block text-[10px] text-stage-ink/35">
                        Microphone access lasts for this call only and is never saved.
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-stage-ink/30" title="The media path this browser actually chose">
                        {mediaPath ?? 'Media: negotiating…'}
                    </span>
                </div>
            </div>
        </aside>
    );
}
