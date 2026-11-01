<?php

declare(strict_types=1);

namespace App\Http\Requests\Community;

use App\Models\ForumPost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Reply to a thread (optionally nesting one level under a top-level post).
 */
class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('create', ForumPost::class);
    }

    /**
     * `parent_post_id` gets a plain integer rule here: whether the parent exists,
     * belongs to this thread, and is itself top-level is a domain rule answered
     * in the controller (rendered as a single 422 with a precise message).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:20000'],
            'parent_post_id' => ['nullable', 'integer'],
        ];
    }
}
