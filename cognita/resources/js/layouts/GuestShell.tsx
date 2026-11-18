import { usePage } from '@inertiajs/react';
import { Key, Microphone, PenNib } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { BrandLink, SkipLink } from '@/layouts/chrome';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

const promises = [
    {
        icon: Key,
        title: 'One key per class',
        body: 'Students type six characters instead of waiting for an invitation.',
    },
    {
        icon: Microphone,
        title: 'A room for every class',
        body: 'Voice, the shared board and the roll call live in the same room.',
    },
    {
        icon: PenNib,
        title: 'The board belongs to the room',
        body: 'Ink from one lesson never leaks into the next one.',
    },
];

/**
 * The public side of the product: a pitch on the left, the door on the right.
 *
 * The sheet of graph paper behind it is the product itself — every class in
 * Cognita happens on a board — and it keeps the page from reading like a
 * generic sign-in form.
 */
export default function GuestShell({ children }: { children: ReactNode }) {
    const page = usePage<SharedProps>();
    const { appName } = page.props;

    return (
        <div className="flex min-h-[100dvh] flex-col bg-canvas graph-paper">
            <SkipLink />

            <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-5 sm:px-8">
                <BrandLink appName={appName} href={routes.welcome} compact={false} />

                <ThemeToggle />
            </header>

            <main className="flex flex-1 flex-col">
                <div className="mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-14">
                    <section className="flex flex-col gap-7">
                        <div className="max-w-[22ch] text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] text-ink sm:text-[54px]">
                            Every class meets in one place.
                        </div>

                        <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">
                            Instructors open a class and share a key. Students type it, join the call, and write on the
                            same board.
                        </p>
                    </section>

                    <section className="w-full">
                        <div className="mx-auto w-full max-w-sm">{children}</div>
                    </section>
                </div>

                <div className="mx-auto w-full max-w-[1240px] px-5 pb-10 sm:px-8">
                    <ul className="grid gap-y-6 border-t border-line pt-7 sm:grid-cols-3 sm:gap-x-10">
                        {promises.map((item) => (
                            <li
                                key={item.title}
                                className="flex flex-col gap-1.5 sm:border-l sm:border-line sm:pl-10 sm:first:border-l-0 sm:first:pl-0"
                            >
                                <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                                    <item.icon size={15} className="text-brand" aria-hidden="true" />
                                    {item.title}
                                </span>
                                <p className="text-[12.5px] leading-relaxed text-ink-muted">{item.body}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}
