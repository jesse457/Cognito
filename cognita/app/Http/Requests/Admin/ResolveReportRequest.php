<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\ModerationAction as ModerationActionEnum;
use Illuminate\Validation\Rule;

/**
 * Resolve a report, optionally attaching a moderation action on the author.
 */
final class ResolveReportRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'resolution_note' => ['required', 'string', 'min:3', 'max:2000'],
            'action' => ['sometimes', 'nullable', 'string', Rule::in([
                ModerationActionEnum::Warn->value,
                ModerationActionEnum::Suspend->value,
                ModerationActionEnum::Ban->value,
                ModerationActionEnum::Unban->value,
            ])],
            'duration_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'resolution_note.required' => 'A resolution note is required.',
            'duration_days.max' => 'A suspension can last at most 30 days.',
        ];
    }

    public function resolutionNote(): string
    {
        return (string) $this->validated('resolution_note');
    }

    public function moderationAction(): ?ModerationActionEnum
    {
        $action = $this->validated('action');

        return is_string($action) && $action !== '' ? ModerationActionEnum::from($action) : null;
    }

    public function durationDays(): ?int
    {
        $days = $this->validated('duration_days');

        return $days === null ? null : (int) $days;
    }
}
