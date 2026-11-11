<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Answer;
use App\Models\PostEmbedding;
use App\Models\Question;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Pgvector\Laravel\Distance;
use Throwable;

/**
 * Semantic search over question and answer bodies.
 *
 * A query is embedded once, then compared against the mixed post table with
 * cosine distance. The visible scope is applied in SQL before the nearest
 * neighbour limit, so a class-only question cannot leak into community search
 * results even if its vector is closer.
 */
class QuestionSearch
{
    public function __construct(private readonly PostEmbedder $embedder) {}

    /**
     * @param  list<int>  $classroomIds
     * @return array{
     *     questions: list<array{question: Question, distance: float, kind: 'question'|'answer', excerpt: string, answer: Answer|null}>,
     *     answers: list<array{question: Question, answer: Answer, distance: float, excerpt: string}>
     * }
     */
    public function search(string $term, bool $community, array $classroomIds, int $limit = 40): array
    {
        $term = trim($term);

        if ($term === '') {
            return ['questions' => [], 'answers' => []];
        }

        try {
            $vector = $this->embedder->embed($term, query: true);

            $questionRows = PostEmbedding::query()
                ->where('embeddable_type', Question::class)
                ->whereHasMorph(
                    'embeddable',
                    [Question::class],
                    fn (Builder $query) => $this->scope($query, $community, $classroomIds),
                )
                ->nearestNeighbors('embedding', $vector, Distance::Cosine)
                ->with('embeddable')
                ->limit($limit * 2)
                ->get();

            $answerRows = PostEmbedding::query()
                ->where('embeddable_type', Answer::class)
                ->whereHasMorph(
                    'embeddable',
                    [Answer::class],
                    fn (Builder $query) => $query->whereHas(
                        'question',
                        fn (Builder $question) => $this->scope($question, $community, $classroomIds),
                    ),
                )
                ->nearestNeighbors('embedding', $vector, Distance::Cosine)
                ->with('embeddable')
                ->limit($limit * 2)
                ->get();
        } catch (Throwable $exception) {
            report($exception);

            return ['questions' => [], 'answers' => []];
        }

        /** @var array<int, array{question: Question, distance: float, kind: 'question'|'answer', excerpt: string, answer: Answer|null}> $matches */
        $matches = [];

        foreach ($questionRows as $row) {
            $question = $row->embeddable;

            if (! $question instanceof Question) {
                continue;
            }

            $distance = (float) $row->getAttribute('neighbor_distance');

            if (! $this->withinThreshold($distance)) {
                continue;
            }

            $current = $matches[(int) $question->getKey()] ?? null;

            if ($current === null || $distance < $current['distance']) {
                $matches[(int) $question->getKey()] = [
                    'question' => $question,
                    'distance' => $distance,
                    'kind' => 'question',
                    'excerpt' => $this->excerpt($question->title.' — '.$question->body),
                    'answer' => null,
                ];
            }
        }

        /** @var list<array{question: Question, answer: Answer, distance: float, excerpt: string}> $answerMatches */
        $answerMatches = [];

        foreach ($answerRows as $row) {
            $answer = $row->embeddable;

            if (! $answer instanceof Answer) {
                continue;
            }

            $answer->loadMissing('question');
            $question = $answer->question;

            if ($question === null) {
                continue;
            }

            $distance = (float) $row->getAttribute('neighbor_distance');

            if (! $this->withinThreshold($distance)) {
                continue;
            }

            $excerpt = $this->excerpt($answer->body);
            $answerMatches[] = [
                'question' => $question,
                'answer' => $answer,
                'distance' => $distance,
                'excerpt' => $excerpt,
            ];

            $current = $matches[(int) $question->getKey()] ?? null;

            if ($current === null || $distance < $current['distance']) {
                $matches[(int) $question->getKey()] = [
                    'question' => $question,
                    'distance' => $distance,
                    'kind' => 'answer',
                    'excerpt' => $excerpt,
                    'answer' => $answer,
                ];
            }
        }

        $questions = array_values($matches);
        usort($questions, static fn (array $left, array $right): int => $left['distance'] <=> $right['distance']);
        usort($answerMatches, static fn (array $left, array $right): int => $left['distance'] <=> $right['distance']);

        return [
            'questions' => array_slice($questions, 0, $limit),
            'answers' => array_slice($answerMatches, 0, 6),
        ];
    }

    /**
     * @return list<array{question: Question, distance: float}>
     */
    public function related(Question $question, int $limit = 5): array
    {
        $embedding = PostEmbedding::query()
            ->where('embeddable_type', Question::class)
            ->where('embeddable_id', $question->getKey())
            ->first();

        if ($embedding === null) {
            return [];
        }

        $community = $question->isCommunity();

        try {
            $rows = PostEmbedding::query()
                ->where('embeddable_type', Question::class)
                ->where('embeddable_id', '!=', $question->getKey())
                ->whereHasMorph(
                    'embeddable',
                    [Question::class],
                    fn (Builder $query) => $community
                        ? $query->community()
                        : $query->classroom()->where('classroom_id', $question->classroom_id),
                )
                ->nearestNeighbors('embedding', $embedding->embedding, Distance::Cosine)
                ->with('embeddable')
                ->limit($limit)
                ->get();
        } catch (Throwable $exception) {
            report($exception);

            return [];
        }

        $related = [];

        foreach ($rows as $row) {
            $candidate = $row->embeddable;

            if (! $candidate instanceof Question) {
                continue;
            }

            $related[] = [
                'question' => $candidate,
                'distance' => (float) $row->getAttribute('neighbor_distance'),
            ];
        }

        return $related;
    }

    /**
     * @param  Builder<Question>  $query
     * @param  list<int>  $classroomIds
     */
    private function scope(Builder $query, bool $community, array $classroomIds): void
    {
        $community
            ? $query->community()
            : $query->classroom()->whereIn('classroom_id', $classroomIds);
    }

    private function withinThreshold(float $distance): bool
    {
        return $distance <= (float) config('embeddings.max_distance', 0.82);
    }

    private function excerpt(string $text): string
    {
        $plain = preg_replace('/\s+/', ' ', $text) ?? $text;

        return Str::limit($plain, 180);
    }
}
