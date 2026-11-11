<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('attended_on');
            $table->timestamp('joined_at');
            $table->timestamp('last_seen_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'attended_on']);
            $table->index(['user_id', 'attended_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
