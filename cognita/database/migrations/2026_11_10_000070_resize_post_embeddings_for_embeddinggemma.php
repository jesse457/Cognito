<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $dimensions = max(1, (int) config('embeddings.dimensions', 768));

        // Existing vectors belong to the previous model space. They cannot be
        // cast to the new width, and they would not be comparable anyway.
        DB::table('post_embeddings')->delete();

        DB::statement('DROP INDEX IF EXISTS post_embeddings_embedding_hnsw');
        DB::statement("ALTER TABLE post_embeddings ALTER COLUMN embedding TYPE vector({$dimensions})");
        DB::statement('CREATE INDEX post_embeddings_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops)');
    }

    public function down(): void
    {
        DB::table('post_embeddings')->delete();

        DB::statement('DROP INDEX IF EXISTS post_embeddings_embedding_hnsw');
        DB::statement('ALTER TABLE post_embeddings ALTER COLUMN embedding TYPE vector(1536)');
        DB::statement('CREATE INDEX post_embeddings_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops)');
    }
};
