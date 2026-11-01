import {
    ArrowLeft,
    ArrowRight,
    ArrowsClockwise,
    FilePdf,
    HandPalm,
    MarkerCircle,
    Notebook,
    PencilSimpleLine,
    SquaresFour,
    Trash,
    UploadSimple,
} from '@phosphor-icons/react';
import { useRef } from 'react';
import type { BoardStroke, BoardSurface } from '@/types';
import { cn } from '@/lib/utils';

export type BoardTool = BoardStroke['tool'];

interface BoardToolbarProps {
    surface: BoardSurface;
    page: number;
    pages: number;
    canManage: boolean;
    canDraw: boolean;
    hasDocument: boolean;
    uploading: boolean;
    tool: BoardTool;
    color: string;
    width: number;
    studentsCanAnnotate: boolean;
    onSurface: (surface: BoardSurface) => void;
    onPage: (page: number) => void;
    onUpload: (file: File) => void;
    onClear: () => void;
    onTool: (tool: BoardTool) => void;
    onColor: (color: string) => void;
    onWidth: (width: number) => void;
    onToggleStudents: () => void;
}

const surfaces: Array<{ value: BoardSurface; label: string; icon: typeof Notebook }> = [
    { value: 'canvas', label: 'Canvas', icon: SquaresFour },
    { value: 'notebook', label: 'Notebook', icon: Notebook },
    { value: 'pdf', label: 'PDF', icon: FilePdf },
];

const tools: Array<{ value: BoardTool; label: string; icon: typeof Notebook }> = [
    { value: 'pen', label: 'Pen', icon: PencilSimpleLine },
    { value: 'marker', label: 'Highlighter', icon: MarkerCircle },
    { value: 'eraser', label: 'Eraser', icon: Trash },
];

const colors = ['#191c20', '#0b57d0', '#1a7f3c', '#b3261e', '#9a6a00'];
const widths = [0.0025, 0.005, 0.009];

export default function BoardToolbar({
    surface,
    page,
    pages,
    canManage,
    canDraw,
    hasDocument,
    uploading,
    tool,
    color,
    width,
    studentsCanAnnotate,
    onSurface,
    onPage,
    onUpload,
    onClear,
    onTool,
    onColor,
    onWidth,
    onToggleStudents,
}: BoardToolbarProps) {
    const fileRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="rounded-2xl border border-stage-line bg-stage-raised/90 p-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {canManage ? (
                    <div className="flex items-center gap-0.5 rounded-full bg-black/25 p-0.5" role="group" aria-label="Board surface">
                        {surfaces.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                    if (item.value === 'pdf' && !hasDocument) {
                                        fileRef.current?.click();

                                        return;
                                    }

                                    onSurface(item.value);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                                    surface === item.value
                                        ? 'bg-white text-stage'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                                )}
                                aria-pressed={surface === item.value}
                            >
                                <item.icon size={15} aria-hidden="true" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                {canManage ? (
                    <>
                        <button
                            type="button"
                            className="call-control h-9 min-w-9 px-2.5 text-[12px]"
                            onClick={() => fileRef.current?.click()}
                            title="Upload a PDF to present"
                        >
                            <UploadSimple size={15} aria-hidden="true" />
                            {uploading ? 'Uploading' : hasDocument ? 'Replace PDF' : 'Upload PDF'}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    onUpload(file);
                                }

                                event.target.value = '';
                            }}
                        />

                        <div className="ml-auto flex items-center gap-1">
                            <button
                                type="button"
                                className="call-control h-9 min-w-9 px-2"
                                onClick={() => onPage(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                aria-label="Previous page"
                            >
                                <ArrowLeft size={15} aria-hidden="true" />
                            </button>
                            <span className="min-w-[64px] text-center text-[12px] font-medium text-white/75 tabular">
                                {page} / {Math.max(1, pages)}
                            </span>
                            <button
                                type="button"
                                className="call-control h-9 min-w-9 px-2"
                                onClick={() => onPage(Math.min(pages, page + 1))}
                                disabled={page >= pages}
                                aria-label="Next page"
                            >
                                <ArrowRight size={15} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="call-control h-9 min-w-9 px-2"
                                onClick={onClear}
                                title="Clear this page"
                                aria-label="Clear this page"
                            >
                                <ArrowsClockwise size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="px-2 text-[12px] text-white/60">
                        Page {page} of {Math.max(1, pages)} · {canDraw ? 'You can draw on this board' : 'View only'}
                    </p>
                )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-1.5">
                <div className="flex items-center gap-0.5" role="group" aria-label="Drawing tool">
                    {tools.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            disabled={!canDraw}
                            onClick={() => onTool(item.value)}
                            className={cn(
                                'inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition disabled:pointer-events-none disabled:opacity-40',
                                tool === item.value ? 'bg-white text-stage' : 'text-white/70 hover:bg-white/10 hover:text-white',
                            )}
                            aria-pressed={tool === item.value}
                            title={item.label}
                        >
                            <item.icon size={15} aria-hidden="true" />
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 border-l border-white/10 pl-2" role="group" aria-label="Ink colour">
                    {colors.map((value) => (
                        <button
                            key={value}
                            type="button"
                            disabled={!canDraw}
                            onClick={() => {
                                onColor(value);

                                if (tool === 'eraser') {
                                    onTool('pen');
                                }
                            }}
                            className={cn(
                                'h-6 w-6 rounded-full border-2 transition disabled:pointer-events-none disabled:opacity-40',
                                color === value ? 'border-white scale-105' : 'border-white/25 hover:border-white/60',
                            )}
                            style={{ backgroundColor: value }}
                            aria-label={`Ink colour ${value}`}
                            aria-pressed={color === value}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-1 border-l border-white/10 pl-2" role="group" aria-label="Stroke size">
                    {widths.map((value, index) => (
                        <button
                            key={value}
                            type="button"
                            disabled={!canDraw}
                            onClick={() => onWidth(value)}
                            className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full transition disabled:pointer-events-none disabled:opacity-40',
                                width === value ? 'bg-white/20' : 'hover:bg-white/10',
                            )}
                            aria-label={`Stroke size ${index + 1}`}
                            aria-pressed={width === value}
                        >
                            <span
                                className="rounded-full bg-white/80"
                                style={{ width: 4 + index * 4, height: 4 + index * 3 }}
                            />
                        </button>
                    ))}
                </div>

                {canManage ? (
                    <button
                        type="button"
                        onClick={onToggleStudents}
                        className={cn(
                            'ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition',
                            studentsCanAnnotate ? 'bg-live text-white hover:bg-[#176f34]' : 'text-white/70 hover:bg-white/10 hover:text-white',
                        )}
                        aria-pressed={studentsCanAnnotate}
                        title="Let students draw on the board"
                    >
                        <HandPalm size={15} weight={studentsCanAnnotate ? 'fill' : 'regular'} aria-hidden="true" />
                        <span className="hidden sm:inline">{studentsCanAnnotate ? 'Students can draw' : 'Hand over the pen'}</span>
                    </button>
                ) : null}
            </div>
        </div>
    );
}
