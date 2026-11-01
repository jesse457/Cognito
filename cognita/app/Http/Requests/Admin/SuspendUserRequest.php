<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

final class SuspendUserRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
            'days' => ['required', 'integer', 'min:1', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'days.required' => 'A suspension duration in days is required.',
            'days.max' => 'A suspension can last at most 30 days; use a ban for longer removal.',
            'days.min' => 'A suspension must last at least 1 day.',
        ];
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }

    public function days(): int
    {
        return (int) $this->validated('days');
    }
}
