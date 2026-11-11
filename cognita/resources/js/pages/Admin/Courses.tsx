import { Head } from '@inertiajs/react';
import EmptyState from '@/components/ui/EmptyState';
import { pluralize } from '@/lib/utils';

interface AdminCoursesProps {
    courses: Array<{
        id: number;
        title: string;
        description: string | null;
        instructor: string | null;
        classrooms_count: number;
        created_at: string | null;
    }>;
}

export default function AdminCourses({ courses }: AdminCoursesProps) {
    return (
        <>
            <Head title="Courses" />

            <header>
                <h1 className="page-title">Courses</h1>
                <p className="page-sub">Read-only inventory. Courses are created by the instructor who teaches them.</p>
            </header>

            <div className="card">
                <div className="card-head">
                    <h2 className="section-title">All courses</h2>
                    <span className="chip chip-neutral">{pluralize(courses.length, 'course')}</span>
                </div>

                {courses.length === 0 ? (
                    <EmptyState title="No courses yet" body="Instructors create courses from their own console." />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Course</th>
                                    <th className="th">Instructor</th>
                                    <th className="th">Classes</th>
                                    <th className="th">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course.id} className="row-hover">
                                        <td className="td">
                                            <p className="font-medium text-ink">{course.title}</p>
                                            <p className="mt-0.5 max-w-[52ch] text-xs text-ink-muted">
                                                {course.description ?? 'No description'}
                                            </p>
                                        </td>
                                        <td className="td">{course.instructor ?? '—'}</td>
                                        <td className="td tabular">{course.classrooms_count}</td>
                                        <td className="td tabular">{course.created_at ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
