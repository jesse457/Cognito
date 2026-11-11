<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPostMedia;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuestionRequest extends FormRequest
{
    use ValidatesPostMedia;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('scope')) {
            $this->merge(['scope' => 'class']);
        }

        $tags = $this->input('tags');

        if (is_string($tags)) {
            $tags = explode(',', $tags);
        }

        if (! is_array($tags)) {
            $tags = [];
        }

        $normalised = [];

        foreach ($tags as $tag) {
            if (! is_scalar($tag)) {
                continue;
            }

            $tag = mb_strtolower(ltrim(trim((string) $tag), '#'));

            if ($tag !== '') {
                $normalised[$tag] = $tag;
            }
        }

        $this->merge([
            'tags' => array_slice(array_values($normalised), 0, 5),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'scope' => ['required', Rule::in(['class', 'community'])],
            'classroom_id' => [
                'nullable',
                'integer',
                Rule::exists('classrooms', 'id'),
                Rule::requiredIf(fn (): bool => $this->input('scope') === 'class'),
            ],
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:12000'],
            'tags' => ['nullable', 'array', 'max:5'],
            'tags.*' => ['string', 'max:24', 'regex:/^[a-z0-9][a-z0-9+#.-]*$/i'],
            ...$this->mediaRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->mediaMessages();
    }
}
