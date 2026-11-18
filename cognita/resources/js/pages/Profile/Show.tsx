import { Head, Link, router } from '@inertiajs/react';
import { Books, ChatsCircle, HouseLine, SignOut, UserCircle } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import RoleChip from '@/components/ui/RoleChip';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';

interface ProfileProps {
    user: {
        id: number;
        name: string;
        email: string;
        role: 'admin' | 'instructor' | 'student';
        role_label: string;
        status: string;
        initials: string;
        member_since: string | null;
    };
    totals: {
        courses_teaching: number;
        courses_studying: number;
        classes: number;
        posts: number;
    };
}

export default function Profile({ user, totals }: ProfileProps) {
    const links = [
        {
            label: 'Dashboard',
            body: user.role === 'instructor' ? 'Your classes, calls and attendance.' : 'Your classes, tasks and progress.',
            href: user.role === 'admin'
                ? routes.admin.dashboard
                : user.role === 'instructor'
                    ? routes.instructor.dashboard
                    : routes.student.home,
            icon: HouseLine,
        },
        ...(user.role === 'admin'
            ? []
            : [
                {
                    label: 'Community',
                    body: 'Posts, groups and the course library.',
                    href: routes.questions.index,
                    icon: ChatsCircle,
                },
                {
                    label: 'Courses',
                    body: 'Browse free and paid courses.',
                    href: routes.community.courses,
                    icon: Books,
                },
            ]),
    ];

    return (
        <>
            <Head title="Your profile" />

            <section className="card flex flex-wrap items-center gap-4 p-5">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0 flex-1">
                    <p className="eyebrow">Your profile</p>
                    <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-ink">{user.name}</h1>
                    <p className="meta mt-0.5">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <RoleChip role={user.role} />
                    <p className="meta">
                        {user.status === 'active' ? 'Active account' : user.status}
                        {user.member_since ? ` · joined ${user.member_since}` : ''}
                    </p>
                </div>
            </section>

            <section className="kpi-row grid-cols-2 xl:grid-cols-4" aria-label="Your totals">
                <Stat label="Courses teaching" value={totals.courses_teaching} icon={UserCircle} />
                <Stat label="Courses studying" value={totals.courses_studying} icon={Books} />
                <Stat label="Classes" value={totals.classes} icon={HouseLine} />
                <Stat label="Community posts" value={totals.posts} icon={ChatsCircle} />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Quick links">
                {links.map(({ label, body, href, icon: Icon }) => (
                    <Link key={label} href={href} className="card group flex flex-col gap-2 p-4 transition hover:border-line-strong">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                            <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="text-[14px] font-semibold text-ink group-hover:text-brand">{label}</span>
                        <span className="text-[12.5px] leading-relaxed text-ink-muted">{body}</span>
                    </Link>
                ))}
            </section>

            <div className="flex justify-start">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => router.post(routes.logout)}>
                    <SignOut size={14} aria-hidden="true" />
                    Sign out
                </button>
            </div>
        </>
    );
}
