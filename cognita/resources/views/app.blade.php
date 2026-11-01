<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#f4f6fb">
    <meta name="description" content="Cognita is a live classroom: instructors create courses and classes, students join with a key, and everyone meets in one group call with a shared board.">
    <title inertia>{{ config('app.name', 'Cognita') }}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="min-h-[100dvh] bg-canvas text-ink antialiased">
    @inertia
</body>
</html>
