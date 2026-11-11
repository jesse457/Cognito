import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CaretLeft,
    ChatCircleText,
    CheckCircle,
    Clock,
    Lightbulb,
    Sparkle,
    UsersThree,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import MediaGallery from '@/components/questions/MediaGallery';
import MediaPicker from '@/components/questions/MediaPicker';
import VoteControl from '@/components/questions/VoteControl';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextArea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { postJson } from '@/lib/http';
import { routes } from '@/lib/routes';
import { cn, pluralize } from '@/lib/utils';
import type { PostMedia, SharedProps } from '@/types';

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

interface QuestionDetail {
    id: number;
    title: string;
    body: string;
    tags: string[];
    visibility: 'classroom' | 'community';
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
    classroom: { id: number; name: string; course: string | null } | null;
    href: string;
}

interface RelatedQuestion {
    id: number;
    title: string;
    score: number;
    answers_count: number;
    href: string;
}

interface QuestionShowProps {
    question: QuestionDetail;
    answers: AnswerRow[];
    acceptedAnswerId: number | null;
    related: RelatedQuestion[];
    canAnswer: boolean;
}

function AuthorCard({ name, label }: { name: string; label: ReactNode }) {
    return (
        <div className="ml-auto w-full max-w-[260px] rounded-lg bg-brand-soft/70 px-3 py-2.5">
            <p className="meta">{label}</p>
            <div className="mt-1.5 flex items-center gap-2">
                <Avatar name={name} size="sm" />
                <p className="truncate text-[13px] font-medium text-ink">{name}</p>
            </div>
        </div>
    );
}

export default function QuestionShow({
    question,
    answers,
    acceptedAnswerId,
    related,
    canAnswer,
}: QuestionShowProps) {
    const role = usePage<SharedProps>().props.auth?.user?.role;
    const instructor = role === 'instructor';
    const { push } = useToast();
    const [acceptedId, setAcceptedId] = useState<number | null>(acceptedAnswerId);
    const [accepting, setAccepting] = useState<number | null>(null);
    const form = useForm({ body: '', media: [] as File[] });

    const classHref =
        question.classroom === null
            ? null
            : role === 'instructor'
              ? routes.instructor.classroom(question.classroom.id)
              : routes.student.classroom(question.classroom.id);
    const backHref =
        question.visibility === 'community'
            ? `${routes.questions.index}?scope=community`
            : routes.questions.index;
    const orderedAnswers = [...answers].sort(
        (first, second) => Number(second.id === acceptedId) - Number(first.id === acceptedId),
    );
    const mediaError =
        form.errors.media ??
        Object.entries(form.errors).find(([field]) => field.startsWith('media.'))?.[1] ??
        null;

    async function toggleAccepted(answer: AnswerRow): Promise<void> {
        if (!answer.can_accept || accepting !== null) {
            return;
        }

        setAccepting(answer.id);

        try {
            const data = await postJson<{ accepted_answer_id: number | null }>(
                routes.answers.accept(answer.id),
            );
            setAcceptedId(data.accepted_answer_id);
            push({
                title: data.accepted_answer_id === null ? 'Accepted answer cleared' : 'Answer accepted',
                description:
                    data.accepted_answer_id === null
                        ? 'The thread is open again.'
                        : 'This answer now sits at the top of the thread.',
                tone: 'success',
            });
        } catch (error) {
            push({
                title: 'Could not update the answer',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'error',
            });
        } finally {
            setAccepting(null);
        }
    }

    function submitAnswer(event: FormEvent): void {
        event.preventDefault();

        form.post(routes.questions.answers.store(question.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <>
            <Head title={question.title} />

            <Link
                href={backHref}
                className="meta inline-flex w-fit items-center gap-1.5 transition-colors hover:text-brand"
            >
                <CaretLeft size={13} weight="bold" aria-hidden="true" />
                {instructor ? 'Question desk' : 'All questions'}
            </Link>

            <header className="mt-3 border-b border-line pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'chip',
                            question.visibility === 'community' ? 'chip-brand' : 'chip-neutral',
                        )}
                    >
                        {question.visibility === 'community'
                            ? 'Community'
                            : question.classroom?.name ?? 'Class'}
                    </span>
                    {acceptedId === null ? null : (
                        <span className="chip chip-live">
                            <CheckCircle size={12} weight="fill" aria-hidden="true" />
                            Solved
                        </span>
                    )}
                    {question.mine ? <span className="chip chip-brand">Your question</span> : null}
                    {instructor ? <span className="chip chip-mentor">Instructor view</span> : null}
                </div>

                <h1 className="mt-2.5 text-[24px] leading-tight font-semibold tracking-tight text-ink sm:text-[29px]">
                    {question.title}
                </h1>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>Asked {question.created_at}</span>
                    <span className="inline-flex items-center gap-1">
                        <ChatCircleText size={13} aria-hidden="true" />
                        {pluralize(answers.length, 'answer')}
                    </span>
                    {question.classroom?.course == null ? null : (
                        <span className="inline-flex items-center gap-1">
                            <UsersThree size={13} aria-hidden="true" />
                            {question.classroom.course}
                        </span>
                    )}
                </div>
            </header>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex min-w-0 flex-col gap-6">
                    <article aria-label="Question">
                        <div className="flex gap-3 sm:gap-5">
                            <VoteControl
                                score={question.score}
                                myVote={question.my_vote}
                                canVote={question.can_vote}
                                endpoint={routes.questions.vote(question.id)}
                            />

                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] leading-7 whitespace-pre-line text-ink">
                                    {question.body}
                                </p>

                                <MediaGallery media={question.media} />

                                {question.tags.length === 0 ? null : (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {question.tags.map((tag) => (
                                            <span key={tag} className="tag">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                                    {question.mine ? (
                                        <span className="meta">You asked this question</span>
                                    ) : (
                                        <span>
                                            <Link
                                                href={backHref}
                                                className="meta transition-colors hover:text-brand"
                                            >
                                                Back to the board
                                            </Link>
                                        </span>
                                    )}

                                    <AuthorCard
                                        name={question.user.name}
                                        label={`Asked ${question.created_at}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </article>

                    <section aria-labelledby="answers-heading">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                            <h2 id="answers-heading" className="text-lg font-semibold text-ink">
                                {pluralize(answers.length, 'Answer')}
                            </h2>
                            <p className="meta">
                                {acceptedId === null
                                    ? 'No accepted answer yet'
                                    : 'The asker marked one answer as accepted'}
                            </p>
                        </div>

                        {answers.length === 0 ? (
                            <EmptyState
                                title="No answers yet"
                                body={
                                    instructor
                                        ? 'This thread is still waiting. A short, specific instructor reply often unlocks the next attempt.'
                                        : 'You have the whole thread to yourself. If you know the next step, write it out for whoever asks next.'
                                }
                            />
                        ) : (
                            <ol className="divide-y divide-line">
                                {orderedAnswers.map((answer) => {
                                    const accepted = answer.id === acceptedId;

                                    return (
                                        <li
                                            key={answer.id}
                                            id={`answer-${answer.id}`}
                                            className={cn('scroll-mt-24 py-5', accepted && 'bg-live-soft/20')}
                                        >
                                            <div className="flex gap-3 sm:gap-5">
                                                <VoteControl
                                                    score={answer.score}
                                                    myVote={answer.my_vote}
                                                    canVote={answer.can_vote}
                                                    endpoint={routes.answers.vote(answer.id)}
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {accepted ? (
                                                            <span className="chip chip-live">
                                                                <CheckCircle
                                                                    size={12}
                                                                    weight="fill"
                                                                    aria-hidden="true"
                                                                />
                                                                Accepted
                                                            </span>
                                                        ) : null}
                                                        {answer.mine ? (
                                                            <span className="chip chip-brand">Your answer</span>
                                                        ) : null}
                                                        <span className="meta inline-flex items-center gap-1">
                                                            <Clock size={12} aria-hidden="true" />
                                                            {answer.created_at}
                                                        </span>
                                                        <span className="meta">· {answer.user.name}</span>
                                                    </div>

                                                    <p className="mt-3 text-[15px] leading-7 whitespace-pre-line text-ink">
                                                        {answer.body}
                                                    </p>

                                                    <MediaGallery media={answer.media} />

                                                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                                                        {answer.can_accept ? (
                                                            <Button
                                                                variant={accepted ? 'tonal' : 'outline'}
                                                                size="sm"
                                                                onClick={() => void toggleAccepted(answer)}
                                                                disabled={accepting !== null}
                                                            >
                                                                <CheckCircle
                                                                    size={15}
                                                                    weight={accepted ? 'fill' : 'regular'}
                                                                    aria-hidden="true"
                                                                />
                                                                {accepting === answer.id
                                                                    ? 'Saving'
                                                                    : accepted
                                                                      ? 'Accepted answer'
                                                                      : 'Accept answer'}
                                                            </Button>
                                                        ) : (
                                                            <span />
                                                        )}

                                                        <AuthorCard
                                                            name={answer.user.name}
                                                            label={`Answered ${answer.created_at}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>

                    {canAnswer ? (
                        <section
                            className="rounded-xl border border-line bg-surface p-4 sm:p-5"
                            aria-labelledby="answer-form-heading"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 id="answer-form-heading" className="text-lg font-semibold text-ink">
                                    {instructor ? 'Reply as instructor' : 'Your answer'}
                                </h2>
                                {instructor ? <span className="chip chip-mentor">Instructor</span> : null}
                            </div>
                            <p className="page-sub">
                                {instructor
                                    ? 'Answer for the room: name the concept, the likely misconception, and the next small step.'
                                    : 'Walk through the step that unlocks it. Link a photo if the diagram is easier to follow than the words.'}
                            </p>

                            <form onSubmit={submitAnswer} className="mt-4 flex flex-col gap-4">
                                <Field
                                    label={instructor ? 'Instructor reply' : 'Answer'}
                                    error={form.errors.body}
                                >
                                    {(id) => (
                                        <TextArea
                                            id={id}
                                            value={form.data.body}
                                            onChange={(event) => form.setData('body', event.target.value)}
                                            placeholder={
                                                instructor
                                                    ? 'Point to the concept, name the likely misconception, then give the next step the student can retry...'
                                                    : 'Start from the equation that applies, then show the step where the sign or direction changes...'
                                            }
                                            className="min-h-40"
                                            invalid={Boolean(form.errors.body)}
                                        />
                                    )}
                                </Field>

                                <div>
                                    <span className="label">
                                        Photos <span className="font-normal text-ink-soft">(optional)</span>
                                    </span>
                                    <MediaPicker
                                        files={form.data.media}
                                        onChange={(media) => form.setData('media', media)}
                                        error={mediaError}
                                        disabled={form.processing}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                                    <p className="meta">
                                        {instructor
                                            ? 'Leave a step the student can retry without you.'
                                            : 'Be specific enough that a classmate can retry it alone.'}
                                    </p>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={form.processing || form.data.body.trim() === ''}
                                    >
                                        {form.processing
                                            ? 'Posting'
                                            : instructor
                                              ? 'Post instructor reply'
                                              : 'Post your answer'}
                                    </Button>
                                </div>
                            </form>
                        </section>
                    ) : null}
                </div>

                <aside className="flex flex-col gap-4" aria-label="Question details">
                    {instructor ? (
                        <div className="rounded-xl border border-mentor/30 bg-mentor-soft/45 p-4">
                            <span className="chip chip-mentor">Instructor lens</span>
                            <p className="mt-2 text-sm font-semibold text-ink">Answer for the whole class</p>
                            <p className="meta mt-1 leading-relaxed">
                                Name the misconception, point to the concept, and leave a step the student can
                                retry alone. Then accept the reply that closes the loop.
                            </p>
                        </div>
                    ) : null}

                    <div className="overflow-hidden rounded-xl border border-line bg-surface">
                        <div className="border-b border-line bg-surface-sunken px-4 py-2.5">
                            <p className="eyebrow">Thread</p>
                        </div>
                        <dl className="divide-y divide-line">
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <dt className="text-[13px] text-ink-muted">Answers</dt>
                                <dd className="text-[13px] font-semibold text-ink tabular">{answers.length}</dd>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <dt className="text-[13px] text-ink-muted">Status</dt>
                                <dd className="text-[13px] font-semibold text-ink">
                                    {acceptedId === null ? 'Open' : 'Solved'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <dt className="text-[13px] text-ink-muted">Asked</dt>
                                <dd className="text-[13px] font-semibold text-ink">{question.created_at}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-xl border border-line bg-surface p-4">
                        <p className="eyebrow">
                            {question.visibility === 'community' ? 'Community' : 'Class'}
                        </p>
                        <h2 className="mt-1 text-[15px] font-semibold text-ink">
                            {question.visibility === 'community'
                                ? 'Across the whole school'
                                : question.classroom?.name ?? 'Class'}
                        </h2>
                        {question.visibility === 'community' ? (
                            <p className="meta mt-1 leading-relaxed">
                                Visible to every signed-in student and instructor, not just one class.
                            </p>
                        ) : question.classroom?.course == null ? null : (
                            <p className="meta mt-1">{question.classroom.course}</p>
                        )}
                        {classHref === null ? null : (
                            <Link
                                href={classHref}
                                className="meta mt-3 inline-flex items-center gap-1.5 transition-colors hover:text-brand"
                            >
                                Open the class
                                <ArrowRight size={12} aria-hidden="true" />
                            </Link>
                        )}
                    </div>

                    {related.length === 0 ? null : (
                        <div className="overflow-hidden rounded-xl border border-line bg-surface">
                            <div className="border-b border-line bg-surface-sunken px-4 py-2.5">
                                <p className="eyebrow inline-flex items-center gap-1.5">
                                    <Sparkle size={11} weight="fill" aria-hidden="true" />
                                    Similar threads
                                </p>
                            </div>
                            <ul className="divide-y divide-line">
                                {related.map((item) => (
                                    <li key={item.id} className="px-4 py-3">
                                        <Link
                                            href={item.href}
                                            className="text-[13px] leading-snug font-medium text-brand transition-colors hover:text-brand-strong hover:underline"
                                        >
                                            {item.title}
                                        </Link>
                                        <p className="meta mt-1">
                                            {item.score} votes · {pluralize(item.answers_count, 'answer')}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="rounded-xl border border-line p-4">
                        <p className="eyebrow">Keep it useful</p>
                        <ul className="mt-2.5 flex flex-col gap-2.5 text-[13px] leading-relaxed text-ink-muted">
                            <li className="flex gap-2">
                                <Lightbulb
                                    size={15}
                                    className="mt-0.5 shrink-0 text-brand"
                                    aria-hidden="true"
                                />
                                <span>Explain the step, not just the result. A classmate should be able to retry it alone.</span>
                            </li>
                        </ul>
                        <Link
                            href={routes.questions.index}
                            className="meta mt-3 inline-flex items-center gap-1.5 transition-colors hover:text-brand"
                        >
                            Ask a question
                            <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                    </div>
                </aside>
            </div>
        </>
    );
}
