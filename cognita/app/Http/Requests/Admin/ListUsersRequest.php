<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Validation\Rule;

/**
 * Query filters for `GET admin/users`.
 */
final class ListUsersRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:200'],
            'role' => ['sometimes', 'nullable', 'string', Rule::in(array_column(UserRole::cases(), 'value'))],
            'status' => ['sometimes', 'nullable', 'string', Rule::in(array_column(UserStatus::cases(), 'value'))],
            'per_page' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }

    public function search(): ?string
    {
        $search = $this->query('search');

        return is_string($search) && trim($search) !== '' ? trim($search) : null;
    }

    public function role(): ?UserRole
    {
        $role = $this->query('role');

        return is_string($role) && $role !== '' ? UserRole::from($role) : null;
    }

    public function status(): ?UserStatus
    {
        $status = $this->query('status');

        return is_string($status) && $status !== '' ? UserStatus::from($status) : null;
    }

    public function perPage(): int
    {
        return max(1, min((int) $this->query('per_page', 25), 100));
    }

    public function page(): int
    {
        return max(1, (int) $this->query('page', 1));
    }
}
