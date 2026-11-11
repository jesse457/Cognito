import type { DoctorReport } from '@/realtime';
import { cn } from '@/lib/utils';

/** The four connection layers, each with the reason it failed when it did. */
export default function DoctorReportView({ report }: { report: DoctorReport }) {
    return (
        <div className="rounded-xl border border-stage-ink/15 bg-stage-ink/5 px-3 py-2">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-stage-ink/50 uppercase">Connection check</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-stage-ink/40">{report.url}</p>
            <ul className="mt-2 space-y-1.5">
                {report.checks.map((check) => (
                    <li key={check.key} className="flex items-start gap-2 text-[11px] leading-relaxed">
                        <span
                            className={cn('mt-px shrink-0 font-semibold', check.ok ? 'text-stage-live' : 'text-stage-danger')}
                            aria-hidden="true"
                        >
                            {check.ok ? '✓' : '✕'}
                        </span>
                        <span className="min-w-0">
                            <span className={cn('font-medium', check.ok ? 'text-stage-ink/80' : 'text-stage-danger')}>
                                {check.label}
                            </span>
                            <span className="block break-words text-stage-ink/45">{check.detail}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
