<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Enums\CourseStatus;
use App\Enums\Currency;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Course creation is deliberately tiny: a title, an optional description, and
 * the instructor who owns it. Classes carry the live group call.
 */
class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->authorize('viewAny', Course::class);

        return Inertia::render('Instructor/Courses', [
            'courses' => $instructor->courses()
                ->withCount('classrooms')
                ->orderByDesc('id')
                ->get()
                ->map(static fn (Course $course): array => [
                    'id' => (int) $course->getKey(),
                    'title' => $course->title,
                    'description' => $course->description,
                    'classrooms_count' => (int) $course->classrooms_count,
                    'created_at' => $course->created_at?->toDateString(),
                    'is_paid' => $course->requiresPayment(),
                    'price_cents' => (int) $course->price_cents,
                    'currency' => $course->currency?->value,
                    'status' => $course->status?->value,
                    'status_label' => $course->status?->label(),
                    'price_label' => $course->requiresPayment() ? $course->priceLabel() : null,
                    'payment_url' => $course->payment_url,
                    'payment_instructions' => $course->payment_instructions,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreCourseRequest $request): RedirectResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->authorize('create', Course::class);

        /** @var array{title: string, description?: string|null, status?: string|null, price_cents?: int|null, currency?: string|null, payment_url?: string|null, payment_instructions?: string|null} $data */
        $data = $request->validated();

        $isPaid = $request->boolean('is_paid');

        Course::query()->create([
            'instructor_id' => $instructor->getKey(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => CourseStatus::from($data['status'] ?? CourseStatus::Published->value),
            ...$this->paymentAttributes($isPaid, $data),
        ]);

        return back()->with('success', $isPaid ? 'Paid course created.' : 'Course created.');
    }

    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $this->authorize('update', $course);

        /** @var array{title: string, description?: string|null, status?: string|null, price_cents?: int|null, currency?: string|null, payment_url?: string|null, payment_instructions?: string|null} $data */
        $data = $request->validated();

        $course->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => CourseStatus::from($data['status'] ?? $course->status?->value ?? CourseStatus::Published->value),
            ...$this->paymentAttributes($request->boolean('is_paid'), $data),
        ]);

        return back()->with('success', 'Course updated.');
    }

    /**
     * Normalise the paid fields: a free course keeps no price or payment note.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function paymentAttributes(bool $isPaid, array $data): array
    {
        return [
            'is_paid' => $isPaid,
            'price_cents' => $isPaid ? (int) ($data['price_cents'] ?? 0) : 0,
            'currency' => $isPaid ? Currency::from(strtoupper((string) ($data['currency'] ?? Currency::USD->value))) : Currency::USD,
            'payment_url' => $isPaid ? ($data['payment_url'] ?? null) : null,
            'payment_instructions' => $isPaid ? ($data['payment_instructions'] ?? null) : null,
        ];
    }

    public function destroy(Request $request, Course $course): RedirectResponse
    {
        $this->authorize('delete', $course);

        $course->delete();

        return back()->with('success', 'Course removed. Its classes were kept.');
    }
}
