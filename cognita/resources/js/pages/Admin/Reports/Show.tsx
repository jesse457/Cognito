import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { roleTone, statusTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';

interface ReportProps {
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
    details: string | null;
    resolution_note: string | null;
    resolved_at: string | null;
    reporter_email: string | null;
    reportable: { type: string; id: number; label: string } | null;
    author: { id: number; name: string; role: string } | null;
}

interface ReportsShowProps {
    report: ReportProps;
    capabilities: {
        can_resolve: boolean;
        can_dismiss: boolean;
        has_author: boolean;
        can_ban_author: boolean;
    };
}

const actions = [
    { value: '', label: 'No account action' },
    { value: 'warn', label: 'Warn the author' },
    { value: 'suspend', label: 'Suspend the author' },
    { value: 'ban', label: 'Ban the author' },
    { value: 'unban', label: 'Reinstate the author' },
];

export default function ReportsShow({ report, capabilities }: ReportsShowProps) {
    const [action, setAction] = useState('');

    const isClosed = report.status === 'resolved' || report.status === 'dismissed';

    return (
        <>
            <Head title={`Report #${report.id}`} />

            <PageHeader
                title={`Report #${report.id}`}
                subtitle={`${report.reason_label} report filed ${formatDateTime(report.created_at)}.`}
                actions={
                    <Link href={adminRoutes.reports.index.url()} className="btn btn-secondary btn-sm">
                        Back to queue
                    </Link>
                }
            />

            <Card>
                <CardHeader
                    title="Summary"
                    description="What was reported, who reported it, and the current handling state."
                    actions={
                        <>
                            <Badge tone={statusTone(report.status)}>{report.status_label}</Badge>
                            {report.status === 'open' || report.status === 'in_review' ? (
                                <Form {...adminRoutes.reports.assign.form(report.id)}>
                                    {({ processing }) => (
                                        <button type="submit" className="btn btn-secondary btn-sm" disabled={processing}>
                                            {processing ? 'Assigning' : 'Assign to me'}
                                        </button>
                                    )}
                                </Form>
                            ) : null}
                        </>
                    }
                />
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th className="w-48">Field</Th>
                            <Th>Value</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Reason</Td>
                            <Td>{report.reason_label}</Td>
                        </Tr>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Status</Td>
                            <Td>{report.status_label}</Td>
                        </Tr>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Reporter</Td>
                            <Td>
                                <p className="text-zinc-800">{report.reporter ?? 'Unknown user'}</p>
                                <p className="meta mt-0.5">{report.reporter_email ?? 'Email hidden for moderators'}</p>
                            </Td>
                        </Tr>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Reported item</Td>
                            <Td>{report.reportable?.label ?? `${report.reportable_type} #${report.reportable_id}`}</Td>
                        </Tr>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Filed</Td>
                            <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(report.created_at)}</Td>
                        </Tr>
                        <Tr>
                            <Td className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Details</Td>
                            <Td className="max-w-[70ch]">{report.details ?? 'No details were provided.'}</Td>
                        </Tr>
                    </tbody>
                </TableWrapper>
            </Card>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Card>
                    <CardHeader title="Reported item" description="The content this report points at." />
                    <CardBody>
                        {report.reportable ? (
                            <div>
                                <p className="text-sm font-medium text-zinc-900">{report.reportable.label}</p>
                                <p className="meta mt-1">
                                    {report.reportable.type.replace(/_/g, ' ')} #{report.reportable.id}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-600">
                                The reported item no longer exists. It was deleted before this report was reviewed.
                            </p>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Author" description="Who owns the reported content. Account actions act on this person." />
                    <CardBody>
                        {report.author ? (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="avatar" aria-hidden="true">
                                        {report.author.name
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((part) => part.charAt(0).toUpperCase())
                                            .join('')}
                                    </span>
                                    <div>
                                        <Link
                                            href={adminRoutes.users.show.url(report.author.id)}
                                            className="text-sm font-medium text-zinc-900 hover:text-teal-800"
                                        >
                                            {report.author.name}
                                        </Link>
                                        <p className="meta mt-0.5">
                                            <Badge tone={roleTone(report.author.role)}>{report.author.role}</Badge>
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={adminRoutes.users.show.url(report.author.id)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    Open account
                                </Link>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-600">
                                No author could be resolved for this report, so account actions are unavailable.
                            </p>
                        )}
                    </CardBody>
                </Card>
            </div>

            {isClosed ? (
                <Card>
                    <CardHeader
                        title="Resolution"
                        description="This report is closed. The record is read only and the audit row cannot be changed."
                    />
                    <CardBody>
                        <dl className="dl">
                            <div>
                                <dt className="dt">Outcome</dt>
                                <dd className="dd">{report.status_label}</dd>
                            </div>
                            <div>
                                <dt className="dt">Handled by</dt>
                                <dd className="dd">{report.resolved_by ?? 'Unknown'}</dd>
                            </div>
                            <div>
                                <dt className="dt">Closed at</dt>
                                <dd className="dd">{formatDateTime(report.resolved_at)}</dd>
                            </div>
                            <div>
                                <dt className="dt">Note</dt>
                                <dd className="dd max-w-[60ch]">{report.resolution_note ?? 'No note recorded.'}</dd>
                            </div>
                        </dl>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
                    {capabilities.can_resolve ? (
                        <Card>
                            <CardHeader
                                title="Resolve"
                                description="Closes the report as upheld. An optional account action is applied in the same step and audited."
                            />
                            <CardBody>
                                <Form {...adminRoutes.reports.resolve.form(report.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field
                                                label="Resolution note"
                                                htmlFor="resolve-note"
                                                required
                                                hint="Goes into the audit record and the reporter notification."
                                                error={errors.resolution_note}
                                            >
                                                <textarea
                                                    id="resolve-note"
                                                    name="resolution_note"
                                                    rows={4}
                                                    className={inputClass}
                                                    placeholder="What you found and what you did"
                                                    required
                                                />
                                            </Field>

                                            <Field
                                                label="Account action"
                                                htmlFor="resolve-action"
                                                hint={
                                                    capabilities.can_ban_author
                                                        ? 'Optional. Applied to the author in the same transaction.'
                                                        : 'Account actions are unavailable for this author.'
                                                }
                                                error={errors.action}
                                            >
                                                <select
                                                    id="resolve-action"
                                                    name="action"
                                                    className={selectClass}
                                                    value={action}
                                                    onChange={(event) => setAction(event.target.value)}
                                                    disabled={!capabilities.can_ban_author}
                                                >
                                                    {actions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>

                                            {action === 'suspend' ? (
                                                <Field
                                                    label="Suspension days"
                                                    htmlFor="resolve-days"
                                                    hint="Between 1 and 30 days."
                                                    error={errors.duration_days}
                                                >
                                                    <input
                                                        id="resolve-days"
                                                        name="duration_days"
                                                        type="number"
                                                        min={1}
                                                        max={30}
                                                        step={1}
                                                        defaultValue={7}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                            ) : null}

                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                                    {processing ? 'Resolving' : 'Resolve report'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader title="Resolve" />
                            <CardBody>
                                <p className="text-sm text-zinc-600">
                                    Your role cannot resolve this report. Ask an admin if it needs an outcome.
                                </p>
                            </CardBody>
                        </Card>
                    )}

                    {capabilities.can_dismiss ? (
                        <Card>
                            <CardHeader
                                title="Dismiss"
                                description="Closes the report without an action on the author. Use when the report is unfounded."
                            />
                            <CardBody>
                                <Form {...adminRoutes.reports.dismiss.form(report.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field
                                                label="Dismissal note"
                                                htmlFor="dismiss-note"
                                                required
                                                error={errors.resolution_note}
                                            >
                                                <textarea
                                                    id="dismiss-note"
                                                    name="resolution_note"
                                                    rows={4}
                                                    className={inputClass}
                                                    placeholder="Why this report is not upheld"
                                                    required
                                                />
                                            </Field>
                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-danger" disabled={processing}>
                                                    {processing ? 'Dismissing' : 'Dismiss report'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader title="Dismiss" />
                            <CardBody>
                                <p className="text-sm text-zinc-600">
                                    Your role cannot dismiss this report.
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}
        </>
    );
}
