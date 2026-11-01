import { Form, Head, router } from '@inertiajs/react';
import { useState } from 'react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';
import type { Paginated } from '@/types';

interface CourseRow {
    id: number;
    title: string;
    status: string;
    status_label: string;
    is_ai_generated: boolean;
    modules_count: number;
    lessons_count: number;
    enrollments_count: number;
    creator: string | null;
    removed_by: string | null;
    removal_reason: string | null;
    created_at: string | null;
}

interface CoursesIndexProps {
    courses: Paginated<CourseRow>;
    filters: { search: string; status: string };
    statuses: { value: string; label: string }[];
}

export default function CoursesIndex({ courses, filters, statuses }: CoursesIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function apply(event: React.FormEvent) {
        event.preventDefault();
        router.get(
            adminRoutes.courses.index.url(),
            { search: search || undefined, status: status || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function reset() {
        setSearch('');
        setStatus('');
        router.get(adminRoutes.courses.index.url(), {}, { preserveState: false });
    }

    return (
        <>
            <Head title="Courses" />

            <PageHeader
                title="Courses"
                subtitle="Remove misleading or broken courses from the catalogue, and restore them after review. Every removal is audited."
            />

            <Card>
                <CardBody>
                    <form onSubmit={apply} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
                        <Field label="Search" htmlFor="course-search">
                            <input
                                id="course-search"
                                type="search"
                                className={inputClass}
                                placeholder="Course title"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </Field>

                        <Field label="Status" htmlFor="course-status">
                            <select
                                id="course-status"
                                className={selectClass}
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                            >
                                <option value="">All statuses</option>
                                {statuses.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="flex items-end gap-2">
                            <button type="submit" className="btn btn-primary">
                                Filter
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                Reset
                            </button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            <Card>
                {courses.data.length === 0 ? (
                    <EmptyState
                        title="No courses match these filters"
                        body="Try a different status or search term."
                        action={
                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                Clear filters
                            </button>
                        }
                    />
                ) : (
                    <>
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Course</Th>
                                    <Th>Content</Th>
                                    <Th>Creator</Th>
                                    <Th>Status</Th>
                                    <Th>Created</Th>
                                    <Th>Moderation</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.data.map((course) => {
                                    const removed = course.status === 'removed';

                                    return (
                                        <Tr key={course.id}>
                                            <Td>
                                                <p className="font-medium text-zinc-900">{course.title}</p>
                                                <p className="meta mt-0.5 flex items-center gap-1.5">
                                                    course #{course.id}
                                                    {course.is_ai_generated ? <Badge tone="accent">AI generated</Badge> : null}
                                                </p>
                                            </Td>
                                            <Td className="whitespace-nowrap text-zinc-600 tabular-nums">
                                                {course.modules_count} modules, {course.lessons_count} lessons
                                                <p className="meta mt-0.5">{course.enrollments_count} enrolled</p>
                                            </Td>
                                            <Td>{course.creator ?? 'Unknown'}</Td>
                                            <Td>
                                                <Badge tone={statusTone(course.status)}>{course.status_label}</Badge>
                                                {removed && course.removal_reason ? (
                                                    <p className="meta mt-1 max-w-[30ch]">{course.removal_reason}</p>
                                                ) : null}
                                                {removed && course.removed_by ? (
                                                    <p className="meta mt-0.5">by {course.removed_by}</p>
                                                ) : null}
                                            </Td>
                                            <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(course.created_at)}</Td>
                                            <Td className="min-w-[18rem]">
                                                {removed ? (
                                                    <Form {...adminRoutes.courses.restore.form(course.id)}>
                                                        {({ processing }) => (
                                                            <div className="flex flex-col gap-1.5">
                                                                <button
                                                                    type="submit"
                                                                    className="btn btn-secondary btn-sm"
                                                                    disabled={processing}
                                                                >
                                                                    {processing ? 'Restoring' : 'Restore to catalogue'}
                                                                </button>
                                                                <p className="meta">
                                                                    Puts the course back in the catalogue and undoes the removal.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </Form>
                                                ) : (
                                                    <Form {...adminRoutes.courses.remove.form(course.id)} resetOnSuccess>
                                                        {({ errors, processing }) => (
                                                            <div className="flex flex-col gap-1.5">
                                                                <label
                                                                    htmlFor={`remove-reason-${course.id}`}
                                                                    className="label mb-0 text-xs"
                                                                >
                                                                    Removal reason
                                                                    <span className="text-red-600"> *</span>
                                                                </label>
                                                                <input
                                                                    id={`remove-reason-${course.id}`}
                                                                    name="reason"
                                                                    type="text"
                                                                    className={inputClass}
                                                                    placeholder="Why this course is being removed"
                                                                    required
                                                                />
                                                                {errors.reason ? (
                                                                    <p className="error">{errors.reason}</p>
                                                                ) : null}
                                                                <button
                                                                    type="submit"
                                                                    className="btn btn-danger btn-sm"
                                                                    disabled={processing}
                                                                >
                                                                    {processing ? 'Removing' : 'Remove from catalogue'}
                                                                </button>
                                                                <p className="meta">
                                                                    Hides the course from students and records the reason in the
                                                                    audit trail.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </Form>
                                                )}
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </TableWrapper>

                        <div className="card-footer">
                            <Pagination page={courses} />
                        </div>
                    </>
                )}
            </Card>
        </>
    );
}
