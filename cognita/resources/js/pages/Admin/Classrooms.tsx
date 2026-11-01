import { Head } from '@inertiajs/react';
import EmptyState from '@/components/ui/EmptyState';
import { pluralize } from '@/lib/utils';

interface AdminClassroomsProps {
    classrooms: Array<{
        id: number;
        name: string;
        course: string | null;
        instructor: string | null;
        members: number;
        created_at: string | null;
    }>;
}

export default function AdminClassrooms({ classrooms }: AdminClassroomsProps) {
    return (
        <>
            <Head title="Classes" />

            <header>
                <h1 className="page-title">Classes</h1>
                <p className="page-sub">
                    Read-only inventory of live classes. Each one is a group call plus a shared board, opened by its
                    instructor.
                </p>
            </header>

            <div className="card">
                <div className="card-head">
                    <h2 className="section-title">All classes</h2>
                    <span className="chip chip-neutral">{pluralize(classrooms.length, 'class', 'classes')}</span>
                </div>

                {classrooms.length === 0 ? (
                    <EmptyState title="No classes yet" body="Instructors create classes from their own console." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Class</th>
                                    <th className="th">Course</th>
                                    <th className="th">Instructor</th>
                                    <th className="th">Students</th>
                                    <th className="th">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classrooms.map((classroom) => (
                                    <tr key={classroom.id} className="row-hover">
                                        <td className="td font-medium text-ink">{classroom.name}</td>
                                        <td className="td">{classroom.course ?? '—'}</td>
                                        <td className="td">{classroom.instructor ?? '—'}</td>
                                        <td className="td tabular">{classroom.members}</td>
                                        <td className="td tabular">{classroom.created_at ?? '—'}</td>
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
