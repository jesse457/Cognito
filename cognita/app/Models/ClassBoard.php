<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BoardSurface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The single board attached to a class and rendered inside the live call.
 *
 * It records which surface is showing (blank canvas, ruled notebook page or an
 * uploaded PDF), which page is visible, whether students may draw on it, and
 * the persisted strokes. Live edits travel over the LiveKit data channel for
 * latency; this row is what a late joiner loads and what survives a reload.
 */
class ClassBoard extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'surface',
        'title',
        'document_path',
        'document_name',
        'document_pages',
        'page',
        'students_can_annotate',
        'strokes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'surface' => BoardSurface::class,
            'document_pages' => 'integer',
            'page' => 'integer',
            'students_can_annotate' => 'boolean',
            'strokes' => 'array',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function hasDocument(): bool
    {
        return filled($this->document_path);
    }

    public function pageCount(): int
    {
        return max(1, (int) $this->document_pages);
    }

    /** Pages a fresh surface starts with: one canvas, a short notebook, a PDF. */
    public static function defaultPagesFor(BoardSurface $surface): int
    {
        return match ($surface) {
            BoardSurface::Canvas => 1,
            BoardSurface::Notebook => 8,
            BoardSurface::Pdf => 1,
        };
    }

    /**
     * The payload the call page boots from.
     *
     * @return array{
     *     surface: string,
     *     title: string,
     *     document: array{name: string, url: string, pages: int}|null,
     *     page: int,
     *     pages: int,
     *     studentsCanAnnotate: bool,
     *     strokes: list<mixed>
     * }
     */
    public function state(): array
    {
        return [
            'surface' => $this->surface->value,
            'title' => (string) ($this->title ?: $this->surface->label()),
            'document' => $this->hasDocument() ? [
                'name' => (string) ($this->document_name ?: 'Document.pdf'),
                'url' => route('board.document', ['classroom' => $this->classroom_id], absolute: false),
                'pages' => $this->pageCount(),
            ] : null,
            'page' => max(1, min($this->page, $this->pageCount())),
            'pages' => $this->pageCount(),
            'studentsCanAnnotate' => (bool) $this->students_can_annotate,
            'strokes' => array_values($this->strokes ?? []),
        ];
    }
}
