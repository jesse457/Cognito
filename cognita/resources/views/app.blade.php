<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#f3efe6">
    <meta name="description" content="Cognita is a live classroom: instructors create courses and classes, students join with a key, and everyone meets in one group call with a shared board.">
    <title inertia>{{ config('app.name', 'Cognita') }}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <script>
        (() => {
            try {
                const mode = localStorage.getItem('cognita.theme') || 'system';
                const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
                const root = document.documentElement;
                root.classList.toggle('dark', dark);
                root.dataset.theme = dark ? 'dark' : 'light';
                root.style.colorScheme = dark ? 'dark' : 'light';
            } catch {
                // Storage can be unavailable; the provider still follows the system below.
            }
        })();
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="min-h-[100dvh] bg-canvas text-ink antialiased">
    @inertia
</body>
</html>
