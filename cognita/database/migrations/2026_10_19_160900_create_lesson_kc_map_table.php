<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_kc_map', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('knowledge_component_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['lesson_id', 'knowledge_component_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_kc_map');
    }
};
