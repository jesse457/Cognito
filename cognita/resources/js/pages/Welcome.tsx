import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Key } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

interface WelcomeProps {
    errors?: Record<string, string>;
}

export default function Welcome({ errors = {} }: WelcomeProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user ?? null;
    const [key, setKey] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function submit(event: FormEvent): void {
        event.preventDefault();
        setSubmitting(true);

        router.post(
            routes.join,
            { key: key.trim().toUpperCase() },
            {
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <Head title="Sign in" />

            <div className="card p-6 sm:p-7">
                {user ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="eyebrow">Signed in</p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h2>
                            <p className="page-sub">Your classes are one step away.</p>
                        </div>
                        <Link href={routes.dashboard} className="btn btn-primary w-full">
                            Continue to {user.role === 'student' ? 'my classes' : `${user.role} console`}
                            <ArrowRight size={16} weight="bold" aria-hidden="true" />
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <div>
                            <p className="eyebrow">Students</p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">Enter your class key</h2>
                            <p className="page-sub">
                                Six characters from your instructor. We open the class call as soon as you are signed in.
                            </p>
                        </div>

                        <form onSubmit={submit} className="flex flex-col gap-3">
                            <label className="label" htmlFor="class-key">
                                Class key
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="class-key"
                                    name="key"
                                    value={key}
                                    onChange={(event) => setKey(event.target.value)}
                                    placeholder="PHY101"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    maxLength={12}
                                    className="input input-key"
                                    aria-invalid={Boolean(errors.key)}
                                    aria-describedby={errors.key ? 'class-key-error' : 'class-key-hint'}
                                />
                                <Button type="submit" variant="primary" disabled={submitting || key.trim() === ''}>
                                    <Key size={16} weight="bold" aria-hidden="true" />
                                    {submitting ? 'Opening' : 'Join'}
                                </Button>
                            </div>
                            {errors.key ? (
                                <p className="error" id="class-key-error" role="alert">
                                    {errors.key}
                                </p>
                            ) : (
                                <p className="hint" id="class-key-hint">
                                    No account yet? Signing in first is fine. The key is kept for you.
                                </p>
                            )}
                        </form>

                        <div className="divider pt-5">
                            <p className="meta mb-3">Instructors and administrators sign in here.</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Link href={routes.login} className="btn btn-outline flex-1">
                                    Sign in
                                </Link>
                                <Link href={routes.register} className="btn btn-tonal flex-1">
                                    Create student account
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-xs text-ink-muted">
                Cognita runs the class call on your browser microphone. Nothing is recorded.
            </p>
        </>
    );
}
