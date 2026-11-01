import { Head, Link, router } from '@inertiajs/react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { statusTone } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, selectClass } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { cn, formatDateTime } from '@/lib/utils';
import type { Paginated } from '@/types';

interface ReportRow {
    id: number;
    reason: string;
    reason_label: string;
    status: string;
    status_label: string;
    reportable_type: string;
    reportable_id: number;
    reporter: string | null;
    resolved_by: string | null;
    created_at: string | null;
}

interface ReportsIndexProps {
    reports: Paginated<ReportRow>;
    filters: { status: string; reason: string };
    statuses: { value: string; label: string }[];
    reasons: { value: string; label: string }[];
    counts: Record<string, number>;
}

export default function ReportsIndex({ reports, filters, statuses, reasons, counts }: ReportsIndexProps) {
    const activeStatus = filters.status || 'open';
    const reason = filters.reason ?? '';

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    const tabs: { value: string; label: string; count: number }[] = [
        ...statuses.map((status) => ({
            value: status.value,
            label: status.label,
            count: counts[status.value] ?? 0,
        })),
        { value: 'all', label: 'All', count: total },
    ];

    function visit(next: { status?: string; reason?: string }) {
        router.get(
            adminRoutes.reports.index.url(),
            {
                status: next.status ?? activeStatus,
                reason: (next.reason ?? reason) || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Reports" />

            <PageHeader
                title="Moderation queue"
                subtitle="Content reported by students. Resolving or dismissing a report writes an audit row and notifies the reporter."
            />

            <Card>
                <CardBody>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <nav aria-label="Filter by status">
                            <ul className="flex flex-wrap items-center gap-1">
                                {tabs.map((tab) => {
                                    const active = tab.value === activeStatus;

                                    return (
                                        <li key={tab.value}>
                                            <button
                                                type="button"
                                                onClick={() => visit({ status: tab.value })}
                                                aria-current={active ? 'page' : undefined}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                                                    active
                                                        ? 'border-teal-700 bg-teal-700 text-white'
                                                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
                                                )}
                                            >
                                                {tab.label}
                                                <span
                                                    className={cn(
                                                        'rounded-full px-1.5 text-[11px] tabular-nums',
                                                        active ? 'bg-teal-800 text-white' : 'bg-zinc-100 text-zinc-600',
                                                    )}
                                                >
                                                    {tab.count}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>

                        <div className="w-full sm:w-64">
                            <Field label="Reason" htmlFor="reason">
                                <select
                                    id="reason"
                                    className={selectClass}
                                    value={reason}
                                    onChange={(event) => visit({ reason: event.target.value })}
                                >
                                    <option value="">All reasons</option>
                                    {reasons.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                {reports.data.length === 0 ? (
                    <EmptyState
                        title="No reports match this view"
                        body="Change the status tab or clear the reason filter to see more of the queue."
                        action={
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => visit({ status: 'all', reason: '' })}
                            >
                                Show all reports
                            </button>
                        }
                    />
                ) : (
                    <>
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Target</Th>
                                    <Th>Reason</Th>
                                    <Th>Reporter</Th>
                                    <Th>Status</Th>
                                    <Th>Filed</Th>
                                    <Th className="text-right">Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.data.map((report) => (
                                    <Tr key={report.id}>
                                        <Td>
                                            <Link
                                                href={adminRoutes.reports.show.url(report.id)}
                                                className="font-medium text-zinc-900 hover:text-teal-800"
                                            >
                                                {report.reportable_type.replace(/_/g, ' ')} #{report.reportable_id}
                                            </Link>
                                            <p className="meta mt-0.5">report #{report.id}</p>
                                        </Td>
                                        <Td>{report.reason_label}</Td>
                                        <Td>{report.reporter ?? 'Unknown user'}</Td>
                                        <Td>
                                            <Badge tone={statusTone(report.status)}>{report.status_label}</Badge>
                                            {report.resolved_by ? (
                                                <p className="meta mt-0.5">by {report.resolved_by}</p>
                                            ) : null}
                                        </Td>
                                        <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(report.created_at)}</Td>
                                        <Td className="text-right">
                                            <Link
                                                href={adminRoutes.reports.show.url(report.id)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Review
                                            </Link>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </TableWrapper>

                        <div className="card-footer">
                            <Pagination page={reports} />
                        </div>
                    </>
                )}
            </Card>
        </>
    );
}
