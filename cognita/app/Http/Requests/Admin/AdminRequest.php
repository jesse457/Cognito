<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared authorization for every admin user action: the route middleware has
 * already resolved the actor, so `authorize()` only guarantees presence.
 * Rank rules are enforced by AdminScopeService in the service layer.
 */
abstract class AdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->isStaff();
    }
}
