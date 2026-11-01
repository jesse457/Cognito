import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import adminRoutes from '@/routes/panel/admin';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';

type SettingValue = string | number | boolean | null;

interface SettingDefinition {
    key: string;
    label: string;
    type: 'select' | 'number' | 'boolean' | 'text';
    options?: string[];
    step?: string;
    description: string | null;
}

interface SettingsIndexProps {
    settings: Record<string, unknown>;
    definitions: SettingDefinition[];
    capabilities: { can_edit: boolean; cache_ttl: number };
}

function seed(definitions: SettingDefinition[], settings: Record<string, unknown>): Record<string, SettingValue> {
    const seeded: Record<string, SettingValue> = {};

    for (const definition of definitions) {
        const raw = settings[definition.key];

        if (definition.type === 'boolean') {
            seeded[definition.key] = raw === true || raw === '1' || raw === 1;
        } else if (raw === null || raw === undefined) {
            seeded[definition.key] = '';
        } else {
            seeded[definition.key] = String(raw);
        }
    }

    return seeded;
}

export default function SettingsIndex({ settings, definitions, capabilities }: SettingsIndexProps) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<{
        settings: Record<string, SettingValue>;
    }>({ settings: seed(definitions, settings) });

    const [original] = useState(() => seed(definitions, settings));

    function submit(event: React.FormEvent) {
        event.preventDefault();
        put(adminRoutes.settings.update.url(), { preserveScroll: true });
    }

    function update(key: string, value: SettingValue) {
        setData('settings', { ...data.settings, [key]: value });
    }

    /**
     * Number inputs report strings while typing. Submit a real number so the
     * stored value keeps its scalar type instead of becoming "0.6".
     */
    function updateNumber(key: string, raw: string) {
        const numeric = Number(raw);

        update(key, raw === '' || Number.isNaN(numeric) ? '' : numeric);
    }

    const dirtyKeys = definitions
        .map((definition) => definition.key)
        .filter((key) => data.settings[key] !== original[key]);

    return (
        <>
            <Head title="System settings" />

            <PageHeader
                title="System settings"
                subtitle="Runtime configuration for the platform. Saving invalidates the settings cache immediately."
            />

            {!capabilities.can_edit ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                    You can read these settings but not change them. Only an owner can save. The server rejects any write
                    from another role.
                </p>
            ) : null}

            <Card>
                <CardHeader
                    title="Configuration"
                    description={`Values are cached for ${capabilities.cache_ttl} seconds. A save flushes the cache, so changes apply on the next request.`}
                    actions={
                        <span className="badge badge-neutral tabular-nums">
                            {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
                        </span>
                    }
                />
                <form onSubmit={submit}>
                    <CardBody>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {definitions.map((definition) => {
                                const value = data.settings[definition.key];
                                const inputId = `setting-${definition.key}`;
                                const error = errors[`settings.${definition.key}`];

                                if (definition.type === 'boolean') {
                                    return (
                                        <div key={definition.key} className="rounded-lg border border-zinc-200 px-4 py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <label htmlFor={inputId} className="label mb-0">
                                                        {definition.label}
                                                    </label>
                                                    {definition.description ? (
                                                        <p className="hint">{definition.description}</p>
                                                    ) : null}
                                                </div>
                                                <input
                                                    id={inputId}
                                                    type="checkbox"
                                                    className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                    checked={value === true}
                                                    onChange={(event) => update(definition.key, event.target.checked)}
                                                    disabled={!capabilities.can_edit}
                                                />
                                            </div>
                                            {error ? <p className="error">{error}</p> : null}
                                        </div>
                                    );
                                }

                                if (definition.type === 'select') {
                                    return (
                                        <Field
                                            key={definition.key}
                                            label={definition.label}
                                            htmlFor={inputId}
                                            hint={definition.description ?? undefined}
                                            error={error}
                                        >
                                            <select
                                                id={inputId}
                                                className={selectClass}
                                                value={String(value ?? '')}
                                                onChange={(event) => update(definition.key, event.target.value)}
                                                disabled={!capabilities.can_edit}
                                            >
                                                {(definition.options ?? []).map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    );
                                }

                                if (definition.type === 'number') {
                                    return (
                                        <Field
                                            key={definition.key}
                                            label={definition.label}
                                            htmlFor={inputId}
                                            hint={definition.description ?? undefined}
                                            error={error}
                                        >
                                            <input
                                                id={inputId}
                                                type="number"
                                                step={definition.step ?? '1'}
                                                className={inputClass}
                                                value={String(value ?? '')}
                                                onChange={(event) => updateNumber(definition.key, event.target.value)}
                                                disabled={!capabilities.can_edit}
                                            />
                                        </Field>
                                    );
                                }

                                return (
                                    <Field
                                        key={definition.key}
                                        label={definition.label}
                                        htmlFor={inputId}
                                        hint={definition.description ?? undefined}
                                        error={error}
                                    >
                                        <input
                                            id={inputId}
                                            type="text"
                                            className={inputClass}
                                            value={String(value ?? '')}
                                            onChange={(event) => update(definition.key, event.target.value)}
                                            disabled={!capabilities.can_edit}
                                        />
                                    </Field>
                                );
                            })}
                        </div>
                    </CardBody>
                    <CardFooter>
                        <div className="flex flex-wrap items-center gap-3">
                            {capabilities.can_edit ? (
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving' : 'Save settings'}
                                </button>
                            ) : null}
                            {errors.settings ? <p className="error">{errors.settings}</p> : null}
                            {recentlySuccessful ? (
                                <p className="meta" role="status">
                                    Settings saved and the cache was flushed.
                                </p>
                            ) : null}
                            <p className="meta">
                                Read the values shown here, not a cached copy. The cache lives for{' '}
                                {capabilities.cache_ttl} seconds between writes.
                            </p>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </>
    );
}
