<?php

declare(strict_types=1);

namespace App\Http\Requests\Community;

use App\Models\ForumPost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Edit a post body. Author-only, enforced by ForumPostPolicy@update.
 */
class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        $post = $this->route('post');

        return $post instanceof ForumPost
            && Gate::forUser($this->user())->allows('update', $post);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:20000'],
        ];
    }
}
