<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * pgvector must exist before `chunk_embeddings` is created. The container
     * image already provides the extension; this statement makes a plain
     * (non-container) Postgres install work identically.
     */
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
    }

    public function down(): void
    {
        // The extension is shared infrastructure; it is intentionally not dropped.
    }
};
