<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CourseStatus;
use App\Enums\Currency;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourseRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['nullable', Rule::enum(CourseStatus::class)],
            'is_paid' => ['sometimes', 'boolean'],
            'price_cents' => [
                'nullable',
                'integer',
                'min:0',
                'max:100000000',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($this->boolean('is_paid') && (int) $value <= 0) {
                        $fail('A paid course needs a price greater than zero.');
                    }
                },
            ],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'payment_url' => ['nullable', 'url', 'max:2048'],
            'payment_instructions' => ['nullable', 'string', 'max:1200'],
        ];
    }
}
