<?php

use App\Enums\KtEngine;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_kc_mastery', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('knowledge_component_id')->constrained()->cascadeOnDelete();
            $table->decimal('mastery_probability', 5, 4)->default(0.0);
            // String column so switching BKT <-> DKT never requires a migration.
            $table->string('model_used')->default(KtEngine::Bkt->value);
            $table->timestamp('last_updated');
            $table->timestamps();

            $table->unique(['user_id', 'knowledge_component_id']);
            $table->index('mastery_probability');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_kc_mastery');
    }
};
