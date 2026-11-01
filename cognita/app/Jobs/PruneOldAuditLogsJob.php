<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AdminAuditLog;
use App\Services\SystemSettingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Retention pruning for the append-only audit trail. Scheduled monthly.
 *
 * Deletion goes through the QUERY BUILDER on purpose: AdminAuditLog blocks
 * instance-level deletes so no application code can quietly rewrite history,
 * while this explicit retention job is the single sanctioned pruning path.
 *
 * Retention comes from the owner-editable `audit_retention_days` setting,
 * read through SystemSettingService (and therefore from its 60s cache).
 */
class PruneOldAuditLogsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300, 900];

    public int $timeout = 300;

    public function __construct(private readonly ?int $retentionDays = null) {}

    public function handle(SystemSettingService $settings): void
    {
        $retention = $this->retentionDays
            ?? (int) $settings->get('audit_retention_days', 365);

        if ($retention < 1) {
            $retention = 365;
        }

        $cutoff = now()->subDays($retention);

        $deleted = AdminAuditLog::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        Log::info('audit.retention_pruned', [
            'event' => 'audit.retention_pruned',
            'retention_days' => $retention,
            'cutoff' => $cutoff->toIso8601String(),
            'deleted_rows' => $deleted,
            'job' => self::class,
        ]);
    }
}
