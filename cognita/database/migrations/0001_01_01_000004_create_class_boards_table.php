<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_boards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->unique()->constrained('classrooms')->cascadeOnDelete();
            $table->string('surface')->default('canvas');
            $table->string('title')->nullable();
            $table->string('document_path')->nullable();
            $table->string('document_name')->nullable();
            $table->unsignedInteger('document_pages')->default(1);
            $table->unsignedInteger('page')->default(1);
            $table->boolean('students_can_annotate')->default(false);
            $table->json('strokes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_boards');
    }
};
