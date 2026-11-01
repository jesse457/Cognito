<?php

declare(strict_types=1);

namespace App\Http\Requests\Instructor;

use App\Models\PrivateClass;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Create a private class. The route group already guarantees the instructor
 * role, so authorization here only mirrors the flag-aware policy.
 */
class StoreClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && $this->user()->can('create', PrivateClass::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxClassSize = (int) config('features.max_class_size');

        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'max_students' => ['nullable', 'integer', 'min:1', 'max:'.max($maxClassSize, 1)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'max_students.max' => 'A class may not exceed the platform limit of :max students.',
        ];
    }
}
