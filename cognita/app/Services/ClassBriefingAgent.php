<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PrivateClass;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * AI class briefing for an instructor.
 *
 * The agent receives the class KPIs as a prompt and returns a plain-language
 * summary plus suggested interventions. Provider outage must never break the
 * dashboard, so every failure is caught and replaced by a deterministic
 * rule-based briefing derived from the same KPIs.
 */
class ClassBriefingAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function __construct(
        private readonly ClassAccessService $access,
        private readonly ClassDashboardService $dashboard,
        private readonly AtRiskDetectionService $atRisk,
    ) {}

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
        You are a teaching assistant for an online course platform. You receive
        aggregate class-analytics figures for one private class taught by a human
        instructor.

        Write a short, plain-language briefing (2-4 sentences) that describes how
        the class is doing, and propose 1-4 concrete, actionable interventions a
        teacher could take this week. Be specific about knowledge components when
        they are named. Never invent numbers that are not in the input, never
        mention that you are an AI, and never give medical or diagnostic advice.
        PROMPT;
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'summary' => $schema->string()->required(),
            'suggested_interventions' => $schema->array()
                ->items($schema->string())
                ->required(),
        ];
    }

    /**
     * Produce a class briefing, falling back to a deterministic summary whenever
     * the AI provider is unavailable or returns an unusable payload.
     *
     * @return array{
     *     summary: string,
     *     suggested_interventions: list<string>,
     *     engine: string
     * }
     */
    public function briefing(User $instructor, int $classId): array
    {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $kpis = $this->dashboard->forClass($instructor, $classId);
        $atRisk = $this->atRisk->atRiskStudents($instructor, $classId);

        try {
            $response = $this->prompt($this->buildPrompt($class, $kpis, $atRisk));

            /** @var array<string, mixed> $structured */
            $structured = $response->toArray();

            $summary = trim((string) ($structured['summary'] ?? ''));

            /** @var mixed $rawInterventions */
            $rawInterventions = $structured['suggested_interventions'] ?? [];

            $interventions = [];

            if (is_array($rawInterventions)) {
                foreach ($rawInterventions as $candidate) {
                    if (is_string($candidate) && trim($candidate) !== '') {
                        $interventions[] = trim($candidate);
                    }
                }
            }

            if ($summary === '' || $interventions === []) {
                throw new \RuntimeException('The AI briefing response was incomplete.');
            }

            return [
                'summary' => $summary,
                'suggested_interventions' => array_values(array_slice($interventions, 0, 5)),
                'engine' => 'ai',
            ];
        } catch (\Throwable $exception) {
            Log::warning('instructor.briefing.fallback', [
                'event' => 'instructor.briefing.fallback',
                'instructor_id' => (int) $instructor->getKey(),
                'class_id' => (int) $class->getKey(),
                'error' => $exception->getMessage(),
                'exception' => $exception::class,
            ]);

            $fallback = $this->ruleBasedBriefing($class, $kpis, $atRisk);

            return [
                'summary' => $fallback['summary'],
                'suggested_interventions' => $fallback['suggested_interventions'],
                'engine' => 'rule_based',
            ];
        }
    }

    /**
     * Deterministic briefing built only from the class KPIs.
     *
     * @param  array<string, mixed>  $kpis
     * @param  list<array<string, mixed>>  $atRisk
     * @return array{summary: string, suggested_interventions: list<string>}
     */
    public function ruleBasedBriefing(PrivateClass $class, array $kpis, array $atRisk): array
    {
        $activeStudents = (int) ($kpis['active_students'] ?? 0);
        $averageMastery = (float) ($kpis['avg_mastery'] ?? 0.0);
        $atRiskCount = (int) ($kpis['at_risk_count'] ?? 0);
        $assignments = is_array($kpis['upcoming_assignments'] ?? null) ? count($kpis['upcoming_assignments']) : 0;

        $summary = sprintf(
            '%s has %d active %s with an average mastery of %.0f%%; %d %s currently at risk.',
            (string) $class->name,
            $activeStudents,
            $activeStudents === 1 ? 'student' : 'students',
            $averageMastery * 100,
            $atRiskCount,
            $atRiskCount === 1 ? 'student is' : 'students are',
        );

        $interventions = [];

        if ($atRiskCount > 0) {
            $interventions[] = sprintf(
                'Schedule a small-group remediation session for the %d at-risk %s and focus on their lowest-scoring knowledge components.',
                $atRiskCount,
                $atRiskCount === 1 ? 'student' : 'students',
            );
        }

        if ($averageMastery < 0.7) {
            $interventions[] = 'Re-teach the two weakest knowledge components and add a short formative quiz before the next unit.';
        }

        if ($assignments === 0) {
            $interventions[] = 'Assign the next course lesson so every student has a concrete task due this week.';
        }

        if ($interventions === []) {
            $interventions[] = 'Keep the current pace and spot-check mastery after the next practice session.';
        }

        return [
            'summary' => $summary,
            'suggested_interventions' => $interventions,
        ];
    }

    /**
     * @param  array<string, mixed>  $kpis
     * @param  list<array<string, mixed>>  $atRisk
     */
    private function buildPrompt(PrivateClass $class, array $kpis, array $atRisk): string
    {
        $atRiskLines = [];

        foreach (array_slice($atRisk, 0, 10) as $row) {
            $atRiskLines[] = sprintf(
                '- student #%d: lowest mastery %.2f across %d knowledge components',
                (int) ($row['student_id'] ?? 0),
                (float) ($row['lowest_mastery'] ?? 0.0),
                (int) ($row['at_risk_kc_count'] ?? 0),
            );
        }

        return implode("\n", [
            'Class: '.$class->name,
            'Description: '.($class->description ?? 'n/a'),
            'Active students: '.((int) ($kpis['active_students'] ?? 0)),
            'Average mastery probability: '.round((float) ($kpis['avg_mastery'] ?? 0.0), 4),
            'Students at risk: '.((int) ($kpis['at_risk_count'] ?? 0)),
            'Assigned courses: '.count(is_array($kpis['assigned_courses'] ?? null) ? $kpis['assigned_courses'] : []),
            'Upcoming assignments: '.count(is_array($kpis['upcoming_assignments'] ?? null) ? $kpis['upcoming_assignments'] : []),
            $atRiskLines === [] ? 'No at-risk detail available.' : "At-risk detail:\n".implode("\n", $atRiskLines),
            'Produce the briefing for the instructor.',
        ]);
    }
}
