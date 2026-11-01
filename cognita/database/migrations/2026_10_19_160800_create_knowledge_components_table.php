<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('slug')->index();
            $table->timestamps();
        });

        // Deferred FK: answer_history is created earlier in the mandated order.
        Schema::table('answer_history', function (Blueprint $table) {
            $table->foreign('knowledge_component_id')
                ->references('id')
                ->on('knowledge_components')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_components');
    }
};
