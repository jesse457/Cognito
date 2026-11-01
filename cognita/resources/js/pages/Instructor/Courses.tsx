import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type { CourseSummary } from '@/types';

interface CoursesProps {
    courses: CourseSummary[];
}

export default function Courses({ courses }: CoursesProps) {
    const form = useForm({ title: '', description: '' });
    const destroy = useForm({});
    const [editing, setEditing] = useState<CourseSummary | null>(null);
    const [confirming, setConfirming] = useState<number | null>(null);

    function create(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.instructor.courses, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <>
            <Head title="Courses" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-sub">
                        A course is a title and a short description. Classes hang off it, and each class carries the live
                        group call.
                    </p>
                </div>
                <Link href={routes.instructor.dashboard} className="btn btn-quiet">
                    Back to overview
                </Link>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
                <form onSubmit={create} className="card p-5 lg:sticky lg:top-24">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <Plus size={16} weight="bold" aria-hidden="true" />
                        </span>
                        <h2 className="section-title">New course</h2>
                    </div>

                    <div className="mt-4 flex flex-col gap-4">
                        <Field label="Title" error={form.errors.title}>
                            {(id) => (
                                <TextInput
                                    id={id}
                                    value={form.data.title}
                                    onChange={(event) => form.setData('title', event.target.value)}
                                    placeholder="Foundations of Applied Physics"
                                    invalid={Boolean(form.errors.title)}
                                />
                            )}
                        </Field>

                        <Field
                            label="Description"
                            hint="Optional, two lines are plenty."
                            error={form.errors.description}
                        >
                            {(id) => (
                                <TextArea
                                    id={id}
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    placeholder="Mechanics, momentum and energy, taught live twice a week."
                                    rows={3}
                                    invalid={Boolean(form.errors.description)}
                                />
                            )}
                        </Field>

                        <Button type="submit" variant="primary" disabled={form.processing || form.data.title.trim() === ''}>
                            {form.processing ? 'Creating' : 'Create course'}
                        </Button>
                    </div>
                </form>

                <section className="flex flex-col gap-4" aria-labelledby="course-list-heading">
                    <h2 id="course-list-heading" className="section-title">
                        All courses
                    </h2>

                    {courses.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title="No courses yet"
                                body="Create your first course on the left. You can add classes to it straight away."
                            />
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {courses.map((course) => (
                                <li key={course.id} className="card p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-[15px] font-semibold">{course.title}</h3>
                                            <p className="meta mt-1">
                                                {pluralize(course.classrooms_count, 'class', 'classes')}
                                                {course.created_at ? ` · created ${course.created_at}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                className="btn btn-quiet btn-sm"
                                                onClick={() => setEditing(course)}
                                            >
                                                <PencilSimple size={15} aria-hidden="true" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-quiet btn-sm text-danger hover:bg-danger-soft"
                                                onClick={() => setConfirming(course.id)}
                                            >
                                                <Trash size={15} aria-hidden="true" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
                                        {course.description ?? 'No description yet.'}
                                    </p>

                                    {confirming === course.id ? (
                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                setConfirming(null);
                                            }}
                                            className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2.5"
                                        >
                                            <p className="text-sm text-ink">Delete this course? Its classes are kept.</p>
                                            <div className="ml-auto flex gap-2">
                                                <Button variant="quiet" size="sm" onClick={() => setConfirming(null)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() =>
                                                        destroy.delete(routes.instructor.course(course.id), {
                                                            preserveScroll: true,
                                                            onFinish: () => setConfirming(null),
                                                        })
                                                    }
                                                >
                                                    Delete course
                                                </Button>
                                            </div>
                                        </form>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Modal open={editing !== null} title="Edit course" onClose={() => setEditing(null)}>
                {editing ? <EditCourseForm course={editing} onDone={() => setEditing(null)} /> : null}
            </Modal>
        </>
    );
}

function EditCourseForm({ course, onDone }: { course: CourseSummary; onDone: () => void }) {
    const form = useForm({ title: course.title, description: course.description ?? '' });

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.patch(routes.instructor.course(course.id), { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Title" error={form.errors.title}>
                {(id) => (
                    <TextInput
                        id={id}
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        invalid={Boolean(form.errors.title)}
                    />
                )}
            </Field>

            <Field label="Description" error={form.errors.description}>
                {(id) => (
                    <TextArea
                        id={id}
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                        rows={3}
                    />
                )}
            </Field>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="quiet" onClick={onDone}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={form.processing}>
                    Save changes
                    <ArrowRight size={15} weight="bold" aria-hidden="true" />
                </Button>
            </div>
        </form>
    );
}
