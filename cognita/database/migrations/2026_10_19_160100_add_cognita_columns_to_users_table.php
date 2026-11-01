<?php

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 4.1 — extend Laravel's default `users` table with the Cognita
     * role / status / presence columns. Role and status are STRING columns
     * (never native DB enums) cast to PHP backed enums on the model.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default(UserRole::Student->value)->after('password')->index();
            $table->string('display_name')->nullable()->after('name');
            $table->string('avatar_url')->nullable()->after('display_name');
            $table->string('status')->default(UserStatus::Active->value)->after('role')->index();
            $table->timestamp('suspended_until')->nullable()->after('status');
            $table->timestamp('last_seen_at')->nullable()->after('suspended_until');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropIndex(['status']);
            $table->dropColumn(['role', 'display_name', 'avatar_url', 'status', 'suspended_until', 'last_seen_at']);
        });
    }
};
