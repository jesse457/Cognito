<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use App\Services\AttendanceTracker;
use App\Services\ClassroomAccess;
use Dompdf\Dompdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class AttendanceExportController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly AttendanceTracker $attendance,
    ) {}

    public function __invoke(Request $request, Classroom $classroom, string $format): Response|JsonResponse
    {
        /** @var User $instructor */
        $instructor = $request->user();

        $this->access->assertInstructorOwnsClassroom($instructor, $classroom);

        $date = $this->attendance->date($request->query('date'));
        $report = $this->attendance->report($classroom, $date);
        $base = 'attendance-'.(Str::slug($classroom->name) ?: 'class').'-'.$date;

        if ($format === 'pdf') {
            $pdf = new Dompdf(['isRemoteEnabled' => false]);
            $pdf->loadHtml(view('attendance.pdf', ['report' => $report])->render());
            $pdf->setPaper('a4', 'landscape');
            $pdf->render();

            return response($pdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$base.'.pdf"',
            ]);
        }

        return Excel::download(new AttendanceExport($report), $base.'.xlsx', ExcelWriter::XLSX);
    }
}
