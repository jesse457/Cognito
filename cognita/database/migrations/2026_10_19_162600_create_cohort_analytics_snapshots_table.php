<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cohort_analytics_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('private_classes')->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->json('metrics');
            $table->timestamps();

            $table->index(['class_id', 'snapshot_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cohort_analytics_snapshots');
    }
};
