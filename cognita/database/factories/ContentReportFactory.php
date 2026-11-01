<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Models\ContentReport;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * `reportable_type` stores a SHORT MORPH ALIAS (`course`, `forum_thread`,
 * `forum_post`, `lesson`) — never an FQCN, per config('cognita.morph_map').
 *
 * @extends Factory<ContentReport>
 */
class ContentReportFactory extends Factory
{
    /** @var class-string<ContentReport> */
    protected $model = ContentReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $reportable = Course::factory();

        return [
            'reporter_id' => User::factory()->student(),
            'reportable_type' => $this->aliasFor($reportable),
            'reportable_id' => $reportable,
            'reason' => $this->faker->randomElement(ReportReason::cases()),
            'details' => $this->faker->sentence(14),
            'status' => ReportStatus::Open,
            'resolution_note' => null,
            'resolved_by' => null,
            'resolved_at' => null,
        ];
    }

    /**
     * Point the report at a concrete reportable model and set the alias from
     * config('cognita.morph_map') so it always matches the app's morph map.
     */
    public function forReportable(Model $reportable): static
    {
        return $this->state(fn (array $attributes): array => [
            'reportable_type' => $this->aliasFor($reportable),
            'reportable_id' => $reportable->getKey(),
        ]);
    }

    public function open(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReportStatus::Open,
            'resolved_by' => null,
            'resolved_at' => null,
            'resolution_note' => null,
        ]);
    }

    public function inReview(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReportStatus::InReview,
        ]);
    }

    public function resolved(?User $moderator = null, ?string $note = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReportStatus::Resolved,
            'resolved_by' => $moderator?->getKey() ?? User::factory()->moderator(),
            'resolved_at' => now(),
            'resolution_note' => $note ?? 'Reviewed and actioned by moderation.',
        ]);
    }

    public function dismissed(?User $moderator = null, ?string $note = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReportStatus::Dismissed,
            'resolved_by' => $moderator?->getKey() ?? User::factory()->moderator(),
            'resolved_at' => now(),
            'resolution_note' => $note ?? 'No policy violation found.',
        ]);
    }

    public function withReason(ReportReason $reason): static
    {
        return $this->state(fn (array $attributes): array => [
            'reason' => $reason,
        ]);
    }

    /**
     * Resolve a model instance (not a factory) to its configured morph alias.
     */
    private function aliasFor(mixed $reportable): string
    {
        if ($reportable instanceof Model) {
            $alias = array_search($reportable::class, config('cognita.morph_map', []), true);

            if (is_string($alias)) {
                return $alias;
            }

            return (string) $reportable->getMorphClass();
        }

        return 'course';
    }
}
