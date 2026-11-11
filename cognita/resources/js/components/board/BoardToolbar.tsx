import {
    ArrowClockwise,
    ArrowCounterClockwise,
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    ArrowsClockwise,
    ArrowsIn,
    ArrowsOut,
    Circle,
    Crosshair,
    Eraser,
    FilePdf,
    Flashlight,
    HandPalm,
    LineSegment,
    MarkerCircle,
    Minus,
    PencilSimpleLine,
    Plus,
    Sparkle,
    Square,
    SquaresFour,
    TextAa,
} from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import PdfLibrary from '@/components/board/PdfLibrary';
import { ERASER_WIDTHS, INK_COLORS, INK_WIDTHS, SURFACE_LABEL, TOOLS, ZOOM } from '@/lib/board';
import { cn } from '@/lib/utils';
import type { BoardDocumentSummary, BoardSurface, BoardTool } from '@/types';

export type { BoardTool } from '@/types';

interface BoardToolbarProps {
    surface: BoardSurface;
    page: number;
    pages: number;
    canManage: boolean;
    canDraw: boolean;
    canUndo: boolean;
    canRedo: boolean;
    hasDocument: boolean;
    documents: BoardDocumentSummary[];
    uploading: boolean;
    tool: BoardTool;
    color: string;
    width: number;
    eraserWidth: number;
    zoom: number;
    studentsCanAnnotate: boolean;
    fullscreen: boolean;
    onSurface: (surface: BoardSurface) => void;
    onPage: (page: number) => void;
    onUpload: (file: File) => void;
    onSelectDocument: (document: BoardDocumentSummary) => void;
    onClear: () => void;
    onTool: (tool: BoardTool) => void;
    onColor: (color: string) => void;
    onWidth: (width: number) => void;
    onEraserWidth: (width: number) => void;
    onZoom: (zoom: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    onToggleStudents: () => void;
    onToggleFullscreen: () => void;
    /** Host only: clear the board into a new room. */
    onNewRoom?: () => void;
}

const SURFACES: BoardSurface[] = ['canvas', 'pdf'];

const SURFACE_ICON = { canvas: SquaresFour, pdf: FilePdf } as const;

const TOOL_ICON = {
    pen: PencilSimpleLine,
    marker: MarkerCircle,
    laser: Crosshair,
    spotlight: Flashlight,
    eraser: Eraser,
    line: LineSegment,
    arrow: ArrowUpRight,
    rect: Square,
    ellipse: Circle,
    text: TextAa,
} as const;

/** Board controls, in two rows: what is on the sheet, then what draws on it. */
export default function BoardToolbar(props: BoardToolbarProps) {
    const {
        surface,
        page,
        pages,
        canManage,
        canDraw,
        canUndo,
        canRedo,
        hasDocument,
        documents,
        uploading,
        tool,
        color,
        width,
        eraserWidth,
        zoom,
        studentsCanAnnotate,
        fullscreen,
    } = props;

    const fileInput = useRef<HTMLInputElement | null>(null);
    const [libraryOpen, setLibraryOpen] = useState(false);

    /** "PDF" means the deck that is already up; otherwise pick or upload one. */
    function choosePdf(): void {
        if (hasDocument) {
            props.onSurface('pdf');

            return;
        }

        if (documents.length > 0) {
            setLibraryOpen(true);

            return;
        }

        fileInput.current?.click();
    }

    return (
        <div className="board-toolbar">
            <div className="flex flex-wrap items-center gap-1.5">
                {canManage ? (
                    <>
                        <div
                            className="flex items-center gap-0.5 rounded-full bg-stage-ink/5 p-0.5"
                            role="group"
                            aria-label="Board surface"
                        >
                            {SURFACES.map((value) => {
                                const Icon = SURFACE_ICON[value];

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => (value === 'pdf' ? choosePdf() : props.onSurface(value))}
                                        className={cn('surface-tab', surface === value && 'surface-tab-active')}
                                        aria-pressed={surface === value}
                                    >
                                        <Icon size={15} aria-hidden="true" />
                                        <span className="hidden sm:inline">{SURFACE_LABEL[value]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <PdfLibrary
                            open={libraryOpen}
                            onOpenChange={setLibraryOpen}
                            documents={documents}
                            uploading={uploading}
                            surface={surface}
                            onSelect={props.onSelectDocument}
                            onUpload={() => fileInput.current?.click()}
                        />

                        <input
                            ref={fileInput}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    props.onUpload(file);
                                }

                                event.target.value = '';
                            }}
                        />
                    </>
                ) : null}

                <div className="ml-auto flex items-center gap-1">
                    {canManage ? (
                        <>
                            <div className="flex items-center rounded-full bg-stage-ink/5">
                                <ControlButton
                                    label="Zoom out"
                                    disabled={zoom <= ZOOM.min}
                                    onClick={() => props.onZoom(zoom - ZOOM.step)}
                                >
                                    <Minus size={14} aria-hidden="true" />
                                </ControlButton>
                                <span className="min-w-[44px] text-center text-[11px] font-medium text-stage-ink/75 tabular">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <ControlButton
                                    label="Zoom in"
                                    disabled={zoom >= ZOOM.max}
                                    onClick={() => props.onZoom(zoom + ZOOM.step)}
                                >
                                    <Plus size={14} aria-hidden="true" />
                                </ControlButton>
                            </div>

                            <ControlButton
                                label="Previous page"
                                disabled={page <= 1}
                                onClick={() => props.onPage(page - 1)}
                            >
                                <ArrowLeft size={15} aria-hidden="true" />
                            </ControlButton>
                            <span className="min-w-[52px] text-center text-[12px] font-medium text-stage-ink/75 tabular">
                                {page} / {Math.max(1, pages)}
                            </span>
                            <ControlButton
                                label="Next page"
                                disabled={page >= pages}
                                onClick={() => props.onPage(page + 1)}
                            >
                                <ArrowRight size={15} aria-hidden="true" />
                            </ControlButton>
                            <ControlButton label="Clear this page" onClick={props.onClear}>
                                <ArrowsClockwise size={15} aria-hidden="true" />
                            </ControlButton>

                            {props.onNewRoom ? (
                                <ControlButton
                                    label="Start a fresh room (clears every drawing)"
                                    onClick={props.onNewRoom}
                                >
                                    <Sparkle size={15} weight="fill" aria-hidden="true" />
                                </ControlButton>
                            ) : null}
                        </>
                    ) : (
                        <span className="px-1 text-[11px] text-stage-ink/50 tabular">
                            {page} / {Math.max(1, pages)}
                        </span>
                    )}

                    <ControlButton
                        label={fullscreen ? 'Leave fullscreen (Esc)' : 'Fullscreen'}
                        onClick={props.onToggleFullscreen}
                        className="bg-stage-ink/5 hover:bg-stage-ink/10"
                    >
                        {fullscreen ? (
                            <ArrowsIn size={15} aria-hidden="true" />
                        ) : (
                            <ArrowsOut size={15} aria-hidden="true" />
                        )}
                    </ControlButton>
                </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-stage-ink/10 pt-1.5">
                <div className="flex flex-wrap items-center gap-0.5" role="group" aria-label="Drawing tool">
                    {TOOLS.map((item) => {
                        const Icon = TOOL_ICON[item.value];

                        return (
                            <button
                                key={item.value}
                                type="button"
                                disabled={!canDraw}
                                onClick={() => props.onTool(item.value)}
                                className={cn('tool-button', tool === item.value && 'tool-button-active')}
                                aria-pressed={tool === item.value}
                                title={
                                    item.value === 'eraser'
                                        ? `${item.label} (E)`
                                        : item.value === 'laser'
                                          ? `${item.label} pointer (L)`
                                          : item.value === 'spotlight'
                                            ? `${item.label} (S)`
                                            : item.label
                                }
                            >
                                <Icon size={15} aria-hidden="true" />
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {tool === 'eraser' ? (
                    <div
                        className="flex items-center gap-1 border-l border-stage-ink/10 pl-2"
                        role="group"
                        aria-label="Eraser size"
                    >
                        <span className="hidden px-1 text-[10px] font-semibold tracking-[0.12em] text-stage-ink/40 uppercase sm:inline">
                            Eraser
                        </span>
                        {ERASER_WIDTHS.map((value, index) => (
                            <button
                                key={value}
                                type="button"
                                disabled={!canDraw}
                                onClick={() => props.onEraserWidth(value)}
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full transition disabled:pointer-events-none disabled:opacity-40',
                                    eraserWidth === value ? 'bg-stage-ink/20' : 'hover:bg-stage-ink/10',
                                )}
                                aria-label={`Eraser size ${index + 1}`}
                                aria-pressed={eraserWidth === value}
                                title={['Small eraser', 'Large eraser', 'Extra-large eraser'][index]}
                            >
                                <span
                                    className="rounded-full border-2 border-stage-ink/60 bg-stage-ink/10"
                                    style={{ width: 9 + index * 6, height: 9 + index * 6 }}
                                />
                            </button>
                        ))}
                    </div>
                ) : tool === 'spotlight' ? null : (
                    <>
                        {tool !== 'laser' ? (
                            <div
                                className="flex items-center gap-1 border-l border-stage-ink/10 pl-2"
                                role="group"
                                aria-label="Ink colour"
                            >
                                {INK_COLORS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        disabled={!canDraw}
                                        onClick={() => {
                                            props.onColor(value);
                                        }}
                                        className={cn(
                                            'h-6 w-6 rounded-full border-2 transition disabled:pointer-events-none disabled:opacity-40',
                                            color === value ? 'scale-105 border-stage-ink' : 'border-stage-ink/25 hover:border-stage-ink/60',
                                        )}
                                        style={{ backgroundColor: value }}
                                        aria-label={`Ink colour ${value}`}
                                        aria-pressed={color === value}
                                    />
                                ))}
                            </div>
                        ) : null}

                        <div
                            className="flex items-center gap-1 border-l border-stage-ink/10 pl-2"
                            role="group"
                            aria-label="Stroke size"
                        >
                            {INK_WIDTHS.map((value, index) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={!canDraw}
                                    onClick={() => props.onWidth(value)}
                                    className={cn(
                                        'flex h-6 w-6 items-center justify-center rounded-full transition disabled:pointer-events-none disabled:opacity-40',
                                        width === value ? 'bg-stage-ink/20' : 'hover:bg-stage-ink/10',
                                    )}
                                    aria-label={`Stroke size ${index + 1}`}
                                    aria-pressed={width === value}
                                >
                                    <span
                                        className="rounded-full bg-stage-ink/80"
                                        style={{ width: 4 + index * 4, height: 4 + index * 3 }}
                                    />
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <button
                    type="button"
                    disabled={!canDraw || !canUndo}
                    onClick={props.onUndo}
                    className="tool-button ml-1 disabled:pointer-events-none disabled:opacity-40"
                    title="Undo your last stroke"
                >
                    <ArrowCounterClockwise size={15} aria-hidden="true" />
                    <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                    type="button"
                    disabled={!canDraw || !canRedo}
                    onClick={props.onRedo}
                    className="tool-button disabled:pointer-events-none disabled:opacity-40"
                    title="Redo the stroke you just undid"
                >
                    <ArrowClockwise size={15} aria-hidden="true" />
                    <span className="hidden sm:inline">Redo</span>
                </button>

                {canManage ? (
                    <button
                        type="button"
                        onClick={props.onToggleStudents}
                        className={cn(
                            'ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition',
                            studentsCanAnnotate
                                ? 'bg-live text-live-ink hover:bg-live/85'
                                : 'text-stage-ink/70 hover:bg-stage-ink/10 hover:text-stage-ink',
                        )}
                        aria-pressed={studentsCanAnnotate}
                        title="Let the selected students draw on the board"
                    >
                        <HandPalm size={15} weight={studentsCanAnnotate ? 'fill' : 'regular'} aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {studentsCanAnnotate ? 'Students can draw' : 'Hand over the pen'}
                        </span>
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function ControlButton({
    label,
    disabled = false,
    onClick,
    className,
    children,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className={cn('call-control h-9 min-w-9 px-2', className)}
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
        >
            {children}
        </button>
    );
}
