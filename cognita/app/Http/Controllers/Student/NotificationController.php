<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notifications = $user->notifications()
            ->latest()
            ->limit((int) $request->integer('limit', 50))
            ->get()
            ->map(fn ($notification): array => [
                'id' => $notification->id,
                'type' => class_basename($notification->type),
                'data' => $notification->data,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ])
            ->all();

        return response()->json([
            'data' => $notifications,
            'meta' => ['unread' => $user->unreadNotifications()->count()],
        ]);
    }

    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notification = $user->notifications()->whereKey($notificationId)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['data' => ['id' => $notification->id, 'read_at' => now()->toIso8601String()]]);
    }
}
