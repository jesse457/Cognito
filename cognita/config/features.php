<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Cognita feature flags & tunables
|--------------------------------------------------------------------------
|
| Read these ONLY through config('features.*'). Never call env() outside the
| config/ directory (see AGENTS/conventions in README).
|
*/

return [

    /*
    | Instructor portal. When false:
    |   - no /instructor/* routes are mounted (they 404),
    |   - no instructor tables are queried,
    |   - no instructor-scoped scheduled jobs run.
    | Enabling it is a pure config flip: every instructor table is always
    | migrated, so no schema change is ever required.
    */
    'instructor_path' => (bool) env('FEATURE_INSTRUCTOR_PATH', false),

    /*
    | Community / forum surface. Same rules as above: forum tables are always
    | migrated, routes are only mounted when the flag is on.
    */
    'social' => (bool) env('FEATURE_SOCIAL', false),

    /*
    | LiveKit group voice calls for private classes. The LiveKit server itself
    | is configured under services.livekit; this flag only mounts the routes
    | and exposes the call entry points.
    */
    'live_calls' => (bool) env('FEATURE_LIVE_CALLS', true),

    /*
    | Knowledge Tracing engine: 'bkt' (default, CPU) or 'dkt' (GPU upgrade).
    | The Laravel side never branches on anything but this string, and the
    | column that stores the engine (`student_kc_mastery.model_used`) is a
    | string, so switching engines requires no schema change.
    */
    'kt_engine' => env('KT_ENGINE', 'bkt'),

    /* Base URL of the Python KT microservice. */
    'kt_service_url' => env('KT_SERVICE_URL', 'http://127.0.0.1:8001'),

    /* Hard cap on private-class size. */
    'max_class_size' => (int) env('INSTRUCTOR_MAX_CLASS_SIZE', 50),

    /* Mastery probability below which a student is considered at risk. */
    'at_risk_threshold' => (float) env('MASTERY_AT_RISK_THRESHOLD', 0.6),

];
