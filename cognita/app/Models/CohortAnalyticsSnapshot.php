<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CohortAnalyticsSnapshot extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'class_id',
        'snapshot_date',
        'metrics',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'metrics' => 'array',
        ];
    }

    /** @return BelongsTo<PrivateClass, $this> */
    public function privateClass(): BelongsTo
    {
        return $this->belongsTo(PrivateClass::class, 'class_id');
    }
}
