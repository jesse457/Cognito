<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ClassDocument;
use App\Models\User;

/** Class PDFs are visible to the class and managed by its instructor. */
class ClassDocumentPolicy
{
    public function view(User $actor, ClassDocument $document): bool
    {
        return $document->classroom !== null
            && app(ClassroomPolicy::class)->viewMaterials($actor, $document->classroom);
    }

    public function update(User $actor, ClassDocument $document): bool
    {
        return $document->classroom !== null
            && app(ClassroomPolicy::class)->manageMaterials($actor, $document->classroom);
    }

    public function delete(User $actor, ClassDocument $document): bool
    {
        return $this->update($actor, $document);
    }
}
