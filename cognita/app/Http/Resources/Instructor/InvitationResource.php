<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\ClassInvitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ClassInvitation
 */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'class_id' => (int) $this->class_id,
            'email' => $this->email,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'is_expired' => $this->isExpired(),
            'is_accepted' => $this->isAccepted(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
