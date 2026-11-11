<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Live call seats
    |--------------------------------------------------------------------------
    |
    | A browser session gets one seat per class while it is in the call. The
    | seat is refreshed by the heartbeat and released on leave; a crashed
    | browser is allowed to be replaced after the stale grace period. Tests
    | that do not model persistent browser cookies can turn enforcement off.
    |
    */
    'enforce_seats' => env('CALL_SEATS_ENFORCE', true),
    'stale_seat_seconds' => (int) env('CALL_SEAT_STALE_SECONDS', 45),
];
