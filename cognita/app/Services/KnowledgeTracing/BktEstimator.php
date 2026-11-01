<?php

declare(strict_types=1);

namespace App\Services\KnowledgeTracing;

/**
 * Deterministic, CPU-cheap BKT estimator used as the Laravel-side fallback when
 * the Python KT service is unreachable or degraded.
 *
 * This is the classic four-parameter BKT model (prior L0, learn T, guess G,
 * slip S) applied as a sequential Bayesian update followed by the learn step.
 * It is intentionally stateless: the full observation history is replayed per
 * request, exactly like pyBKT's per-request fit, so a provider outage never
 * silently changes the meaning of a mastery value.
 */
final class BktEstimator
{
    public function __construct(
        private readonly float $priorKnown = 0.10,
        private readonly float $learnRate = 0.15,
        private readonly float $guessRate = 0.20,
        private readonly float $slipRate = 0.10,
    ) {}

    /**
     * @param  list<bool|int>  $observations  Chronological correctness values.
     */
    public function predict(array $observations): float
    {
        $known = $this->priorKnown;

        foreach ($observations as $observation) {
            $correct = (bool) $observation;

            $known = $correct
                ? ($known * (1.0 - $this->slipRate)) / $this->denominator($known, $this->slipRate, 1.0 - $this->guessRate)
                : ($known * $this->slipRate) / $this->denominator($known, 1.0 - $this->slipRate, $this->guessRate);

            // Learn transition: a student may transition to the known state
            // after every practice opportunity.
            $known = $known + (1.0 - $known) * $this->learnRate;
        }

        return round(min(1.0, max(0.0, $known)), 4);
    }

    /**
     * Predict one probability per knowledge component.
     *
     * @param  array<int, list<bool|int>>  $observationsByComponent
     * @return array<int, float>
     */
    public function predictMany(array $observationsByComponent): array
    {
        $predictions = [];

        foreach ($observationsByComponent as $componentId => $observations) {
            $predictions[(int) $componentId] = $this->predict($observations);
        }

        return $predictions;
    }

    /** @return array<string, float> */
    public function parameters(): array
    {
        return [
            'prior' => $this->priorKnown,
            'learn' => $this->learnRate,
            'guess' => $this->guessRate,
            'slip' => $this->slipRate,
        ];
    }

    private function denominator(float $known, float $correctTerm, float $incorrectTerm): float
    {
        $numerator = $known * $correctTerm;
        $denominator = $numerator + (1.0 - $known) * $incorrectTerm;

        return $denominator <= 0.0 ? 1.0 : $denominator;
    }
}
