# Cognita (application)

The Laravel + Inertia application for Cognita. Setup, architecture, roles and tests are
documented once, in the repository root README: `../README.md`.

## Quick reference

```bash
php artisan migrate:fresh --seed   # schema + demo accounts + PHY101 class
php artisan serve --port=8000      # app
npm run dev                        # Vite dev server (second terminal)
npm run typecheck                  # tsc --noEmit
npm run build                      # production assets
```

## Layout

- `app/Models`, `app/Http/Controllers`, `app/Http/Requests`, `app/Services`,
  `app/Policies`, `app/Enums` — the conventional Laravel layout; controllers are
  grouped in `Instructor/`, `Student/` and `Admin/` subfolders
- `resources/js/layouts` — two main platforms: `DashboardShell` (classes, calls,
  attendance, tasks and progress) and `CommunityShell` (feed, courses, groups);
  `AppShell` serves admin, `GuestShell` sign-in, the live call is bare
- `resources/js/pages/Community` — the feed, post detail, course library and groups
- `resources/js` — `pages/`, `components/`, `hooks/`, `lib/`, `realtime/`, `types/`
- `routes/` — `web.php` plus one file per role, `questions.php` (feed) and `community.php`
- `tests/` — `Unit` + `Feature`
