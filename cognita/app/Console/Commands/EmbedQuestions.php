<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\PostEmbedding;
use App\Models\Question;
use App\Services\PostEmbedder;
use Illuminate\Console\Command;

/**
 * Builds the search vectors for rows that predate semantic search. Safe to run
 * repeatedly: PostEmbedder compares the stored content first and skips unchanged
 * posts.
 */
class EmbedQuestions extends Command
{
    protected $signature = 'questions:embed {--fresh : Rebuild every vector from scratch}';

    protected $description = 'Generate pgvector embeddings for questions and answers';

    public function handle(PostEmbedder $embedder): int
    {
        if ($this->option('fresh') === true) {
            PostEmbedding::query()->delete();
            $this->components->info('Cleared the existing search vectors.');
        }

        $questions = 0;
        $answers = 0;

        Question::query()
            ->with('answers.question')
            ->chunkById(100, function ($rows) use ($embedder, &$questions, &$answers): void {
                foreach ($rows as $question) {
                    $embedder->sync($question);
                    $questions++;

                    foreach ($question->answers as $answer) {
                        $embedder->sync($answer);
                        $answers++;
                    }
                }
            });

        $this->components->info("Indexed {$questions} questions and {$answers} answers.");

        return self::SUCCESS;
    }
}
