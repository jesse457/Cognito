<?php

declare(strict_types=1);

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadClassMaterialRequest;
use App\Models\ClassDocument;
use App\Models\Classroom;
use App\Services\ClassMaterials;
use App\Services\ClassroomAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The class's PDF library, managed from the instructor's class page.
 *
 * Uploading here only adds the file to the library; attaching it to a lesson
 * happens when the instructor schedules the session.
 */
class MaterialController extends Controller
{
    public function __construct(
        private readonly ClassroomAccess $access,
        private readonly ClassMaterials $materials,
    ) {}

    public function store(UploadClassMaterialRequest $request, Classroom $classroom): RedirectResponse
    {
        $this->authorize('manageMaterials', $classroom);

        $file = $request->file('document');

        if ($file === null) {
            return back()->with('error', 'Choose a PDF to upload.');
        }

        $document = $this->materials->storeIfNew($file, $classroom, $request->user());

        if ($document === null) {
            return back()->with('error', 'The PDF could not be stored. Try again.');
        }

        return back()->with('success', $document->name.' is now in the class materials.');
    }

    public function destroy(Request $request, Classroom $classroom, ClassDocument $document): RedirectResponse
    {
        $this->authorize('manageMaterials', $classroom);
        abort_unless((int) $document->classroom_id === (int) $classroom->getKey(), 404);

        $this->materials->delete($document);

        return back()->with('success', 'Material removed from the class.');
    }
}
