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
use App\Services\ClassroomAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

/**
 * The board *settings* of a live class: what is up (canvas or a PDF), which page,
 * and whether students may draw.
 *
 * Ink is not here, and not anywhere on the server. A stroke is drawn in the
 * browser that made it, sent over the room's realtime channel, and forgotten when
 * the room closes — so this endpoint is small on purpose and refuses strokes
 * outright rather than quietly dropping them.
 *
 * The board row is durable: the class keeps its deck, its page and its drawing
 * permission between lessons.
 */
class BoardController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly BoardSessions $sessions,
    ) {}

    public function update(UpdateBoardRequest $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertHost($user, $classroom, 'Only the class instructor can change the board.');

        abort_if(
            $request->has('strokes'),
            422,
            'Drawings live in the room only. The board saves its surface, page and permissions.',
        );

        $board = $classroom->boardOrCreate();

        /** @var array{surface?: string, page?: int, pages?: int, students_can_annotate?: bool} $data */
        $data = $request->validated();

        $this->applyToBoard($board, $data);
        $board->save();

        $state = $board->refresh()->state($this->sessions->live($classroom));

        return $request->expectsJson() ? response()->json(['data' => $state]) : back();
    }

    /**
     * @param  array{surface?: string, page?: int, pages?: int, students_can_annotate?: bool}  $data
     */
    private function applyToBoard(ClassBoard $board, array $data): void
    {
        if (array_key_exists('surface', $data)) {
            $board->surface = BoardSurface::from($data['surface']);
            $board->title = $board->surface->label();
        }

        if (array_key_exists('pages', $data)) {
            $board->document_pages = max(1, (int) $data['pages']);

            // The page count belongs to the stored document too, so the class
            // library keeps the right number after the board leaves the PDF.
            if ($board->document_id !== null) {
                ClassDocument::query()
                    ->whereKey($board->document_id)
                    ->update(['pages' => $board->document_pages]);
            }
        }

        if (array_key_exists('page', $data) && $board->surface === BoardSurface::Pdf) {
            $board->page = max(1, (int) $data['page']);
        }

        if (array_key_exists('students_can_annotate', $data)) {
            $board->students_can_annotate = (bool) $data['students_can_annotate'];
        }

        // The canvas has one page, but the PDF page is remembered underneath it:
        // switching to the canvas and back must not start the lecture again.
        if ($board->surface === BoardSurface::Pdf) {
            $board->page = max(1, min($board->page, $board->pageCount()));
        }
    }
}
