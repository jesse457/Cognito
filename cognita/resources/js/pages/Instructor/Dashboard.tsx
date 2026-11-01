import { Head, Link } from '@inertiajs/react';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Field';
import Meter from '@/components/ui/Meter';
import Stat from '@/components/ui/Stat';
import instructor from '@/lib/instructorRoutes';
import { percent } from '@/lib/utils';

interface ClassCardRow {
    id: number;
    name: string;
    description: string | null;
    join_code: string;
    status: string;
    max_students: number;
    active_students: number;
    avg_mastery: number;
    at_risk_count: number;
    created_at: string | null;
}

interface InstructorDashboardProps {
    dashboard: {
        kpis: {
            classes: number;
            active_students: number;
            avg_mastery: number;
            at_risk_count: number;
        };
        classes: ClassCardRow[];
    };
    threshold: number;
}

export default function InstructorDashboard({ dashboard, threshold }: InstructorDashboardProps) {
    const { kpis, classes } = dashboard;

    return (
        <>
            <Head title="Instructor overview" />

            <PageHeader
                title="Instructor overview"
                subtitle="Class health for every private class you own. Mastery values are read from the knowledge tracing engine; this console does not estimate them."
                actions={
                    <Link href={instructor.classes.index.url()} className="btn btn-secondary">
                        All classes
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Classes" value={kpis.classes} hint="Private classes you own" />
                <Stat
                    label="Active students"
                    value={kpis.active_students}
                    hint="Across every class, counted once"
                />
                <Stat
                    label="Average mastery"
                    value={percent(kpis.avg_mastery)}
                    tone={kpis.avg_mastery < 0.6 ? 'warn' : 'accent'}
                    hint="Mean knowledge tracing probability"
                />
                <Stat
                    label="Students at risk"
                    value={kpis.at_risk_count}
                    tone={kpis.at_risk_count > 0 ? 'danger' : 'default'}
                    hint={`Mastery below ${percent(threshold)} on a knowledge component`}
                />
            </div>

            {classes.length === 0 ? (
                <Card>
                    <EmptyState
                        title="No classes yet"
                        body="A private class is created through the Cognita API. Once one exists, its roster, at-risk students and assignments appear here."
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {classes.map((classRow) => (
                        <ClassCard key={classRow.id} classRow={classRow} />
                    ))}
                </div>
            )}
        </>
    );
}

function ClassCard({ classRow }: { classRow: ClassCardRow }) {
    return (
        <Card className="flex flex-col">
            <CardHeader
                title={
                    <Link
                        href={instructor.classes.show.url(classRow.id)}
                        className="text-zinc-900 hover:text-teal-800"
                    >
                        {classRow.name}
                    </Link>
                }
                description={
                    <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={statusTone(classRow.status)}>{classRow.status}</Badge>
                        <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-zinc-700">
                            {classRow.join_code}
                        </code>
                    </span>
                }
                actions={
                    classRow.at_risk_count > 0 ? (
                        <Badge tone="danger">
                            {classRow.at_risk_count} at risk
                        </Badge>
                    ) : (
                        <Badge tone="success">On track</Badge>
                    )
                }
            />

            <CardBody className="flex flex-1 flex-col gap-3">
                {classRow.description ? (
                    <p className="line-clamp-2 text-sm text-zinc-600">{classRow.description}</p>
                ) : (
                    <p className="text-sm text-zinc-400">No description.</p>
                )}

                <div>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Average mastery</p>
                        <p className="text-xs text-zinc-500 tabular-nums">
                            {classRow.active_students} of {classRow.max_students} seats used
                        </p>
                    </div>
                    <Meter
                        value={classRow.avg_mastery}
                        label={`Average mastery for ${classRow.name}`}
                        className="mt-1.5"
                    />
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                    <p className="meta">{classRow.active_students} active students</p>
                    <Link href={instructor.classes.show.url(classRow.id)} className="btn btn-secondary btn-sm">
                        Open class
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}
