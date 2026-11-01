import { Form, Head, router } from '@inertiajs/react';
import adminRoutes from '@/routes/panel/admin';
import Badge, { roleTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Field, PageHeader, inputClass, selectClass } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { TableWrapper, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';
import type { Paginated } from '@/types';

interface InvitationRow {
    id: number;
    email: string;
    role: string;
    role_label: string;
    inviter: string | null;
    expires_at: string | null;
    accepted_at: string | null;
    is_expired: boolean;
    is_accepted: boolean;
    created_at: string | null;
}

interface InvitationsIndexProps {
    invitations: Paginated<InvitationRow>;
    roles: { value: string; label: string }[];
    capabilities: { can_invite: boolean; can_revoke: boolean };
}

type InvitationState = 'accepted' | 'expired' | 'pending';

function stateOf(invitation: InvitationRow): InvitationState {
    if (invitation.is_accepted) {
        return 'accepted';
    }

    return invitation.is_expired ? 'expired' : 'pending';
}

const stateTone: Record<InvitationState, 'success' | 'warn' | 'neutral'> = {
    accepted: 'success',
    expired: 'neutral',
    pending: 'warn',
};

export default function InvitationsIndex({ invitations, roles, capabilities }: InvitationsIndexProps) {
    function revoke(id: number) {
        router.delete(adminRoutes.invitations.destroy.url(id), { preserveScroll: true });
    }

    return (
        <>
            <Head title="Staff invitations" />

            <PageHeader
                title="Staff invitations"
                subtitle="Invite a moderator or admin. The invitee sets their own password through the emailed link."
            />

            {capabilities.can_invite ? (
                <Card>
                    <CardHeader
                        title="Send an invitation"
                        description="The invitation expires on its own. Nothing is created until the invitee accepts."
                    />
                    <CardBody>
                        <Form {...adminRoutes.invitations.store.form()} resetOnSuccess>
                            {({ errors, processing }) => (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
                                    <Field label="Email" htmlFor="invite-email" required error={errors.email}>
                                        <input
                                            id="invite-email"
                                            name="email"
                                            type="email"
                                            className={inputClass}
                                            placeholder="person@example.com"
                                            required
                                        />
                                    </Field>

                                    <Field
                                        label="Role"
                                        htmlFor="invite-role"
                                        required
                                        hint="Only roles you may grant are listed."
                                        error={errors.role}
                                    >
                                        <select id="invite-role" name="role" className={selectClass} required>
                                            {roles.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <div className="flex items-end">
                                        <button type="submit" className="btn btn-primary" disabled={processing}>
                                            {processing ? 'Sending' : 'Send invitation'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardBody>
                        <p className="text-sm text-zinc-600">
                            Your role cannot send staff invitations. An owner or admin can invite on your behalf.
                        </p>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader
                    title="Invitation history"
                    description="Every invitation with its current state. Revoking withdraws a link that has not been used"
                />
                {invitations.data.length === 0 ? (
                    <EmptyState
                        title="No invitations yet"
                        body="Invitations you send appear here until they are accepted, revoked or expire."
                    />
                ) : (
                    <>
                        <TableWrapper>
                            <thead>
                                <tr>
                                    <Th>Email</Th>
                                    <Th>Role</Th>
                                    <Th>Invited by</Th>
                                    <Th>State</Th>
                                    <Th>Expires</Th>
                                    <Th className="text-right">Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.data.map((invitation) => {
                                    const state = stateOf(invitation);
                                    const canRevokeThis = capabilities.can_revoke && state !== 'accepted';

                                    return (
                                        <Tr key={invitation.id}>
                                            <Td>
                                                <p className="font-medium text-zinc-900">{invitation.email}</p>
                                                <p className="meta mt-0.5">sent {formatDateTime(invitation.created_at)}</p>
                                            </Td>
                                            <Td>
                                                <Badge tone={roleTone(invitation.role)}>{invitation.role_label}</Badge>
                                            </Td>
                                            <Td>{invitation.inviter ?? 'Unknown'}</Td>
                                            <Td>
                                                <Badge tone={stateTone[state]}>{state}</Badge>
                                                {invitation.is_accepted ? (
                                                    <p className="meta mt-0.5">
                                                        accepted {formatDateTime(invitation.accepted_at)}
                                                    </p>
                                                ) : null}
                                            </Td>
                                            <Td className="whitespace-nowrap text-zinc-500">
                                                {formatDateTime(invitation.expires_at)}
                                            </Td>
                                            <Td className="text-right">
                                                {canRevokeThis ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => revoke(invitation.id)}
                                                        >
                                                            Revoke invitation
                                                        </button>
                                                        <p className="meta max-w-[26ch] text-right">
                                                            The link stops working immediately. This cannot be undone.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="meta">
                                                        {state === 'accepted' ? 'account created' : 'not revocable'}
                                                    </span>
                                                )}
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </TableWrapper>

                        <div className="card-footer">
                            <Pagination page={invitations} />
                        </div>
                    </>
                )}
            </Card>
        </>
    );
}
