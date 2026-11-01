# Cognita

A small live-classroom app: instructors create courses and classes, students join a class
with a key, and everyone meets in one group voice call with a shared board.

Laravel 13 + Inertia 3 + React 19 + Tailwind 4, with LiveKit for the group call.

```
/admin                       administrators   accounts, read-only inventory
/instructor                  instructors      courses, classes, keys, live calls
/my-classes                  students         class key, class list, live calls
/classes/{classroom}/call                     group call + shared board
```

---

## What the app does

**Three roles, nothing else.** `student`, `instructor`, `admin` — one column on `users`, and
every surface is gated by `role:` middleware. Sign-up always creates a student; an
administrator promotes instructors.

**Courses are small on purpose.** A course is a title, an optional description, and the
instructor who owns it.

**Classes own the live call.** A class belongs to a course (or to nothing), carries a
six-character join key, and creates its board automatically. A student types the key, becomes a
member, and the class opens straight into the call.

**One group call per class.** LiveKit room names derive from the class id. Tokens are
microphone-scoped, short-lived, and minted per request.

**One shared board per class.** Inside the call the instructor presents a PDF, a ruled notebook
page, or a blank canvas, draws on it, and can hand the pen to students. Strokes travel over the
LiveKit data channel for latency and are persisted through the board endpoint, so a late joiner
or a page reload lands on the same board, same page.

**What was removed.** The previous build carried a forum, quizzes, gamification, knowledge
tracing (and its Python service), moderation/reports, audit logs, staff invitations,
impersonation, system settings, AI course generation, and a public JSON API. None of that is in
scope now; the whole schema is six tables.

---

## Schema

| Table | Purpose |
| --- | --- |
| `users` | name, email, password, role |
| `sessions` | session driver |
| `courses` | title, description, `instructor_id` |
| `classrooms` | name, `join_code`, `instructor_id`, nullable `course_id` |
| `enrollments` | which student joined which class (unique pair) |
| `class_boards` | one per class: surface, page, permission, document, strokes |

Each table maps to one of the five domain models in `app/Models`: `User`, `Course`, `Classroom`,
`Enrollment`, `ClassBoard`.

---

## Running it locally

Requirements: PHP 8.3+, Node 20+, Docker (for Postgres and LiveKit).

```bash
# 1. infrastructure
docker compose up -d db livekit

# 2. backend
cd cognita
cp .env.example .env            # then set DB_*, LIVEKIT_*
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000

# 3. frontend (second terminal)
cd cognita
npm install
npm run dev                     # or `npm run build` for production assets
```

Open <http://127.0.0.1:8000>.

> **Microphone note.** Browsers only expose `getUserMedia` on a secure origin. `localhost` is
> trusted; a LAN address such as `http://192.168.x.x:8000` is not, so the microphone stays
> blocked there — the group call and the board still work, you just join muted. Use
> `localhost`, a TLS terminator, or a tunnel for voice.

### Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@cognita.test` | `password` |
| Instructor | `instructor@cognita.test` | `password` |
| Student | `student1@cognita.test` | `password` |
| Student | `student2@cognita.test` | `password` |
| Student | `student3@cognita.test` | `password` |

The seed also creates one course (*Foundations of Applied Physics*) and one class
(*Physics Cohort A*) whose class key is **`PHY101`**.

---

## Running LiveKit for calls

Two connections must both work: the **signal** WebSocket on 7880 (TCP) and the **media**
path on 7882 (UDP). A page that shows *Joining…* and then *Reconnecting* is almost always
the second one.

### Local development: native server behind a relay

Three facts shape this setup:

- Docker Desktop's published-port proxy does not deliver WebRTC media to LiveKit's own UDP
  socket — the browser joins, the server receives **zero** STUN packets, and the session ends
  with `CONNECTION_TIMEOUT`.
- WSL2 on Windows 10 NATs the distro behind the host. `netsh interface portproxy` forwards TCP
  only, never UDP, and `networkingMode=mirrored` needs Windows 11.
- A Docker-published port is proxied *inside* the distro, so it collides with anything native
  listening on that port.

So LiveKit runs natively in WSL (the binary comes out of the image, no download) and a small
Node relay on Windows publishes the three ports and hands every packet to it:

```
phone / browser ──▶ 192.168.26.1:7880,7881 (TCP) ──▶ relay ──┐
                └──▶ 192.168.26.1:7882 (UDP) ─────▶ relay ──┴──▶ 172.30.128.252 native LiveKit
```

```bash
.dev/livekit.sh            # phone + browser; writes LIVEKIT_URL into cognita/.env
.dev/livekit.sh --direct   # no relay, this machine only
```

The script stops `cognita-livekit` (it would hold the ports), regenerates the LiveKit config with
`node_ip` set to the host address from `APP_URL`, starts `relay.mjs` on Windows through
`start-relay.ps1`, and runs the server in the foreground. After a reboot, WSL's address changes —
rerun the script.

Phones on the LAN need one firewall rule, because the stock *Node.js JavaScript Runtime* rules
cover only the **Public** profile and a home Wi-Fi network is **Private**:

```powershell
# elevated PowerShell, once
.\.dev\lan-forwarddd-firewall.ps1      # or run it from \wsl.localhost\<distro>\...
```

Getting the binary, if it is ever missing:

```bash
docker create --name lkx livekit/livekit-server:v1.13
docker cp lkx:/livekit-server .dev/livekit-server-bin/livekit-server
docker rm -f lkx && chmod +x .dev/livekit-server-bin/livekit-server
```

Verifying the relay without a phone (both must answer):

```powershell
(Invoke-WebRequest -UseBasicParsing http://192.168.26.1:7880/).StatusCode   # 200
```

Open the app at `http://localhost:8000` (secure context, microphone allowed) or, on a phone, at
`http://<host-ip>:8000` — a plain HTTP address on the LAN is not a secure origin, so the phone
joins muted and listens; the instructor still hears the room.

### Docker

`docker-compose.yml` still runs `livekit/livekit-server` with the same keys. Use it when the
server sits on a real host or behind TURN/TLS — not for media on this machine.

### When media still fails

1. **Server up and token valid?**
   ```bash
   curl http://<livekit-host>:7880/                    # → OK
   .dev/artisan tinker --execute '
   $u = App\Models\User::where("email","instructor@cognita.test")->first();
   $c = App\Models\Classroom::first();
   echo app(App\Services\LiveKit::class)->token($u, $c, "host")["token"];' > /tmp/t
   curl "http://<livekit-host>:7880/rtc/validate?access_token=$(cat /tmp/t)"   # → success
   ```
2. **Is media reaching the server?** ICE pairs with `"state":"failed"` and
   `"requestsReceived":0` mean UDP is dropped in between. On Windows allow the ports:
   ```powershell
   netsh advfirewall firewall add rule name="LiveKit UDP 7882" dir=in action=allow protocol=UDP localport=7882
   netsh advfirewall firewall add rule name="LiveKit TCP 7881" dir=in action=allow protocol=TCP localport=7881
   ```
3. **Phones on mobile data** sit behind carrier-grade NAT and usually cannot receive the
   server's inbound UDP. Use Wi-Fi, a public host with TURN, or LiveKit Cloud — the app only
   needs `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, so switching is config only.
4. **One identity per browser tab.** Each tab gets its own LiveKit participant (suffixed from
   `sessionStorage`), so two tabs or two devices on one account no longer kick each other. When
   the server ends a session the call page says why and offers *Rejoin*.

## Using it

1. Sign in as the instructor, create a course, then a class inside it.
2. Copy the class key from the class page.
3. Sign in as a student (or use a private window) and type the key on `/` or `/my-classes`.
4. Join the call from the class card. Press **Present** to open the board, upload a PDF (or
   switch to the notebook or blank canvas), and draw.
5. **Hand over pen** lets students draw; switching it off makes the board read-only for them.

## The board

- **Canvas** — one blank page with a soft dot grid.
- **Notebook** — eight ruled pages, for worked solutions.
- **PDF** — upload up to 25 MB; pages are rendered client-side with PDF.js from an authorised
  streaming route, so only class members can read the file.
- Strokes are normalised to the page (0–1), so every window size shows the same drawing.
- Tools: pen, highlighter, eraser, five inks, three widths, page navigation, clear page.
- The instructor owns the surface, the page, the document, and the draw permission; students
  own only their strokes, and only while the pen is handed over.

## Design

The interface borrows Google Meet's grammar rather than a marketing page: a light blue-grey
product surface with a single accent blue for action, pill-shaped controls, and a dark stage
reserved for the call itself. Inside the call that means a full stage, a compact top bar with
the meeting identity and key, a floating control bar (mic, present, hand over pen, people,
leave), and a side panel with the participant list.

Tokens live in `resources/css/app.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `#f4f6fb` | app background |
| `--color-brand` | `#0b57d0` | primary action (Google blue) |
| `--color-live` | `#1a7f3c` | live affordances |
| `--color-danger` | `#b3261e` | leave call, destructive |
| `--color-stage` | `#121417` | call stage |

Radii: containers 16px, tiles 14px, inputs 12px, buttons full pill. Typeface: Instrument Sans.

---

## Project layout

```
cognita/
├── app/
│   ├── Enums/            UserRole, BoardSurface
│   ├── Http/
│   │   ├── Controllers/  Auth, Dashboard, Join, LiveCall, Board,
│   │   │                 Instructor/*, Student/*, Admin/*
│   │   ├── Middleware/   EnsureUserHasRole, HandleInertiaRequests
│   │   └── Requests/     form validation
│   ├── Models/           User, Course, Classroom, Enrollment, ClassBoard
│   └── Services/         ClassroomAccess (authorisation), LiveKit (tokens)
├── database/
│   ├── migrations/       users + sessions, courses, classrooms, enrollments, boards
│   ├── factories/        one per model
│   └── seeders/          accounts + one teaching example
├── resources/js/
│   ├── components/       ui primitives, call tiles, board stage + toolbar
│   ├── layouts/          AppShell (product chrome), GuestShell (auth pages)
│   └── pages/            Welcome, Auth, Student, Instructor, Admin, LiveCall
├── resources/css/app.css design tokens + component classes
└── routes/               web.php with admin / instructor / student groups
```

## Tests

```bash
.dev/acceptance.sh                        # schema, phpunit, tsc, vite build
.dev/ui-smoke.sh http://127.0.0.1:8000    # HTTP smoke test of all three roles
```

The suite covers authentication, role boundaries, the class-key door (including the deferred
key for guests), instructor course/class management and scoping, board permissions and stroke
normalisation, PDF upload and streaming, call tokens, and the admin console.
