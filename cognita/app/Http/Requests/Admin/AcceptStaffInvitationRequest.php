<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

/**
 * Public acceptance payload. This request is NOT part of the admin group: the
 * invitee has no account or session yet, so authorization is token-based.
 */
final class AcceptStaffInvitationRequest extends AdminRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Your name is required.',
            'password.min' => 'Choose a password of at least 8 characters.',
        ];
    }

    public function name(): string
    {
        return (string) $this->validated('name');
    }

    public function password(): string
    {
        return (string) $this->validated('password');
    }
}
