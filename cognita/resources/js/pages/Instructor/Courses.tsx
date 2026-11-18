import { Head, Link, router, useForm } from '@inertiajs/react';
import type { InertiaForm } from '@inertiajs/react';
import { ArrowRight, Books, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import ModalFooter from '@/components/ui/ModalFooter';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type { CourseSummary } from '@/types';

interface CoursesProps {
    courses: CourseSummary[];
}

interface CourseFormData {
    title: string;
    description: string;
    status: string;
    is_paid: boolean;
    price: string;
    currency: string;
    payment_url: string;
    payment_instructions: string;
}

const COURSE_STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

const CURRENCIES = ['XAF', 'USD', 'EUR'].map((currency) => ({
    value: currency,
    label: currency,
}));

function courseData(course?: CourseSummary): CourseFormData {
    return {
        title: course?.title ?? '',
        description: course?.description ?? '',
        status: course?.status ?? 'published',
        is_paid: course?.is_paid ?? false,
        price: course ? (course.price_cents / 100).toFixed(2) : '',
        currency: course?.currency ?? 'USD',
        payment_url: course?.payment_url ?? '',
        payment_instructions: course?.payment_instructions ?? '',
    };
}

function coursePayload(data: CourseFormData): Record<string, unknown> {
    return {
        title: data.title,
        description: data.description,
        status: data.status,
        is_paid: data.is_paid,
        price_cents: data.is_paid ? Math.max(0, Math.round(Number(data.price || 0) * 100)) : 0,
        currency: data.currency,
        payment_url: data.is_paid && data.payment_url.trim() !== '' ? data.payment_url : null,
        payment_instructions:
            data.is_paid && data.payment_instructions.trim() !== '' ? data.payment_instructions : null,
    };
}

export default function InstructorCourses({ courses }: CoursesProps) {
    const form = useForm<CourseFormData>(courseData());
    const destroy = useForm({});
    const [editing, setEditing] = useState<CourseSummary | null>(null);
    const [confirming, setConfirming] = useState<number | null>(null);
    const [query, setQuery] = useState('');

    /**
     * The course endpoint takes the whole course, so the quick publish toggle
     * sends the course as it stands with only the status changed.
     */
    function toggleStatus(course: CourseSummary): void {
        router.patch(
            routes.instructor.course(course.id),
            {
                title: course.title,
                description: course.description,
                status: course.status === 'published' ? 'draft' : 'published',
                is_paid: course.is_paid,
                price_cents: course.price_cents,
                currency: course.currency,
                payment_url: course.payment_url,
                payment_instructions: course.payment_instructions,
            },
            { preserveScroll: true },
        );
    }

    /** The list is filtered in the browser: one teacher owns a handful of courses. */
    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (needle === '') {
            return courses;
        }

        return courses.filter((course) =>
            `${course.title} ${course.description ?? ''}`.toLowerCase().includes(needle),
        );
    }, [courses, query]);

    function create(event: FormEvent): void {
        event.preventDefault();
        form.transform(coursePayload);
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
                        A course groups your classes. Make it free, or paid: a paid course still accepts the class
                        key, but its live room stays locked until you confirm each student's payment.
                    </p>
                </div>
                <Link href={routes.instructor.dashboard} className="btn btn-quiet">
                    Back to overview
                </Link>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
                <form onSubmit={create} className="card p-4 lg:sticky lg:top-20">
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

                        <Field label="Status" error={form.errors.status}>
                            {(id) => (
                                <Select
                                    id={id}
                                    value={form.data.status}
                                    onChange={(status) => form.setData('status', status)}
                                    options={COURSE_STATUSES}
                                />
                            )}
                        </Field>

                        <CoursePaymentFields form={form} />

                        <Button type="submit" variant="primary" disabled={form.processing || form.data.title.trim() === ''}>
                            {form.processing ? 'Creating' : 'Create course'}
                        </Button>
                    </div>
                </form>

                <section className="flex flex-col gap-4" aria-labelledby="course-list-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="course-list-heading" className="section-title">
                            All courses
                        </h2>
                        {courses.length > 0 ? (
                            <SearchInput
                                className="w-full sm:w-64"
                                value={query}
                                onChange={setQuery}
                                placeholder="Search courses"
                                ariaLabel="Search courses"
                            />
                        ) : null}
                    </div>

                    {courses.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title="No courses yet"
                                body="Create your first course on the left. You can add classes to it straight away."
                            />
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title="No courses match"
                                body="Try another word, or clear the search to see every course you teach."
                                action={
                                    <Button variant="outline" onClick={() => setQuery('')}>
                                        Clear search
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {visible.map((course) => (
                                <li key={course.id} className="card p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-[15px] font-semibold">{course.title}</h3>
                                                <span
                                                    className={
                                                        course.status === 'published'
                                                            ? 'chip chip-brand'
                                                            : 'chip chip-neutral'
                                                    }
                                                >
                                                    {course.status_label ?? 'Published'}
                                                </span>
                                                {course.is_paid ? (
                                                    <span className="chip chip-brand">Paid · {course.price_label}</span>
                                                ) : (
                                                    <span className="chip chip-neutral">Free</span>
                                                )}
                                            </div>
                                            <p className="meta mt-1">
                                                {pluralize(course.classrooms_count, 'class')}
                                                {course.created_at ? ` · created ${course.created_at}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link href={routes.instructor.course(course.id)} className="btn btn-quiet btn-sm">
                                                <Books size={15} aria-hidden="true" />
                                                Outline
                                            </Link>
                                            <button
                                                type="button"
                                                className="btn btn-quiet btn-sm"
                                                onClick={() => toggleStatus(course)}
                                            >
                                                {course.status === 'published' ? 'Unpublish' : 'Publish'}
                                            </button>
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

                                    {course.is_paid ? (
                                        <div className="mt-3 rounded-xl border border-line bg-surface-sunken/60 px-3 py-2.5">
                                            <p className="text-[12px] font-medium text-ink">
                                                Live rooms unlock after you confirm a student's payment.
                                            </p>
                                            {course.payment_instructions ? (
                                                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                                                    {course.payment_instructions}
                                                </p>
                                            ) : null}
                                            {course.payment_url ? (
                                                <p className="mt-1 truncate text-[12px] text-ink-muted">
                                                    Payment link: {course.payment_url}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

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

function CoursePaymentFields({ form }: { form: InertiaForm<CourseFormData> }) {
    return (
        <div className="rounded-xl border border-line bg-surface-sunken/50 p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
                <input
                    type="checkbox"
                    checked={form.data.is_paid}
                    onChange={(event) => form.setData('is_paid', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
                />
                <span>
                    <span className="block text-[13px] font-medium text-ink">This is a paid course</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">
                        Students can join with the class key, but only paid students can enter the live room.
                    </span>
                </span>
            </label>

            {form.data.is_paid ? (
                <div className="mt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                        <Field label="Price" error={form.errors.price}>
                            {(id) => (
                                <TextInput
                                    id={id}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.price}
                                    onChange={(event) => form.setData('price', event.target.value)}
                                    placeholder="49.00"
                                    invalid={Boolean(form.errors.price)}
                                />
                            )}
                        </Field>

                        <Field label="Currency" error={form.errors.currency}>
                            {(id) => (
                                <Select
                                    id={id}
                                    value={form.data.currency}
                                    onChange={(currency) => form.setData('currency', currency)}
                                    options={CURRENCIES}
                                />
                            )}
                        </Field>
                    </div>

                    <Field
                        label="Payment link"
                        hint="Optional. Where students pay, for example a checkout page."
                        error={form.errors.payment_url}
                    >
                        {(id) => (
                            <TextInput
                                id={id}
                                type="url"
                                value={form.data.payment_url}
                                onChange={(event) => form.setData('payment_url', event.target.value)}
                                placeholder="https://pay.example.com/course"
                                invalid={Boolean(form.errors.payment_url)}
                            />
                        )}
                    </Field>

                    <Field
                        label="Payment instructions"
                        hint="Optional. Bank details or what to send you as proof."
                        error={form.errors.payment_instructions}
                    >
                        {(id) => (
                            <TextArea
                                id={id}
                                value={form.data.payment_instructions}
                                onChange={(event) => form.setData('payment_instructions', event.target.value)}
                                placeholder="Pay to the class account and send the reference to your instructor."
                                rows={3}
                                invalid={Boolean(form.errors.payment_instructions)}
                            />
                        )}
                    </Field>
                </div>
            ) : null}
        </div>
    );
}

function EditCourseForm({ course, onDone }: { course: CourseSummary; onDone: () => void }) {
    const form = useForm<CourseFormData>(courseData(course));

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.transform(coursePayload);
        form.patch(routes.instructor.course(course.id), {
            preserveScroll: true,
            onSuccess: onDone,
        });
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

            <Field label="Status" error={form.errors.status}>
                {(id) => (
                    <Select
                        id={id}
                        value={form.data.status}
                        onChange={(status) => form.setData('status', status)}
                        options={COURSE_STATUSES}
                    />
                )}
            </Field>

            <CoursePaymentFields form={form} />

            <ModalFooter
                onCancel={onDone}
                submitLabel="Save changes"
                busy={form.processing}
                icon={<ArrowRight size={15} weight="bold" aria-hidden="true" />}
            />
        </form>
    );
}
