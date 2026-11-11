<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Poll;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $options = $this->input('options');

        if (! is_array($options)) {
            $options = [];
        }

        $clean = [];

        foreach ($options as $option) {
            if (! is_scalar($option)) {
                continue;
            }

            $label = trim((string) $option);

            if ($label !== '') {
                $clean[] = $label;
            }
        }

        $this->merge(['options' => $clean]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in([Poll::KIND_OPEN, Poll::KIND_CHOICE])],
            'question' => ['required', 'string', 'max:240'],
            'duration' => ['required', 'integer', 'min:10', 'max:600'],
            'options' => ['exclude_unless:kind,'.Poll::KIND_CHOICE, 'required', 'array', 'min:2', 'max:6'],
            'options.*' => ['string', 'max:120'],
        ];
    }
}
