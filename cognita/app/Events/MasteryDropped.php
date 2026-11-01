<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\KnowledgeComponent;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A student's mastery for one knowledge component fell. The only listener is the
 * instructor-path at-risk detector, which is a no-op while the flag is off.
 */
class MasteryDropped
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly User $student,
        public readonly KnowledgeComponent $knowledgeComponent,
        public readonly float $previousProbability,
        public readonly float $currentProbability,
    ) {}
}
