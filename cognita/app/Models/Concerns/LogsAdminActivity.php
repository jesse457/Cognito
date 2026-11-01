<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an `admin_audit_logs` row whenever a model is created, updated or
 * deleted **from an admin context** (see App\Support\AdminContext).
 *
 * Public and student actions never carry an admin actor, so they are never
 * audited. Services that record their own explicit audit row wrap their work in
 * AdminContext::runWithoutModelAudit() to keep exactly one row per action.
 */
trait LogsAdminActivity
{
    public static function bootLogsAdminActivity(): void
    {
        static::created(function (Model $model): void {
            app(AuditLogService::class)->recordIfAdminContext(
                action: $model->auditActionFor('create'),
                target: $model,
                context: ['event' => 'created', 'attributes' => $model->auditSnapshot()],
            );
        });

        static::updated(function (Model $model): void {
            app(AuditLogService::class)->recordIfAdminContext(
                action: $model->auditActionFor('update'),
                target: $model,
                context: ['event' => 'updated', 'changes' => $model->auditChanges()],
            );
        });

        static::deleted(function (Model $model): void {
            app(AuditLogService::class)->recordIfAdminContext(
                action: $model->auditActionFor('delete'),
                target: $model,
                context: ['event' => 'deleted', 'attributes' => $model->auditSnapshot()],
            );
        });
    }

    /** Audit action key, e.g. `course.update`. Override to customise. */
    public function auditActionFor(string $event): string
    {
        return $this->auditResourceName().'.'.$event;
    }

    /** Resource prefix, e.g. `course`. Override when it differs from the table name. */
    public function auditResourceName(): string
    {
        return str($this->getTable())->singular()->snake()->value();
    }

    /**
     * Attributes captured on create/delete.
     *
     * @return array<string, mixed>
     */
    protected function auditSnapshot(): array
    {
        return collect($this->getAttributes())
            ->except([$this->getKeyName(), 'password', 'remember_token'])
            ->all();
    }

    /**
     * Attribute changes captured on update.
     *
     * @return array<string, array{old:mixed,new:mixed}>
     */
    protected function auditChanges(): array
    {
        $changes = [];

        foreach ($this->getChanges() as $key => $new) {
            if (in_array($key, [$this->getKeyName(), 'password', 'remember_token', 'updated_at'], true)) {
                continue;
            }

            $changes[$key] = ['old' => $this->getOriginal($key), 'new' => $new];
        }

        return $changes;
    }
}
