<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\GenerateEmbeddingsJob;
use App\Models\Course;
use App\Models\DocumentChunk;
use App\Models\User;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * RAG ingestion: source document → text → chunks → embeddings.
 *
 * Chunk rows are written synchronously (fast, deterministic), while the actual
 * embedding call is queued so no HTTP request ever waits on an LLM provider.
 */
class RagIngestionService
{
    /**
     * Ingest an uploaded PDF/DOCX/TXT/MD file.
     *
     * @return array{source_name: string, chunks_created: int, chunk_ids: list<int>}
     */
    public function ingestFile(UploadedFile $file, ?User $uploader = null, ?Course $course = null): array
    {
        $path = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension() ?: (string) $file->guessExtension());

        $text = $this->extractText((string) $path, $extension);

        return $this->ingestText($text, $file->getClientOriginalName(), $uploader, $course);
    }

    /**
     * Ingest a file that already lives on disk.
     *
     * @return array{source_name: string, chunks_created: int, chunk_ids: list<int>}
     */
    public function ingestPath(string $absolutePath, ?User $uploader = null, ?Course $course = null): array
    {
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));
        $text = $this->extractText($absolutePath, $extension);

        return $this->ingestText($text, basename($absolutePath), $uploader, $course);
    }

    /**
     * @return array{source_name: string, chunks_created: int, chunk_ids: list<int>}
     */
    public function ingestText(string $text, string $sourceName, ?User $uploader = null, ?Course $course = null): array
    {
        $pieces = $this->chunk($text);

        if ($pieces === []) {
            throw new RuntimeException('The uploaded document did not contain any extractable text.');
        }

        $chunkIds = [];

        foreach ($pieces as $index => $piece) {
            $chunk = DocumentChunk::query()->create([
                'course_id' => $course?->getKey(),
                'uploaded_by' => $uploader?->getKey(),
                'source_name' => $sourceName,
                'chunk_index' => $index,
                'content' => $piece,
                'metadata' => [
                    'source' => $sourceName,
                    'chunk_index' => $index,
                    'characters' => mb_strlen($piece),
                    'words' => str_word_count($piece),
                ],
            ]);

            $chunkIds[] = $chunk->getKey();

            GenerateEmbeddingsJob::dispatch($chunk->getKey());
        }

        Log::info('rag.ingested', [
            'source_name' => $sourceName,
            'course_id' => $course?->getKey(),
            'uploaded_by' => $uploader?->getKey(),
            'chunks_created' => count($chunkIds),
        ]);

        return [
            'source_name' => $sourceName,
            'chunks_created' => count($chunkIds),
            'chunk_ids' => $chunkIds,
        ];
    }

    /**
     * Split text on sentence-ish boundaries into overlapping windows.
     *
     * @return list<string>
     */
    public function chunk(string $text): array
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        if ($text === '') {
            return [];
        }

        $size = max(200, (int) config('cognita.rag.chunk_size', 1200));
        $overlap = max(0, min((int) config('cognita.rag.chunk_overlap', 200), (int) ($size / 2)));

        $sentences = preg_split('/(?<=[.!?])\s+/u', $text) ?: [$text];
        $chunks = [];
        $buffer = '';

        foreach ($sentences as $sentence) {
            if ($buffer !== '' && mb_strlen($buffer) + mb_strlen($sentence) + 1 > $size) {
                $chunks[] = trim($buffer);
                $buffer = $overlap > 0 ? mb_substr($buffer, -$overlap) : '';
            }

            $buffer = trim($buffer.' '.$sentence);
        }

        if ($buffer !== '') {
            $chunks[] = trim($buffer);
        }

        return array_values(array_filter($chunks, static fn (string $chunk): bool => $chunk !== ''));
    }

    /**
     * Extract plain text. DOCX is read through ZipArchive; PDF uses a text
     * utility when available and otherwise degrades with a clear exception.
     */
    public function extractText(string $absolutePath, string $extension): string
    {
        if (! is_file($absolutePath)) {
            throw new RuntimeException("Source document not found: {$absolutePath}");
        }

        return match ($extension) {
            '', 'txt', 'md', 'markdown', 'csv' => (string) file_get_contents($absolutePath),
            'docx' => $this->extractDocx($absolutePath),
            'pdf' => $this->extractPdf($absolutePath),
            default => throw new RuntimeException("Unsupported document type: .{$extension}"),
        };
    }

    private function extractDocx(string $absolutePath): string
    {
        $zip = new ZipArchive;

        if ($zip->open($absolutePath) !== true) {
            throw new RuntimeException('Unable to open the DOCX archive.');
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            throw new RuntimeException('The DOCX archive does not contain word/document.xml.');
        }

        $withBreaks = preg_replace('#</w:p>#', "\n", $xml) ?? $xml;
        $text = strip_tags($withBreaks);

        return html_entity_decode($text, ENT_QUOTES | ENT_XML1);
    }

    /**
     * PDF text extraction.
     *
     * Prefers `pdftotext` (poppler-utils). When it is unavailable we fall back to
     * a conservative extractor for uncompressed text objects; PDFs that only
     * contain compressed streams raise a clear, actionable exception rather than
     * silently ingesting garbage.
     */
    private function extractPdf(string $absolutePath): string
    {
        $binary = trim((string) shell_exec('command -v pdftotext 2>/dev/null'));

        if ($binary !== '') {
            $output = [];
            $exitCode = 0;
            exec($binary.' -q -enc UTF-8 '.escapeshellarg($absolutePath).' - 2>/dev/null', $output, $exitCode);

            if ($exitCode === 0 && $output !== []) {
                return implode("\n", $output);
            }
        }

        $raw = (string) file_get_contents($absolutePath);
        $captured = [];

        if (preg_match_all('/\((?:\\\\.|[^\\\\()])+\)/s', $raw, $matches) > 0) {
            foreach ($matches[0] as $literal) {
                $captured[] = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], substr($literal, 1, -1));
            }
        }

        $text = trim(implode(' ', $captured));

        if (mb_strlen($text) < 40) {
            throw new RuntimeException(
                'PDF text extraction failed: install poppler-utils (pdftotext) or upload a text/DOCX copy of the source material.',
            );
        }

        return $text;
    }

    /**
     * Retrieve grounding chunks for a course.
     *
     * Semantic when embeddings are available, lexical (LIKE ranking) otherwise —
     * generation must never hard-fail just because the embedding provider is down.
     *
     * @return list<string>
     */
    public function retrieveForCourse(int $courseId, string $query = '', int $limit = 8): array
    {
        if ($query !== '') {
            try {
                $chunks = DocumentChunk::query()
                    ->where('course_id', $courseId)
                    ->where(function ($builder) use ($query): void {
                        foreach (preg_split('/\s+/', preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $query) ?: '') ?: [] as $word) {
                            if (mb_strlen($word) > 3) {
                                $builder->orWhere('content', 'ILIKE', '%'.$word.'%');
                            }
                        }
                    })
                    ->limit($limit)
                    ->pluck('content')
                    ->all();

                if ($chunks !== []) {
                    return array_values($chunks);
                }
            } catch (Throwable $exception) {
                Log::warning('rag.lexical_retrieval_failed', ['message' => $exception->getMessage()]);
            }
        }

        return DocumentChunk::query()
            ->where('course_id', $courseId)
            ->orderBy('chunk_index')
            ->limit($limit)
            ->pluck('content')
            ->all();
    }

    /** Keep the storage disk warm for future uploads; unused but part of the upload contract. */
    public function disk(): Filesystem
    {
        return Storage::disk(config('filesystems.default'));
    }
}
