<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\User;
use App\Support\AdminContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Central writer for the append-only `admin_audit_logs` table.
 *
 * Every privileged write in Cognita funnels through here so that the column set
 * (actor, actor_role, action, target, context, ip, user_agent) is identical
 * everywhere. There is deliberately no update()/delete() method: audit rows are
 * immutable and no HTTP route can modify them.
 */
class AuditLogService
{
    public function __construct(private readonly AdminContext $adminContext) {}

    /**
     * @param  array<string, mixed>  $context  Free-form structured details; never empty.
     */
    public function record(
        User $actor,
        string $action,
        ?Model $target = null,
        array $context = [],
        ?string $ipAddress = null,
        ?string $userAgent = null,
    ): AdminAuditLog {
        $context = $this->normaliseContext($context);

        return AdminAuditLog::create([
            'actor_id' => $actor->getKey(),
            'actor_role' => $actor->role->value,
            'action' => $action,
            'target_type' => $target === null ? null : $this->morphAlias($target),
            'target_id' => $target?->getKey(),
            'context' => $context,
            'ip_address' => $ipAddress ?? $this->adminContext->ipAddress(),
            'user_agent' => $userAgent ?? $this->adminContext->userAgent(),
        ]);
    }

    /**
     * Record only when an admin context actor is present (used by the
     * LogsAdminActivity trait, which must never audit public user actions).
     *
     * @param  array<string, mixed>  $context
     */
    public function recordIfAdminContext(string $action, ?Model $target = null, array $context = []): ?AdminAuditLog
    {
        if (! $this->adminContext->auditingEnabled()) {
            return null;
        }

        $actor = $this->adminContext->actor();

        if ($actor === null) {
            return null;
        }

        return $this->record($actor, $action, $target, $context);
    }

    /**
     * @return array{actor_id:int, actor_role:string, action:string, target_type:?string, target_id:?int, context:array<string,mixed>}
     */
    public function describe(AdminAuditLog $log): array
    {
        return [
            'actor_id' => $log->actor_id,
            'actor_role' => $log->actor_role,
            'action' => $log->action,
            'target_type' => $log->target_type,
            'target_id' => $log->target_id,
            'context' => $log->context ?? [],
        ];
    }

    /** Stable lowercase alias used for target_type (e.g. `user`, `course`, `content_report`). */
    private function morphAlias(Model $model): string
    {
        $alias = array_search($model::class, config('cognita.morph_map', []), true);

        if (is_string($alias)) {
            return $alias;
        }

        return str($model->getTable())->singular()->snake()->value();
    }

    /**
     * Guarantees a non-empty JSON object: the audit contract requires structured
     * context on every row.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function normaliseContext(array $context): array
    {
        $context = array_filter(
            $context,
            static fn (mixed $value): bool => $value !== null && $value !== '' && $value !== [],
        );

        if ($context === []) {
            return ['recorded_at' => now()->toIso8601String()];
        }

        return $context;
    }
}
