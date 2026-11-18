import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Article,
    ArrowLeft,
    ArrowRight,
    Exam,
    Eye,
    FileArrowUp,
    Files,
    PencilSimple,
    PlayCircle,
    Plus,
    Trash,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import DocumentViewer from '@/components/lesson/DocumentViewer';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { ConfirmRequest } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import ModalFooter from '@/components/ui/ModalFooter';
import Select from '@/components/ui/Select';
import Stat from '@/components/ui/Stat';
import { embedUrl } from '@/lib/embed';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';
import type {
    CourseMaterialView as MaterialRow,
    CurriculumLessonView as LessonRow,
    CurriculumSectionView as SectionRow,
    EnumOption as OptionRow,
    LessonStatus,
    LessonType,
} from '@/types';

interface CurriculumProps {
    course: {
        id: number;
        title: string;
        description: string | null;
        status: string;
        status_label: string;
        is_paid: boolean;
        price_label: string | null;
    };
    sections: SectionRow[];
    materials: MaterialRow[];
    lessonTypes: OptionRow[];
    lessonStatuses: OptionRow[];
}

const LESSON_ICONS: Record<string, typeof PlayCircle> = {
    video: PlayCircle,
    article: Article,
    quiz: Exam,
};

export default function InstructorCurriculum({
    course,
    sections,
    materials,
    lessonTypes,
    lessonStatuses,
}: CurriculumProps) {
    const [sectionModal, setSectionModal] = useState<SectionRow | 'new' | null>(null);
    const [lessonModal, setLessonModal] = useState<{ section: SectionRow; lesson?: LessonRow } | null>(null);
    const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
    const [preview, setPreview] = useState<LessonRow | null>(null);
    const [uploadLesson, setUploadLesson] = useState<LessonRow | null>(null);
    const [filesLesson, setFilesLesson] = useState<LessonRow | null>(null);
    const [previewMaterial, setPreviewMaterial] = useState<MaterialRow | null>(null);

    /**
     * The lesson endpoint takes the whole lesson, so a quick publish toggle
     * sends the lesson as it stands with the one field changed.
     */
    function updateLesson(lesson: LessonRow, status: LessonRow['status']): void {
        router.patch(
            routes.instructor.lesson(lesson.id),
            {
                title: lesson.title,
                type: lesson.type,
                status,
                content: lesson.content,
                video_url: lesson.video_url,
                duration_minutes: lesson.duration_minutes,
                position: lesson.position,
            },
            { preserveScroll: true },
        );
    }

    const lessonCount = sections.reduce((count, section) => count + section.lessons.length, 0);
    /** New sections and lessons land at the end of the outline, not on top of it. */
    const nextSectionPosition = sections.reduce(
        (highest, section) => Math.max(highest, section.position),
        -1,
    ) + 1;
    const published = sections.reduce(
        (count, section) => count + section.lessons.filter((lesson) => lesson.status === 'published').length,
        0,
    );

    return (
        <>
            <Head title={`${course.title} outline`} />

            <nav className="flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
                <Link href={routes.instructor.courses} className="hover:text-ink">
                    Courses
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-ink">{course.title}</span>
            </nav>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="eyebrow">Self-paced curriculum</p>
                    <h1 className="page-title mt-1.5 truncate">{course.title}</h1>
                    <p className="page-sub max-w-[70ch]">
                        {course.description ??
                            'Build the course students can work through between live classes. Sections and lessons are independent of the live room.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={routes.instructor.courses} className="btn btn-quiet">
                        <ArrowLeft size={15} aria-hidden="true" />
                        All courses
                    </Link>
                    <Button variant="primary" onClick={() => setSectionModal('new')}>
                        <Plus size={15} weight="bold" aria-hidden="true" />
                        Add section
                    </Button>
                </div>
            </header>

            <div className="kpi-row">
                <Stat label="Sections" value={sections.length} hint="Modules in the outline" />
                <Stat label="Lessons" value={lessonCount} hint={pluralize(published, 'published lesson')} />
                <Stat label="Files" value={materials.length} hint="Attached to lessons" />
                <Stat
                    label="Live rooms"
                    value={course.is_paid ? 'Paid' : 'Included'}
                    hint={course.is_paid ? course.price_label ?? 'Payment required' : 'Free with the class key'}
                />
            </div>

            <div className="flex flex-col">
                <section className="flex flex-col gap-4" aria-labelledby="outline-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="outline-heading" className="section-title">
                            Course outline
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={course.status === 'published' ? 'chip chip-brand' : 'chip chip-neutral'}>
                                {course.status_label}
                            </span>
                            <Link
                                href={routes.instructor.courses}
                                className="text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                            >
                                Course settings
                            </Link>
                        </div>
                    </div>

                    {sections.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                title="No sections yet"
                                body="Start with a section such as “Week 1 — Foundations”, then add lessons inside it."
                                action={
                                    <Button variant="tonal" onClick={() => setSectionModal('new')}>
                                        <Plus size={15} aria-hidden="true" />
                                        Add the first section
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <ol className="flex flex-col gap-4">
                            {sections.map((section, index) => (
                                <li key={section.id} className="card overflow-hidden">
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
                                        <div className="min-w-0">
                                            <p className="eyebrow">Section {index + 1}</p>
                                            <h3 className="mt-1 text-[15px] font-semibold">{section.title}</h3>
                                            {section.description ? (
                                                <p className="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-ink-muted">
                                                    {section.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                className="btn btn-quiet btn-sm"
                                                onClick={() => setSectionModal(section)}
                                            >
                                                <PencilSimple size={14} aria-hidden="true" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-quiet btn-sm text-danger hover:bg-danger-soft"
                                                onClick={() =>
                                                    setConfirm({
                                                        title: `Delete “${section.title}”?`,
                                                        description: 'The section and every lesson inside it are removed.',
                                                        confirmLabel: 'Delete section',
                                                        tone: 'danger',
                                                        onConfirm: () =>
                                                            router.delete(routes.instructor.section(section.id), {
                                                                preserveScroll: true,
                                                            }),
                                                    })
                                                }
                                            >
                                                <Trash size={14} aria-hidden="true" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {section.lessons.length === 0 ? (
                                        <p className="px-4 py-4 text-[13px] text-ink-muted">
                                            No lessons in this section yet.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-line">
                                            {section.lessons.map((lesson) => {
                                                const Glyph = LESSON_ICONS[lesson.type] ?? Article;

                                                return (
                                                    <li
                                                        key={lesson.id}
                                                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                                                    >
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                                                            <Glyph size={16} aria-hidden="true" />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[13.5px] font-medium">{lesson.title}</p>
                                                            <p className="meta mt-0.5">
                                                                {lesson.type_label}
                                                                {lesson.duration_minutes
                                                                    ? ` · ${lesson.duration_minutes} min`
                                                                    : ''}
                                                                {lesson.materials_count > 0
                                                                    ? ` · ${pluralize(lesson.materials_count, 'file')}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={
                                                                lesson.status === 'published'
                                                                    ? 'chip chip-brand'
                                                                    : 'chip chip-neutral'
                                                            }
                                                        >
                                                            {lesson.status_label}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-sm"
                                                            onClick={() =>
                                                                updateLesson(
                                                                    lesson,
                                                                    lesson.status === 'published' ? 'draft' : 'published',
                                                                )
                                                            }
                                                        >
                                                            {lesson.status === 'published' ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-sm"
                                                            onClick={() => setPreview(lesson)}
                                                        >
                                                            <Eye size={14} aria-hidden="true" />
                                                            Preview
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-sm"
                                                            onClick={() => setUploadLesson(lesson)}
                                                            title="Upload a file for this lesson"
                                                        >
                                                            <FileArrowUp size={14} aria-hidden="true" />
                                                            Upload file
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-sm"
                                                            onClick={() => setFilesLesson(lesson)}
                                                            title="Preview the files attached to this lesson"
                                                        >
                                                            <Files size={14} aria-hidden="true" />
                                                            Materials
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-sm"
                                                            onClick={() => setLessonModal({ section, lesson })}
                                                        >
                                                            <PencilSimple size={14} aria-hidden="true" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-quiet btn-icon btn-sm text-danger hover:bg-danger-soft"
                                                            aria-label={`Delete ${lesson.title}`}
                                                            onClick={() =>
                                                                setConfirm({
                                                                    title: `Delete “${lesson.title}”?`,
                                                                    description: 'The lesson and the progress students made on it are removed.',
                                                                    confirmLabel: 'Delete lesson',
                                                                    tone: 'danger',
                                                                    onConfirm: () =>
                                                                        router.delete(routes.instructor.lesson(lesson.id), {
                                                                            preserveScroll: true,
                                                                        }),
                                                                })
                                                            }
                                                        >
                                                            <Trash size={14} aria-hidden="true" />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}

                                    <div className="border-t border-line px-4 py-2.5">
                                        <button
                                            type="button"
                                            className="btn btn-quiet btn-sm"
                                            onClick={() => setLessonModal({ section })}
                                        >
                                            <Plus size={14} aria-hidden="true" />
                                            Add lesson
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

            </div>

            <Modal
                open={sectionModal !== null}
                title={sectionModal === 'new' ? 'Add section' : 'Edit section'}
                onClose={() => setSectionModal(null)}
            >
                {sectionModal !== null ? (
                    <SectionForm
                        courseId={course.id}
                        section={sectionModal === 'new' ? undefined : sectionModal}
                        nextPosition={nextSectionPosition}
                        onDone={() => setSectionModal(null)}
                    />
                ) : null}
            </Modal>

            <Modal
                open={lessonModal !== null}
                title={lessonModal?.lesson ? 'Edit lesson' : 'Add lesson'}
                description={lessonModal?.section.title}
                onClose={() => setLessonModal(null)}
            >
                {lessonModal !== null ? (
                    <LessonForm
                        sectionId={lessonModal.section.id}
                        lesson={lessonModal.lesson}
                        nextPosition={nextLessonPosition(lessonModal.section)}
                        lessonTypes={lessonTypes}
                        lessonStatuses={lessonStatuses}
                        onDone={() => setLessonModal(null)}
                    />
                ) : null}
            </Modal>

            <Modal
                open={preview !== null}
                title={preview?.title ?? 'Lesson preview'}
                description={preview === null ? undefined : `What a student sees — ${preview.type_label}`}
                onClose={() => setPreview(null)}
            >
                {preview !== null ? <LessonPreview lesson={preview} /> : null}
            </Modal>

            <Modal
                open={uploadLesson !== null}
                title="Upload a lesson file"
                description={uploadLesson === null ? undefined : `Attaching to “${uploadLesson.title}”`}
                onClose={() => setUploadLesson(null)}
            >
                {uploadLesson !== null ? (
                    <MaterialComposer
                        courseId={course.id}
                        lessonId={uploadLesson.id}
                        onDone={() => setUploadLesson(null)}
                    />
                ) : null}
            </Modal>

            <Modal
                open={filesLesson !== null}
                title="Lesson materials"
                description={filesLesson === null ? undefined : `Files attached to “${filesLesson.title}”`}
                onClose={() => setFilesLesson(null)}
            >
                {filesLesson !== null ? (
                    <LessonMaterials
                        materials={materials.filter((material) => material.lesson_id === filesLesson.id)}
                        onPreview={setPreviewMaterial}
                        onRemove={(material) =>
                            setConfirm({
                                title: `Remove “${material.title}”?`,
                                description: 'Students will no longer find this file in the lesson.',
                                confirmLabel: 'Remove file',
                                tone: 'danger',
                                onConfirm: () =>
                                    router.delete(
                                        routes.instructor.courseMaterial(course.id, material.id),
                                        { preserveScroll: true, onSuccess: () => setFilesLesson(null) },
                                    ),
                            })
                        }
                        onUpload={() => {
                            setFilesLesson(null);
                            setUploadLesson(filesLesson);
                        }}
                    />
                ) : null}
            </Modal>

            <DocumentViewer material={previewMaterial} onClose={() => setPreviewMaterial(null)} />

            <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
        </>
    );
}

/** The position a new lesson takes inside its section. */
function nextLessonPosition(section: SectionRow): number {
    return section.lessons.reduce((highest, lesson) => Math.max(highest, lesson.position), -1) + 1;
}

/**
 * The lesson as a student would read it: the same video, the same notes, the
 * same files. The instructor can check a lesson before it is published.
 */
function LessonPreview({ lesson }: { lesson: LessonRow }) {
    const embed = embedUrl(lesson.video_url);
    const paragraphs = (lesson.content ?? '').split(/\n{2,}/).filter((part) => part.trim() !== '');

    return (
        <div className="flex flex-col gap-4">
            {lesson.status === 'draft' ? (
                <p className="rounded-xl border border-line bg-surface-sunken/60 px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted">
                    This lesson is a draft. Students cannot open it until it is published.
                </p>
            ) : null}

            {lesson.video_url ? (
                embed ? (
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
                    <a href={lesson.video_url} target="_blank" rel="noreferrer" className="btn btn-outline">
                        <PlayCircle size={15} aria-hidden="true" />
                        Open the video
                    </a>
                )
            ) : null}

            {paragraphs.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {paragraphs.map((paragraph, index) => (
                        <p key={index} className="max-w-[75ch] text-[13.5px] leading-7 text-ink">
                            {paragraph}
                        </p>
                    ))}
                </div>
            ) : (
                <p className="text-[13px] text-ink-muted">This lesson has no written content yet.</p>
            )}

            <p className="meta">
                {lesson.type_label}
                {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}
                {lesson.materials_count > 0 ? ` · ${pluralize(lesson.materials_count, 'file')}` : ''}
            </p>
        </div>
    );
}

function SectionForm({
    courseId,
    section,
    nextPosition,
    onDone,
}: {
    courseId: number;
    section?: SectionRow;
    /** Where a new section lands in the outline. */
    nextPosition: number;
    onDone: () => void;
}) {
    const form = useForm({
        title: section?.title ?? '',
        description: section?.description ?? '',
        position: section?.position ?? nextPosition,
    });

    function submit(event: FormEvent): void {
        event.preventDefault();

        if (section) {
            form.patch(routes.instructor.section(section.id), { preserveScroll: true, onSuccess: onDone });
        } else {
            form.post(routes.instructor.courseSections(courseId), { preserveScroll: true, onSuccess: onDone });
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Section title" error={form.errors.title}>
                {(id) => (
                    <TextInput
                        id={id}
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        placeholder="Week 1 — Foundations"
                        invalid={Boolean(form.errors.title)}
                    />
                )}
            </Field>
            <Field label="Description" hint="Optional." error={form.errors.description}>
                {(id) => (
                    <TextArea
                        id={id}
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                        rows={3}
                    />
                )}
            </Field>
            <Field label="Position" hint="Lower numbers appear first." error={form.errors.position}>
                {(id) => (
                    <TextInput
                        id={id}
                        type="number"
                        min="0"
                        value={form.data.position}
                        onChange={(event) => form.setData('position', Number(event.target.value))}
                    />
                )}
            </Field>
            <ModalFooter
                onCancel={onDone}
                submitLabel={section ? 'Save section' : 'Add section'}
                busy={form.processing}
                icon={<ArrowRight size={15} weight="bold" aria-hidden="true" />}
            />
        </form>
    );
}

function LessonForm({
    sectionId,
    lesson,
    nextPosition,
    lessonTypes,
    lessonStatuses,
    onDone,
}: {
    sectionId: number;
    lesson?: LessonRow;
    /** Where a new lesson lands inside its section. */
    nextPosition: number;
    lessonTypes: OptionRow[];
    lessonStatuses: OptionRow[];
    onDone: () => void;
}) {
    const form = useForm({
        title: lesson?.title ?? '',
        type: lesson?.type ?? 'article',
        status: lesson?.status ?? 'published',
        content: lesson?.content ?? '',
        video_url: lesson?.video_url ?? '',
        duration_minutes: lesson?.duration_minutes ?? ('' as number | ''),
        position: lesson?.position ?? nextPosition,
    });

    function submit(event: FormEvent): void {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            duration_minutes: data.duration_minutes === '' ? null : Number(data.duration_minutes),
        }));

        if (lesson) {
            form.patch(routes.instructor.lesson(lesson.id), { preserveScroll: true, onSuccess: onDone });
        } else {
            form.post(routes.instructor.sectionLessons(sectionId), { preserveScroll: true, onSuccess: onDone });
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Lesson title" error={form.errors.title}>
                {(id) => (
                    <TextInput
                        id={id}
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        invalid={Boolean(form.errors.title)}
                    />
                )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Type" error={form.errors.type}>
                    {(id) => (
                        <Select
                            id={id}
                            value={form.data.type}
                            onChange={(value) => form.setData('type', value as LessonType)}
                            options={lessonTypes}
                        />
                    )}
                </Field>
                <Field label="Status" error={form.errors.status}>
                    {(id) => (
                        <Select
                            id={id}
                            value={form.data.status}
                            onChange={(value) => form.setData('status', value as LessonStatus)}
                            options={lessonStatuses}
                        />
                    )}
                </Field>
            </div>

            {form.data.type === 'video' ? (
                <Field label="Video URL" hint="YouTube, Vimeo or a direct video link." error={form.errors.video_url}>
                    {(id) => (
                        <TextInput
                            id={id}
                            type="url"
                            value={form.data.video_url}
                            onChange={(event) => form.setData('video_url', event.target.value)}
                            placeholder="https://..."
                            invalid={Boolean(form.errors.video_url)}
                        />
                    )}
                </Field>
            ) : null}

            <Field
                label={form.data.type === 'quiz' ? 'Quiz prompt and materials' : 'Lesson content'}
                hint="Plain text. Students read this at their own pace."
                error={form.errors.content}
            >
                {(id) => (
                    <TextArea
                        id={id}
                        value={form.data.content}
                        onChange={(event) => form.setData('content', event.target.value)}
                        rows={6}
                    />
                )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (minutes)" error={form.errors.duration_minutes}>
                    {(id) => (
                        <TextInput
                            id={id}
                            type="number"
                            min="1"
                            max="600"
                            value={form.data.duration_minutes}
                            onChange={(event) =>
                                form.setData(
                                    'duration_minutes',
                                    event.target.value === '' ? '' : Number(event.target.value),
                                )
                            }
                        />
                    )}
                </Field>
                <Field label="Position" hint="Lower numbers appear first." error={form.errors.position}>
                    {(id) => (
                        <TextInput
                            id={id}
                            type="number"
                            min="0"
                            value={form.data.position}
                            onChange={(event) => form.setData('position', Number(event.target.value))}
                        />
                    )}
                </Field>
            </div>

            <ModalFooter
                onCancel={onDone}
                submitLabel={lesson ? 'Save lesson' : 'Add lesson'}
                busy={form.processing}
                icon={<ArrowRight size={15} weight="bold" aria-hidden="true" />}
            />
        </form>
    );
}

function LessonMaterials({
    materials,
    onPreview,
    onRemove,
    onUpload,
}: {
    materials: MaterialRow[];
    onPreview: (material: MaterialRow) => void;
    onRemove: (material: MaterialRow) => void;
    onUpload: () => void;
}) {
    if (materials.length === 0) {
        return (
            <EmptyState
                title="No files yet"
                body="Upload notes, a PDF, a video or an image for this lesson."
                action={
                    <Button variant="tonal" onClick={onUpload}>
                        <FileArrowUp size={14} aria-hidden="true" />
                        Upload file
                    </Button>
                }
            />
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="divide-y divide-line">
                {materials.map((material) => (
                    <li key={material.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                            <Files size={15} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{material.title}</p>
                            <p className="meta mt-0.5">{material.size_label} · {material.kind}</p>
                        </div>
                        {(material.kind === 'pdf' || material.kind === 'image') ? (
                            <button
                                type="button"
                                className="btn btn-quiet btn-sm"
                                onClick={() => onPreview(material)}
                            >
                                <Eye size={14} aria-hidden="true" />
                                Preview
                            </button>
                        ) : (
                            <a href={material.url} target="_blank" rel="noreferrer" className="btn btn-quiet btn-sm">
                                Open
                            </a>
                        )}
                        <button
                            type="button"
                            className="btn btn-quiet btn-icon btn-sm text-danger hover:bg-danger-soft"
                            aria-label={`Remove ${material.title}`}
                            onClick={() => onRemove(material)}
                        >
                            <Trash size={14} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex justify-end border-t border-line pt-3">
                <Button variant="tonal" onClick={onUpload}>
                    <FileArrowUp size={14} aria-hidden="true" />
                    Upload file
                </Button>
            </div>
        </div>
    );
}

function MaterialComposer({
    courseId,
    lessonId,
    onDone,
}: {
    courseId: number;
    lessonId: number;
    onDone: () => void;
}) {
    const form = useForm({
        title: '',
        lesson_id: String(lessonId),
        document: null as File | null,
    });

    function submit(event: FormEvent): void {
        event.preventDefault();

        if (form.data.document === null) {
            return;
        }

        form.transform((data) => ({
            ...data,
            lesson_id: Number(data.lesson_id),
        }));

        form.post(routes.instructor.courseMaterials(courseId), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onDone();
            },
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="File" error={form.errors.document}>
                {(id) => (
                    <input
                        id={id}
                        type="file"
                        className="input py-2"
                        onChange={(event) => form.setData('document', event.target.files?.[0] ?? null)}
                    />
                )}
            </Field>

            <Field label="Title" error={form.errors.title}>
                {(id) => (
                    <TextInput
                        id={id}
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        placeholder="Lesson notes"
                    />
                )}
            </Field>

            <p className="meta">PDF, document, slides, video or image up to 100 MB.</p>

            <div className="flex justify-end gap-2 border-t border-line pt-3">
                <Button type="button" variant="quiet" onClick={onDone}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={form.processing || form.data.document === null}>
                    <FileArrowUp size={15} aria-hidden="true" />
                    {form.processing ? 'Uploading' : 'Upload file'}
                </Button>
            </div>
        </form>
    );
}
