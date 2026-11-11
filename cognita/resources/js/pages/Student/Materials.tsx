import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    FilePdf,
    Files,
    MagnifyingGlass,
    Stack,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Stat from '@/components/ui/Stat';
import { routes } from '@/lib/routes';
import { pluralize } from '@/lib/utils';

interface Material {
    id: number;
    name: string;
    pages: number;
    size: string;
    classroom: string;
    classroom_id: number;
    course: string | null;
    added: string;
    url: string;
    class_url: string;
}

interface MaterialsPageProps {
    filters: { q: string };
    stats: { documents: number; classes: number; pages: number; size: string };
    documents: Material[];
}

export default function StudentMaterials({ filters, stats, documents }: MaterialsPageProps) {
    const [q, setQ] = useState(filters.q);

    const grouped = documents.reduce<Record<number, { name: string; course: string | null; url: string; items: Material[] }>>(
        (groups, document) => {
            groups[document.classroom_id] ??= {
                name: document.classroom,
                course: document.course,
                url: document.class_url,
                items: [],
            };
            groups[document.classroom_id].items.push(document);

            return groups;
        },
        {},
    );

    function submit(event: FormEvent): void {
        event.preventDefault();
        router.get(
            routes.student.materials,
            q.trim() === '' ? {} : { q: q.trim() },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Materials" />

            <header>
                <p className="eyebrow">Student</p>
                <h1 className="page-title mt-1.5">Materials</h1>
                <p className="page-sub">
                    Every PDF attached to a class you joined. The same library the live board presents from, readable
                    between calls.
                </p>
            </header>

            <section aria-label="Materials at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Files" value={stats.documents} hint="shared with your classes" icon={Files} />
                <Stat label="Classes" value={stats.classes} hint="with at least one file" icon={BookOpen} />
                <Stat label="Pages" value={stats.pages} hint="across all documents" icon={Stack} />
                <Stat label="Total size" value={stats.size} hint="stored for the class" icon={FilePdf} />
            </section>

            <form onSubmit={submit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                <label className="flex-1">
                    <span className="label">Search materials</span>
                    <span className="relative block">
                        <MagnifyingGlass
                            size={16}
                            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
                            aria-hidden="true"
                        />
                        <input
                            value={q}
                            onChange={(event) => setQ(event.target.value)}
                            className="input pl-10"
                            placeholder="File name"
                            aria-label="Search materials by file name"
                        />
                    </span>
                </label>
                <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                        Search
                    </Button>
                    {filters.q !== '' ? (
                        <Button
                            type="button"
                            variant="quiet"
                            onClick={() => {
                                setQ('');
                                router.get(
                                    routes.student.materials,
                                    {},
                                    { preserveState: true, preserveScroll: true, replace: true },
                                );
                            }}
                        >
                            Clear
                        </Button>
                    ) : null}
                </div>
            </form>

            <section aria-labelledby="library-heading" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="library-heading" className="section-title">
                        {filters.q === '' ? 'Your library' : `Results for “${filters.q}”`}
                    </h2>
                    <p className="meta">{pluralize(documents.length, 'file')} across {pluralize(Object.keys(grouped).length, 'class', 'classes')}.</p>
                </div>

                {documents.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            title={filters.q === '' ? 'No materials yet' : 'No files match that search'}
                            body={
                                filters.q === ''
                                    ? 'When an instructor puts a PDF on a class board, it stays in that class library and shows up here.'
                                    : 'Try a shorter file name, or clear the search to see the whole library.'
                            }
                            action={
                                filters.q === '' ? (
                                    <Link href={routes.student.classrooms} className="btn btn-outline">
                                        Open my classes
                                    </Link>
                                ) : undefined
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {Object.entries(grouped).map(([id, group]) => (
                            <section key={id} className="card" aria-label={`Materials for ${group.name}`}>
                                <div className="card-head">
                                    <div className="min-w-0">
                                        <p className="eyebrow truncate">{group.course ?? 'Class'}</p>
                                        <h3 className="mt-1 truncate text-[15px] font-semibold">
                                            <Link href={group.url} className="hover:text-brand">
                                                {group.name}
                                            </Link>
                                        </h3>
                                    </div>
                                    <Link href={group.url} className="btn btn-quiet btn-sm shrink-0">
                                        Open class
                                        <ArrowRight size={13} weight="bold" aria-hidden="true" />
                                    </Link>
                                </div>

                                <ul className="divide-y divide-line">
                                    {group.items.map((document) => (
                                        <li key={document.id} className="flex items-center gap-3 px-5 py-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                                                <FilePdf size={17} weight="duotone" aria-hidden="true" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <a
                                                    href={document.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block truncate text-sm font-medium text-ink hover:text-brand"
                                                >
                                                    {document.name}
                                                </a>
                                                <p className="text-xs text-ink-muted">
                                                    {pluralize(document.pages, 'page')} · {document.size} · added{' '}
                                                    {document.added}
                                                </p>
                                            </div>
                                            <a
                                                href={document.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-outline btn-sm shrink-0"
                                            >
                                                Open PDF
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
