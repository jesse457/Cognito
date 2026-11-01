import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { routes } from '@/lib/routes';

interface SignInPageProps {
    errors?: Record<string, string>;
}

export default function SignIn({ errors = {} }: SignInPageProps) {
    const form = useForm({ email: '', password: '', remember: false as boolean });

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.login, { onFinish: () => form.reset('password') });
    }

    return (
        <>
            <Head title="Sign in" />

            <div className="card p-6 sm:p-7">
                <p className="eyebrow">Welcome back</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">Sign in to Cognita</h1>
                <p className="page-sub">One account for teaching, studying and joining live classes.</p>

                <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                    <Field label="Email address" error={errors.email}>
                        {(id) => (
                            <TextInput
                                id={id}
                                type="email"
                                name="email"
                                value={form.data.email}
                                onChange={(event) => form.setData('email', event.target.value)}
                                autoComplete="email"
                                placeholder="you@school.edu"
                                invalid={Boolean(errors.email)}
                                autoFocus
                            />
                        )}
                    </Field>

                    <Field label="Password" error={errors.password}>
                        {(id) => (
                            <TextInput
                                id={id}
                                type="password"
                                name="password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                                autoComplete="current-password"
                                invalid={Boolean(errors.password)}
                            />
                        )}
                    </Field>

                    <label className="flex items-center gap-2 text-sm text-ink-muted">
                        <input
                            type="checkbox"
                            checked={form.data.remember}
                            onChange={(event) => form.setData('remember', event.target.checked)}
                            className="h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
                        />
                        Keep me signed in on this device
                    </label>

                    <Button type="submit" variant="primary" className="mt-1 w-full" disabled={form.processing}>
                        {form.processing ? 'Signing in' : 'Sign in'}
                        <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    </Button>
                </form>

                <p className="mt-5 text-sm text-ink-muted">
                    New here?{' '}
                    <Link href={routes.register} className="font-medium text-brand hover:underline">
                        Create a student account
                    </Link>
                </p>
            </div>

            <details className="mt-4 rounded-2xl border border-line bg-surface/60 px-4 py-3 text-xs text-ink-muted">
                <summary className="cursor-pointer font-medium text-ink-muted select-none">Local demo accounts</summary>
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                    <li>admin@cognita.test · password</li>
                    <li>instructor@cognita.test · password</li>
                    <li>student1@cognita.test · password</li>
                </ul>
                <p className="mt-2">Class key for the seeded class: PHY101</p>
            </details>

            {errors.email && errors.email.includes('attempts') ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
                    <WarningCircle size={14} weight="bold" aria-hidden="true" />
                    Rate limited. Wait a minute before trying again.
                </p>
            ) : null}
        </>
    );
}
