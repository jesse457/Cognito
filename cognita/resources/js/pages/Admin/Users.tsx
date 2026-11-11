import { Head, router } from '@inertiajs/react';
import { MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'instructor' | 'student';
    created_at: string | null;
}

interface UsersProps {
    users: Paginated<AdminUser>;
    filters: { search: string; role: string };
}

const roleChip: Record<string, string> = {
    admin: 'chip chip-brand',
    instructor: 'chip chip-live',
    student: 'chip chip-neutral',
};

export default function AdminUsers({ users, filters }: UsersProps) {
    const [search, setSearch] = useState(filters.search);
    const [confirming, setConfirming] = useState<number | null>(null);

    function filter(event: FormEvent): void {
        event.preventDefault();
        router.get(routes.admin.users, { search, role: filters.role }, { preserveState: true, preserveScroll: true });
    }

    function setRole(role: string): void {
        router.get(routes.admin.users, { search: filters.search, role }, { preserveState: true, preserveScroll: true });
    }

    return (
        <>
            <Head title="People" />

            <header>
                <h1 className="page-title">People</h1>
                <p className="page-sub">
                    Change a role to open a surface, or remove an account. Administrators cannot edit another person's
                    courses or classes.
                </p>
            </header>

            <div className="card">
                <div className="card-head">
                    <form onSubmit={filter} className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                            <MagnifyingGlass
                                size={16}
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
                                aria-hidden="true"
                            />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name or email"
                                className="input pl-9"
                                aria-label="Search people"
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>

                    <div className="flex items-center gap-1 rounded-full bg-surface-sunken p-1" role="group" aria-label="Filter by role">
                        {[
                            { value: '', label: 'All' },
                            { value: 'admin', label: 'Admins' },
                            { value: 'instructor', label: 'Instructors' },
                            { value: 'student', label: 'Students' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setRole(option.value)}
                                className={cn(
                                    'rounded-full px-3 py-2 text-xs font-medium transition',
                                    filters.role === option.value
                                        ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(25,28,32,0.08)]'
                                        : 'text-ink-muted hover:text-ink',
                                )}
                                aria-pressed={filters.role === option.value}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {users.data.length === 0 ? (
                    <EmptyState title="No accounts match" body="Try a different search term or clear the role filter." />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Person</th>
                                    <th className="th">Role</th>
                                    <th className="th">Joined</th>
                                    <th className="th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map((user) => (
                                    <tr key={user.id} className="row-hover">
                                        <td className="td">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.name} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-ink">{user.name}</p>
                                                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-2">
                                                <span className={roleChip[user.role]}>
                                                    {user.role === 'admin'
                                                        ? 'Admin'
                                                        : user.role === 'instructor'
                                                          ? 'Instructor'
                                                          : 'Student'}
                                                </span>
                                                <Select
                                                    value={user.role}
                                                    onChange={(role) =>
                                                        router.patch(
                                                            routes.admin.userRole(user.id),
                                                            { role },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    options={[
                                                        { value: 'student', label: 'Student' },
                                                        { value: 'instructor', label: 'Instructor' },
                                                        { value: 'admin', label: 'Admin' },
                                                    ]}
                                                    size="sm"
                                                    className="w-auto"
                                                    ariaLabel={`Change role for ${user.name}. Current role: ${user.role}.`}
                                                />
                                            </div>
                                        </td>
                                        <td className="td tabular">{user.created_at ?? '—'}</td>
                                        <td className="td text-right">
                                            {confirming === user.id ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="text-xs text-ink-muted">Delete?</span>
                                                    <Button variant="quiet" size="sm" onClick={() => setConfirming(null)}>
                                                        No
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() =>
                                                            router.delete(routes.admin.user(user.id), {
                                                                preserveScroll: true,
                                                                onFinish: () => setConfirming(null),
                                                            })
                                                        }
                                                    >
                                                        Yes
                                                    </Button>
                                                </span>
                                            ) : (
                                                <Button
                                                    variant="quiet"
                                                    size="sm"
                                                    className="text-danger hover:bg-danger-soft"
                                                    onClick={() => setConfirming(user.id)}
                                                >
                                                    <Trash size={14} aria-hidden="true" />
                                                    Delete
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={users} />
            </div>
        </>
    );
}
