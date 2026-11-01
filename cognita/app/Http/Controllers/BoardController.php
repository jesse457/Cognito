<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BoardSurface;
use App\Http\Requests\UpdateBoardRequest;
use App\Http\Requests\UploadBoardDocumentRequest;
use App\Models\ClassBoard;
use App\Models\Classroom;
use App\Models\User;
use App\Services\ClassroomAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The shared board that lives inside a class call.
 *
 * The instructor owns the surface (blank canvas, ruled notebook or an uploaded
 * PDF), the visible page, and whether students may draw. Students may only send
 * strokes, and only while the instructor has opened drawing up to them.
 *
 * Live edits travel over the LiveKit data channel; this controller persists the
 * authoritative state so a late joiner or a page reload lands on the same board.
 */
class BoardController extends Controller
{
    private const DISK = 'local';

    public function __construct(private readonly ClassroomAccess $access) {}

    public function update(UpdateBoardRequest $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $board = $this->boardFor($classroom);
        $isHost = $this->isHost($user, $classroom);

        if (! $isHost) {
            $this->access->assertStudentMember($user, $classroom);

            abort_unless($board->students_can_annotate, 403, 'The instructor has not opened the board to students.');
        }

        /** @var array{surface?: string, page?: int, pages?: int, students_can_annotate?: bool, strokes?: array<int, mixed>} $data */
        $data = $request->validated();

        if (! $isHost) {
            $write = array_diff(array_keys($data), ['strokes']);
            abort_if($write !== [], 403, 'Only the instructor can change the board surface or permissions.');
        }

        if (array_key_exists('surface', $data)) {
            $board->surface = BoardSurface::from($data['surface']);
            $board->title = $board->surface->label();

            // A canvas, a notebook and a PDF each carry their own page count.
            $board->document_pages = $board->surface === BoardSurface::Pdf && $board->hasDocument()
                ? $board->pageCount()
                : ClassBoard::defaultPagesFor($board->surface);
        }

        if (array_key_exists('pages', $data)) {
            $board->document_pages = max(1, (int) $data['pages']);
        }

        if (array_key_exists('page', $data)) {
            $board->page = max(1, min((int) $data['page'], $board->pageCount()));
        }

        if (array_key_exists('students_can_annotate', $data)) {
            $board->students_can_annotate = (bool) $data['students_can_annotate'];
        }

        if (array_key_exists('strokes', $data)) {
            $board->strokes = $this->normalizeStrokes($data['strokes']);
        }

        $board->save();

        if ($request->expectsJson()) {
            return response()->json(['data' => $board->state()]);
        }

        return back();
    }

    public function storeDocument(UploadBoardDocumentRequest $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        $this->assertHost($request->user(), $classroom);

        $board = $this->boardFor($classroom);
        $file = $request->file('document');

        if ($file === null) {
            return back()->with('error', 'Choose a PDF to present.');
        }

        $this->deleteStoredDocument($board);

        $path = $file->storeAs(
            'boards/'.$classroom->getKey(),
            uniqid('board-', true).'.pdf',
            self::DISK,
        );

        $board->forceFill([
            'surface' => BoardSurface::Pdf,
            'title' => BoardSurface::Pdf->label(),
            'document_path' => $path,
            'document_name' => $file->getClientOriginalName(),
            'document_pages' => 1,
            'page' => 1,
        ])->save();

        if ($request->expectsJson()) {
            return response()->json(['data' => $board->refresh()->state()]);
        }

        return back()->with('success', 'PDF is on the board. Everyone in the call sees page 1.');
    }

    public function document(Request $request, Classroom $classroom): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->access->assertCanJoinCall($user, $classroom);

        $board = $classroom->board()->first();

        abort_if($board === null || ! $board->hasDocument(), 404);
        abort_unless(Storage::disk(self::DISK)->exists((string) $board->document_path), 404);

        return Storage::disk(self::DISK)->response(
            (string) $board->document_path,
            $board->document_name,
            ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, max-age=0, no-store'],
        );
    }

    public function destroyDocument(Request $request, Classroom $classroom): JsonResponse|RedirectResponse
    {
        $this->assertHost($request->user(), $classroom);

        $board = $this->boardFor($classroom);
        $this->deleteStoredDocument($board);

        $board->forceFill([
            'surface' => BoardSurface::Canvas,
            'title' => BoardSurface::Canvas->label(),
            'document_path' => null,
            'document_name' => null,
            'document_pages' => 1,
            'page' => 1,
        ])->save();

        if ($request->expectsJson()) {
            return response()->json(['data' => $board->refresh()->state()]);
        }

        return back()->with('success', 'PDF removed from the board.');
    }

    private function boardFor(Classroom $classroom): ClassBoard
    {
        return $classroom->board()->firstOrCreate([], [
            'surface' => BoardSurface::Canvas,
            'title' => BoardSurface::Canvas->label(),
        ]);
    }

    private function isHost(?User $user, Classroom $classroom): bool
    {
        return $user !== null && (int) $classroom->instructor_id === (int) $user->getKey();
    }

    private function assertHost(?User $user, Classroom $classroom): void
    {
        abort_if($user === null, 401);
        abort_if(! $this->isHost($user, $classroom), 403, 'Only the class instructor can change the board document.');
    }

    private function deleteStoredDocument(ClassBoard $board): void
    {
        if ($board->hasDocument()) {
            Storage::disk(self::DISK)->delete((string) $board->document_path);
        }
    }

    /**
     * Keep only well-formed strokes: a known tool, a page, and 1..2000 points
     * normalised to 0..1 so the board is resolution independent.
     *
     * @param  array<int, mixed>  $strokes
     * @return list<array{tool: string, color: string, width: float, page: int, points: list<array{0: float, 1: float}>}>
     */
    private function normalizeStrokes(array $strokes): array
    {
        $clean = [];

        foreach ($strokes as $stroke) {
            if (! is_array($stroke)) {
                continue;
            }

            $tool = (string) ($stroke['tool'] ?? 'pen');

            if (! in_array($tool, ['pen', 'marker', 'eraser'], true)) {
                continue;
            }

            $points = [];

            foreach (array_slice((array) ($stroke['points'] ?? []), 0, 2000) as $point) {
                if (! is_array($point) || count($point) < 2) {
                    continue;
                }

                $x = (float) $point[0];
                $y = (float) $point[1];

                $points[] = [max(0.0, min(1.0, $x)), max(0.0, min(1.0, $y))];
            }

            if ($points === []) {
                continue;
            }

            $clean[] = [
                'tool' => $tool,
                'color' => $this->safeColor((string) ($stroke['color'] ?? '#111827')),
                'width' => max(0.001, min(0.05, (float) ($stroke['width'] ?? 0.004))),
                'page' => max(1, (int) ($stroke['page'] ?? 1)),
                'points' => $points,
            ];

            if (count($clean) >= 4000) {
                break;
            }
        }

        return $clean;
    }

    private function safeColor(string $color): string
    {
        return preg_match('/^#[0-9a-fA-F]{6}$/', $color) === 1 ? $color : '#111827';
    }
}
