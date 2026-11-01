import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Books, ChalkboardTeacher, ChatsCircle, GraduationCap } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';

interface AdminDashboardProps {
    counts: {
        users: number;
        instructors: number;
        students: number;
        admins: number;
        courses: number;
        classrooms: number;
    };
    recentUsers: Array<{
        id: number;
        name: string;
        email: string;
        role: string;
        created_at: string | null;
    }>;
}

const roleChip: Record<string, string> = {
    admin: 'chip chip-brand',
    instructor: 'chip chip-live',
    student: 'chip chip-neutral',
};

export default function AdminDashboard({ counts, recentUsers }: AdminDashboardProps) {
    return (
        <>
            <Head title="Overview" />

            <header>
                <h1 className="page-title">Overview</h1>
                <p className="page-sub">
                    Three roles, one job each: administrators run accounts, instructors run classes, students join with a
                    key.
                </p>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform counts">
                <div className="stat">
                    <p className="eyebrow">Accounts</p>
                    <p className="stat-value tabular">{counts.users}</p>
                    <p className="meta mt-1">{pluralize(counts.admins, 'administrator')}</p>
                </div>
                <div className="stat">
                    <p className="eyebrow">Instructors</p>
                    <p className="stat-value tabular">{counts.instructors}</p>
                    <p className="meta mt-1">Can create courses and classes</p>
                </div>
                <div className="stat">
                    <p className="eyebrow">Students</p>
                    <p className="stat-value tabular">{counts.students}</p>
                    <p className="meta mt-1">Join classes with a key</p>
                </div>
                <div className="stat">
                    <p className="eyebrow">Teaching</p>
                    <p className="stat-value tabular">
                        {counts.courses}/{counts.classrooms}
                    </p>
                    <p className="meta mt-1">courses / live classes</p>
                </div>
            </section>

            <section className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
                <div className="card">
                    <div className="card-head">
                        <div>
                            <h2 className="section-title">Newest accounts</h2>
                            <p className="meta mt-0.5">The eight most recent sign-ups.</p>
                        </div>
                        <Link href={routes.admin.users} className="btn btn-quiet btn-sm">
                            All people
                            <ArrowRight size={14} weight="bold" aria-hidden="true" />
                        </Link>
                    </div>

                    <ul className="divide-y divide-line">
                        {recentUsers.map((user) => (
                            <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                                <Avatar name={user.name} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                                </div>
                                <span className={roleChip[user.role] ?? 'chip chip-neutral'}>
                                    {user.role === 'admin' ? 'Admin' : user.role === 'instructor' ? 'Instructor' : 'Student'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <Link href={routes.admin.users} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <ChatsCircle size={19} weight="duotone" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">People</span>
                            <span className="block text-xs text-ink-muted">Promote instructors, remove accounts</span>
                        </span>
                        <ArrowRight size={16} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <Link href={routes.admin.courses} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <Books size={19} weight="duotone" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">Courses</span>
                            <span className="block text-xs text-ink-muted">{pluralize(counts.courses, 'course')}</span>
                        </span>
                        <ArrowRight size={16} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <Link href={routes.admin.classrooms} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <ChalkboardTeacher size={19} weight="duotone" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">Classes</span>
                            <span className="block text-xs text-ink-muted">{pluralize(counts.classrooms, 'class', 'classes')}</span>
                        </span>
                        <ArrowRight size={16} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <div className="rounded-2xl border border-line bg-surface-sunken/60 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                            <GraduationCap size={17} weight="duotone" className="text-brand" aria-hidden="true" />
                            How access works
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                            Every page is gated by role. Students only ever see their own classes, instructors only their own
                            teaching, and administrators never edit teaching content.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
