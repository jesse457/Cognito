import { Head, Link } from '@inertiajs/react';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Field';
import Stat from '@/components/ui/Stat';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import instructor from '@/lib/instructorRoutes';
import type { SharedProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { percent } from '@/lib/utils';

interface ClassRow {
    id: number;
    name: string;
    description: string | null;
    join_code: string;
    status: string;
    max_students: number;
    active_students: number;
    assigned_courses_count: number;
}

interface InstructorClassesIndexProps {
    classes: ClassRow[];
    kpis: {
        classes: number;
        active_students: number;
        avg_mastery: number;
        at_risk_count: number;
    };
}

export default function InstructorClassesIndex({ classes, kpis }: InstructorClassesIndexProps) {
    const { features } = usePage<SharedProps>().props;

    return (
        <>
            <Head title="Classes" />

            <PageHeader
                title="Classes"
                subtitle="Every private class you own, with its join code and enrollment. Students join with the code through the Cognita API."
                actions={
                    <Link href={instructor.dashboard.url()} className="btn btn-secondary">
                        Overview
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Classes" value={kpis.classes} hint="Owned by you" />
                <Stat label="Active students" value={kpis.active_students} hint="Counted once across classes" />
                <Stat label="Average mastery" value={percent(kpis.avg_mastery)} hint="Mean knowledge tracing probability" />
                <Stat
                    label="Students at risk"
                    value={kpis.at_risk_count}
                    tone={kpis.at_risk_count > 0 ? 'danger' : 'default'}
                    hint="Below the configured mastery threshold"
                />
            </div>

            <Card>
                {classes.length === 0 ? (
                    <EmptyState
                        title="No classes yet"
                        body="A private class is created through the Cognita API. Once one exists it appears here with its roster and assignments."
                        action={
                            <Link href={instructor.dashboard.url()} className="btn btn-secondary btn-sm">
                                Back to overview
                            </Link>
                        }
                    />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Class</Th>
                                <Th>Join code</Th>
                                <Th>Status</Th>
                                <Th>Enrollment</Th>
                                <Th>Courses assigned</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((classRow) => (
                                <Tr key={classRow.id}>
                                    <Td>
                                        <Link
                                            href={instructor.classes.show.url(classRow.id)}
                                            className="font-medium text-zinc-900 hover:text-teal-800"
                                        >
                                            {classRow.name}
                                        </Link>
                                        {classRow.description ? (
                                            <p className="meta mt-0.5 line-clamp-1 max-w-[60ch]">{classRow.description}</p>
                                        ) : null}
                                    </Td>
                                    <Td>
                                        <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-zinc-700">
                                            {classRow.join_code}
                                        </code>
                                    </Td>
                                    <Td>
                                        <Badge tone={statusTone(classRow.status)}>{classRow.status}</Badge>
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">
                                        {classRow.active_students} of {classRow.max_students}
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-600 tabular-nums">
                                        {classRow.assigned_courses_count}
                                    </Td>
                                    <Td className="text-right">
                                        <Link
                                            href={instructor.classes.show.url(classRow.id)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Open
                                        </Link>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>

            {!features?.instructorPath ? (
                <p className="meta">The instructor portal is disabled on this deployment, so class pages are not mounted.</p>
            ) : null}
        </>
    );
}
