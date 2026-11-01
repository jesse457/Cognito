<?php

use App\Enums\ClassStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 4.7 — migrated unconditionally even while the instructor path is
     * disabled, so enabling the portal later is a config flip, not a schema change.
     */
    public function up(): void
    {
        Schema::create('private_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('join_code')->unique();
            $table->integer('max_students')->default(50);
            $table->string('status')->default(ClassStatus::Active->value)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_classes');
    }
};
