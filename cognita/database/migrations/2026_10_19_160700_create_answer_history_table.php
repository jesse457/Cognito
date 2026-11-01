<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('answer_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('practice_sessions')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            // The FK to knowledge_components is added by that table's own
            // migration (Phase 4.3) because the spec orders answer_history
            // (4.2) before knowledge_components (4.3).
            $table->unsignedBigInteger('knowledge_component_id')->nullable()->index();
            $table->json('question_payload');
            $table->json('user_answer');
            $table->boolean('is_correct');
            $table->integer('time_taken_ms');
            $table->timestamps();

            $table->index(['user_id', 'knowledge_component_id', 'created_at'], 'answer_history_user_kc_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answer_history');
    }
};
