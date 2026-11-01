<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use Illuminate\Validation\Rule;

/**
 * Invite a staff member by email at a grantable role.
 */
final class StoreStaffInvitationRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', 'string', Rule::in(UserRole::invitableValues())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'The invitee email address is required.',
            'role.required' => 'The role to grant is required.',
            'role.in' => 'Only admin and moderator roles can be invited.',
        ];
    }

    public function email(): string
    {
        return (string) $this->validated('email');
    }

    public function role(): UserRole
    {
        return UserRole::from((string) $this->validated('role'));
    }
}
