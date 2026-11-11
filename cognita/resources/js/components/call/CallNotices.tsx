import { Info, Warning, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface Notice {
    id: string;
    tone: 'info' | 'warn' | 'error';
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

const TONE = {
    info: {
        icon: Info,
        className: 'border-stage-ink/12 bg-stage-ink/5 text-stage-ink/75',
    },
    warn: {
        icon: Warning,
        className: 'border-warn/35 bg-warn/10 text-warn',
    },
    error: {
        icon: WarningCircle,
        className: 'border-danger/40 bg-danger/10 text-danger',
    },
} as const;

/**
 * The quiet strip under the stage: things that are true right now (a blocked
 * microphone, a fallback driver, a lost connection). Anything that happened once
 * is a toast instead.
 */
export default function CallNotices({ notices }: { notices: Notice[] }) {
    if (notices.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5 px-3 pb-2">
            {notices.map((notice) => {
                const tone = TONE[notice.tone];
                const Icon = tone.icon;

                return (
                    <div
                        key={notice.id}
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        className={cn('notice-in flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px] leading-relaxed', tone.className)}
                    >
                        <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <span className="font-medium">{notice.title}</span>
                            {notice.description ? (
                                <span className="ml-1 opacity-70">{notice.description}</span>
                            ) : null}
                            {notice.action ? (
                                <button
                                    type="button"
                                    onClick={notice.action.onClick}
                                    className="ml-1 underline underline-offset-2 hover:opacity-100"
                                >
                                    {notice.action.label}
                                </button>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
