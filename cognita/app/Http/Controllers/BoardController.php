<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BoardSurface;
use App\Http\Requests\UpdateBoardRequest;
use App\Models\ClassBoard;
use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Models\User;
use App\Services\BoardSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

/**
 * The board *settings* of a live class: what is up (canvas or a PDF) and
 * which page.
 *
 * Ink is not here, and not anywhere on the server. A stroke is drawn in the
 * browser that made it, sent over the room's realtime channel, and forgotten when
 * the room closes — so this endpoint is small on purpose and refuses strokes
 * outright rather than quietly dropping them.
 *
 * The board row is durable: the class keeps its deck and its page between
 * lessons.
 */
class BoardController extends Controller
{
    public function __construct(
        private readonly BoardSessions $sessions,
    ) {}

    public function update(UpdateBoardRequest $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('manageBoard', $classroom);

        abort_if(
            $request->has('strokes'),
            422,
            'Drawings live in the room only. The board saves its surface and its page.',
        );

        $board = $classroom->boardOrCreate();

        /** @var array{surface?: string, page?: int, pages?: int} $data */
        $data = $request->validated();

        $this->applyToBoard($board, $data);
        $board->save();

        $state = $board->refresh()->state($this->sessions->live($classroom));

        return $request->expectsJson() ? response()->json(['data' => $state]) : back();
    }

    /**
     * @param  array{surface?: string, page?: int, pages?: int}  $data
     */
    private function applyToBoard(ClassBoard $board, array $data): void
    {
        if (array_key_exists('surface', $data)) {
            $board->surface = BoardSurface::from($data['surface']);
            $board->title = $board->surface->label();
        }

        if (array_key_exists('pages', $data)) {
            // The page count belongs to the document, so the class library
            // keeps the right number however often the deck is shown again.
            if ($board->document_id !== null) {
                ClassDocument::query()
                    ->whereKey($board->document_id)
                    ->update(['pages' => max(1, (int) $data['pages'])]);

                $board->unsetRelation('document');
            }
        }

        if (array_key_exists('page', $data) && $board->surface === BoardSurface::Pdf) {
            $board->page = max(1, (int) $data['page']);
        }

        // The canvas has one page, but the PDF page is remembered underneath it:
        // switching to the canvas and back must not start the lecture again.
        if ($board->surface === BoardSurface::Pdf) {
            $board->page = max(1, min($board->page, $board->pageCount()));
        }
    }
}
