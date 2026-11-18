import { Head } from '@inertiajs/react';
import InventoryTable from '@/components/admin/InventoryTable';
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

            <InventoryTable
                title="Classes"
                subtitle="Read-only inventory of live classes. Each one is a group call plus a shared board, opened by its instructor."
                count={pluralize(classrooms.length, 'class')}
                rows={classrooms}
                emptyTitle="No classes yet"
                emptyBody="Instructors create classes from their own console."
                searchText={(classroom) =>
                    `${classroom.name} ${classroom.course ?? ''} ${classroom.instructor ?? ''}`
                }
                columns={[
                    {
                        header: 'Class',
                        cell: (classroom) => <span className="font-medium text-ink">{classroom.name}</span>,
                    },
                    { header: 'Course', cell: (classroom) => classroom.course ?? '—' },
                    { header: 'Instructor', cell: (classroom) => classroom.instructor ?? '—' },
                    { header: 'Students', cell: (classroom) => classroom.members, numeric: true },
                    { header: 'Created', cell: (classroom) => classroom.created_at ?? '—', numeric: true },
                ]}
            />
        </>
    );
}
