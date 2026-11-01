import { Head, useForm } from '@inertiajs/react';
import { store as loginStore } from '@/actions/App/Http/Controllers/Auth/LoginController';
import Button from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';

export default function SignIn() {
    const { features } = usePage<SharedProps>().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(loginStore.url());
    }

    return (
        <>
            <Head title="Sign in" />
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] items-stretch px-4 py-6">
                <div className="grid w-full grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)] lg:grid-cols-[1fr_420px]">
                    <div className="order-2 flex flex-col justify-center px-6 py-10 sm:px-12 lg:order-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
                                C
                            </span>
                            <div className="leading-tight">
                                <p className="text-sm font-semibold tracking-tight text-zinc-900">Cognita</p>
                                <p className="text-[11px] text-zinc-500">Adaptive learning platform</p>
                            </div>
                        </div>

                        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-zinc-900">Staff sign in</h1>
                        <p className="mt-1 max-w-[42ch] text-sm text-zinc-500">
                            Instructor, moderator, admin and owner accounts sign in here. Student learning runs through
                            the API.
                        </p>

                        <form onSubmit={submit} className="mt-6 flex max-w-sm flex-col gap-4">
                            <Field label="Work email" htmlFor="email" required error={errors.email}>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="username"
                                    required
                                    value={data.email}
                                    onChange={(event) => setData('email', event.target.value)}
                                    className={inputClass}
                                    placeholder="name@cognita.test"
                                />
                            </Field>

                            <Field label="Password" htmlFor="password" required error={errors.password}>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                    className={inputClass}
                                />
                            </Field>

                            <label className="flex items-center gap-2 text-sm text-zinc-600">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(event) => setData('remember', event.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                                />
                                Keep me signed in on this device
                            </label>

                            <div className="form-footer pt-1">
                                <Button type="submit" variant="primary" disabled={processing}>
                                    {processing ? 'Signing in…' : 'Sign in'}
                                </Button>
                            </div>
                        </form>

                        <p className="mt-8 text-xs text-zinc-500">
                            Seeded accounts use the password <span className="font-medium text-zinc-700">password</span>.
                            This console is for staff only.
                        </p>
                    </div>

                    <aside className="order-1 border-b border-zinc-200 bg-zinc-50 px-6 py-8 sm:px-8 lg:order-2 lg:border-b-0 lg:border-l">
                        <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                            What this console covers
                        </p>

                        <ul className="mt-4 space-y-4 text-sm">
                            <li>
                                <p className="font-medium text-zinc-900">Admin panel</p>
                                <p className="mt-0.5 text-zinc-600">
                                    User management, moderation queue, course takedowns, audit trail, owner settings.
                                </p>
                            </li>
                            <li>
                                <p className="font-medium text-zinc-900">Instructor portal</p>
                                <p className="mt-0.5 text-zinc-600">
                                    Private classes, roster mastery, at-risk students, announcements and assignments.
                                </p>
                                <p className="mt-1">
                                    <span className={features?.instructorPath ? 'badge badge-success' : 'badge badge-neutral'}>
                                        {features?.instructorPath
                                            ? 'enabled on this deployment'
                                            : 'disabled on this deployment'}
                                    </span>
                                </p>
                            </li>
                        </ul>

                        <div className="mt-8 border-t border-zinc-200 pt-5">
                            <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                                Seeded accounts
                            </p>
                            <dl className="mt-3 space-y-1.5 text-xs text-zinc-600">
                                {[
                                    ['Owner', 'owner@cognita.test'],
                                    ['Admin', 'admin@cognita.test'],
                                    ['Moderator', 'moderator@cognita.test'],
                                    ['Instructor', 'instructor@cognita.test'],
                                ].map(([role, email]) => (
                                    <div key={email} className="flex justify-between gap-3">
                                        <dt>{role}</dt>
                                        <dd className="tabular-nums">{email}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <p className="mt-8 text-[11px] leading-relaxed text-zinc-500">
                            Privileged actions are audited. Sign in with the account that matches the role you need.
                        </p>
                    </aside>
                </div>
            </div>
        </>
    );
}
