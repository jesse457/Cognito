<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A PDF that belongs to a class, independent of the board currently showing it.
 *
 * Uploads are kept in this library instead of being replaced, so an instructor
 * can put a deck back on the board later without uploading it again. The file
 * itself lives on the board disk; this row holds its metadata and a stable URL.
 */
class ClassDocument extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'uploaded_by',
        'name',
        'path',
        'pages',
        'size',
        'checksum',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pages' => 'integer',
            'size' => 'integer',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * The document as the board sees it. A stable per-document URL lets the
     * browser and PDF.js reuse an immutable cached copy, and lets range
     * requests be served for just the pages a student opens.
     *
     * @return array{id: int, name: string, url: string, pages: int, size: int}
     */
    public function boardReference(): array
    {
        return [
            'id' => (int) $this->getKey(),
            'name' => (string) $this->name,
            'url' => route('board.documents.show', [
                'classroom' => $this->classroom_id,
                'document' => $this->getKey(),
            ], absolute: false),
            'pages' => max(1, (int) $this->pages),
            'size' => max(0, (int) $this->size),
        ];
    }

    /**
     * @return array{id: int, name: string, url: string, pages: int, size: int, selectUrl: string, active: bool}
     */
    public function boardSummary(int $activeId): array
    {
        return [
            ...$this->boardReference(),
            'selectUrl' => route('board.documents.present', [
                'classroom' => $this->classroom_id,
                'document' => $this->getKey(),
            ], absolute: false),
            'active' => (int) $this->getKey() === $activeId,
        ];
    }
}
