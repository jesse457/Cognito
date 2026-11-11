import { PaperPlaneRight, X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { cn, pluralize } from '@/lib/utils';
import type { CommentEntry } from '@/types';

interface CommentsPanelProps {
    open: boolean;
    comments: CommentEntry[];
    draft: string;
    myName: string;
    onDraft: (value: string) => void;
    onSend: () => void;
    onClose: () => void;
}

/** A short-lived class chat: no history, nothing stored after the call. */
export default function CommentsPanel({ open, comments, draft, myName, onDraft, onSend, onClose }: CommentsPanelProps) {
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, [comments.length, open]);

    if (!open) {
        return null;
    }

    function submit(event: FormEvent): void {
        event.preventDefault();
        onSend();
    }

    return (
        <aside className="call-panel panel-in" aria-label="Comments">
            <div className="flex items-center justify-between border-b border-stage-line px-3 py-2.5">
                <p className="text-[12px] font-semibold text-stage-ink">
                    Comments <span className="font-normal text-stage-ink/45">{pluralize(comments.length, 'comment')}</span>
                </p>
                <button type="button" onClick={onClose} className="call-control h-7 min-w-7 px-1" aria-label="Close comments">
                    <X size={14} aria-hidden="true" />
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
                {comments.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[12px] leading-relaxed text-stage-ink/40">
                        Nothing yet. Comments are for the people in this call and disappear with it.
                    </p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className={cn('comment-in', comment.mine && 'text-right')}>
                            <p className="text-[10px] font-medium text-stage-ink/40">
                                {comment.mine ? 'You' : comment.senderName}
                            </p>
                            <p
                                className={cn(
                                    'mt-0.5 inline-block max-w-[95%] rounded-2xl px-3 py-1.5 text-left text-[12px] leading-relaxed break-words',
                                    comment.mine ? 'bg-brand text-brand-ink' : 'bg-stage-ink/10 text-stage-ink/85',
                                )}
                            >
                                {comment.body}
                            </p>
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </div>

            <form onSubmit={submit} className="border-t border-stage-line p-2">
                <div className="flex items-end gap-1.5">
                    <textarea
                        value={draft}
                        onChange={(event) => onDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                onSend();
                            }
                        }}
                        rows={1}
                        maxLength={500}
                        placeholder={`Comment as ${myName}`}
                        className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-stage-ink/15 bg-stage-ink/5 px-3 py-2 text-[12px] text-stage-ink placeholder:text-stage-ink/35 focus:border-stage-ink/40 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={draft.trim() === ''}
                        className="call-control call-control-on h-9 min-w-9 px-2.5"
                        aria-label="Send comment"
                    >
                        <PaperPlaneRight size={16} weight="fill" aria-hidden="true" />
                    </button>
                </div>
            </form>
        </aside>
    );
}
