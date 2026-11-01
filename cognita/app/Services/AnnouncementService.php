<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Announcement;
use App\Models\PrivateClass;
use App\Models\User;
use App\Notifications\ClassAnnouncementNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Class announcements: persist the announcement, then queue one database
 * notification per active class member.
 *
 * Notifications are queued (never sent inline) so a large class does not block
 * the instructor's request, and delivery failures are logged rather than
 * breaking the announcement itself.
 */
class AnnouncementService
{
    public function __construct(private readonly ClassAccessService $access) {}

    /**
     * Publish an announcement to every active member of the class.
     */
    public function publish(User $instructor, int $classId, string $title, string $body): Announcement
    {
        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        $announcement = DB::transaction(function () use ($class, $instructor, $title, $body): Announcement {
            return Announcement::query()->create([
                'class_id' => $class->getKey(),
                'instructor_id' => $instructor->getKey(),
                'title' => $title,
                'body' => $body,
                'published_at' => now(),
            ]);
        });

        $this->notifyMembers($class, $announcement);

        return $announcement;
    }

    /**
     * Announcements of a class, newest first.
     *
     * @return Collection<int, Announcement>
     */
    public function forClass(User $instructor, int $classId): Collection
    {
        if (! $this->access->portalEnabled()) {
            return new Collection;
        }

        $class = $this->access->assertInstructorOwnsClass($instructor, $classId);

        return Announcement::query()
            ->with('instructor:id,name,display_name')
            ->where('class_id', $class->getKey())
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();
    }

    private function notifyMembers(PrivateClass $class, Announcement $announcement): void
    {
        $studentIds = $this->access->activeStudentIdsForClass($class);

        if ($studentIds->isEmpty()) {
            return;
        }

        $students = User::query()
            ->whereIn('id', $studentIds->all())
            ->get();

        try {
            Notification::send($students, new ClassAnnouncementNotification($announcement, $class));
        } catch (\Throwable $exception) {
            Log::warning('instructor.announcement.notify_failed', [
                'event' => 'instructor.announcement.notify_failed',
                'class_id' => (int) $class->getKey(),
                'announcement_id' => (int) $announcement->getKey(),
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
