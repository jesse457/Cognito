import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Key } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

/** "Dr. Lena Fischer" is addressed as Lena, not as Dr. */
function firstName(name: string): string {
    const parts = name.trim().split(/\s+/);
    const titled = parts.filter((part) => !/^(dr|prof|mr|ms|mrs|mx)\.?$/i.test(part));

    return titled[0] ?? parts[0] ?? name;
}

/**
 * The door.
 *
 * A student arrives with one thing — the key their instructor read out — so
 * the key is the first control on the page and the only thing styled as the
 * primary action. Everything else is a way in for staff.
 */
export default function Welcome() {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user ?? null;
    const form = useForm({ key: '' });
    const errors = form.errors;

    function submit(event: FormEvent): void {
        event.preventDefault();

        form.transform((data) => ({ key: data.key.trim().toUpperCase() }));
        form.post(routes.join);
    }

    return (
        <>
            <Head title="Sign in" />

            <div className="card p-5 shadow-float">
                {user ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">
                                Welcome back, {firstName(user.name)}
                            </h2>
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
                            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Join your class</h2>
                            <p className="page-sub">Type the six characters your instructor read out.</p>
                        </div>

                        <form onSubmit={submit} className="flex flex-col gap-3">
                            <label className="label" htmlFor="class-key">
                                Class key
                            </label>
                            <input
                                id="class-key"
                                name="key"
                                value={form.data.key}
                                onChange={(event) => form.setData('key', event.target.value.toUpperCase())}
                                placeholder="PHY101"
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                maxLength={12}
                                className="input input-key"
                                aria-invalid={Boolean(errors.key)}
                                aria-describedby={errors.key ? 'class-key-error' : 'class-key-hint'}
                            />
                            {errors.key ? (
                                <p className="error" id="class-key-error" role="alert">
                                    {errors.key}
                                </p>
                            ) : (
                                <p className="hint" id="class-key-hint">
                                    No account yet? Signing in first is fine. The key is kept for you.
                                </p>
                            )}
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={form.processing || form.data.key.trim() === ''}
                                className="mt-1 w-full"
                            >
                                <Key size={16} weight="bold" aria-hidden="true" />
                                {form.processing ? 'Opening' : 'Join class'}
                            </Button>
                        </form>

                        <div className="border-t border-line pt-4">
                            <p className="meta mb-2.5">Instructors and administrators sign in here.</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Link href={routes.login} className="btn btn-outline flex-1">
                                    Sign in
                                </Link>
                                <Link href={routes.register} className="btn btn-quiet flex-1">
                                    Create account
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-3 text-center text-[11.5px] text-ink-soft">
                Cognita runs the class call on your browser microphone. Nothing is recorded.
            </p>
        </>
    );
}
