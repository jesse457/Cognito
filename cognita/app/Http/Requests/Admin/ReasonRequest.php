<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

/**
 * `{reason}` payload for warn / ban / unban and content moderation actions.
 */
final class ReasonRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'A reason is required and is written to the audit trail.',
            'reason.min' => 'Please describe the reason in at least 3 characters.',
        ];
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }
}
