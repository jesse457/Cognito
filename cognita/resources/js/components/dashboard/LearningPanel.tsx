import { Link } from '@inertiajs/react';
import { ArrowUpRight, BookOpen, ChalkboardTeacher, CheckCircle, PlayCircle } from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export interface LearningView {
    courses: Array<{
        id: number;
        title: string;
        completed: number;
        total: number;
        percent: number;
        href: string;
        next_href: string | null;
    }>;
    tasks: Array<{
        id: number;
        kind: 'lesson' | 'course' | 'call';
        label: string;
        context: string;
        href: string;
    }>;
    stats: { courses: number; completed: number; lessons: number; percent: number };
}

const TASK_ICONS = {
    lesson: BookOpen,
    course: PlayCircle,
    call: ChalkboardTeacher,
};

export default function LearningPanel({ learning, title }: { learning: LearningView; title: string }) {
    return (
        <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <h2 className="section-title">{title}</h2>
                        <p className="meta mt-0.5">
                            {learning.stats.completed} of {learning.stats.lessons} lessons · {learning.stats.percent}% overall
                        </p>
                    </div>
                    <span className="text-[22px] font-semibold tabular text-brand">{learning.stats.percent}%</span>
                </div>
                <div
                    className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                    role="progressbar"
                    aria-label="Overall course progress"
                    aria-valuenow={learning.stats.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${learning.stats.percent}%` }} />
                </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-line p-4 lg:border-r lg:border-b-0">
                    <p className="px-0.5 pb-2 text-[10.5px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                        Your tasks
                    </p>
                    {learning.tasks.length === 0 ? (
                        <EmptyState title="All caught up" body="No lessons or calls need your attention right now." />
                    ) : (
                        <ul className="flex flex-col gap-1">
                            {learning.tasks.map((task) => {
                                const Icon = TASK_ICONS[task.kind];

                                return (
                                    <li key={`${task.kind}-${task.id}`}>
                                        <Link
                                            href={task.href}
                                            className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken"
                                        >
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                                                <Icon size={14} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[12.5px] font-medium text-ink">{task.label}</span>
                                                <span className="block truncate text-[11.5px] text-ink-soft">{task.context}</span>
                                            </span>
                                            <ArrowUpRight size={13} className="shrink-0 text-ink-soft opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="p-4">
                    <p className="px-0.5 pb-2 text-[10.5px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
                        Courses
                    </p>
                    {learning.courses.length === 0 ? (
                        <EmptyState title="No courses yet" body="Browse the community course library to get started." />
                    ) : (
                        <ul className="flex flex-col gap-2.5">
                            {learning.courses.map((course) => (
                                <li key={course.id}>
                                    <Link href={course.next_href ?? course.href} className="block rounded-lg px-2 py-1.5 hover:bg-surface-sunken">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle
                                                size={14}
                                                className={cn('shrink-0', course.percent === 100 ? 'text-live' : 'text-ink-soft')}
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{course.title}</span>
                                            <span className="text-[11.5px] tabular text-ink-soft">
                                                {course.completed}/{course.total}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 ml-6 h-1 overflow-hidden rounded-full bg-surface-sunken">
                                            <div className="h-full rounded-full bg-mentor" style={{ width: `${course.percent}%` }} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
