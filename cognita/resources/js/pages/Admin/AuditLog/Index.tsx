import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import adminRoutes from '@/routes/panel/admin';
import { Card, CardBody } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';
import type { Paginated } from '@/types';

interface AuditRow {
    id: number;
    action: string;
    actor: string | null;
    actor_id: number | null;
    actor_role: string;
    target_type: string | null;
    target_id: number | null;
    context: Record<string, unknown>;
    created_at: string | null;
}

interface AuditIndexProps {
    logs: Paginated<AuditRow>;
    filters: { action: string; actor_id: number | null };
    actions: string[];
    scope: { sees_all_rows: boolean; actor_id: number };
}

/** Long context strings are clipped so a dense row still scans in one line. */
function clip(value: string, limit = 80): string {
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function compactValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null';
    }

    if (typeof value === 'string') {
        return clip(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    const serialised = JSON.stringify(value);

    return clip(serialised ?? String(value));
}

function contextEntries(context: Record<string, unknown>): [string, unknown][] {
    return Object.entries(context ?? {});
}

export default function AuditIndex({ logs, filters, actions, scope }: AuditIndexProps) {
    const [action, setAction] = useState(filters.action ?? '');
    const [actorId, setActorId] = useState(filters.actor_id ? String(filters.actor_id) : '');

    function apply(event: React.FormEvent) {
        event.preventDefault();
        router.get(
            adminRoutes.audit.index.url(),
            { action: action || undefined, actor_id: actorId || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function reset() {
        setAction('');
        setActorId('');
        router.get(adminRoutes.audit.index.url(), {}, { preserveState: false });
    }

    function onlyMine() {
        setActorId(String(scope.actor_id));
        router.get(
            adminRoutes.audit.index.url(),
            { action: action || undefined, actor_id: scope.actor_id },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Audit log" />

            <PageHeader
                title="Audit log"
                subtitle="Every privileged action, oldest write first in the record. Rows are append only: there is no edit and no delete path."
            />

            <Card>
                <CardBody>
                    <div className="flex flex-col gap-3">
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                            This trail is append only. No route can update or delete a row, so what you see here is the
                            complete history for the rows you are allowed to read.
                            {scope.sees_all_rows
                                ? ' As an owner you see every actor.'
                                : ' As an admin you see only rows you wrote.'}
                        </p>

                        <form onSubmit={apply} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto]">
                            <Field label="Action" htmlFor="audit-action">
                                <select
                                    id="audit-action"
                                    className={selectClass}
                                    value={action}
                                    onChange={(event) => setAction(event.target.value)}
                                >
                                    <option value="">All actions</option>
                                    {actions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Actor id" htmlFor="audit-actor" hint="Numeric account id of the staff member.">
                                <input
                                    id="audit-actor"
                                    type="number"
                                    min={1}
                                    step={1}
                                    className={inputClass}
                                    placeholder="Any actor"
                                    value={actorId}
                                    onChange={(event) => setActorId(event.target.value)}
                                />
                            </Field>

                            <div className="flex items-end gap-2">
                                <button type="submit" className="btn btn-primary">
                                    Filter
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={onlyMine}>
                                    My rows
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={reset}>
                                    Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </CardBody>
            </Card>

            <Card>
                {logs.data.length === 0 ? (
                    <EmptyState
                        title="No audit rows match these filters"
                        body="Clear the action and actor filters to see the whole trail."
                        action={
                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                Clear filters
                            </button>
                        }
                    />
                ) : (
                    <>
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Action</Th>
                                    <Th>Actor</Th>
                                    <Th>Target</Th>
                                    <Th>Context</Th>
                                    <Th>Recorded</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.map((row) => {
                                    const entries = contextEntries(row.context);

                                    return (
                                        <Tr key={row.id}>
                                            <Td>
                                                <span className="font-medium text-zinc-900">{row.action}</span>
                                                <p className="meta mt-0.5 tabular-nums">row #{row.id}</p>
                                            </Td>
                                            <Td>
                                                <p className="text-zinc-800">{row.actor ?? 'system'}</p>
                                                <p className="meta capitalize">
                                                    {row.actor_role}
                                                    {row.actor_id ? ` #${row.actor_id}` : ''}
                                                </p>
                                            </Td>
                                            <Td className="whitespace-nowrap text-zinc-600">
                                                {row.target_type ? (
                                                    <>
                                                        {row.target_type} #{row.target_id}
                                                    </>
                                                ) : (
                                                    <span className="meta">none</span>
                                                )}
                                            </Td>
                                            <Td className="max-w-[34rem]">
                                                {entries.length === 0 ? (
                                                    <span className="meta">none</span>
                                                ) : entries.length > 2 ? (
                                                    <details>
                                                        <summary className="cursor-pointer text-xs text-zinc-600">
                                                            {entries.length} keys
                                                        </summary>
                                                        <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-zinc-50 p-2 text-[11px] whitespace-pre-wrap text-zinc-700">
                                                            {JSON.stringify(row.context, null, 2)}
                                                        </pre>
                                                    </details>
                                                ) : (
                                                    <dl className="flex flex-col gap-0.5 text-xs">
                                                        {entries.map(([key, value]) => (
                                                            <div key={key} className="flex gap-1.5">
                                                                <dt className="shrink-0 text-zinc-500">{key}:</dt>
                                                                <dd className="break-all text-zinc-700">{compactValue(value)}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                )}
                                            </Td>
                                            <Td className="whitespace-nowrap text-zinc-500">{formatDateTime(row.created_at)}</Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </TableWrapper>

                        <div className="card-footer">
                            <Pagination page={logs} />
                        </div>
                    </>
                )}
            </Card>
        </>
    );
}
