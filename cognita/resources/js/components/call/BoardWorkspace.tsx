import { Eye } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import BoardStage from '@/components/board/BoardStage';
import BoardToolbar from '@/components/board/BoardToolbar';
import CallStage from '@/components/call/CallStage';
import { useFullscreen } from '@/hooks/useFullscreen';
import type { BoardApi } from '@/hooks/useBoard';
import { cn } from '@/lib/utils';
import type { CallParticipant, PresenceFrame } from '@/realtime';

interface BoardWorkspaceProps {
    board: BoardApi;
    presence: PresenceFrame[];
    now: number;
    canManage: boolean;
    /** A room is open, so drawing has somewhere to go. */
    live: boolean;
    participants: CallParticipant[];
    hands: Set<string>;
    onCursor: (point: [number, number] | null) => void;
    onNewRoom: () => void;
    /** Escape and `F` reach the page; fullscreen wants the first one. */
    onFullscreenChange?: (active: boolean) => void;
    /** The call bar is rendered inside the fullscreen board, not behind it. */
    fullscreenControls?: ReactNode;
    fullscreenPanel?: ReactNode;
    showFullscreenControls?: boolean;
    onShowFullscreenControls?: () => void;
}

/**
 * The board and its controls, with the people in the call kept alongside.
 *
 * The sheet is sized by the stage box, so this component is also what decides how
 * much room the board gets: everything it can have on a desktop, and the whole
 * display in fullscreen. Fullscreen is native where the browser allows it and a
 * fixed overlay where it does not (iOS), which is why the class names here are
 * the same in both cases.
 */
export default function BoardWorkspace({
    board,
    presence,
    now,
    canManage,
    live,
    participants,
    hands,
    onCursor,
    onNewRoom,
    onFullscreenChange,
    fullscreenControls,
    fullscreenPanel,
    showFullscreenControls = true,
    onShowFullscreenControls,
}: BoardWorkspaceProps) {
    const state = board.board;

    const shell = useRef<HTMLDivElement | null>(null);
    const fullscreen = useFullscreen(shell);
    const active = fullscreen.active;
    // Drawing needs both permission and a room: ink with nowhere to go is a
    // drawing nobody else can see, and it would look like a saved sketch.
    const canDraw = board.canDraw && live;

    useEffect(() => {
        onFullscreenChange?.(active);

        return () => {
            if (active) {
                onFullscreenChange?.(false);
            }
        };
    }, [active, onFullscreenChange]);

    // `F` is fullscreen and `E` flips the eraser; both stay inside the board.
    useEffect(() => {
        function onKey(event: KeyboardEvent): void {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;

            if (target !== null && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === 'f') {
                event.preventDefault();
                fullscreen.toggle();

                return;
            }

            if (key === 'e' && canDraw) {
                event.preventDefault();
                board.setTool(board.tool === 'eraser' ? 'pen' : 'eraser');
            }

            if (key === 'l' && canDraw) {
                event.preventDefault();
                board.setTool(board.tool === 'laser' ? 'pen' : 'laser');
            }

            if (key === 's' && canDraw) {
                event.preventDefault();
                board.setTool(board.tool === 'spotlight' ? 'pen' : 'spotlight');
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [board.setTool, board.tool, canDraw, fullscreen.toggle]);

    return (
        <div
            ref={shell}
            className={cn(active ? 'board-shell-immersive' : 'flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 lg:flex-row lg:px-3')}
        >
            <div
                className={cn(
                    'flex min-h-0 flex-1 gap-2',
                    active && fullscreenPanel !== undefined ? 'flex-col sm:flex-row' : 'flex-col',
                )}
            >
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                    {active && !showFullscreenControls ? null : (
                    <BoardToolbar
                        surface={state.surface}
                        page={state.page}
                        pages={state.pages}
                        canManage={canManage}
                        canDraw={canDraw}
                        canUndo={board.canUndo}
                        canRedo={board.canRedo}
                        hasDocument={state.document !== null}
                        documents={state.documents}
                        uploading={board.uploading}
                        tool={board.tool}
                        color={board.color}
                        width={board.width}
                        eraserWidth={board.eraserWidth}
                        zoom={board.zoom}
                        studentsCanAnnotate={state.studentsCanAnnotate}
                        fullscreen={active}
                        onSurface={board.changeSurface}
                        onPage={board.flipPage}
                        onUpload={(file) => void board.uploadPdf(file)}
                        onSelectDocument={(document) => void board.presentPdf(document)}
                        onClear={board.clearPage}
                        onTool={board.setTool}
                        onColor={board.setColor}
                        onWidth={board.setWidth}
                        onEraserWidth={board.setEraserWidth}
                        onZoom={board.setZoom}
                        onUndo={board.undo}
                        onRedo={board.redo}
                        onToggleStudents={board.toggleStudents}
                        onToggleFullscreen={fullscreen.toggle}
                        onNewRoom={canManage ? onNewRoom : undefined}
                    />
                )}

                <div
                    className={cn(
                        'relative',
                        active ? 'min-h-0 flex-1' : 'min-h-[52vh] flex-1 sm:min-h-[440px] lg:min-h-0',
                    )}
                >
                    <BoardStage
                        surface={state.surface}
                        documentUrl={state.document?.url ?? null}
                        page={state.page}
                        strokes={state.strokes}
                        canDraw={canDraw}
                        tool={board.tool}
                        color={board.color}
                        width={board.width}
                        eraserWidth={board.eraserWidth}
                        zoom={board.zoom}
                        presence={presence}
                        now={now}
                        immersive={active}
                        newStrokeId={board.newStrokeId}
                        onStroke={board.addStroke}
                        onPageCount={board.setPageCount}
                        onCursor={onCursor}
                    />
                    </div>
                </div>

                {active && fullscreenPanel !== undefined ? (
                    <div className="flex max-h-[52%] min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain sm:max-h-none sm:w-[340px] [&>aside]:min-h-0 [&>aside]:flex-1">
                        {fullscreenPanel}
                    </div>
                ) : null}
            </div>

            {active && fullscreenControls !== undefined ? (
                showFullscreenControls ? (
                    <div className="relative z-30 flex shrink-0 justify-center">{fullscreenControls}</div>
                ) : (
                    <button
                        type="button"
                        onClick={onShowFullscreenControls}
                        className="absolute right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full border border-stage-ink/15 bg-stage-raised/95 px-3.5 py-2 text-[12px] font-medium text-stage-ink/80 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition hover:bg-stage-raised hover:text-stage-ink"
                        title="Show the call controls"
                    >
                        <Eye size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">Show controls</span>
                    </button>
                )
            ) : null}

            {/* Fullscreen belongs to the sheet: the strip would eat the space. */}
            {active ? null : <CallStage participants={participants} hands={hands} layout="strip" />}
        </div>
    );
}
