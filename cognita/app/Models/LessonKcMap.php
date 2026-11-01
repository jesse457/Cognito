<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonKcMap extends Model
{
    use HasFactory;

    protected $table = 'lesson_kc_map';

    /** @var list<string> */
    protected $fillable = [
        'lesson_id',
        'knowledge_component_id',
    ];

    /** @return BelongsTo<Lesson, $this> */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    /** @return BelongsTo<KnowledgeComponent, $this> */
    public function knowledgeComponent(): BelongsTo
    {
        return $this->belongsTo(KnowledgeComponent::class);
    }
}
