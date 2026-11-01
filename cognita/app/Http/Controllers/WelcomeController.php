<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Public landing page. Signed-in visitors are sent straight to their surface.
 */
class WelcomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Welcome');
    }
}
