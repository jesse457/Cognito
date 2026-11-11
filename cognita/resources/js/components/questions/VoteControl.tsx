import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { postJson } from '@/lib/http';
import { cn } from '@/lib/utils';

interface VoteControlProps {
    score: number;
    myVote: number;
    canVote: boolean;
    endpoint: string;
    size?: 'sm' | 'md';
}

interface VoteResponse {
    score: number;
    vote: number;
}

export default function VoteControl({ score, myVote, canVote, endpoint, size = 'md' }: VoteControlProps) {
    const { push } = useToast();
    const [vote, setVote] = useState(myVote);
    const [total, setTotal] = useState(score);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        setVote(myVote);
        setTotal(score);
    }, [myVote, score]);

    async function cast(direction: 1 | -1): Promise<void> {
        if (!canVote || pending) {
            return;
        }

        const previousVote = vote;
        const previousTotal = total;
        const nextVote = vote === direction ? 0 : direction;
        const nextTotal = total - vote + nextVote;

        setVote(nextVote);
        setTotal(nextTotal);
        setPending(true);

        try {
            const data = await postJson<VoteResponse>(endpoint, { value: nextVote });
            setVote(data.vote);
            setTotal(data.score);
        } catch (error) {
            setVote(previousVote);
            setTotal(previousTotal);
            push({
                title: 'Vote not saved',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'error',
            });
        } finally {
            setPending(false);
        }
    }

    const button = cn(
        'flex items-center justify-center rounded-full border transition-colors',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        !canVote || pending ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-sunken',
    );

    return (
        <div
            className="inline-flex shrink-0 flex-col items-center gap-0.5"
            title={canVote ? 'Vote on this post' : 'You cannot vote on your own post'}
        >
            <button
                type="button"
                onClick={() => void cast(1)}
                disabled={!canVote || pending}
                aria-label="Upvote"
                aria-pressed={vote === 1}
                className={cn(
                    button,
                    vote === 1
                        ? 'border-brand/30 bg-brand-soft text-brand'
                        : 'border-transparent text-ink-soft hover:text-ink',
                )}
            >
                <CaretUp size={size === 'sm' ? 13 : 15} weight="bold" aria-hidden="true" />
            </button>
            <span className="min-w-[2.5ch] text-center text-[13px] font-semibold text-ink tabular">{total}</span>
            <button
                type="button"
                onClick={() => void cast(-1)}
                disabled={!canVote || pending}
                aria-label="Downvote"
                aria-pressed={vote === -1}
                className={cn(
                    button,
                    vote === -1
                        ? 'border-danger/25 bg-danger-soft text-danger'
                        : 'border-transparent text-ink-soft hover:text-ink',
                )}
            >
                <CaretDown size={size === 'sm' ? 13 : 15} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}
