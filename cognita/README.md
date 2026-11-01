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

- `app/Enums` — `UserRole`, `BoardSurface`
- `app/Http/Controllers` — auth, dashboard, key door, live call, board; `Instructor/`, `Student/`, `Admin/`
- `app/Models` — `User`, `Course`, `Classroom`, `Enrollment`, `ClassBoard`
- `app/Services` — `ClassroomAccess` (authorisation), `LiveKit` (tokens)
- `resources/js` — `pages/`, `components/`, `layouts/`, `lib/`, `types/`
- `routes/` — `web.php` plus one file per role
- `tests/` — `Unit` + `Feature`
