<?php

declare(strict_types=1);

namespace App\Http\Requests\Community;

use App\Models\ForumThread;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Edit an existing thread. Author-only, enforced by ForumThreadPolicy@update
 * against the route-bound `thread`.
 */
class UpdateThreadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $thread = $this->route('thread');

        return $thread instanceof ForumThread
            && Gate::forUser($this->user())->allows('update', $thread);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'min:3', 'max:160'],
            'body' => ['sometimes', 'required', 'string', 'min:1', 'max:20000'],
        ];
    }
}
