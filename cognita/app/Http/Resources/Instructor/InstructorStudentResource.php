<?php

declare(strict_types=1);

namespace App\Http\Resources\Instructor;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Roster entry for a class member. Only the fields an instructor needs to run a
 * class — never role, status or audit metadata.
 *
 * @mixin User
 */
class InstructorStudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->displayLabel(),
            'email' => $this->email,
            'avg_mastery' => $this->when(isset($this->avg_mastery), fn (): float => (float) $this->avg_mastery),
            'at_risk' => $this->when(isset($this->at_risk), fn (): bool => (bool) $this->at_risk),
            'kc_count' => $this->when(isset($this->kc_count), fn (): int => (int) $this->kc_count),
        ];
    }
}
