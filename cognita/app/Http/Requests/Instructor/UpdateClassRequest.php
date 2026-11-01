<?php

declare(strict_types=1);

namespace App\Http\Requests\Instructor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update a private class. Ownership is enforced by the controller through
 * ClassAccessService; this request only shapes the payload.
 */
class UpdateClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxClassSize = (int) config('features.max_class_size');

        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'max_students' => ['sometimes', 'integer', 'min:1', 'max:'.max($maxClassSize, 1)],
            'status' => ['sometimes', 'string', 'in:active,archived'],
        ];
    }
}
