<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AnswerHistoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnswerHistory extends Model
{
    /** @use HasFactory<AnswerHistoryFactory> */
    use HasFactory;

    protected $table = 'answer_history';

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'session_id',
        'lesson_id',
        'knowledge_component_id',
        'question_payload',
        'user_answer',
        'is_correct',
        'time_taken_ms',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'question_payload' => 'array',
            'user_answer' => 'array',
            'is_correct' => 'boolean',
            'time_taken_ms' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<PracticeSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(PracticeSession::class, 'session_id');
    }

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
