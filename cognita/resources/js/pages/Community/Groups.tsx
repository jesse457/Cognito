import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowUpRight, Plus, UsersThree } from '@phosphor-icons/react';
import EmptyState from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { routes } from '@/lib/routes';
import { useState } from 'react';

interface GroupRow {
    id: number;
    name: string;
    description: string | null;
    creator: string;
    members_count: number;
    posts_count: number;
    joined: boolean;
    mine: boolean;
    created_at: string;
    href: string;
}

export default function Groups({ groups }: { groups: GroupRow[] }) {
    const [creating, setCreating] = useState(false);
    const form = useForm({ name: '', description: '' });

    function submit(event: React.FormEvent): void {
        event.preventDefault();

        form.post(routes.community.groups.store, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    }

    return (
        <>
            <Head title="Groups" />

            <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="page-title">Groups</h1>
                    <p className="page-sub">
                        Start a group for your cohort, a course or a topic. Members post questions; everyone can read.
                    </p>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                    <Plus size={15} weight="bold" aria-hidden="true" />
                    New group
                </button>
            </div>

            {groups.length === 0 ? (
                <EmptyState
                    title="No groups yet"
                    body="Groups give course questions a home. Create the first one and invite your classmates."
                    action={
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                            Create a group
                        </button>
                    }
                />
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {groups.map((group) => (
                        <li key={group.id} className="card flex flex-col p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mentor-soft text-[15px] font-semibold text-mentor">
                                    {group.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <Link href={group.href} className="block truncate text-[14px] font-semibold text-ink hover:text-brand">
                                        {group.name}
                                    </Link>
                                    <p className="meta mt-0.5">Started by {group.creator} · {group.created_at}</p>
                                </div>
                            </div>
                            <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">
                                {group.description ?? 'A place to ask and answer questions together.'}
                            </p>
                            <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-[12px] text-ink-muted">
                                <span className="inline-flex items-center gap-1">
                                    <UsersThree size={14} aria-hidden="true" />
                                    {group.members_count} members
                                </span>
                                <span>{group.posts_count} posts</span>
                                {group.joined ? <span className="chip chip-mentor">Joined</span> : null}
                                {group.mine ? <span className="chip">Yours</span> : null}
                                <Link href={group.href} className="ml-auto text-brand hover:underline" title="Open group">
                                    <ArrowUpRight size={15} aria-hidden="true" />
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Modal open={creating} title="Start a group" description="Pick a name people will recognise." onClose={() => setCreating(false)}>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Field label="Group name" error={form.errors.name}>
                        {(id) => (
                            <input
                                id={id}
                                className="input"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                placeholder="Physics revision"
                                maxLength={120}
                            />
                        )}
                    </Field>
                    <Field label="What is it for?" error={form.errors.description}>
                        {(id) => (
                            <textarea
                                id={id}
                                className="textarea"
                                rows={4}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                                placeholder="Exam questions and worked examples."
                            />
                        )}
                    </Field>
                    <div className="flex justify-end gap-2 border-t border-line pt-3">
                        <button type="button" className="btn btn-quiet" onClick={() => setCreating(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={form.processing}>
                            {form.processing ? 'Creating…' : 'Create group'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
