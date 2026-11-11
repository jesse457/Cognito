<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('polls', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('call_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('question', 240);
            $table->timestamp('ends_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['call_session_id', 'id']);
            $table->index(['classroom_id', 'created_at']);
        });

        Schema::create('poll_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_id')->constrained()->cascadeOnDelete();
            $table->string('label', 120);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['poll_id', 'position']);
        });

        Schema::create('poll_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('poll_option_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->timestamps();

            $table->unique(['poll_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_responses');
        Schema::dropIfExists('poll_options');
        Schema::dropIfExists('polls');
    }
};
