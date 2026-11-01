import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { roleTone, statusTone } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';
import type { Paginated, PanelUser } from '@/types';

interface UsersIndexProps {
    users: Paginated<PanelUser>;
    filters: { search: string; role: string; status: string };
    roles: { value: string; label: string; rank: number }[];
    statuses: string[];
    capabilities: { is_privileged: boolean; can_moderate: boolean };
}

export default function UsersIndex({ users, filters, roles, statuses, capabilities }: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function apply(event: React.FormEvent) {
        event.preventDefault();
        router.get(
            adminRoutes.users.index.url(),
            { search: search || undefined, role: role || undefined, status: status || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function reset() {
        setSearch('');
        setRole('');
        setStatus('');
        router.get(adminRoutes.users.index.url(), {}, { preserveState: false });
    }

    return (
        <>
            <Head title="Users" />

            <PageHeader
                title="Users"
                subtitle="Accounts ranked by role. Moderators receive a redacted view: no email addresses."
            />

            <Card>
                <CardBody>
                    <form onSubmit={apply} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
                        <Field label="Search" htmlFor="search">
                            <input
                                id="search"
                                type="search"
                                className={inputClass}
                                placeholder="Name, display name or email"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </Field>

                        <Field label="Role" htmlFor="role">
                            <select id="role" className={selectClass} value={role} onChange={(event) => setRole(event.target.value)}>
                                <option value="">All roles</option>
                                {roles.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Status" htmlFor="status">
                            <select
                                id="status"
                                className={selectClass}
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                            >
                                <option value="">All statuses</option>
                                {statuses.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="flex items-end gap-2">
                            <button type="submit" className="btn btn-primary">
                                Filter
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                Reset
                            </button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            <Card>
                {users.data.length === 0 ? (
                    <EmptyState
                        title="No accounts match these filters"
                        body="Try a different role, status or search term."
                        action={
                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                Clear filters
                            </button>
                        }
                    />
                ) : (
                    <>
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Account</Th>
                                    <Th>Role</Th>
                                    <Th>Status</Th>
                                    <Th>Last seen</Th>
                                    <Th>Joined</Th>
                                    <Th className="text-right">Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map((user) => (
                                    <Tr key={user.id}>
                                        <Td>
                                            <div className="flex items-center gap-2.5">
                                                <span className="avatar" aria-hidden="true">
                                                    {user.display_label
                                                        .split(' ')
                                                        .slice(0, 2)
                                                        .map((part) => part.charAt(0).toUpperCase())
                                                        .join('')}
                                                </span>
                                                <div>
                                                    <Link
                                                        href={adminRoutes.users.show.url(user.id)}
                                                        className="font-medium text-zinc-900 hover:text-teal-800"
                                                    >
                                                        {user.display_label}
                                                    </Link>
                                                    <p className="meta mt-0.5">
                                                        {user.email ?? 'email hidden for moderators'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            <Badge tone={roleTone(user.role)}>{user.role_label}</Badge>
                                        </Td>
                                        <Td>
                                            <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                                        </Td>
                                        <Td className="whitespace-nowrap text-zinc-500">
                                            {formatDateTime(user.last_seen_at ?? null)}
                                        </Td>
                                        <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(user.created_at)}</Td>
                                        <Td className="text-right">
                                            <Link
                                                href={adminRoutes.users.show.url(user.id)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Open
                                            </Link>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </TableWrapper>

                        <div className="card-footer">
                            <Pagination page={users} />
                        </div>
                    </>
                )}
            </Card>

            {!capabilities.is_privileged ? (
                <p className="meta">
                    You are viewing the moderator projection. Emails and login metadata are reserved for admins and
                    owners.
                </p>
            ) : null}
        </>
    );
}
