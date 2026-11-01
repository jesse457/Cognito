<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

/**
 * Bulk upsert of the owner-only settings map:
 *   {"settings": {"kt_engine": "bkt", "at_risk_threshold": 0.6}}
 */
final class UpdateSystemSettingsRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array', 'min:1'],
            'settings.*' => ['nullable', Rule::anyOf([
                'string',
                'integer',
                'numeric',
                'boolean',
                'array',
            ])],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'settings.required' => 'A settings object is required, e.g. {"settings":{"kt_engine":"bkt"}}.',
            'settings.min' => 'Provide at least one setting to update.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function settings(): array
    {
        /** @var array<string, mixed> $settings */
        $settings = (array) $this->validated('settings');

        return $settings;
    }

    public function description(): ?string
    {
        $description = $this->validated('description');

        return is_string($description) && $description !== '' ? $description : null;
    }
}
