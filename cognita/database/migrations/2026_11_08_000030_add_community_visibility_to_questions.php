<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->string('visibility', 16)->default('classroom');
            $table->foreignId('classroom_id')->nullable()->change();

            $table->index(['visibility', 'created_at']);
        });
    }

    public function down(): void
    {
        DB::table('questions')->whereNull('classroom_id')->delete();

        Schema::table('questions', function (Blueprint $table): void {
            $table->dropIndex(['visibility', 'created_at']);
            $table->dropColumn('visibility');
            $table->foreignId('classroom_id')->nullable(false)->change();
        });
    }
};
