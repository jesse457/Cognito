<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use Database\Factories\ContentReportFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ContentReport extends Model
{
    /** @use HasFactory<ContentReportFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'reporter_id',
        'reportable_type',
        'reportable_id',
        'reason',
        'details',
        'status',
        'resolution_note',
        'resolved_by',
        'resolved_at',
    ];

    /**
     * NOTE: `reportable_type` is intentionally NOT cast to an enum — the morph
     * relation needs the raw alias string. ReportableType validation happens at
     * the request/controller boundary instead.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reason' => ReportReason::class,
            'status' => ReportStatus::class,
            'resolved_at' => 'datetime',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /** @return BelongsTo<User, $this> */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /** @param  Builder<ContentReport>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', ReportStatus::Open->value);
    }

    /** @param  Builder<ContentReport>  $query */
    public function scopeAwaitingAction(Builder $query): void
    {
        $query->whereIn('status', [ReportStatus::Open->value, ReportStatus::InReview->value]);
    }

    /**
     * Moderators can action every report, so no row-level filtering is needed.
     * Kept as an explicit named scope so the intent is documented in one place.
     *
     * @param  Builder<ContentReport>  $query
     */
    public function scopeForAssignableTo(Builder $query, User $staff): void
    {
        if ($staff->roleAtLeast(UserRole::Moderator)) {
            return;
        }

        // Non-staff never reach this path; return an impossible set defensively.
        $query->whereRaw('1 = 0');
    }
}
