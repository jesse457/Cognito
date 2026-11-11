<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('body');
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_accepted')->default(false);
            $table->timestamps();

            $table->index(['question_id', 'is_accepted']);
        });

        Schema::create('question_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('value');
            $table->timestamps();

            $table->unique(['question_id', 'user_id']);
        });

        Schema::create('answer_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('answer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('value');
            $table->timestamps();

            $table->unique(['answer_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answer_votes');
        Schema::dropIfExists('question_votes');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
    }
};
