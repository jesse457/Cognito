<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\KtEngine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentKcMastery extends Model
{
    use HasFactory;

    protected $table = 'student_kc_mastery';

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'knowledge_component_id',
        'mastery_probability',
        'model_used',
        'last_updated',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mastery_probability' => 'decimal:4',
            'model_used' => KtEngine::class,
            'last_updated' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<KnowledgeComponent, $this> */
    public function knowledgeComponent(): BelongsTo
    {
        return $this->belongsTo(KnowledgeComponent::class);
    }

    /** @param  Builder<StudentKcMastery>  $query */
    public function scopeBelowThreshold(Builder $query, ?float $threshold = null): void
    {
        $query->where('mastery_probability', '<', $threshold ?? (float) config('features.at_risk_threshold'));
    }

    /** @param  Builder<StudentKcMastery>  $query */
    public function scopeForUser(Builder $query, User $user): void
    {
        $query->where('user_id', $user->getKey());
    }
}
