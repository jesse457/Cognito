import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Paperclip } from '@phosphor-icons/react';
import { useState } from 'react';
import MediaGallery from '@/components/questions/MediaGallery';
import MediaPicker from '@/components/questions/MediaPicker';
import TagList from '@/components/questions/TagList';
import VoteControl from '@/components/questions/VoteControl';
import { Field } from '@/components/ui/Field';
import { postJson } from '@/lib/http';
import { routes } from '@/lib/routes';
import type { PostMedia } from '@/types';

interface AnswerRow {
    id: number;
    body: string;
    score: number;
    my_vote: number;
    accepted: boolean;
    mine: boolean;
    can_vote: boolean;
    can_accept: boolean;
    media: PostMedia[];
    created_at: string;
    user: { id: number; name: string };
}

interface PostProps {
    question: {
        id: number;
        title: string;
        body: string;
        tags: string[];
        score: number;
        answers_count: number;
        accepted: boolean;
        my_vote: number;
        can_vote: boolean;
        can_accept: boolean;
        mine: boolean;
        media: PostMedia[];
        created_at: string;
        user: { id: number; name: string };
        group: { id: number; name: string; href: string } | null;
        href: string;
    };
    answers: AnswerRow[];
    acceptedAnswerId: number | null;
    related: Array<{ id: number; title: string; score: number; answers_count: number; href: string }>;
}

export default function Post({ question, answers, acceptedAnswerId, related }: PostProps) {
    const [accepted, setAccepted] = useState<number | null>(acceptedAnswerId);
    const [busy, setBusy] = useState(false);
    const form = useForm({ body: '', media: [] as File[] });

    const ordered = [...answers].sort((a, b) => Number(b.accepted) - Number(a.accepted));
    const backHref = question.group?.href ?? routes.questions.index;

    async function toggleAccept(answer: AnswerRow): Promise<void> {
        setBusy(true);

        try {
            const result = await postJson<{ accepted_answer_id: number | null }>(routes.answers.accept(answer.id));
            setAccepted(result.accepted_answer_id);
        } finally {
            setBusy(false);
        }
    }

    function submit(event: React.FormEvent): void {
        event.preventDefault();

        form.post(routes.questions.answers.store(question.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
            },
        });
    }

    return (
        <>
            <Head title={question.title} />

            <Link href={backHref} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-brand">
                <ArrowLeft size={14} aria-hidden="true" />
                {question.group ? `Back to ${question.group.name}` : 'Back to the community feed'}
            </Link>

            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
                <div className="flex min-w-0 flex-col gap-4">
                    <article className="card p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
                            <span className="font-medium text-ink">{question.user.name}</span>
                            <span aria-hidden="true">·</span>
                            <span>{question.created_at}</span>
                            {question.group ? (
                                <Link href={question.group.href} className="chip chip-mentor">{question.group.name}</Link>
                            ) : (
                                <span className="chip">Community</span>
                            )}
                            {question.accepted ? (
                                <span className="inline-flex items-center gap-1 text-live">
                                    <CheckCircle size={13} aria-hidden="true" /> Solved
                                </span>
                            ) : null}
                        </div>

                        <h1 className="text-[22px] leading-snug font-semibold tracking-[-0.01em] text-ink">{question.title}</h1>
                        <p className="mt-3 text-[14px] leading-[1.75] whitespace-pre-wrap text-ink-muted">{question.body}</p>
                        <TagList tags={question.tags} />
                        <MediaGallery media={question.media} className="mt-3" />

                        <div className="mt-4 border-t border-line pt-3">
                            <VoteControl
                                score={question.score}
                                myVote={question.my_vote}
                                canVote={question.can_vote}
                                endpoint={routes.questions.vote(question.id)}
                            />
                        </div>
                    </article>

                    <section className="flex flex-col gap-3">
                        <h2 className="section-title">
                            {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
                        </h2>

                        {answers.length === 0 ? (
                            <div className="card p-5 text-[13px] text-ink-muted">
                                No answers yet. Share what you know — even a partial answer helps.
                            </div>
                        ) : (
                            ordered.map((answer) => (
                                <article
                                    key={answer.id}
                                    id={`answer-${answer.id}`}
                                    className={`card p-4 ${accepted === answer.id ? 'border-live/40' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <VoteControl
                                            score={answer.score}
                                            myVote={answer.my_vote}
                                            canVote={answer.can_vote}
                                            endpoint={routes.answers.vote(answer.id)}
                                            size="sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
                                                <span className="font-medium text-ink">{answer.user.name}</span>
                                                <span aria-hidden="true">·</span>
                                                <span>{answer.created_at}</span>
                                                {accepted === answer.id ? (
                                                    <span className="inline-flex items-center gap-1 text-live">
                                                        <CheckCircle size={13} aria-hidden="true" /> Accepted
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="text-[13.5px] leading-[1.7] whitespace-pre-wrap text-ink-muted">{answer.body}</p>
                                            <MediaGallery media={answer.media} className="mt-2.5" />
                                            {question.can_accept ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-quiet btn-sm mt-3"
                                                    disabled={busy}
                                                    onClick={() => void toggleAccept(answer)}
                                                >
                                                    {accepted === answer.id ? 'Unaccept' : 'Accept this answer'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </section>

                    <section className="card p-5">
                        <h2 className="section-title">Add an answer</h2>
                        <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
                            <Field label="Your answer" error={form.errors.body}>
                                {(id) => (
                                    <textarea
                                        id={id}
                                        className="textarea"
                                        rows={5}
                                        value={form.data.body}
                                        onChange={(event) => form.setData('body', event.target.value)}
                                        placeholder="Share the step that helped you."
                                    />
                                )}
                            </Field>
                            <MediaPicker
                                files={form.data.media}
                                onChange={(files) => form.setData('media', files)}
                                error={form.errors.media ?? form.errors['media.0']}
                                disabled={form.processing}
                            />
                            <button type="submit" className="btn btn-primary self-end" disabled={form.processing}>
                                {form.processing ? 'Posting…' : 'Post answer'}
                            </button>
                        </form>
                    </section>
                </div>

                <aside className="flex flex-col gap-4">
                    {related.length > 0 ? (
                        <div className="card p-4">
                            <p className="section-title">Related posts</p>
                            <ul className="mt-2 flex flex-col divide-y divide-line">
                                {related.map((item) => (
                                    <li key={item.id} className="py-2.5">
                                        <Link href={item.href} className="text-[13px] font-medium text-ink hover:text-brand">
                                            {item.title}
                                        </Link>
                                        <p className="meta mt-0.5">{item.answers_count} answers · {item.score} votes</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    <div className="card p-4">
                        <p className="section-title">Photos</p>
                        <p className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-muted">
                            <Paperclip size={14} aria-hidden="true" />
                            {question.media.length + answers.reduce((sum, answer) => sum + answer.media.length, 0)} attached
                        </p>
                    </div>
                </aside>
            </div>
        </>
    );
}
