<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\MediaDisk;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A file attached to one lesson of a course. */
class CourseMaterial extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'course_id',
        'lesson_id',
        'uploaded_by',
        'title',
        'path',
        'disk',
        'mime_type',
        'size',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    /** @return BelongsTo<Course, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** @return BelongsTo<Lesson, $this> */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** The disk the bytes live on. */
    public function mediaDisk(): string
    {
        return $this->disk ?: MediaDisk::name();
    }

    public function sizeLabel(): string
    {
        return $this->size >= 1_048_576
            ? number_format($this->size / 1_048_576, 1).' MB'
            : number_format($this->size / 1024, 0).' KB';
    }

    /** video, image, pdf, document or archive — what the browser can preview. */
    public function kind(): string
    {
        $mime = strtolower($this->mime_type ?? '');
        $extension = strtolower(pathinfo($this->title, PATHINFO_EXTENSION));

        return match (true) {
            str_starts_with($mime, 'video/') || in_array($extension, ['mp4', 'webm', 'mov'], true) => 'video',
            str_starts_with($mime, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true) => 'image',
            $mime === 'application/pdf' || $extension === 'pdf' => 'pdf',
            $extension === 'zip' => 'archive',
            default => 'document',
        };
    }

    /**
     * @return array{id: int, title: string, mime_type: string|null, size_label: string, kind: string, url: string, download_url: string}
     */
    public function reference(): array
    {
        return [
            'id' => (int) $this->getKey(),
            'title' => $this->title,
            'mime_type' => $this->mime_type,
            'size_label' => $this->sizeLabel(),
            'kind' => $this->kind(),
            'url' => route('course-materials.show', ['material' => $this->getKey()]),
            'download_url' => route('course-materials.show', ['material' => $this->getKey(), 'download' => 1]),
        ];
    }
}
