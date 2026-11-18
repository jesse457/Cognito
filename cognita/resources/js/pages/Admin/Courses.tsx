import { Head } from '@inertiajs/react';
import InventoryTable from '@/components/admin/InventoryTable';
import { pluralize } from '@/lib/utils';

interface AdminCoursesProps {
    courses: Array<{
        id: number;
        title: string;
        description: string | null;
        instructor: string | null;
        is_paid: boolean;
        price_label: string | null;
        classrooms_count: number;
        created_at: string | null;
    }>;
}

export default function AdminCourses({ courses }: AdminCoursesProps) {
    return (
        <>
            <Head title="Courses" />

            <InventoryTable
                title="Courses"
                subtitle="Read-only inventory. Courses are created by the instructor who teaches them."
                count={pluralize(courses.length, 'course')}
                rows={courses}
                emptyTitle="No courses yet"
                emptyBody="Instructors create courses from their own console."
                searchText={(course) => `${course.title} ${course.description ?? ''} ${course.instructor ?? ''}`}
                columns={[
                    {
                        header: 'Course',
                        cell: (course) => (
                            <>
                                <p className="font-medium text-ink">{course.title}</p>
                                <p className="mt-0.5 max-w-[52ch] text-xs text-ink-muted">
                                    {course.description ?? 'No description'}
                                </p>
                            </>
                        ),
                    },
                    { header: 'Instructor', cell: (course) => course.instructor ?? '—' },
                    {
                        header: 'Access',
                        cell: (course) => (course.is_paid ? `Paid · ${course.price_label}` : 'Free'),
                    },
                    { header: 'Classes', cell: (course) => course.classrooms_count, numeric: true },
                    { header: 'Created', cell: (course) => course.created_at ?? '—', numeric: true },
                ]}
            />
        </>
    );
}
