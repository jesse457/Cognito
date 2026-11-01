<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use Illuminate\Validation\Rule;

/**
 * Query filters for `GET admin/reports`.
 */
final class ListReportsRequest extends AdminRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'nullable', 'string', Rule::in([
                ...array_column(ReportStatus::cases(), 'value'),
                'all',
            ])],
            'reason' => ['sometimes', 'nullable', 'string', Rule::in(array_column(ReportReason::cases(), 'value'))],
            'per_page' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array{status:string|null, reason:string|null, per_page:int, page:int}
     */
    public function filters(): array
    {
        $status = $this->query('status');
        $reason = $this->query('reason');

        return [
            'status' => is_string($status) && $status !== '' ? $status : null,
            'reason' => is_string($reason) && $reason !== '' ? $reason : null,
            'per_page' => max(1, min((int) $this->query('per_page', 20), 100)),
            'page' => max(1, (int) $this->query('page', 1)),
        ];
    }
}
