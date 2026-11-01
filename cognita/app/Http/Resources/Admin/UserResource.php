<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin user projection with rank-aware redaction.
 *
 * Moderators see the operational shape of an account but NOT its private
 * fields: `email` and any presence/login-derived data (last seen, sessions).
 * Admins and owners see everything, plus the account-status internals.
 *
 * @property-read User $resource
 */
final class UserResource extends JsonResource
{
    private ?User $actor = null;

    /** Moderation history is opt-in through the `?include=` style helper. */
    private bool $withModerationHistory = false;

    public function forActor(?User $actor): self
    {
        $this->actor = $actor;

        return $this;
    }

    public function withModerationHistory(bool $include = true): self
    {
        $this->withModerationHistory = $include;

        return $this;
    }

    /** True when the viewer may see sensitive (private) fields. */
    public function viewerIsPrivileged(): bool
    {
        $actor = $this->resolveActor();

        return $actor !== null && $actor->role->rank() >= UserRole::Admin->rank();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        $privileged = $this->viewerIsPrivileged();

        $payload = [
            'id' => $user->getKey(),
            'name' => $user->name,
            'display_name' => $user->display_name,
            'display_label' => $user->displayLabel(),
            'avatar_url' => $user->avatar_url,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'status' => $user->status->value,
            'is_staff' => $user->isStaff(),
            'is_banned' => $user->isBanned(),
            'is_suspended' => $user->isSuspended(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];

        if ($privileged) {
            $payload['email'] = $user->email;
            $payload['email_verified_at'] = $user->email_verified_at?->toIso8601String();
            $payload['suspended_until'] = $user->suspended_until?->toIso8601String();
            $payload['last_seen_at'] = $user->last_seen_at?->toIso8601String();
            $payload['has_active_suspension'] = $user->hasActiveSuspension();
            $payload['updated_at'] = $user->updated_at?->toIso8601String();
        }

        if ($this->withModerationHistory) {
            $payload['moderation_history'] = $this->moderationHistory();
        }

        if ($privileged && $this->actor !== null) {
            $payload['can_manage'] = $this->actor->role->rank() > $user->role->rank();
        }

        return $payload;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function moderationHistory(): array
    {
        $actions = $this->resource->relationLoaded('moderationActionsReceived')
            ? $this->resource->moderationActionsReceived
            : $this->resource->moderationActionsReceived()->latest('id')->limit(25)->get();

        return $actions->map(static fn ($action): array => [
            'id' => $action->getKey(),
            'action' => $action->action->value,
            'reason' => $action->reason,
            'expires_at' => $action->expires_at?->toIso8601String(),
            'created_at' => $action->created_at?->toIso8601String(),
            'actor_id' => $action->actor_id,
        ])->all();
    }

    private function resolveActor(): ?User
    {
        if ($this->actor !== null) {
            return $this->actor;
        }

        $user = request()->user();

        return $user instanceof User ? $user : null;
    }
}
