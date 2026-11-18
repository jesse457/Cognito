import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Article,
    CheckCircle,
    Clock,
    Exam,
    Eye,
    FileArrowDown,
    PlayCircle,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import DocumentViewer from '@/components/lesson/DocumentViewer';
import VideoPlayer from '@/components/lesson/VideoPlayer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { embedUrl } from '@/lib/embed';
import { routes } from '@/lib/routes';
import type {
    CourseMaterialView as MaterialRow,
    LessonNeighbourView as NeighbourLesson,
    StudentLessonView as LessonPayload,
} from '@/types';

interface LessonProps {
    lesson: LessonPayload;
    previous: NeighbourLesson | null;
    next: NeighbourLesson | null;
}

const LESSON_ICONS: Record<string, typeof PlayCircle> = {
    video: PlayCircle,
    article: Article,
    quiz: Exam,
};

/**
 * "4 min" / "1 h 05 min" for the time a student has spent on a lesson.
 */
function formatStudyTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) {
        return 'under a minute';
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}

export default function StudentLesson({ lesson, previous, next }: LessonProps) {
    const progress = useForm({ status: lesson.completed ? 'completed' : 'in_progress', watched_seconds: 0 });
    const [studied, setStudied] = useState(0);
    const [viewing, setViewing] = useState<MaterialRow | null>(null);
    const secondsRef = useRef(0);
    const Glyph = LESSON_ICONS[lesson.type] ?? Article;
    const embed = embedUrl(lesson.video_url);
    const videos = lesson.materials.filter((material) => material.kind === 'video');
    const files = lesson.materials.filter((material) => material.kind !== 'video');
    const paragraphs = (lesson.content ?? '').split(/\n{2,}/).filter((part) => part.trim() !== '');

    /**
     * The time the student has spent on this lesson, counted while the tab is
     * in front of them. It travels with the progress save, so a lesson that was
     * read and a lesson that was only opened no longer look the same.
     */
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            secondsRef.current += 1;

            if (secondsRef.current % 15 === 0) {
                setStudied(secondsRef.current);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    function submit(event: FormEvent, status: 'in_progress' | 'completed'): void {
        event.preventDefault();
        progress.setData('status', status);
        progress.setData('watched_seconds', secondsRef.current);
        progress.post(routes.community.lessonProgress(lesson.id), { preserveScroll: true });
    }

    return (
        <>
            <Head title={lesson.title} />

            <nav className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
                <Link href={routes.student.courses} className="hover:text-ink">
                    Courses
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={lesson.course.url} className="hover:text-ink">
                    {lesson.course.title}
                </Link>
                {lesson.section ? (
                    <>
                        <span aria-hidden="true">/</span>
                        <span className="text-ink">{lesson.section}</span>
                    </>
                ) : null}
            </nav>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow flex items-center gap-1.5">
                        <Glyph size={13} aria-hidden="true" />
                        {lesson.type_label}
                        {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}
                    </p>
                    <h1 className="page-title mt-1.5">{lesson.title}</h1>
                    <p className="page-sub max-w-[70ch]">
                        {lesson.completed
                            ? 'You finished this lesson. Keep going, or reopen it whenever you need.'
                            : 'Work through this lesson at your own pace — live sessions never hold it back.'}
                    </p>
                </div>

                {lesson.completed ? (
                    <span className="chip chip-brand">
                        <CheckCircle size={13} weight="fill" aria-hidden="true" />
                        Completed
                    </span>
                ) : lesson.progress === 'in_progress' ? (
                    <span className="chip chip-neutral">In progress</span>
                ) : null}
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="flex flex-col gap-4" aria-labelledby="lesson-body-heading">
                    <h2 id="lesson-body-heading" className="sr-only">
                        Lesson content
                    </h2>

                    <article className="card p-5">
                        {videos.length > 0 ? (
                            <div className="mb-5 flex flex-col gap-3">
                                {videos.map((video) => (
                                    <div key={video.id}>
                                        <p className="mb-1.5 text-[12px] font-medium text-ink-muted">{video.title}</p>
                                        <VideoPlayer src={video.url} title={video.title} />
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {lesson.video_url ? (
                            <div className="mb-5">
                                {embed ? (
                                    <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
                                        <iframe
                                            src={embed}
                                            title={lesson.title}
                                            className="h-full w-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <a
                                        href={lesson.video_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-outline"
                                    >
                                        <PlayCircle size={15} aria-hidden="true" />
                                        Open the video
                                    </a>
                                )}
                            </div>
                        ) : null}

                        {paragraphs.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {paragraphs.map((paragraph, index) => (
                                    <p key={index} className="max-w-[75ch] text-[14px] leading-7 text-ink">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="No written content yet"
                                body="Your instructor has not added notes for this lesson. Use the files beside it, or join the live session."
                            />
                        )}
                    </article>

                    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                            <Clock size={15} className="text-ink-soft" aria-hidden="true" />
                            {lesson.completed && lesson.completed_at
                                ? `Completed on ${lesson.completed_at}`
                                : 'Your progress is saved as you study.'}
                            {studied > 0 ? (
                                <span aria-live="polite">· {formatStudyTime(studied)} on this lesson</span>
                            ) : null}
                        </div>

                        {lesson.completed ? (
                            <Button variant="outline" onClick={(event) => submit(event, 'in_progress')}>
                                Mark as in progress
                            </Button>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="quiet" onClick={(event) => submit(event, 'in_progress')}>
                                    Save progress
                                </Button>
                                <Button variant="primary" onClick={(event) => submit(event, 'completed')}>
                                    <CheckCircle size={15} aria-hidden="true" />
                                    Mark complete
                                </Button>
                            </div>
                        )}
                    </div>

                    <nav className="flex items-stretch justify-between gap-3" aria-label="Lesson navigation">
                        {previous ? (
                            <Link href={previous.url} className="btn btn-outline min-w-0 justify-start">
                                <ArrowLeft size={15} aria-hidden="true" />
                                <span className="min-w-0">
                                    <span className="block text-[11px] uppercase tracking-wide text-ink-muted">
                                        Previous
                                    </span>
                                    <span className="block truncate text-[13px] font-medium">{previous.title}</span>
                                </span>
                            </Link>
                        ) : (
                            <span />
                        )}

                        {next ? (
                            <Link href={next.url} className="btn btn-outline min-w-0 justify-end text-right">
                                <span className="min-w-0">
                                    <span className="block text-[11px] uppercase tracking-wide text-ink-muted">
                                        Next
                                    </span>
                                    <span className="block truncate text-[13px] font-medium">{next.title}</span>
                                </span>
                                <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                        ) : (
                            <span />
                        )}
                    </nav>
                </section>

                <aside className="flex flex-col gap-4">
                    <section className="card" aria-labelledby="lesson-materials-heading">
                        <div className="card-head">
                            <h2 id="lesson-materials-heading" className="section-title">
                                Lesson files
                            </h2>
                        </div>

                        {files.length === 0 ? (
                            <p className="px-4 py-4 text-[13px] text-ink-muted">
                                No notes or documents attached to this lesson yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {files.map((material) => {
                                    const previewable = material.kind === 'pdf' || material.kind === 'image';

                                    return (
                                        <li key={material.id}>
                                            {previewable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewing(material)}
                                                    className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-surface-sunken/60"
                                                >
                                                    <Eye size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-medium">
                                                            {material.title}
                                                        </span>
                                                        <span className="meta mt-0.5 block">
                                                            {material.kind === 'pdf' ? 'PDF · ' : 'Image · '}
                                                            {material.size_label} · View
                                                        </span>
                                                    </span>
                                                </button>
                                            ) : (
                                                <a
                                                    href={material.download_url}
                                                    className="flex items-start gap-2.5 px-4 py-2.5 transition hover:bg-surface-sunken/60"
                                                >
                                                    <FileArrowDown size={15} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-medium">
                                                            {material.title}
                                                        </span>
                                                        <span className="meta mt-0.5 block">{material.size_label} · Download</span>
                                                    </span>
                                                </a>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <Link href={lesson.course.url} className="btn btn-quiet justify-start">
                        <ArrowLeft size={15} aria-hidden="true" />
                        Back to {lesson.course.title}
                    </Link>
                </aside>
            </div>

            <DocumentViewer material={viewing} onClose={() => setViewing(null)} />
        </>
    );
}
