import { CaretDown, ChartBar, CheckCircle, Clock, PaperPlaneRight, Plus, Trash, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '@/components/ui/Toast';
import { formatClock } from '@/lib/recording';
import { cn, pluralize } from '@/lib/utils';
import type { CreatePollInput, PollView } from '@/types';

interface PollsPanelProps {
    open: boolean;
    role: 'host' | 'participant';
    polls: PollView[];
    active: PollView | null;
    onClose: () => void;
    onCreate: (input: CreatePollInput) => Promise<void>;
    onRespond: (pollId: number, response: { option_id?: number; body?: string }) => Promise<void>;
    onClosePoll: (pollId: number) => Promise<void>;
    onRefresh: () => Promise<void>;
}

const DURATIONS = [
    { value: '30', label: '30s' },
    { value: '60', label: '1 min' },
    { value: '90', label: '90s' },
    { value: '120', label: '2 min' },
];

function PollResults({ poll }: { poll: PollView }) {
    if (poll.kind === 'choice') {
        return (
            <div className="flex flex-col gap-2">
                {poll.options.map((option) => {
                    const percent =
                        poll.total_responses === 0 ? 0 : Math.round((option.count / poll.total_responses) * 100);
                    const mine = poll.my_response?.option_id === option.id;

                    return (
                        <div key={option.id}>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className={cn('truncate', mine ? 'font-semibold text-stage-ink' : 'text-stage-ink/65')}>
                                    {option.label}
                                    {mine ? ' · you' : ''}
                                </span>
                                <span className="shrink-0 text-stage-ink/45 tabular">
                                    {option.count} · {percent}%
                                </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stage-ink/10">
                                <div
                                    className={cn('h-full rounded-full', mine ? 'bg-brand-soft' : 'bg-stage-ink/35')}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (poll.responses.length === 0) {
        return <p className="text-[12px] text-stage-ink/40">No answers yet.</p>;
    }

    return (
        <div className="max-h-52 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
            {poll.responses.map((body, index) => (
                <p
                    key={`${index}-${body.slice(0, 12)}`}
                    className="rounded-lg bg-stage-ink/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-stage-ink/65"
                >
                    {body}
                </p>
            ))}
        </div>
    );
}

export default function PollsPanel({
    open,
    role,
    polls,
    active,
    onClose,
    onCreate,
    onRespond,
    onClosePoll,
    onRefresh,
}: PollsPanelProps) {
    const { push } = useToast();
    const [now, setNow] = useState(() => Date.now());
    const [composerOpen, setComposerOpen] = useState(false);
    const [kind, setKind] = useState<'open' | 'choice'>('choice');
    const [question, setQuestion] = useState('');
    const [duration, setDuration] = useState('60');
    const [options, setOptions] = useState(['', '']);
    const [choice, setChoice] = useState<number | null>(null);
    const [answer, setAnswer] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        void onRefresh();
    }, [onRefresh, open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);

        return () => window.clearInterval(timer);
    }, [open]);

    useEffect(() => {
        setChoice(active?.my_response?.option_id ?? null);
        setAnswer(active?.my_response?.body ?? '');
    }, [active?.id, active?.my_response?.option_id, active?.my_response?.body]);

    if (!open) {
        return null;
    }

    const remaining = (poll: PollView): number =>
        Math.max(0, Math.ceil((new Date(poll.ends_at).getTime() - now) / 1_000));
    const activeOpen = active !== null && active.is_open && remaining(active) > 0;
    const history = polls.filter((poll) => poll.id !== active?.id);

    function errorMessage(caught: unknown): string {
        return caught instanceof Error ? caught.message : 'Please try again.';
    }

    async function submitPoll(event: FormEvent): Promise<void> {
        event.preventDefault();
        const text = question.trim();
        const cleanedOptions = options.map((option) => option.trim()).filter((option) => option !== '');

        if (text === '') {
            push({ title: 'Add a question first', tone: 'warn' });

            return;
        }

        if (kind === 'choice' && cleanedOptions.length < 2) {
            push({ title: 'Add at least two options', tone: 'warn' });

            return;
        }

        setBusy(true);

        try {
            await onCreate({
                kind,
                question: text,
                duration: Number(duration),
                options: kind === 'choice' ? cleanedOptions : [],
            });
            setQuestion('');
            setOptions(['', '']);
            setKind('choice');
            setComposerOpen(false);
        } catch (error) {
            push({ title: 'Poll could not start', description: errorMessage(error), tone: 'error' });
        } finally {
            setBusy(false);
        }
    }

    async function submitAnswer(): Promise<void> {
        if (active === null || busy) {
            return;
        }

        setBusy(true);

        try {
            if (active.kind === 'choice') {
                if (choice === null) {
                    push({ title: 'Choose an option first', tone: 'warn' });

                    return;
                }

                await onRespond(active.id, { option_id: choice });
            } else {
                if (answer.trim() === '') {
                    push({ title: 'Write an answer first', tone: 'warn' });

                    return;
                }

                await onRespond(active.id, { body: answer.trim() });
            }
        } catch (error) {
            push({ title: 'Answer not saved', description: errorMessage(error), tone: 'error' });
        } finally {
            setBusy(false);
        }
    }

    async function closePoll(poll: PollView): Promise<void> {
        if (busy) {
            return;
        }

        setBusy(true);

        try {
            await onClosePoll(poll.id);
        } catch (error) {
            push({ title: 'Poll could not close', description: errorMessage(error), tone: 'error' });
        } finally {
            setBusy(false);
        }
    }

    return (
        <aside className="call-panel panel-in" aria-label="Live polls">
            <div className="flex items-center justify-between border-b border-stage-line px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-stage-ink">
                    <ChartBar size={14} aria-hidden="true" />
                    Live polls
                    <span className="font-normal text-stage-ink/45">
                        {polls.length === 0 ? 'none yet' : pluralize(polls.length, 'poll')}
                    </span>
                </p>
                <button type="button" onClick={onClose} className="call-control h-7 min-w-7 px-1" aria-label="Close polls">
                    <X size={14} aria-hidden="true" />
                </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
                {role === 'host' ? (
                    composerOpen || active === null ? (
                        <form onSubmit={(event) => void submitPoll(event)} className="rounded-xl border border-stage-ink/10 bg-stage-ink/5 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-stage-ink/45 uppercase">New poll</p>
                                {active !== null || composerOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(false)}
                                        className="text-[11px] text-stage-ink/45 hover:text-stage-ink"
                                    >
                                        Hide
                                    </button>
                                ) : null}
                            </div>

                            <div className="mt-2 flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setKind('choice')}
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                                        kind === 'choice' ? 'bg-stage-ink text-stage' : 'text-stage-ink/55 hover:bg-stage-ink/10 hover:text-stage-ink',
                                    )}
                                >
                                    Multiple choice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setKind('open')}
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                                        kind === 'open' ? 'bg-stage-ink text-stage' : 'text-stage-ink/55 hover:bg-stage-ink/10 hover:text-stage-ink',
                                    )}
                                >
                                    Open answer
                                </button>
                            </div>

                            <textarea
                                value={question}
                                onChange={(event) => setQuestion(event.target.value)}
                                rows={2}
                                maxLength={240}
                                placeholder="Ask the room a question…"
                                className="mt-2 w-full resize-none rounded-xl border border-stage-ink/15 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink placeholder:text-stage-ink/35 focus:border-stage-ink/40 focus:outline-none"
                            />

                            {kind === 'choice' ? (
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {options.map((option, index) => (
                                        <div key={index} className="flex items-center gap-1.5">
                                            <span className="w-4 text-center text-[10px] text-stage-ink/35">{index + 1}</span>
                                            <input
                                                value={option}
                                                onChange={(event) =>
                                                    setOptions((current) =>
                                                        current.map((item, itemIndex) =>
                                                            itemIndex === index ? event.target.value : item,
                                                        ),
                                                    )
                                                }
                                                maxLength={120}
                                                placeholder={`Option ${index + 1}`}
                                                className="min-w-0 flex-1 rounded-lg border border-stage-ink/15 bg-stage-ink/5 px-2.5 py-1.5 text-[12px] text-stage-ink placeholder:text-stage-ink/30 focus:border-stage-ink/40 focus:outline-none"
                                            />
                                            {options.length > 2 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                                    className="rounded-full p-1 text-stage-ink/35 transition hover:bg-stage-ink/10 hover:text-stage-ink"
                                                    aria-label={`Remove option ${index + 1}`}
                                                >
                                                    <Trash size={12} aria-hidden="true" />
                                                </button>
                                            ) : null}
                                        </div>
                                    ))}
                                    {options.length < 6 ? (
                                        <button
                                            type="button"
                                            onClick={() => setOptions((current) => [...current, ''])}
                                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-stage-ink/55 transition hover:text-stage-ink"
                                        >
                                            <Plus size={12} aria-hidden="true" />
                                            Add option
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-1">
                                <Clock size={12} className="text-stage-ink/35" aria-hidden="true" />
                                {DURATIONS.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setDuration(item.value)}
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] font-medium transition',
                                            duration === item.value
                                                ? 'bg-stage-ink/15 text-stage-ink'
                                                : 'text-stage-ink/40 hover:bg-stage-ink/10 hover:text-stage-ink',
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={busy}
                                className="call-control call-control-on mt-2 h-8 w-full px-3 text-[12px]"
                            >
                                <ChartBar size={14} aria-hidden="true" />
                                {busy ? 'Starting…' : 'Start poll'}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setComposerOpen(true)}
                            className="call-control call-control-on h-9 w-full justify-center px-3 text-[12px]"
                        >
                            <Plus size={14} weight="bold" aria-hidden="true" />
                            New poll
                        </button>
                    )
                ) : null}

                {active === null ? (
                    <div className="px-1 py-6 text-center text-[12px] leading-relaxed text-stage-ink/40">
                        {role === 'host'
                            ? 'No poll is open. Start one above when you want a quick read of the room.'
                            : 'No poll is open right now. The instructor will start one during the lesson.'}
                    </div>
                ) : (
                    <div className="rounded-xl border border-stage-ink/10 bg-stage-ink/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-stage-ink/40 uppercase">
                                    {active.kind === 'choice' ? 'Multiple choice' : 'Open answer'}
                                </p>
                                <p className="mt-1 text-[13px] leading-snug font-semibold text-stage-ink">{active.question}</p>
                            </div>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular',
                                    activeOpen ? 'bg-live/20 text-stage-live' : 'bg-stage-ink/10 text-stage-ink/45',
                                )}
                            >
                                {activeOpen ? formatClock(remaining(active)) : 'Closed'}
                            </span>
                        </div>

                        {activeOpen && role === 'participant' ? (
                            <div className="mt-3">
                                {active.kind === 'choice' ? (
                                    <div className="flex flex-col gap-1.5">
                                        {active.options.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setChoice(option.id)}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[12px] transition',
                                                    choice === option.id
                                                        ? 'border-stage-ink/40 bg-stage-ink/12 text-stage-ink'
                                                        : 'border-stage-ink/10 text-stage-ink/70 hover:bg-stage-ink/5 hover:text-stage-ink',
                                                )}
                                                aria-pressed={choice === option.id}
                                            >
                                                <span
                                                    className={cn(
                                                        'h-3.5 w-3.5 shrink-0 rounded-full border',
                                                        choice === option.id ? 'border-stage-ink bg-stage-ink' : 'border-stage-ink/30',
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea
                                        value={answer}
                                        onChange={(event) => setAnswer(event.target.value)}
                                        rows={2}
                                        maxLength={500}
                                        placeholder="Your answer…"
                                        className="w-full resize-none rounded-xl border border-stage-ink/15 bg-stage-ink/5 px-3 py-2 text-[12px] leading-relaxed text-stage-ink placeholder:text-stage-ink/35 focus:border-stage-ink/40 focus:outline-none"
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => void submitAnswer()}
                                    disabled={busy}
                                    className="call-control call-control-on mt-2 h-8 w-full justify-center px-3 text-[12px]"
                                >
                                    <PaperPlaneRight size={14} weight="fill" aria-hidden="true" />
                                    {busy ? 'Saving…' : active.my_response === null ? 'Submit answer' : 'Update answer'}
                                </button>
                            </div>
                        ) : null}

                        <div className="mt-3 border-t border-stage-ink/10 pt-2">
                            <p className="pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-stage-ink/35 uppercase">
                                Live results
                            </p>
                            <PollResults poll={active} />

                            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-stage-ink/40">
                                <CheckCircle size={11} aria-hidden="true" />
                                {pluralize(active.total_responses, 'response')}
                                {active.my_response === null ? '' : ' · your answer is counted'}
                            </p>

                            {active.can_close ? (
                                <button
                                    type="button"
                                    onClick={() => void closePoll(active)}
                                    disabled={busy}
                                    className="call-control mt-2 h-8 w-full justify-center border border-stage-ink/15 px-3 text-[12px]"
                                >
                                    Close poll
                                </button>
                            ) : null}
                        </div>
                    </div>
                )}

                {history.length > 0 ? (
                    <div>
                        <p className="px-1 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-stage-ink/35 uppercase">
                            Earlier polls
                        </p>
                        <ul className="flex flex-col gap-1.5">
                            {history.slice(0, 5).map((poll) => (
                                <li key={poll.id}>
                                    <details className="group rounded-lg bg-stage-ink/5 px-2.5 py-2">
                                        <summary className="flex cursor-pointer list-none items-start justify-between gap-2 [&::-webkit-details-marker]:hidden">
                                            <span className="text-[11px] leading-snug text-stage-ink/65">{poll.question}</span>
                                            <span className="flex shrink-0 items-center gap-1 text-[10px] text-stage-ink/35">
                                                {pluralize(poll.total_responses, 'response')} · {poll.created_at}
                                                <CaretDown
                                                    size={10}
                                                    className="transition-transform group-open:rotate-180"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </summary>
                                        <div className="mt-2 border-t border-stage-ink/10 pt-2">
                                            <PollResults poll={poll} />
                                        </div>
                                    </details>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
