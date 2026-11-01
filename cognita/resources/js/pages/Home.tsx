import { Head, Link, router } from '@inertiajs/react';
import { logout as logoutRoute } from '@/routes';

interface LiveClass {
    id: number;
    name: string;
    description: string | null;
    instructor: string | null;
    url: string;
}

interface HomeProps {
    role: string;
    liveClasses?: LiveClass[];
}

export default function Home({ role, liveClasses = [] }: HomeProps) {
    return (
        <>
            <Head title="Signed in" />
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl items-center px-4 py-10">
                <div className="flex w-full flex-col gap-5">
                    <div className="card w-full">
                        <div className="card-body">
                            <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">Cognita</p>
                            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                                {liveClasses.length > 0 ? 'Your live classes are ready' : 'This account has no staff surface'}
                            </h1>
                            <p className="mt-2 text-sm text-zinc-600">
                                You are signed in as <span className="font-medium">{role}</span>. The student learning
                                experience is delivered through the Cognita API; the staff console is for moderators, admins,
                                owners and instructors.
                            </p>
                            <div className="form-footer mt-6">
                                <button type="button" className="btn btn-secondary" onClick={() => router.post(logoutRoute.url())}>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>

                    {liveClasses.length > 0 ? (
                        <section className="card w-full" aria-labelledby="live-classes-heading">
                            <div className="card-header">
                                <div>
                                    <h2 id="live-classes-heading" className="section-title">
                                        Join a group voice call
                                    </h2>
                                    <p className="meta mt-1">
                                        Live rooms for the classes you are enrolled in. Your browser will ask for microphone
                                        access when you join.
                                    </p>
                                </div>
                            </div>
                            <ul className="divide-y divide-zinc-100">
                                {liveClasses.map((liveClass) => (
                                    <li key={liveClass.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900">{liveClass.name}</p>
                                            <p className="meta mt-0.5">
                                                {liveClass.instructor ? `Instructor: ${liveClass.instructor}` : 'No instructor listed'}
                                            </p>
                                            {liveClass.description ? (
                                                <p className="mt-1 max-w-[60ch] text-sm text-zinc-600">{liveClass.description}</p>
                                            ) : null}
                                        </div>
                                        <Link href={liveClass.url} className="btn btn-primary btn-sm">
                                            Join voice call
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </div>
            </div>
        </>
    );
}
