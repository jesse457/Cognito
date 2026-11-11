<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->string('token', 32)->unique();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_seen_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'ended_at']);
        });

        // Ink is not data. Keeping it on the board row is what carried last
        // week's drawings into this week's lesson, so the column goes — and it
        // does not move to call_sessions either: a room is a time and a token,
        // never a canvas the database keeps.
        Schema::table('class_boards', function (Blueprint $table): void {
            $table->dropColumn('strokes');
        });
    }

    public function down(): void
    {
        Schema::table('class_boards', function (Blueprint $table): void {
            $table->json('strokes')->nullable()->after('students_can_annotate');
        });

        Schema::dropIfExists('call_sessions');
    }
};
