<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Instructor\StoreAnnouncementRequest;
use App\Http\Resources\Instructor\AnnouncementResource;
use App\Models\User;
use App\Services\AnnouncementService;
use App\Services\ClassAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Class announcements. Publishing persists the announcement and queues one
 * database notification per active class member.
 */
class InstructorAnnouncementController extends Controller
{
    public function __construct(
        private readonly AnnouncementService $announcements,
        private readonly ClassAccessService $access,
    ) {}

    public function index(Request $request, int $class): AnonymousResourceCollection
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $announcements = $this->announcements->forClass($instructor, $class);

        return AnnouncementResource::collection($announcements)
            ->additional(['meta' => ['total' => $announcements->count()]]);
    }

    public function store(StoreAnnouncementRequest $request, int $class): JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClass($instructor, $class);

        /** @var array{title:string, body:string} $data */
        $data = $request->validated();

        $announcement = $this->announcements->publish(
            $instructor,
            $class,
            $data['title'],
            $data['body'],
        );

        return (new AnnouncementResource($announcement))
            ->response()
            ->setStatusCode(201);
    }
}
