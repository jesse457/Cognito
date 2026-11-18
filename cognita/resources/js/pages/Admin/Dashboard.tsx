import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Books, ChalkboardTeacher, ChatsCircle, GraduationCap } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import RoleChip from '@/components/ui/RoleChip';
import Stat from '@/components/ui/Stat';
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

            <section className="kpi-row grid-cols-2 xl:grid-cols-4" aria-label="Platform counts">
                <Stat
                    label="Accounts"
                    value={counts.users}
                    hint={pluralize(counts.admins, 'administrator')}
                />
                <Stat
                    label="Instructors"
                    value={counts.instructors}
                    hint="Can create courses and classes"
                />
                <Stat label="Students" value={counts.students} hint="Join classes with a key" />
                <Stat
                    label="Teaching"
                    value={`${counts.courses}/${counts.classrooms}`}
                    hint="courses / live classes"
                />
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
                            <li key={user.id} className="flex items-center gap-3 px-4 py-2.5">
                                <Avatar name={user.name} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-medium text-ink">{user.name}</p>
                                    <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
                                </div>
                                <RoleChip role={user.role} />
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <Link href={routes.admin.users} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                            <ChatsCircle size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-ink">People</span>
                            <span className="block text-[12px] text-ink-muted">Promote instructors, remove accounts</span>
                        </span>
                        <ArrowRight size={15} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <Link href={routes.admin.courses} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                            <Books size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-ink">Courses</span>
                            <span className="block text-[12px] text-ink-muted">{pluralize(counts.courses, 'course')}</span>
                        </span>
                        <ArrowRight size={15} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <Link href={routes.admin.classrooms} className="card flex items-center gap-3 p-4 transition hover:border-line-strong">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                            <ChalkboardTeacher size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-ink">Classes</span>
                            <span className="block text-[12px] text-ink-muted">{pluralize(counts.classrooms, 'class')}</span>
                        </span>
                        <ArrowRight size={15} className="text-ink-soft" aria-hidden="true" />
                    </Link>

                    <div className="card p-4">
                        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                            <GraduationCap size={16} className="text-brand" aria-hidden="true" />
                            How access works
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                            Every page is gated by role. Students only ever see their own classes, instructors only their own
                            teaching, and administrators never edit teaching content.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
