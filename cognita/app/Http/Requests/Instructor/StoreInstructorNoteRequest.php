<?php

declare(strict_types=1);

namespace App\Http\Requests\Instructor;

use App\Models\InstructorNote;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Store a private note about a student. The note stays visible to the authoring
 * instructor only (InstructorNotePolicy); students never see it.
 */
class StoreInstructorNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && $this->user()->can('create', InstructorNote::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'note' => ['required', 'string', 'min:1', 'max:5000'],
        ];
    }
}
