import { Head, Link, useForm } from '@inertiajs/react';
import { Key, Microphone, Users } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import KeyChip from '@/components/ui/KeyChip';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type { ClassroomSummary } from '@/types';

interface StudentHomeProps {
    classrooms: ClassroomSummary[];
}

export default function StudentHome({ classrooms }: StudentHomeProps) {
    const form = useForm({ key: '' });

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.join, { onFinish: () => form.reset('key') });
    }

    return (
        <>
            <Head title="My classes" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">My classes</h1>
                    <p className="page-sub">
                        Every class you joined with a key lives here. Open one to join its group call and the shared board.
                    </p>
                </div>
                <span className="chip chip-neutral">
                    <Users size={13} aria-hidden="true" />
                    {pluralize(classrooms.length, 'class', 'classes')}
                </span>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
                <aside className="card p-5 lg:sticky lg:top-24">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <Key size={16} weight="duotone" aria-hidden="true" />
                        </span>
                        <h2 className="section-title">Join a class</h2>
                    </div>
                    <p className="meta mt-2">Ask your instructor for the six-character key, then type it here.</p>

                    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                        <label className="label" htmlFor="join-key">
                            Class key
                        </label>
                        <input
                            id="join-key"
                            name="key"
                            value={form.data.key}
                            onChange={(event) => form.setData('key', event.target.value.toUpperCase())}
                            placeholder="PHY101"
                            maxLength={12}
                            autoComplete="off"
                            spellCheck={false}
                            className="input input-key"
                            aria-invalid={Boolean(form.errors.key)}
                        />
                        {form.errors.key ? (
                            <p className="error" role="alert">
                                {form.errors.key}
                            </p>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={form.processing || form.data.key.trim() === ''}>
                            {form.processing ? 'Joining' : 'Join class'}
                        </Button>
                    </form>
                </aside>

                <section className="flex flex-col gap-4" aria-labelledby="class-list-heading">
                    <h2 id="class-list-heading" className="section-title">
                        Your classroom
                    </h2>

                    {classrooms.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title="No classes yet"
                                body="The key from your instructor is all you need. Joined classes appear here with a one-click way into the call."
                            />
                        </div>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {classrooms.map((classroom) => (
                                <li key={classroom.id} className="card flex flex-col gap-4 p-5 transition hover:border-line-strong">
                                    <div className="min-w-0">
                                        <p className="eyebrow">{classroom.course ?? 'Class'}</p>
                                        <h3 className="mt-1.5 truncate text-[15px] font-semibold">{classroom.name}</h3>
                                        <p className="meta mt-1 truncate">
                                            {classroom.instructor ?? 'Instructor'} · {pluralize(classroom.members, 'member')}
                                        </p>
                                    </div>

                                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                                        <KeyChip code={classroom.join_code} compact />
                                        <Link href={classroom.call_url} className="btn btn-primary btn-sm">
                                            <Microphone size={15} weight="duotone" aria-hidden="true" />
                                            Join call
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}
