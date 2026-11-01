<?php

declare(strict_types=1);

namespace App\Http\Requests\Community;

use App\Models\ForumThread;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * New forum thread in an existing course.
 */
class StoreThreadRequest extends FormRequest
{
    /**
     * Any authenticated user may start a thread (the policy is flag-gated).
     * The actor is explicit because under Sanctum the gate's default
     * `auth()->user()` is null even on an authenticated route.
     */
    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('create', ForumThread::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'min:3', 'max:160'],
            'body' => ['required', 'string', 'min:1', 'max:20000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'course_id.exists' => 'The selected course does not exist.',
        ];
    }
}
