# Cognita

A small live-classroom app: instructors create courses and classes, students join a class
with a key, and everyone meets in one group voice call with a shared board.

Laravel 13 + Inertia 3 + React 19 + Tailwind 4, with LiveKit for the group call — behind a
small provider contract, so the call server can be swapped in one class.

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

**Attendance, without a register.** The instructor opens one class session and ends it
deliberately with **End class**. A student's attendance starts when they join that session,
is refreshed while their browser is in the call, and closes when they leave. Leaving and
rejoining the same session adds to the same time total instead of starting a new row. The
instructor reads it at **Teaching → any class → Attendance** — one row per enrolled student
for a given day, with first joined, last seen, sessions, time in class, and Excel/PDF
downloads.

**One group call per class.** LiveKit room names derive from the class id. Tokens are
microphone-scoped, short-lived, and minted per request. One account gets one live seat per class:
a second browser or device is refused while the first seat is active, and the seat is released on
leave or after a short stale grace period.

**Polls run inside the live room.** The instructor can open a timed multiple-choice or open-answer
poll from the call bar. Students answer in the room, change their answer until the timer runs out,
and the instructor watches the counts live. A poll belongs to one call session, so ending the
lesson closes its polls too.

**Recording never leaves the room.** The instructor can press **Record** in the call bar. The
browser mixes the microphones and any shared screen into a file on that device and downloads it
when the lesson is stopped; there is no egress, no upload, and no recording table. A recording is
a local copy, not a class asset.

**One shared board per class.** Inside the call the instructor presents a PDF or a blank canvas,
draws on it, and can hand the pen to students. Strokes travel over LiveKit's data channel and are
never stored anywhere: a room is a time and a token, and when it closes the ink is gone. What the
class keeps is the board's *settings* — which deck, which page, who may draw.

**Questions belong to the class, or to the community.** Every class has a question board at
`/questions`, and the same page has a **Community** scope. Class questions are visible only to
students who joined that class and its instructor. Community questions are visible to every
signed-in student and instructor. Both use the same answering, voting, photo and accepted-answer
flow.

**What was removed.** The previous build carried a forum, quizzes, gamification, knowledge
tracing (and its Python service), moderation/reports, audit logs, staff invitations,
impersonation, system settings, AI course generation, and a public JSON API. None of that is in
scope now; the whole schema is a handful of tables.

---

## Schema

| Table | Purpose |
| --- | --- |
| `users` | name, email, password, role |
| `sessions` | session driver |
| `courses` | title, description, `instructor_id` |
| `classrooms` | name, `join_code`, `instructor_id`, nullable `course_id` |
| `enrollments` | which student joined which class (unique pair) |
| `class_boards` | one per class: surface, page, permission, active document |
| `class_documents` | PDFs attached to a class, kept for reuse across calls |
| `call_sessions` | one per class session: token, who opened it, last heartbeat, when they ended it |
| `attendance_records` | one per student per class session: joins, last seen, accumulated time |
| `questions` | one class or community question: author, optional class, scope, title, body, tags |
| `answers` | one answer per row: question, author, body, accepted flag |
| `post_media` | up to five photos per question or answer, streamed through an access check |
| `question_votes` | one vote per person per question: `-1`, `0` or `1` |
| `answer_votes` | one vote per person per answer: `-1`, `0` or `1` |
| `polls` | one live poll: class, call session, author, kind, question, timer, close time |
| `poll_options` | the choices of a multiple-choice poll, in display order |
| `poll_responses` | one response per student per poll: option or open-answer text |
| `call_seats` | one live call seat per account per class, keyed to the browser session |

There is no table, column or blob anywhere that holds a drawing. That is a design decision, not
an omission: ink belongs to the room, and a room is a period of time.

Domain models live in `app/Models`. Questions add `Question`, `Answer`, `QuestionVote` and
`AnswerVote`; live polls add `Poll`, `PollOption` and `PollResponse` alongside the call, board and
attendance models.

---

## Running it locally

Requirements: PHP 8.3+, Node 20+, Docker (for Postgres), and `openssl` for the local
certificate.

```bash
# 1. database (and MinIO, if you want file storage)
docker compose up -d db minio

# 2. backend
cd cognita
cp .env.example .env           # then set DB_*; leave the LIVEKIT_* block as it is
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000

# 3. frontend (second terminal)
cd cognita
npm install
npm run dev                    # or `npm run build` for production assets

# 4. the call server (third terminal) - no configuration needed
.dev/livekit.sh
```

Open <http://127.0.0.1:8000>; from a phone on the same Wi-Fi, open
`https://<this-machine-lan-ip>:8443` so the microphone is allowed. See
[Running LiveKit for calls](#running-livekit-for-calls) for what the script does and why the
HTTPS port exists.

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
path on 7882 (UDP), with TURN on 3478 as the fallback. A page that shows *Joining…* and
then *Reconnecting* is almost always the second one.

### One command, no configuration

```bash
.dev/livekit.sh              # start everything, machine + LAN
.dev/livekit.sh status       # what is running, on which address
.dev/livekit.sh check        # end-to-end: signal, TCP fallback, UDP media, HTTPS front
.dev/livekit.sh down         # stop

.dev/livekit.sh --direct     # skip the Windows relay: this machine only
.dev/livekit.sh --no-tls     # skip the HTTPS front
```

Every start re-detects the machine's current LAN address and rewrites everything that
depends on it, so nothing has to be edited by hand:

- `LIVEKIT_URL_MODE=auto` (plus ports) in `cognita/.env`
- `node_ip` in `.dev/livekit/livekit.yaml` — the address LiveKit advertises to browsers
- the self-signed certificate for the HTTPS front, regenerated when the address changes
- `APP_URL`

The app itself never stores the call address. `App\Services\LiveKit` derives it from the
request, so a laptop at `http://localhost:8000`, a phone at `http://192.168.1.20:8000` and a
tunnel all get an address they can reach. `LIVEKIT_URL` is only for hosted LiveKit, together
with `LIVEKIT_URL_MODE=fixed`.

### Swapping the call server

The app talks to a call server through one interface, `App\Contracts\RealtimeProvider`: a
driver name, a signal URL, a grant (URL, token, identity, expiry), a way to remove a
participant, and a diagnostic report. LiveKit is one implementation of it.

```php
// config/realtime.php
'driver'  => env('REALTIME_DRIVER', 'livekit'),
'drivers' => ['livekit' => LiveKitProvider::class],
```

To move to another backend — Jitsi, Daily, a plain WebSocket relay — write the class, register
it under a new name, and set `REALTIME_DRIVER`. Nothing else in PHP changes: the controllers
type-hint the interface, and the container resolves it.

The browser mirrors the same idea. `resources/js/realtime/` defines a `CallTransport` (join,
leave, microphone, the three frame kinds, media path) and a registry:

```
realtime/
├── types.ts             CallTransport, TransportOptions, the event vocabulary
├── protocol.ts          the frames both ends agree on (board, presence, comment)
├── livekit-transport.ts the bundled adapter
├── local-transport.ts   BroadcastChannel fallback: tabs on one device, no media
└── index.ts             createCallTransport(config, options)
```

The page is handed `realtime.driver` and `realtime.configured`; it constructs the matching
adapter and never imports a vendor SDK. If the server says the driver is not configured, the
board still works — `LocalTransport` keeps tabs in step and the call page says so instead of
failing at the join button.

```
# verify the provider the app resolved (alias: livekit:check)
php artisan realtime:check
php artisan realtime:check --json --url=https://your-host
```

`realtime:check` resolves the provider from the container and reports what the browser would
be told, so a misconfigured driver fails here rather than at the start of a lesson.

### Why a relay, and why an HTTPS front

WSL2 on Windows 10 NATs the distro behind the host: `netsh interface portproxy` forwards TCP
only, never UDP, and `networkingMode=mirrored` needs Windows 11. Docker Desktop's published
ports do not deliver WebRTC media either — the browser joins and the server receives zero
STUN packets. So LiveKit runs natively in WSL (the binary is extracted from
`livekit/livekit-server:v1.13`, nothing is downloaded) and a small Node relay on Windows owns
every port a browser dials:

```
phone / browser ──▶ <lan-ip>:7880, 7881, 8000 (TCP) ──▶ relay ──┐
                └──▶ <lan-ip>:7882, 3478 (UDP) ───────▶ relay ──┼──▶ <wsl-ip> LiveKit + Laravel
phone, voice    ──▶ https://<lan-ip>:8443 (TCP, TLS) ─▶ relay ──┘
```

The HTTPS front matters for telephones: a browser only hands out the microphone on a secure
origin, and `http://192.168.x.x:8000` is not one. On that single port the relay sends `/rtc`
and `/twirp` to LiveKit and everything else to Laravel, so the page and its `wss://` share one
origin. It uses a self-signed certificate, accepted once per browser. The call page notices a
plain-HTTP origin and links straight to the secure address.

### One-time setup on Windows

The relay binds ports the Windows firewall does not open by default, and Windows drops those
packets even when they come from the distro. Run this once, elevated:

```powershell
# elevated PowerShell
.\\.dev\\lan-forward\\setup-windows.ps1
```

It creates the `Cognita relay TCP` and `Cognita relay UDP` rules for the Private and Domain
profiles, removes a stale `netsh portproxy` on 8000, and writes a transcript to
`.dev/lan-forward/setup.log`. The rules are port-based, so a changed Wi-Fi address does not
break them.

### Opening it

| where | address | microphone |
| --- | --- | --- |
| this machine | `http://localhost:8000` | yes |
| this machine, phone-equivalent | `https://localhost:8443` | yes |
| phone / other device | `https://<lan-ip>:8443` | yes, after accepting the certificate |
| phone on plain HTTP | `http://<lan-ip>:8000` | no — hears only, the browser blocks capture |

A Wi-Fi hotspot can change the address while the server is running. `status` says so
explicitly, and rerunning `.dev/livekit.sh` re-advertises the new one.

### Verifying without a phone

```bash
.dev/livekit.sh check                      # signal, TCP fallback, UDP media, HTTPS front
php artisan livekit:check                  # what the browser would do, from Laravel
node .dev/lan-forward/stun-probe.mjs <lan-ip> 3478   # is UDP really arriving?
```

The call page has the same thing built in: **Check connection** in the lobby (and
automatically after a failed join) runs `/classes/{id}/call/doctor` and lists each layer with
the address it tried — configuration, signal, credentials, UDP media — plus the media path the
browser actually chose (`udp`/`tcp`, direct or relayed) while in a call.

For a real end-to-end run, two browsers on the Windows side join the same class:

```bash
# from Windows (Node must be the Windows build)
node \\\\wsl.localhost\\Ubuntu-24.04\\home\\<you>\\Cognito\\.dev\\call-check.mjs \\
     --base https://<lan-ip>:8443 --class 1 --allow-cert-error
```

It reports the selected ICE candidate pair and the audio packet counts in both directions,
and fails if either microphone stayed silent.

### Docker

`docker-compose.yml` still runs `livekit/livekit-server` with the same keys. Use it when the
server sits on a real host or behind TURN/TLS, not for media on this machine. `node_ip` in
`docker/livekit/livekit.yaml` must be that host's LAN address.

### When the call still fails

1. **Open the call page and press *Check connection*.** The failing line names the layer and
   the address, which is faster than guessing.
2. **`signal` fails** — LiveKit is not running, or TCP 7880 does not reach it. Start it with
   `.dev/livekit.sh`, then `.dev/livekit.sh check`.
3. **`media` fails** — UDP 3478 is dropped. On Windows rerun `setup-windows.ps1` elevated; in
   another network, check the router, and note that carrier-grade NAT on mobile data often
   blocks inbound UDP entirely — use Wi-Fi, or a host with TURN.
4. **The page says the origin is not secure** — open the HTTPS address the call page links to.
   The board works either way; only capture needs it.
5. **One identity per browser tab.** Each tab gets its own LiveKit participant (suffixed from
   `sessionStorage`), so two tabs or two devices on one account no longer kick each other. When
   the server ends a session the call page says why and offers *Rejoin*.
## Using it

1. Sign in as the instructor, create a course, then a class inside it.
2. Copy the class key from the class page.
3. Sign in as a student (or use a private window) and type the key on `/` or `/my-classes`.
4. Join the call from the class card. Press **Board** to show the board, upload a PDF (or pick one
   already attached to the class), switch to the blank canvas, and draw.
5. **Hand over the pen** lets selected students draw; switching it off makes the board read-only
   for them. **Who may draw** lives in the people panel.
6. Shortcuts while the call is open: `B` show/hide the board, `F` fullscreen, `M` microphone,
   `H` hand, `P` live polls, `R` record (instructor), `Esc` leave fullscreen or close a panel.

Drawings belong to the room, not to the class: nothing is saved to the database, so when the
instructor ends the class or starts a fresh board, the next board starts blank. The PDFs
attached to the class stay.

## The board

- **Canvas** — one blank page with a soft dot grid.
- **PDF** — upload up to 25 MB. Every upload stays attached to the class, so instructors can put
  a previous deck back on the board without uploading it again. Pages are rendered client-side
  with PDF.js from an authorised streaming route that supports range requests, ETag
  revalidation and long-lived private caching, so students on constrained connections download
  only the chunks they need.
- Strokes are normalised to the page (0–1) and the sheet keeps a fixed shape, so every window
  size shows the same drawing — the canvas is 16:10 and a PDF keeps its own ratio.
- **The sheet fills the stage.** It is measured from the live container (a `ResizeObserver`) with
  a hairline margin, so a phone gets the pixels its screen has and a projector gets all of them;
  on a small screen the board area keeps a 52vh floor and the page scrolls to it. **Fullscreen**
  (the arrows in the toolbar, or `F`) hands it the whole display, drops the participant strip and
  keeps the board toolbar plus the full call bar — mute, share, hand, board, record, polls, comments,
  people, end class and leave. Polls, comments and the people panel open beside the sheet inside
  fullscreen instead of below the call. **Hide** folds both the call bar and the board toolbar away
  to a small **Show controls** button, so the sheet can be completely clean without losing the way
  back. Native `requestFullscreen` where
  the browser has it, a fixed overlay on iOS Safari, same button either way.
- **Ink is memory, not data.** A class session opens when the instructor joins and stays open
  until they press **End class** (or start a fresh board). A lost network, a closed laptop or a
  rejoin never creates a new session. The server stores the session token and nothing else, so
  the board endpoint refuses strokes outright (`422`), and there is no column for them to land
  in.
- **A late joiner asks for the board.** Since there is nothing to read it from, the browser
  broadcasts an `ask` frame; the host answers with the room as it stands in their own canvas. The
  host is the authority: their canvas *is* the room's ink.
- The room's token is what resets everybody: a new token (a fresh room, or the host pressing the
  sparkle) is what tells each browser to blank its own canvas at the same moment.
- **Mouse-first drawing.** Pointer samples are coalesced and joined with quadratic curves, so a
  mouse or trackpad produces a continuous line instead of visible corners. Hovering shows a brush
  preview that matches the current pen or eraser size; shapes use a crosshair and text uses the
  normal caret.
- **Erasers sized for a real board.** The eraser has its own three sizes — roughly 40, 80 and
  140 px on a 1000 px sheet — and erases with a large circular preview. `E` toggles the eraser
  from anywhere on the board; pressing it again returns to the pen.
- **Laser and spotlight.** `L` turns the pointer into a short-lived glowing laser trail; `S`
  dims the sheet around the pointer so the class looks where the instructor is looking. Neither
  writes ink, so neither needs undoing.
- **Undo and redo.** Undo is personal (you can remove your own last stroke; the instructor can
  remove any), and redo puts it straight back.
- **The canvas and the PDF keep separate state.** Each sheet has its own ink, and the page you
  were on comes back when you return to it — switching surfaces no longer starts the deck over,
  and it no longer resets the zoom.
- Tools: pen, highlighter, laser, spotlight, eraser, line, arrow, rectangle, ellipse, text,
  five inks, three pen widths, page navigation and clear page.
- The instructor owns the surface, the page, the document, and the draw permission; students
  own only their strokes, and only while the pen is handed over.
- Undo is personal: you can only remove a stroke you drew (the instructor can remove any).
- Feedback is deliberately quiet: synthesised WebAudio cues for joins, hands, pen handovers and
  a closing room (mute with the speaker button), toasts for anything that happened once, and a
  notice strip for things that are true right now. All motion collapses under
  `prefers-reduced-motion`.

## Live polls

Inside a live class, the **Polls** button in the call bar opens the poll panel. The instructor can
start a poll without leaving the room:

- **Two kinds.** A multiple-choice poll takes two to six options; an open-answer poll takes a short
  written reply. The instructor picks a 30 s, 1 min, 90 s or 2 min timer when starting it.
- **Only during class.** A poll belongs to the open call session. Starting a new poll closes the
  previous one; ending the class closes all of them. There is no poll page outside the room.
- **One response per student.** Students choose an option or write an answer, and can change it
  until the timer expires. The host cannot vote in their own poll.
- **Results are live and anonymous.** Everyone sees the counts for each option and the anonymous
  open-answer texts as they arrive, not only the instructor. Opening an earlier poll in the panel
  expands its recorded results too. Direct poll URLs are still checked against class membership.

The poll list is refreshed while the call is open, so a new poll reaches every browser in the room
within a few seconds and the countdown is shared.

## Recording, on your device

The **Record** button in the call bar is the instructor's. It captures what the room is carrying,
not what the server stores:

- The browser mixes this microphone, subscribed student voices and any screen-share audio through
  the Web Audio API, and paints whichever screen is on the stage into a 720p canvas. When the
  browser cannot encode video, the recording falls back to audio-only (`webm`/`m4a`).
- Pressing **Stop** downloads the file — `cognita-<class>-<date>-<time>.webm` (or `.mp4`) — and a
  toast names it and its size. Nothing is uploaded, and the backend has no concept of recordings.
- **Leaving**, **End class** and a lost connection stop and save the recording automatically.
  Closing the tab before stopping loses it, so the page warns before a hard unload.
- While recording, a pulsing **REC** chip shows the elapsed time in the call header and the
  controls show **Stop**. The feature is hidden for students and in the no-server preview.

## Attendance

There is nothing to mark by hand and nothing to save from the register screen: it only reads.

- The instructor's session is the unit of attendance. A student who joins while it is open
  gets one row for that session; leaving and rejoining reuses the row and adds time instead of
  creating another. The instructor's **End class** button closes every open row and disconnects
  the call. The host has no record — attendance is about students.
- **Where to find it:** the *Attendance* button on any class card on `/instructor`, the
  *Attendance* button in the class header, the *Full register* link on the class page's
  summary card, or the calendar button in the call header (it opens a new tab so the call
  keeps running). Only the instructor who owns the class can open it.
- One row per enrolled student: **Present** once they have been in the call that day, with
  first joined, last seen, number of sessions and total time in class.
- The date picker reads any day (`?date=YYYY-MM-DD`); a malformed date falls back to today.
- **Excel** and **PDF** download the same day's register — the two files an office asks for.

## Questions: class and community

The sidebar's **Questions** item opens the board for both instructors and students. It leaves the
dashboard chrome behind for a Stack Overflow-shaped page: a top bar with search and board
navigation, a left rail for all/unanswered/community, a flat question feed, and a related-questions
rail.

- **Two scopes.** Class questions are visible only to the instructor and students who joined that
  class. Community questions are visible to every signed-in student and instructor. Admins have no
  board, and an outsider cannot open a private class thread.
- **Ask anywhere.** Pick a class or **Community** in the ask dialog. Community questions work even
  for a student who has not joined a class yet. Add up to five comma-separated tags; they are
  lowercased, deduplicated and stripped of `#`.
- **Photos.** Questions and answers can carry up to five JPG, PNG, GIF or WebP images (10 MB each).
  The files live on the private disk and are served by an access-checked route, so photos in a
  class-only thread stay inside the class.
- **Answer once, accept once.** Answers are text with preserved line breaks plus optional photos.
  Only the person who asked can mark an answer as accepted; accepting another answer moves the
  mark, and clicking the accepted control again clears it.
- **Vote both ways.** Every question and answer has an up/down vote. One vote per person; clicking
  the same direction removes it, and voting the other way switches it. You cannot vote on your own
  post. The score and your vote update immediately, then the server's totals win.
- **Find the thread.** Sort by newest, top voted or unanswered; search title and body; filter the
  class tab to one class with the custom picker. Solved threads carry a green accepted answer at the
  top.

The demo seeder posts four threads in Physics Cohort A and two community threads, including one
solved derivation question and one unanswered units question.

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
│   │   │                 Question, Answer, Poll, Instructor/*, Student/*, Admin/*
│   │   ├── Middleware/   EnsureUserHasRole, HandleInertiaRequests
│   │   └── Requests/     form validation
│   ├── Contracts/        RealtimeProvider (what a call server must do)
│   ├── Models/           User, Course, Classroom, Enrollment, ClassBoard, CallSession,
│   │                     Question, Answer, QuestionVote, AnswerVote, Poll,
│   │                     PollOption, PollResponse, CallSeat
│   ├── Realtime/         LiveKitProvider (the bundled adapter)
│   └── Services/         ClassroomAccess, BoardSessions (room lifecycle),
│                         LiveKit (tokens), AttendanceTracker, CallSeats
├── database/
│   ├── migrations/       users + sessions, courses, classrooms, enrollments, boards,
│   │                     attendance, questions + answers + votes, live polls
│   ├── factories/        one per model
│   └── seeders/          accounts + one teaching example + class/community threads
├── resources/js/
│   ├── components/       ui primitives, questions, polls, board stage + toolbar, call pieces
│   ├── hooks/            useCall (connection), useBoard (ink), usePresence,
│   │                      useAttendance, usePolls, useFullscreen
│   ├── layouts/          AppShell (product chrome), GuestShell (auth pages)
│   ├── lib/              http, api, board, sound, routes
│   ├── realtime/         transport contract + livekit / local adapters
│   └── pages/            Welcome, Auth, Student, Instructor, Admin, LiveCall
├── resources/css/app.css design tokens, component classes, motion
├── config/realtime.php   the driver registry
├── config/calls.php      live seat policy and stale grace period
└── routes/               web.php with admin / instructor / student groups
```

## Tests

```bash
.dev/acceptance.sh                        # schema, phpunit, tsc, vite build
.dev/ui-smoke.sh http://127.0.0.1:8000    # HTTP smoke test of all three roles
```

The suite covers authentication, role boundaries, the class-key door (including the deferred
key for guests), instructor course/class management and scoping, board permissions and stroke
normalisation, PDF upload and streaming, call tokens and one-seat-per-account locking, the admin
console, live poll timing and membership, and the question board's class/community isolation,
voting and accepted answers.
