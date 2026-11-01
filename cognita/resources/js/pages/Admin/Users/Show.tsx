import { Form, Head, Link } from '@inertiajs/react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { roleTone, statusTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';
import type { PanelUser } from '@/types';

interface ModerationRow {
    id: number;
    action: string;
    reason: string | null;
    actor: string | null;
    expires_at: string | null;
    created_at: string | null;
}

interface AuditRow {
    id: number;
    action: string;
    actor: number | null;
    actor_role: string;
    created_at: string | null;
    context: Record<string, unknown>;
}

interface RoleOption {
    value: string;
    label: string;
    rank: number;
}

interface UsersShowProps {
    user: PanelUser & {
        email?: string | null;
        last_seen_at?: string | null;
        email_verified_at?: string | null;
        suspended_until?: string | null;
        has_active_suspension?: boolean;
        avatar_url?: string | null;
        can_manage?: boolean;
    };
    moderationHistory: ModerationRow[];
    auditHistory: AuditRow[];
    capabilities: {
        can_warn: boolean;
        can_suspend: boolean;
        can_ban: boolean;
        can_unban: boolean;
        can_change_role: boolean;
        can_impersonate: boolean;
        role_options: RoleOption[];
    };
}

function initialsFrom(label: string): string {
    return label
        .split(' ')
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function humanise(value: string): string {
    return value.replace(/_/g, ' ');
}

export default function UsersShow({ user, moderationHistory, auditHistory, capabilities }: UsersShowProps) {
    const canModerate =
        capabilities.can_warn ||
        capabilities.can_suspend ||
        capabilities.can_ban ||
        capabilities.can_unban ||
        capabilities.can_change_role;

    return (
        <>
            <Head title={`User ${user.display_label}`} />

            <PageHeader
                title={user.display_label}
                subtitle="Account record, moderation history and every audited action taken against this account."
                actions={
                    <Link href={adminRoutes.users.index.url()} className="btn btn-secondary btn-sm">
                        Back to users
                    </Link>
                }
            />

            <Card>
                <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="avatar h-12 w-12 text-sm" aria-hidden="true">
                                {initialsFrom(user.display_label)}
                            </span>
                            <div>
                                <p className="text-base font-semibold text-zinc-900">{user.display_label}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <Badge tone={roleTone(user.role)}>{user.role_label}</Badge>
                                    <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                                    {user.is_staff ? <Badge tone="info">staff</Badge> : null}
                                </div>
                                <p className="meta mt-1.5">{user.email ?? 'Email hidden for moderators'}</p>
                            </div>
                        </div>
                        <p className="meta max-w-[42ch]">
                            Every action on this page writes a moderation row and an audit row. Actions are not
                            reversible from the console except where a reversal is offered.
                        </p>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Account details" description="Fields visible to your role. Private fields are redacted for moderators." />
                <CardBody>
                    <dl className="dl">
                        <div>
                            <dt className="dt">Account id</dt>
                            <dd className="dd tabular-nums">#{user.id}</dd>
                        </div>
                        <div>
                            <dt className="dt">Name</dt>
                            <dd className="dd">{user.name}</dd>
                        </div>
                        <div>
                            <dt className="dt">Display name</dt>
                            <dd className="dd">{user.display_name ?? 'Not set'}</dd>
                        </div>
                        <div>
                            <dt className="dt">Email</dt>
                            <dd className="dd">{user.email ?? 'Hidden'}</dd>
                        </div>
                        <div>
                            <dt className="dt">Email verified</dt>
                            <dd className="dd">{formatDateTime(user.email_verified_at ?? null)}</dd>
                        </div>
                        <div>
                            <dt className="dt">Role</dt>
                            <dd className="dd">{user.role_label}</dd>
                        </div>
                        <div>
                            <dt className="dt">Status</dt>
                            <dd className="dd capitalize">{user.status}</dd>
                        </div>
                        <div>
                            <dt className="dt">Suspended until</dt>
                            <dd className="dd">{formatDateTime(user.suspended_until ?? null)}</dd>
                        </div>
                        <div>
                            <dt className="dt">Last seen</dt>
                            <dd className="dd">{formatDateTime(user.last_seen_at ?? null)}</dd>
                        </div>
                        <div>
                            <dt className="dt">Joined</dt>
                            <dd className="dd">{formatDateTime(user.created_at)}</dd>
                        </div>
                    </dl>
                </CardBody>
            </Card>

            {canModerate ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {capabilities.can_warn ? (
                        <Card>
                            <CardHeader title="Warn" description="Records a warning against the account. The user is notified." />
                            <CardBody>
                                <Form {...adminRoutes.users.warn.form(user.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field label="Reason" htmlFor="warn-reason" required error={errors.reason}>
                                                <textarea
                                                    id="warn-reason"
                                                    name="reason"
                                                    rows={3}
                                                    className={inputClass}
                                                    placeholder="What the warning is for"
                                                    required
                                                />
                                            </Field>
                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-secondary" disabled={processing}>
                                                    {processing ? 'Sending warning' : 'Send warning'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : null}

                    {capabilities.can_suspend ? (
                        <Card>
                            <CardHeader
                                title="Suspend"
                                description="Blocks sign in until the suspension expires or an admin reinstates the account."
                            />
                            <CardBody>
                                <Form {...adminRoutes.users.suspend.form(user.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field label="Reason" htmlFor="suspend-reason" required error={errors.reason}>
                                                <textarea
                                                    id="suspend-reason"
                                                    name="reason"
                                                    rows={2}
                                                    className={inputClass}
                                                    placeholder="What the suspension is for"
                                                    required
                                                />
                                            </Field>
                                            <Field
                                                label="Days"
                                                htmlFor="suspend-days"
                                                required
                                                hint="Between 1 and 30 days."
                                                error={errors.days}
                                            >
                                                <input
                                                    id="suspend-days"
                                                    name="days"
                                                    type="number"
                                                    min={1}
                                                    max={30}
                                                    step={1}
                                                    defaultValue={7}
                                                    className={inputClass}
                                                    required
                                                />
                                            </Field>
                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                                    {processing ? 'Suspending' : 'Suspend account'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : null}

                    {capabilities.can_ban ? (
                        <Card>
                            <CardHeader
                                title="Ban"
                                description="Bans the account with no expiry. Reinstating a banned account is a separate action."
                            />
                            <CardBody>
                                <Form {...adminRoutes.users.ban.form(user.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field label="Reason" htmlFor="ban-reason" required error={errors.reason}>
                                                <textarea
                                                    id="ban-reason"
                                                    name="reason"
                                                    rows={3}
                                                    className={inputClass}
                                                    placeholder="What the ban is for"
                                                    required
                                                />
                                            </Field>
                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-danger" disabled={processing}>
                                                    {processing ? 'Banning' : 'Ban account'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : null}

                    {capabilities.can_unban ? (
                        <Card>
                            <CardHeader
                                title="Reinstate"
                                description="Clears a ban or an active suspension. The reason is optional but recorded."
                            />
                            <CardBody>
                                <Form {...adminRoutes.users.unban.form(user.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-3">
                                            <Field
                                                label="Reason"
                                                htmlFor="unban-reason"
                                                hint="Leave empty to record the default reason, manual unban."
                                                error={errors.reason}
                                            >
                                                <textarea
                                                    id="unban-reason"
                                                    name="reason"
                                                    rows={2}
                                                    className={inputClass}
                                                    placeholder="Why the account is being reinstated"
                                                />
                                            </Field>
                                            <div className="form-footer">
                                                <button type="submit" className="btn btn-secondary" disabled={processing}>
                                                    {processing ? 'Reinstating' : 'Reinstate account'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                            </CardBody>
                        </Card>
                    ) : null}

                    {capabilities.can_change_role ? (
                        <Card className="xl:col-span-2">
                            <CardHeader
                                title="Change role"
                                description="Role decides every boundary in the system. This action is audited and the target is notified."
                            />
                            <CardBody>
                                <Form {...adminRoutes.users.role.form(user.id)} resetOnSuccess>
                                    {({ errors, processing }) => (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto]">
                                            <Field
                                                label="New role"
                                                htmlFor="role-role"
                                                required
                                                hint="Only roles at or below your own rank are listed."
                                                error={errors.role}
                                            >
                                                <select
                                                    id="role-role"
                                                    name="role"
                                                    className={selectClass}
                                                    defaultValue={user.role}
                                                    required
                                                >
                                                    {capabilities.role_options.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Reason" htmlFor="role-reason" required error={errors.reason}>
                                                <input
                                                    id="role-reason"
                                                    name="reason"
                                                    type="text"
                                                    className={inputClass}
                                                    placeholder="Why the role is changing"
                                                    required
                                                />
                                            </Field>
                                            <div className="flex items-end">
                                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                                    {processing ? 'Changing role' : 'Change role'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Form>
                                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    A role change is written to the audit trail with your identity and the reason you
                                    give. It cannot be deleted.
                                </p>
                            </CardBody>
                        </Card>
                    ) : null}
                </div>
            ) : (
                <Card>
                    <CardBody>
                        <p className="text-sm text-zinc-600">
                            You cannot moderate this account. Your role rank does not allow actions against it.
                        </p>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader
                    title="Moderation history"
                    description="The last 20 moderation actions taken against this account."
                />
                {moderationHistory.length === 0 ? (
                    <EmptyState title="No moderation actions" body="This account has never been warned, suspended or banned." />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Action</Th>
                                <Th>Reason</Th>
                                <Th>Actor</Th>
                                <Th>Expires</Th>
                                <Th>Recorded</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {moderationHistory.map((row) => (
                                <Tr key={row.id}>
                                    <Td>
                                        <Badge tone={statusTone(row.action)}>{humanise(row.action)}</Badge>
                                    </Td>
                                    <Td className="max-w-[38ch]">{row.reason ?? 'No reason recorded'}</Td>
                                    <Td>{row.actor ?? 'Unknown'}</Td>
                                    <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.expires_at)}</Td>
                                    <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.created_at)}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>

            <Card>
                <CardHeader
                    title="Audit history"
                    description="Append-only rows that target this account. There is no edit or delete path."
                />
                {auditHistory.length === 0 ? (
                    <EmptyState
                        title="No audit rows for this account"
                        body="Rows appear here after a privileged action targets this account."
                    />
                ) : (
                    <TableWrapper>
                        <thead>
                            <tr>
                                <Th>Action</Th>
                                <Th>Actor</Th>
                                <Th>Context</Th>
                                <Th>Recorded</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditHistory.map((row) => (
                                <Tr key={row.id}>
                                    <Td className="font-medium text-zinc-900">{row.action}</Td>
                                    <Td>
                                        <p className="text-zinc-800">{row.actor === null ? 'system' : `user #${row.actor}`}</p>
                                        <p className="meta capitalize">{row.actor_role}</p>
                                    </Td>
                                    <Td className="max-w-[42ch]">
                                        {Object.keys(row.context ?? {}).length === 0 ? (
                                            <span className="meta">none</span>
                                        ) : (
                                            <details>
                                                <summary className="cursor-pointer text-xs text-zinc-600">
                                                    {Object.keys(row.context).length} key(s)
                                                </summary>
                                                <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-zinc-50 p-2 text-[11px] text-zinc-700">
                                                    {JSON.stringify(row.context, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </Td>
                                    <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.created_at)}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </TableWrapper>
                )}
            </Card>
        </>
    );
}
