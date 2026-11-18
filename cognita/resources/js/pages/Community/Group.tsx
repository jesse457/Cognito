import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ChatsCircle, Plus, UsersThree } from '@phosphor-icons/react';
import { useState } from 'react';
import AskPostModal from '@/components/community/AskPostModal';
import TagList from '@/components/questions/TagList';
import VoteControl from '@/components/questions/VoteControl';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { routes } from '@/lib/routes';
import type { Paginated } from '@/types';

interface GroupPost {
    id: number;
    title: string;
    excerpt: string;
    tags: string[];
    score: number;
    answers_count: number;
    media_count: number;
    accepted: boolean;
    created_at: string;
    user: string;
    href: string;
}

interface GroupProps {
    group: {
        id: number;
        name: string;
        description: string | null;
        creator: string;
        members_count: number;
        posts_count: number;
        joined: boolean;
        mine: boolean;
    };
    members: Array<{ id: number; name: string }>;
    posts: Paginated<GroupPost>;
}

export default function Group({ group, members, posts }: GroupProps) {
    const [asking, setAsking] = useState(false);

    function membership(): void {
        const options = { preserveScroll: true };

        if (group.joined) {
            router.delete(routes.community.groups.leave(group.id), options);
        } else {
            router.post(routes.community.groups.join(group.id), {}, options);
        }
    }

    return (
        <>
            <Head title={group.name} />

            <Link href={routes.community.groups.index} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-brand">
                <ArrowLeft size={14} aria-hidden="true" />
                All groups
            </Link>

            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="card p-5">
                        <div className="flex flex-wrap items-start gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mentor-soft text-[18px] font-semibold text-mentor">
                                {group.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-[21px] font-semibold tracking-[-0.01em] text-ink">{group.name}</h1>
                                <p className="meta mt-0.5">
                                    Started by {group.creator} · {group.members_count} members · {group.posts_count} posts
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {!group.mine ? (
                                    <button type="button" className="btn btn-outline btn-sm" onClick={membership}>
                                        {group.joined ? 'Leave group' : 'Join group'}
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setAsking(true)}
                                    disabled={!group.joined && !group.mine}
                                >
                                    <Plus size={15} weight="bold" aria-hidden="true" />
                                    Ask here
                                </button>
                            </div>
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                            {group.description ?? 'A place to ask and answer questions together.'}
                        </p>
                    </div>

                    {!group.joined && !group.mine ? (
                        <div className="rounded-xl border border-mentor/25 bg-mentor-soft/40 p-4 text-[13px] text-ink-muted">
                            Join this group to post questions. You can still read everything in it.
                        </div>
                    ) : null}

                    {posts.data.length === 0 ? (
                        <EmptyState
                            title="No questions in this group yet"
                            body="Start the conversation with a question the group can work through."
                            action={
                                group.joined || group.mine ? (
                                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setAsking(true)}>
                                        Ask the first question
                                    </button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {posts.data.map((post) => (
                                <li key={post.id} className="card flex gap-3 p-4 transition hover:border-line-strong">
                                    <VoteControl
                                        score={post.score}
                                        myVote={0}
                                        canVote={false}
                                        endpoint={routes.questions.vote(post.id)}
                                        size="sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11.5px] text-ink-soft">{post.user} · {post.created_at}</p>
                                        <Link href={post.href} className="mt-1 block text-[14px] font-semibold text-ink hover:text-brand">
                                            {post.title}
                                        </Link>
                                        <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-muted">{post.excerpt}</p>
                                        <div className="mt-2 flex items-center gap-3">
                                            <TagList tags={post.tags} />
                                            {post.accepted ? <span className="text-[11.5px] text-live">Solved</span> : null}
                                        </div>
                                    </div>
                                    <Link href={post.href} className="btn btn-quiet btn-sm self-start" title="Open question">
                                        <ChatsCircle size={15} aria-hidden="true" />
                                        <span>{post.answers_count}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination paginator={posts} />
                </div>

                <aside className="flex flex-col gap-4">
                    <div className="card p-4">
                        <p className="section-title flex items-center gap-2">
                            <UsersThree size={16} aria-hidden="true" />
                            Members
                        </p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                            {members.map((member) => (
                                <li key={member.id} className="text-[12.5px] text-ink-muted">{member.name}</li>
                            ))}
                        </ul>
                        {group.members_count > members.length ? (
                            <p className="meta mt-2">+{group.members_count - members.length} more</p>
                        ) : null}
                    </div>
                </aside>
            </div>

            <AskPostModal
                open={asking}
                groups={[{ id: group.id, name: group.name, joined: true }]}
                defaultGroupId={group.id}
                onClose={() => setAsking(false)}
            />
        </>
    );
}
