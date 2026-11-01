import { Head, Link } from '@inertiajs/react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Field';
import Stat from '@/components/ui/Stat';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';

interface ReportRow {
    id: number;
    reason: string;
    status: string;
    reportable_type: string;
    reportable_id: number;
    reporter: string | null;
    created_at: string | null;
}

interface AuditRow {
    id: number;
    action: string;
    actor: string | null;
    actor_role: string;
    target_type: string | null;
    target_id: number | null;
    created_at: string | null;
}

interface DashboardProps {
    kpis: {
        users_total: number;
        users_by_role: Record<string, number>;
        open_reports: number;
        courses_total: number;
        courses_removed: number;
        moderation_actions_24h: number;
        audit_rows_24h: number;
    };
    recentReports: ReportRow[];
    recentAudit: AuditRow[];
    capabilities: {
        is_owner: boolean;
        can_view_audit: boolean;
        can_manage_settings: boolean;
        can_invite_staff: boolean;
        sees_all_audit_rows: boolean;
    };
}

export default function Dashboard({ kpis, recentReports, recentAudit, capabilities }: DashboardProps) {
    const staffTotal = Object.entries(kpis.users_by_role)
        .filter(([role]) => ['moderator', 'admin', 'owner'].includes(role))
        .reduce((total, [, count]) => total + count, 0);

    return (
        <>
            <Head title="Overview" />

            <PageHeader
                title="Platform overview"
                subtitle="Moderation, account state and audit activity across Cognita. Figures refresh on every load."
                actions={
                    <>
                        <Link href={adminRoutes.reports.index.url()} className="btn btn-primary">
                            Open moderation queue
                        </Link>
                        {capabilities.can_view_audit ? (
                            <Link href={adminRoutes.audit.index.url()} className="btn btn-secondary">
                                Audit trail
                            </Link>
                        ) : null}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Accounts" value={kpis.users_total} hint={`${staffTotal} staff`} />
                <Stat
                    label="Open reports"
                    value={kpis.open_reports}
                    tone={kpis.open_reports > 0 ? 'danger' : 'default'}
                    hint={kpis.open_reports > 0 ? 'Needs a moderator' : 'Queue is clear'}
                />
                <Stat
                    label="Courses"
                    value={kpis.courses_total}
                    hint={kpis.courses_removed > 0 ? `${kpis.courses_removed} removed` : 'All published'}
                />
                <Stat
                    label="Moderation actions (24h)"
                    value={kpis.moderation_actions_24h}
                    hint={`${kpis.audit_rows_24h} audit rows you can see`}
                />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_1fr]">
                <Card>
                    <CardHeader
                        title="Latest reports"
                        description="Every resolution writes an audit row and notifies the reporter."
                        actions={
                            <Link href={adminRoutes.reports.index.url()} className="btn btn-ghost btn-sm">
                                View queue
                            </Link>
                        }
                    />
                    {recentReports.length === 0 ? (
                        <EmptyState title="No reports yet" body="When a student reports content it lands here." />
                    ) : (
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Target</Th>
                                    <Th>Reason</Th>
                                    <Th>Status</Th>
                                    <Th>Filed</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentReports.map((report) => (
                                    <Tr key={report.id}>
                                        <Td>
                                            <Link
                                                href={adminRoutes.reports.show.url(report.id)}
                                                className="font-medium text-zinc-900 hover:text-teal-800"
                                            >
                                                {report.reportable_type.replace(/_/g, ' ')} #{report.reportable_id}
                                            </Link>
                                            <p className="meta mt-0.5">by {report.reporter ?? 'unknown user'}</p>
                                        </Td>
                                        <Td className="capitalize">{report.reason.replace(/_/g, ' ')}</Td>
                                        <Td>
                                            <Badge tone={statusTone(report.status)}>{report.status.replace(/_/g, ' ')}</Badge>
                                        </Td>
                                        <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(report.created_at)}</Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </TableWrapper>
                    )}
                </Card>

                <Card>
                    <CardHeader
                        title="Recent audit activity"
                        description={
                            capabilities.sees_all_audit_rows
                                ? 'Owners see every privileged action.'
                                : 'Admins see their own privileged actions.'
                        }
                        actions={
                            capabilities.can_view_audit ? (
                                <Link href={adminRoutes.audit.index.url()} className="btn btn-ghost btn-sm">
                                    Full log
                                </Link>
                            ) : null
                        }
                    />
                    {recentAudit.length === 0 ? (
                        <EmptyState
                            title="No audited actions yet"
                            body="Moderation and role changes appear here the moment staff act."
                        />
                    ) : (
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Action</Th>
                                    <Th>Actor</Th>
                                    <Th>When</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAudit.map((row) => (
                                    <Tr key={row.id}>
                                        <Td>
                                            <span className="font-medium text-zinc-900">{row.action}</span>
                                            {row.target_type ? (
                                                <p className="meta mt-0.5">
                                                    {row.target_type} #{row.target_id}
                                                </p>
                                            ) : null}
                                        </Td>
                                        <Td>
                                            <p className="text-zinc-800">{row.actor ?? 'unknown'}</p>
                                            <p className="meta capitalize">{row.actor_role}</p>
                                        </Td>
                                        <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.created_at)}</Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </TableWrapper>
                    )}
                </Card>
            </div>

            <Card>
                <CardHeader title="Role distribution" description="Rank drives every boundary in the system." />
                <CardBody>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                        {Object.entries(kpis.users_by_role).map(([role, count]) => (
                            <div key={role} className="rounded-lg border border-zinc-200 px-4 py-3">
                                <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">{role}</p>
                                <p className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums">{count}</p>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>
        </>
    );
}
