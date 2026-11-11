<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        $dimensions = max(1, (int) config('embeddings.dimensions', 768));

        Schema::create('post_embeddings', function (Blueprint $table) use ($dimensions): void {
            $table->id();
            $table->morphs('embeddable');
            $table->text('content');
            $table->vector('embedding', $dimensions);
            $table->timestamps();

            $table->unique(['embeddable_type', 'embeddable_id']);
        });

        // Cosine distance is the right default for text embeddings: direction
        // matters, magnitude does not. HNSW keeps the community search fast as
        // the board grows without needing a training pass.
        DB::statement('CREATE INDEX post_embeddings_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('post_embeddings');
    }
};
