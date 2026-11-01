import { Link } from '@inertiajs/react';
import { Microphone, PenNib, Key } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

const promises = [
    {
        icon: Key,
        title: 'One key per class',
        body: 'Students type the key, not an email invite. No lists to maintain.',
    },
    {
        icon: Microphone,
        title: 'A room for every class',
        body: 'Group voice opens from the class itself, on the same page as the board.',
    },
    {
        icon: PenNib,
        title: 'A board you both can use',
        body: 'Present a PDF, a notebook page or a blank canvas, then hand the pen over.',
    },
];

export default function GuestShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-[100dvh] bg-canvas">
            <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1240px] grid-cols-1 gap-10 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-12">
                <section className="flex flex-col gap-8">
                    <Link href={routes.welcome} className="flex items-center gap-2.5" aria-label="Cognita home">
                        <span className="brand-mark" aria-hidden="true">
                            C
                        </span>
                        <span className="text-[15px] font-semibold tracking-tight">Cognita</span>
                    </Link>

                    <div className="max-w-[46ch]">
                        <p className="eyebrow">Live classroom</p>
                        <h1 className="mt-3 text-[34px] leading-[1.08] font-semibold tracking-tight sm:text-[42px]">
                            Every class meets in one place.
                        </h1>
                        <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">
                            Instructors create a course, open a class and share its key. Students type the key, join the
                            group call and work on the same board.
                        </p>
                    </div>

                    <ul className="grid gap-3 sm:grid-cols-3 lg:max-w-[520px]">
                        {promises.map((item) => (
                            <li key={item.title} className="rounded-2xl border border-line bg-surface/70 p-4">
                                <item.icon size={20} weight="duotone" className="text-brand" aria-hidden="true" />
                                <p className="mt-2.5 text-[13px] font-semibold text-ink">{item.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.body}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="w-full">
                    <div className="mx-auto w-full max-w-md">{children}</div>
                </section>
            </div>
        </div>
    );
}
