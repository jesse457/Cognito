import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Microphone, Plus, Users } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Field, Select, TextInput } from '@/components/ui/Field';
import KeyChip from '@/components/ui/KeyChip';
import Modal from '@/components/ui/Modal';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type { ClassroomSummary, CourseSummary } from '@/types';

interface InstructorDashboardProps {
    courses: CourseSummary[];
    classrooms: ClassroomSummary[];
}

export default function InstructorDashboard({ courses, classrooms }: InstructorDashboardProps) {
    const [creating, setCreating] = useState(false);
    const form = useForm({ name: '', course_id: '' as string });

    const members = classrooms.reduce((total, classroom) => total + classroom.members, 0);

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.instructor.classrooms, {
            preserveScroll: true,
            onSuccess: () => {
                setCreating(false);
                form.reset();
            },
        });
    }

    return (
        <>
            <Head title="Teaching" />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Teaching</h1>
                    <p className="page-sub">
                        Create a class, hand out its key, and open the group call. The board is already attached to every class.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={routes.instructor.courses} className="btn btn-outline">
                        Manage courses
                    </Link>
                    <Button variant="primary" onClick={() => setCreating(true)}>
                        <Plus size={16} weight="bold" aria-hidden="true" />
                        New class
                    </Button>
                </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
                <div className="stat">
                    <p className="eyebrow">Courses</p>
                    <p className="stat-value tabular">{courses.length}</p>
                </div>
                <div className="stat">
                    <p className="eyebrow">Classes</p>
                    <p className="stat-value tabular">{classrooms.length}</p>
                </div>
                <div className="stat">
                    <p className="eyebrow">Students enrolled</p>
                    <p className="stat-value tabular">{members}</p>
                </div>
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="classes-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="classes-heading" className="section-title">
                        Your classes
                    </h2>
                    <p className="meta">Each class is one group call and one board.</p>
                </div>

                {classrooms.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title="No classes yet"
                            body="A class gets a key the moment you create it. Students type that key to join the room."
                            action={
                                <Button variant="primary" onClick={() => setCreating(true)}>
                                    <Plus size={16} weight="bold" aria-hidden="true" />
                                    Create your first class
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {classrooms.map((classroom) => (
                            <li key={classroom.id} className="card flex flex-col gap-4 p-5 transition hover:border-line-strong">
                                <div className="min-w-0">
                                    <p className="eyebrow">{classroom.course ?? 'Unassigned course'}</p>
                                    <h3 className="mt-1.5 truncate text-[15px] font-semibold">{classroom.name}</h3>
                                    <p className="meta mt-1 flex items-center gap-1.5">
                                        <Users size={13} aria-hidden="true" />
                                        {pluralize(classroom.members, 'student')}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <KeyChip code={classroom.join_code} compact />
                                </div>

                                <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                                    <Link href={classroom.call_url} className="btn btn-primary btn-sm">
                                        <Microphone size={15} weight="duotone" aria-hidden="true" />
                                        Start call
                                    </Link>
                                    <Link
                                        href={routes.instructor.classroom(classroom.id)}
                                        className="btn btn-quiet btn-sm"
                                    >
                                        Class details
                                        <ArrowRight size={14} weight="bold" aria-hidden="true" />
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="courses-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="courses-heading" className="section-title">
                        Your courses
                    </h2>
                    <Link href={routes.instructor.courses} className="btn btn-quiet btn-sm">
                        Edit courses
                    </Link>
                </div>

                {courses.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title="No courses yet"
                            body="Courses group your classes. A course only needs a title and an optional description."
                            action={
                                <Link href={routes.instructor.courses} className="btn btn-primary">
                                    Create a course
                                </Link>
                            }
                        />
                    </div>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {courses.map((course) => (
                            <li key={course.id} className="card p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-[15px] font-semibold">{course.title}</h3>
                                    <span className="chip chip-neutral shrink-0">
                                        {pluralize(course.classrooms_count, 'class', 'classes')}
                                    </span>
                                </div>
                                <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">
                                    {course.description ?? 'No description yet.'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <Modal
                open={creating}
                title="New class"
                description="Students join this class with the key we generate for it."
                onClose={() => setCreating(false)}
            >
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Field label="Class name" error={form.errors.name}>
                        {(id) => (
                            <TextInput
                                id={id}
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                placeholder="Physics Cohort A"
                                invalid={Boolean(form.errors.name)}
                            />
                        )}
                    </Field>

                    <Field label="Course" hint="Optional. Classes without a course still work." error={form.errors.course_id}>
                        {(id) => (
                            <Select
                                id={id}
                                value={form.data.course_id}
                                onChange={(event) => form.setData('course_id', event.target.value)}
                            >
                                <option value="">No course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>

                    <div className="flex justify-end gap-2 border-t border-line pt-4">
                        <Button variant="quiet" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={form.processing}>
                            {form.processing ? 'Creating' : 'Create class'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
