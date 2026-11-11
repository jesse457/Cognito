<?php

declare(strict_types=1);

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceExport implements FromCollection, WithColumnWidths, WithHeadings, WithStyles
{
    /**
     * @param  array{classroom: string, date: string, date_label: string, present: int, absent: int, rows: list<array<string, mixed>>}  $report
     */
    public function __construct(private readonly array $report) {}

    /** @return Collection<int, array<int, string|int>> */
    public function collection(): Collection
    {
        return collect($this->report['rows'])->map(static fn (array $row): array => [
            $row['name'],
            $row['email'],
            $row['status'],
            $row['first_joined'],
            $row['last_seen'],
            $row['duration'],
        ]);
    }

    /** @return array<int, string> */
    public function headings(): array
    {
        return ['Student', 'Email', 'Status', 'First joined', 'Last seen', 'Time in class'];
    }

    /** @return array<string, int> */
    public function columnWidths(): array
    {
        return [
            'A' => 30,
            'B' => 36,
            'C' => 12,
            'D' => 15,
            'E' => 15,
            'F' => 16,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
