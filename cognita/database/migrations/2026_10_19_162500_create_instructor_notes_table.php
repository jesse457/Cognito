<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Instructor notes are private to the authoring instructor. There is no
     * student-facing route, resource or policy that can read this table.
     */
    public function up(): void
    {
        Schema::create('instructor_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('private_classes')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->text('note');
            $table->timestamps();

            $table->index(['student_id', 'instructor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instructor_notes');
    }
};
