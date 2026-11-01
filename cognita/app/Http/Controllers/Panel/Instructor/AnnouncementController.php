<?php

declare(strict_types=1);

namespace App\Http\Controllers\Panel\Instructor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AnnouncementService;
use App\Services\ClassAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Publish an announcement to a class.
 *
 * The service persists the row and queues one notification per active member,
 * so no event is dispatched from the console. Form errors stay on the class
 * page through the redirect back.
 */
class AnnouncementController extends Controller
{
    public function __construct(
        private readonly ClassAccessService $access,
        private readonly AnnouncementService $announcements,
    ) {}

    public function store(Request $request, int $class): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        /** @var array{title:string, body:string} $data */
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $this->announcements->publish(
            $instructor,
            $class,
            $data['title'],
            $data['body'],
        );

        return back()->with('success', 'Announcement published. Every active class member was notified.');
    }
}
