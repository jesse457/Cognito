import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { routes } from '@/lib/routes';

interface RegisterPageProps {
    errors?: Record<string, string>;
}

export default function Register({ errors = {} }: RegisterPageProps) {
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '' });

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.register, { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <>
            <Head title="Create account" />

            <div className="card p-6 sm:p-7">
                <p className="eyebrow">Students</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">Create your account</h1>
                <p className="page-sub">Then type the class key your instructor shared to join the room.</p>

                <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                    <Field label="Full name" error={errors.name}>
                        {(id) => (
                            <TextInput
                                id={id}
                                name="name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                autoComplete="name"
                                placeholder="Mateo Rivera"
                                invalid={Boolean(errors.name)}
                                autoFocus
                            />
                        )}
                    </Field>

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
                            />
                        )}
                    </Field>

                    <Field label="Password" error={errors.password} hint="At least 8 characters.">
                        {(id) => (
                            <TextInput
                                id={id}
                                type="password"
                                name="password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                                autoComplete="new-password"
                                invalid={Boolean(errors.password)}
                            />
                        )}
                    </Field>

                    <Field label="Confirm password">
                        {(id) => (
                            <TextInput
                                id={id}
                                type="password"
                                name="password_confirmation"
                                value={form.data.password_confirmation}
                                onChange={(event) => form.setData('password_confirmation', event.target.value)}
                                autoComplete="new-password"
                            />
                        )}
                    </Field>

                    <Button type="submit" variant="primary" className="mt-1 w-full" disabled={form.processing}>
                        {form.processing ? 'Creating account' : 'Create account'}
                        <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    </Button>
                </form>

                <p className="mt-5 text-sm text-ink-muted">
                    Already have an account?{' '}
                    <Link href={routes.login} className="font-medium text-brand hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </>
    );
}
