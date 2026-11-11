<?php

declare(strict_types=1);

use App\Realtime\LiveKitProvider;

return [

    /*
    |--------------------------------------------------------------------------
    | Realtime provider
    |--------------------------------------------------------------------------
    |
    | The group call is served by whichever class is named here. Everything the
    | app needs from that class is declared in App\Contracts\RealtimeProvider,
    | so replacing LiveKit with another SFU is a new adapter plus one line.
    |
    | The browser makes the same choice from the `driver` prop: each driver has
    | a client adapter in resources/js/realtime.
    |
    |   livekit  - the bundled adapter, served by .dev/livekit.sh in development
    |   local    - browser-only fallback: board over BroadcastChannel, no voice
    |
    */
    'driver' => env('REALTIME_DRIVER', 'livekit'),

    'drivers' => [
        'livekit' => LiveKitProvider::class,
    ],

];
