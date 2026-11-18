<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Who may draw on the board right now.
 *
 * The permission belongs to a lesson, not to a person: an instructor hands the
 * pen to one student for this class, and the next class starts without it. It
 * is therefore kept in the shared cache — Redis — keyed by class, and thrown
 * away when the class session ends. Nothing about it is written to the
 * database, and there is no class-wide switch: either the instructor allows a
 * particular student to draw, or that student does not draw.
 *
 * It can only be changed from inside the live room: the class page has no
 * control for it, because a permission that outlives its lesson would be a
 * permission the next class inherits.
 */
class DrawPermissions
{
    /** A permission that is never revoked dies with the session; this is the backstop. */
    private const TTL_SECONDS = 43_200;

    /**
     * The students who may draw in this class right now.
     *
     * @return list<int>
     */
    public function allowed(int $classroomId): array
    {
        $ids = Cache::store(self::store())->get($this->key($classroomId), []);

        if (! is_array($ids)) {
            return [];
        }

        return array_values(array_unique(array_map(static fn (mixed $id): int => (int) $id, $ids)));
    }

    public function permits(int $classroomId, int $studentId): bool
    {
        return in_array($studentId, $this->allowed($classroomId), true);
    }

    /**
     * Allow or refuse one student.
     *
     * @return bool the state after the change
     */
    public function set(int $classroomId, int $studentId, bool $allowed): bool
    {
        $ids = $this->allowed($classroomId);

        if ($allowed) {
            if (! in_array($studentId, $ids, true)) {
                $ids[] = $studentId;
            }
        } else {
            $ids = array_values(array_filter($ids, static fn (int $id): bool => $id !== $studentId));
        }

        Cache::store(self::store())->put($this->key($classroomId), $ids, self::TTL_SECONDS);

        return $allowed;
    }

    /** Give the pen back: the session is over and the next one starts clean. */
    public function clear(int $classroomId): void
    {
        Cache::store(self::store())->forget($this->key($classroomId));
    }

    private function key(int $classroomId): string
    {
        return 'cognita:draw:'.$classroomId;
    }

    /**
     * The store the live state of a class lives in.
     *
     * The application's cache — Redis in production and in development, an
     * array in the test suite — so the permission is shared by every process
     * that serves the room and disappears with the machine.
     */
    public static function store(): string
    {
        return (string) config('cache.default', 'array');
    }
}
