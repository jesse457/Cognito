<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

final class BulkResolveReportsRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'report_ids' => ['required', 'array', 'min:1', 'max:100'],
            'report_ids.*' => ['integer', 'min:1'],
            'resolution_note' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'report_ids.required' => 'Select at least one report to resolve.',
            'report_ids.max' => 'You can resolve at most 100 reports at a time.',
            'resolution_note.required' => 'A resolution note is required.',
        ];
    }

    /**
     * @return list<int>
     */
    public function reportIds(): array
    {
        /** @var array<int, int|string> $ids */
        $ids = (array) $this->validated('report_ids');

        return array_values(array_map(static fn (int|string $id): int => (int) $id, $ids));
    }

    public function resolutionNote(): string
    {
        return (string) $this->validated('resolution_note');
    }
}
