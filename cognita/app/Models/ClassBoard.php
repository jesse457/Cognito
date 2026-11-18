<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BoardSurface;
use App\Services\DrawPermissions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * What the projector shows: the blank canvas or an uploaded PDF, and which page.
 *
 * The board itself is durable — the deck an instructor put up is still there
 * next week. The drawings are not: they never reach this table, or any table.
 * Ink lives in the browser that drew it and in the realtime channel of the room
 * that is open right now, so the state below always reports an empty canvas and
 * lets the room fill it in.
 */
class ClassBoard extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'classroom_id',
        'surface',
        'title',
        'document_id',
        'page',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'surface' => BoardSurface::class,
            'page' => 'integer',
        ];
    }

    /** @return BelongsTo<Classroom, $this> */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /** @return BelongsTo<ClassDocument, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(ClassDocument::class);
    }

    public function hasDocument(): bool
    {
        return $this->document_id !== null;
    }

    public function pageCount(): int
    {
        return match ($this->surface) {
            BoardSurface::Pdf => $this->hasDocument() ? max(1, (int) ($this->document?->pages ?? 1)) : 1,
            default => self::defaultPagesFor($this->surface),
        };
    }

    /** Put a stored class document on the board without uploading it again. */
    public function presentDocument(ClassDocument $document, bool $resetPage = true): void
    {
        $this->forceFill([
            'document_id' => $document->getKey(),
            'surface' => BoardSurface::Pdf,
            'title' => BoardSurface::Pdf->label(),
            ...($resetPage ? ['page' => 1] : []),
        ])->save();

        // The board now points at another document; the loaded one is stale.
        $this->unsetRelation('document');
    }

    /** Pages a fresh surface starts with: a single canvas, or a PDF's own count. */
    public static function defaultPagesFor(BoardSurface $surface): int
    {
        return match ($surface) {
            BoardSurface::Canvas, BoardSurface::Pdf => 1,
        };
    }

    /**
     * The payload the call page boots from.
     *
     * The room is passed in rather than looked up so the caller decides which
     * session the caller is allowed to see. The room contributes its token and
     * nothing else: `strokes` is present so the client has one shape to deal
     * with, and is always empty because ink is never stored.
     *
     * @return array{
     *     surface: string,
     *     title: string,
     *     document: array{id: int, name: string, url: string, pages: int, size: int}|null,
     *     documents: list<array{id: int, name: string, url: string, pages: int, size: int, selectUrl: string, active: bool}>,
     *     page: int,
     *     pages: int,
     *     pdfPage: int,
     *     allowedDrawerIds: list<int>,
     *     session: string|null,
     *     strokes: list<mixed>
     * }
     */
    public function state(?CallSession $session = null): array
    {
        $documents = ClassDocument::query()
            ->where('classroom_id', $this->classroom_id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $active = $this->document_id === null
            ? null
            : $documents->first(fn (ClassDocument $document): bool => (int) $document->getKey() === (int) $this->document_id);

        $pdfPages = $active !== null ? max(1, (int) $active->pages) : 1;

        return [
            'surface' => $this->surface->value,
            'title' => (string) ($this->title ?: $this->surface->label()),
            'document' => $active?->boardReference(),
            'documents' => $documents
                ->map(fn (ClassDocument $item): array => $item->boardSummary((int) ($this->document_id ?? 0)))
                ->values()
                ->all(),
            'page' => max(1, min($this->page, $this->pageCount())),
            'pages' => $this->pageCount(),
            // Remembered even while the canvas is up, so switching back to the
            // PDF resumes where the class left off.
            'pdfPage' => max(1, min((int) $this->page, $pdfPages)),
            'allowedDrawerIds' => $this->allowedDrawerIds(),
            'session' => $session?->token,
            'strokes' => [],
        ];
    }

    /**
     * The students who may draw right now.
     *
     * The list lives in the cache for the length of the class session, so a
     * board left over from last week grants nothing.
     *
     * @return list<int>
     */
    private function allowedDrawerIds(): array
    {
        return app(DrawPermissions::class)->allowed((int) $this->classroom_id);
    }
}
