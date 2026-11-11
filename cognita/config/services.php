<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'livekit' => [
        /*
         * Where the browser is told to connect.
         *
         * "auto" is the default and the reason a laptop, a phone on the same
         * Wi-Fi and a tunnelled visitor all work without editing anything: the
         * host comes from the address the page was opened on, so a device that
         * can load the app can always reach the call server next to it. Set
         * url_mode=fixed (plus an explicit url) only when the browser must be
         * sent somewhere the page host cannot describe, such as a hosted
         * LiveKit Cloud project.
         */
        'url' => env('LIVEKIT_URL'),
        'url_mode' => env('LIVEKIT_URL_MODE', 'auto'),

        // Port the browser dials over ws://. With a TLS front the page is https
        // and the signal travels as wss:// on the page's own port instead.
        'port' => (int) env('LIVEKIT_PORT', 7880),
        'secure_port' => (int) env('LIVEKIT_SECURE_PORT', 0),

        // Port the local TLS front listens on, for telling a phone that reached
        // the app over plain HTTP where to go for a working microphone.
        'tls_port' => (int) env('LIVEKIT_TLS_PORT', 0),

        // TURN (UDP) answers an unauthenticated STUN binding request, so the
        // health check can prove the media path end to end.
        'turn_port' => (int) env('LIVEKIT_TURN_PORT', 3478),

        'api_key' => env('LIVEKIT_API_KEY'),
        'api_secret' => env('LIVEKIT_API_SECRET'),
        'token_ttl' => (int) env('LIVEKIT_TOKEN_TTL', 3600),
        'room_prefix' => env('LIVEKIT_ROOM_PREFIX', 'cognita-class'),
    ],

];
