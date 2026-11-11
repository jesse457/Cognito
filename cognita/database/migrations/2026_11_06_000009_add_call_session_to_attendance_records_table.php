<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table): void {
            $table->foreignId('call_session_id')
                ->nullable()
                ->after('classroom_id')
                ->constrained('call_sessions')
                ->nullOnDelete();

            // Completed presence, in seconds. The current uninterrupted stretch
            // is added by the tracker when a ping or leave arrives, so a rejoin
            // adds to this record instead of replacing it.
            $table->unsignedInteger('present_seconds')->default(0)->after('left_at');

            $table->unique(['call_session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table): void {
            $table->dropUnique(['call_session_id', 'user_id']);
            $table->dropConstrainedForeignId('call_session_id');
            $table->dropColumn('present_seconds');
        });
    }
};
