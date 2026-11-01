<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RAG vector store. Laravel has no native `vector` column type, so the
     * embedding column and its HNSW (cosine) index are created with raw SQL.
     */
    public function up(): void
    {
        Schema::create('chunk_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chunk_id')->constrained('document_chunks')->cascadeOnDelete();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE chunk_embeddings ADD COLUMN embedding vector(1536)');
        DB::statement('CREATE INDEX chunk_embeddings_hnsw_idx ON chunk_embeddings USING hnsw (embedding vector_cosine_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('chunk_embeddings');
    }
};
