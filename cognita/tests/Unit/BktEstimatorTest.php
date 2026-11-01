<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\KnowledgeTracing\BktEstimator;
use PHPUnit\Framework\TestCase;

class BktEstimatorTest extends TestCase
{
    public function test_probabilities_stay_within_the_unit_interval(): void
    {
        $estimator = new BktEstimator;

        foreach ([[], [true], [false], [true, true, true, true], [false, false, false, false]] as $observations) {
            $probability = $estimator->predict($observations);

            $this->assertGreaterThanOrEqual(0.0, $probability);
            $this->assertLessThanOrEqual(1.0, $probability);
        }
    }

    public function test_correct_answers_raise_estimated_mastery(): void
    {
        $estimator = new BktEstimator;

        $allCorrect = $estimator->predict([true, true, true, true, true]);
        $allWrong = $estimator->predict([false, false, false, false, false]);

        $this->assertGreaterThan($allWrong, $allCorrect);
    }

    public function test_prediction_is_deterministic(): void
    {
        $estimator = new BktEstimator;

        $this->assertSame(
            $estimator->predict([true, false, true]),
            $estimator->predict([true, false, true]),
        );
    }

    public function test_predict_many_returns_one_probability_per_component(): void
    {
        $predictions = (new BktEstimator)->predictMany([
            7 => [true, true],
            9 => [false],
            42 => [],
        ]);

        $this->assertSame([7, 9, 42], array_keys($predictions));
        $this->assertGreaterThan($predictions[9], $predictions[7]);
    }
}
