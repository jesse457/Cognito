<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use App\Enums\ReportReason;
use App\Models\ContentReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A student filing a content report against any morph-mapped resource.
 *
 * The morph alias itself is validated here (against `cognita.morph_map`); the
 * second half — does the referenced row exist — needs the resolved map, so it
 * lives in `after()` and reports against `reportable_id`.
 */
class StoreReportRequest extends FormRequest
{
    /**
     * Any authenticated user may report; the policy states it.
     *
     * The actor is passed explicitly: under Sanctum the gate's default
     * `auth()->user()` is null even though the route is authenticated, because
     * the route user comes from the request's own user resolver.
     */
    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('create', ContentReport::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reportable_type' => [
                'required',
                'string',
                Rule::in(array_keys($this->morphMap())),
            ],
            'reportable_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', Rule::enum(ReportReason::class)],
            'details' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reportable_type.in' => 'The reportable type must be one of: '
                .implode(', ', array_keys($this->morphMap())).'.',
            'reportable_id.min' => 'The reportable id must be a positive integer.',
        ];
    }

    /**
     * Cross-field check: the aliased model must have a row for `reportable_id`.
     * This runs after the field rules, so `reportable_type` and
     * `reportable_id` are already known-valid and known-present here.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (): void {
                $modelClass = $this->morphMap()[$this->reportableType()] ?? null;

                if ($modelClass === null) {
                    return;
                }

                $exists = $modelClass::query()
                    ->whereKey($this->integer('reportable_id'))
                    ->exists();

                if (! $exists) {
                    $this->validator->errors()->add(
                        'reportable_id',
                        'The reported content does not exist.',
                    );
                }
            },
        ];
    }

    /**
     * Alias => class map for `content_reports.reportable_type`.
     *
     * @return array<string, class-string>
     */
    public function morphMap(): array
    {
        return config('cognita.morph_map', []);
    }

    /** The validated alias, e.g. `forum_thread`. */
    public function reportableType(): string
    {
        return (string) $this->string('reportable_type')->value();
    }
}
