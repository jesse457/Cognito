# Cognita — AI-Native Adaptive E-Learning Backend

Cognita is an **AI-first, self-paced** learning platform. Students enroll in AI-generated
courses grounded in uploaded source material (RAG), take AI-generated quizzes, and a
Knowledge Tracing engine continuously estimates per-concept mastery so content can adapt to
identified weaknesses. Gamification and community features keep learners engaged.

Three surfaces sit on top of one learning engine:

| Surface | Availability | Purpose |
| :--- | :--- | :--- |
| **Student experience** | always on | enroll → learn → practise → adaptive remediation → XP |
| **Admin / owner panel** | **always on** | moderation, user management, audit trail, settings. Baseline requirement, never feature-flagged. |
| **Instructor portal** | **optional (flag)** | private classes: orchestration, observation, intervention. Instructors do not author content. |

**Three non-negotiable design rules**

1. **The instructor portal is additive and dormant by default.** With `FEATURE_INSTRUCTOR_PATH=false`
   no `/instructor/*` route exists (404, not 403), no instructor table is queried outside the
   admin panel, and no instructor-scoped job runs. Enabling it is a config flip — **never a migration**,
   because every instructor table is migrated unconditionally.
2. **Knowledge Tracing is tiered.** BKT (`pyBKT`) is the CPU-friendly default; DKT is an opt-in GPU
   upgrade. `student_kc_mastery.model_used` is a **string** column, so switching engines requires
   neither a schema change nor a Laravel code change.
3. **Every privileged action is audited.** Admin/moderator/owner actions write exactly one row to the
   append-only `admin_audit_logs`. Data scoping is enforced by `AdminScopeService` + Policies, never by
   trusting request input.

---

## 1. Stack

- Laravel **13.37**, PHP **8.5**
- Laravel Sanctum 4.3 (SPA + API tokens)
- PostgreSQL **16** with **pgvector 0.8** (`pgvector/pgvector:pg16`) — one database for relational data *and* embeddings
- `laravel/ai` **1.2.3** (structured output, embeddings, agents)
- `maatwebsite/excel` 4.0 (export-ready dependency)
- `pgvector/pgvector` 0.2.2 (PHP helpers for the vector type)
- Python 3.11+ / FastAPI / uvicorn / **pyBKT 1.4.3** (default KT engine), optional DKT checkpoint
- **LiveKit 1.13** for private-class group voice calls (self-hosted in Compose)
- Queue: `database` in dev, `redis` in production
- Tests: PHPUnit 12 against PostgreSQL (`cognita_test`)

---

## 2. Repository layout

```
/home/jesse/Cognito
├── docker-compose.yml          # Postgres+pgvector, LiveKit, optional kt-service
├── docker/db/init/01-vector.sql# CREATE EXTENSION vector on first boot
├── docker/livekit/livekit.yaml # LiveKit dev configuration (keys come from env)
├── cognita/                    # Laravel application (this README documents it)
└── kt-service/                 # Python Knowledge-Tracing microservice
```

---

## 3. Prerequisites

- PHP 8.3+ (developed on 8.5) with `pdo_pgsql`, `zip`, `mbstring`, `intl`
- Composer 2.8+
- Docker (for the pgvector image) — or any PostgreSQL 16+ with pgvector installed
- Python 3.11+ (for the KT service) — 3.12 works, see `kt-service/README.md`
- ~1 GB RAM for the Postgres container

---

## 4. Local setup

### 4.1 Database (pgvector)

```bash
cd /home/jesse/Cognito
docker compose up -d db
# one-time (idempotent) extension creation; the init script also does this
docker exec cognita-db psql -U postgres -d cognita -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> **Port deviation:** this machine already had a container on host port 5432, so
> `docker-compose.yml` maps **5433 → 5432** and `.env` uses `DB_PORT=5433`.
> On a free machine change the mapping to `"5432:5432"` and `DB_PORT=5432`.

### 4.2 Laravel

```bash
cd cognita
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed     # 39 migrations + idempotent seeders
php artisan serve                    # http://127.0.0.1:8000
php artisan queue:work               # required: AI + KT + notification jobs
php artisan schedule:work            # optional: leaderboards, suspensions, pruning
```

> **Stale-shell note:** some developer shells export `DB_CONNECTION=sqlite` and other Laravel
> variables, which Dotenv will **not** override. This repo ships `../.dev/artisan`, a wrapper that
> strips those variables and runs artisan with a clean environment:
> `.dev/artisan migrate:fresh --seed`. Use it if `php artisan` reports a SQLite connection.

Seeded accounts (all passwords `password`):

| Role | Email |
| :--- | :--- |
| owner | `owner@cognita.test` |
| admin | `admin@cognita.test` |
| moderator | `moderator@cognita.test` |
| instructor | `instructor@cognita.test` |
| students | `student1@cognita.test`, `student2@cognita.test`, `student3@cognita.test` |

### 4.3 Knowledge Tracing service

Native (CPU, no Docker):

```bash
cd /home/jesse/Cognito/kt-service
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```

Docker Compose (runs alongside Postgres):

```bash
cd /home/jesse/Cognito
docker compose --profile kt up -d kt-service
```

Health probe:

```bash
curl -s localhost:8001/health
# {"status":"ok","engine":"bkt", ...}

curl -s -X POST localhost:8001/predict_mastery \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"history":[{"kc_id":1,"correct":1},{"kc_id":1,"correct":0},{"kc_id":2,"correct":1}]}'
# {"mastery":[{"kc_id":1,"probability":0.xxxx},{"kc_id":2,"probability":0.xxxx}],"engine":"bkt"}
```

See `kt-service/README.md` for engine selection, the DKT fallback contract and measured latency.

### 4.4 LiveKit group voice calls

The instructor portal and the student home page can open a **voice-only** LiveKit room per
private class. The owning instructor joins as host (room moderation); active class members join
as participants. Tokens are minted by `LiveCallService` and are scoped to one room with
`canPublishSources: [microphone]` — no camera or screen-share grants.

```bash
cd /home/jesse/Cognito
docker compose up -d livekit
```

Set these in `cognita/.env` (the defaults in `.env.example` and Compose already match):

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `FEATURE_LIVE_CALLS` | `true` | Mounts the call page and token endpoints |
| `LIVEKIT_URL` | `ws://localhost:7880` | Browser-facing LiveKit signal URL (`wss://` in production) |
| `LIVEKIT_API_KEY` | `devkey` | Must match the Compose `LIVEKIT_KEYS` value |
| `LIVEKIT_API_SECRET` | `cognita-dev-livekit-secret-8f3c2a1b` | Must match the Compose `LIVEKIT_KEYS` value |
| `LIVEKIT_TOKEN_TTL` | `3600` | Access-token lifetime in seconds (clamped to 60–21600) |

Entry points: `/instructor/classes/{class}` → **Live voice call** (instructor), `/` → **Join voice
call** (enrolled student), `POST /live-calls/{class}/token` (web), and
`POST /api/classes/{class}/live-call/token` (API). The local Compose server exposes UDP 7882 for
media, TCP 7881 for the WebRTC fallback, and 7880 for signalling; production needs a TLS reverse
proxy and the [LiveKit deployment guide](https://docs.livekit.io/transport/self-hosting/deployment/).

### 4.5 Tests

```bash
cd cognita
php artisan test          # or ../.dev/artisan test
```

Tests run against **PostgreSQL** (`cognita_test`, forced in `phpunit.xml`) because the RAG store uses
pgvector columns and an HNSW index that SQLite cannot represent.

---

## 5. The role model (three reference tables)

### 5.1 Role hierarchy

| Role | Rank | Purpose | Who can create it |
| :--- | :--- | :--- | :--- |
| `owner` | 4 | Full control; manages admins, edits system settings, reads the whole audit trail | bootstrap seeder; other owners |
| `admin` | 3 | User management, content moderation, staff (moderator) invitations, audit review of own actions | owners |
| `moderator` | 2 | Resolves reports, moderates forum content, warns and suspends users (≤ 30 days) | owners and admins |
| `instructor` | 1 | Runs private classes (feature-flagged) | admin panel (role change) |
| `student` | 0 | Standard user (self-registration default) | self-registration |

Multiple users may hold each role. Rank lives on `App\Enums\UserRole` (`rank()`, `atLeast()`);
every boundary compares ranks, never role strings.

### 5.2 Role capability matrix

| Capability | owner | admin | moderator | instructor | student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Ban / unban a user | ✅ (below own rank) | ✅ (below own rank) | ❌ | ❌ | ❌ |
| Warn / suspend (≤ 30 days) | ✅ | ✅ | ✅ (below own rank) | ❌ | ❌ |
| Change a user's role | ✅ (≤ own rank) | ✅ (≤ own rank) | ❌ | ❌ | ❌ |
| Moderate content (reports, courses, forum) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit system settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ (all rows) | ✅ (own rows only) | ❌ | ❌ | ❌ |
| Create a course (AI generation entry-point) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign class content | ❌ (admin panel is not the portal) | ❌ | ❌ | ✅ (own classes, flag on) | ❌ |
| Impersonate a user | ✅ (below admin rank) | ✅ (below admin rank) | ❌ | ❌ | ❌ |
| Invite staff | ✅ admin or moderator | ✅ moderator only | ❌ | ❌ | ❌ |
| Student learning flow (enroll, practise, XP) | — | — | — | — | ✅ |

### 5.3 Route-surface access

| Surface | Mounted | Middleware | Allowed ranks |
| :--- | :--- | :--- | :--- |
| `/api/*` student + auth | always | `auth:sanctum`, `active` | student (any authenticated user for catalogue/account) |
| `/api/admin/*` | **always** | `auth:sanctum`, `active`, `role.min:moderator`, `admin.context` | moderator, admin, owner (per-action rank rules inside) |
| `/api/instructor/*` | **only when `FEATURE_INSTRUCTOR_PATH=true`** | `auth:sanctum`, `active`, `role:instructor` | instructor |
| `/api/community/*` | **only when `FEATURE_SOCIAL=true`** | `auth:sanctum`, `active` | any authenticated user |
| `/api/classes/{class}/live-call/token` | **only when `FEATURE_LIVE_CALLS=true`** | `auth:sanctum`, `active` | class instructor or active member |

---

## 6. Feature flags

All flags are read exclusively via `config('features.*')` (never `env()` outside `config/`).

| Key | Env var | Default | Effect |
| :--- | :--- | :--- | :--- |
| `features.instructor_path` | `FEATURE_INSTRUCTOR_PATH` | `false` | Mounts `/api/instructor/*`; enables instructor services/jobs. Off ⇒ routes 404, services no-op, scheduled analytics never queued. Enabling needs **no migration**. |
| `features.social` | `FEATURE_SOCIAL` | `false` | Mounts `/api/community/*`. Forum tables are always migrated. |
| `features.live_calls` | `FEATURE_LIVE_CALLS` | `true` | Mounts the class voice-call page and token endpoints. Requires `services.livekit.*`; off ⇒ the routes 404. No migration either way. |
| `features.kt_engine` | `KT_ENGINE` | `bkt` | `bkt` or `dkt`; forwarded to the Python service. Stored per row in `student_kc_mastery.model_used` (string). |
| `features.kt_service_url` | `KT_SERVICE_URL` | `http://127.0.0.1:8001` | KT microservice base URL. |
| `features.max_class_size` | `INSTRUCTOR_MAX_CLASS_SIZE` | `50` | Class size cap; assignment/invitation beyond it ⇒ 422. |
| `features.at_risk_threshold` | `MASTERY_AT_RISK_THRESHOLD` | `0.6` | Mastery below this drives adaptive remediation and at-risk flags. |

---

## 7. API surface

All responses are JSON. Single resources: `{"data": {...}}`; lists: `{"data": [...], "meta": {...}}`.
Auth: `Authorization: Bearer <sanctum token>`.

### 7.1 Student & auth (always on)

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/api/register` | Creates a **student**; role is never accepted from input. 403 when `registration_open=false`. |
| POST | `/api/login` | Token + user. Banned users ⇒ 403; suspended users may log in but are blocked elsewhere. |
| POST | `/api/logout` | Revokes the current token. Exempt from the suspension gate. |
| GET | `/api/me` | Current identity + role/rank/status. |
| GET | `/api/account` | Account self-service (exempt from suspension). |
| PUT | `/api/account` | Update name / display name / avatar. |
| POST | `/api/account/password` | Change password (requires current password). |
| GET | `/api/courses` | Published catalogue; search + pagination; `enrolled` flag. |
| GET | `/api/courses/{course}` | Curriculum (modules → lessons) + knowledge components. |
| POST | `/api/courses/{course}/enroll` | Idempotent enrollment. |
| GET | `/api/courses/{course}/leaderboard` | `?period=weekly\|all_time`. |
| GET | `/api/lessons/{lesson}` | Enrolled-only. Quiz answer keys are stripped. |
| POST | `/api/practice-sessions` | `{course_id, lesson_id?}` → session. |
| POST | `/api/practice-sessions/{session}/answers` | `{question_payload?, user_answer, time_taken_ms, knowledge_component_id?}`; correctness computed server-side. Dispatches `AnswerSubmitted` → mastery job. |
| POST | `/api/practice-sessions/{session}/complete` | Closes the session; dispatches `QuizCompleted` → XP/streak/leaderboard/achievements + adaptive. |
| GET | `/api/adaptive/recommendations` | Weak KCs + grounded lessons to revisit. |
| GET | `/api/profile/xp` | XP, level, streak, achievements. |
| GET | `/api/notifications` | Database notifications (moderation, announcements, reports). |
| POST | `/api/notifications/{notification}/read` | Mark read. |
| POST | `/api/reports` | File a content report (any authenticated user). |
| POST | `/api/classes/{class}/live-call/token` | Voice-only LiveKit token for the class instructor or an active member (`FEATURE_LIVE_CALLS=true`). |

### 7.2 Instructor portal (only mounted with `FEATURE_INSTRUCTOR_PATH=true`)

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/api/instructor/dashboard` | Portal landing KPIs. |
| GET | `/api/instructor/classes` | Own classes only. |
| POST | `/api/instructor/classes` | Create a class (auto join code). |
| GET | `/api/instructor/classes/{class}` | Class detail. |
| PATCH | `/api/instructor/classes/{class}` | Update class. |
| DELETE | `/api/instructor/classes/{class}` | Archive/delete class. |
| GET | `/api/instructor/classes/{class}/dashboard` | Per-class KPIs (403 for another instructor). |
| GET | `/api/instructor/classes/{class}/students` | Roster. |
| GET | `/api/instructor/classes/{class}/students/{student}` | Per-student mastery drill-down (reads `student_kc_mastery`). |
| GET | `/api/instructor/classes/{class}/students/{student}/notes` | Notes (author-only). |
| POST | `/api/instructor/classes/{class}/students/{student}/notes` | Create a private note. |
| GET | `/api/instructor/classes/{class}/notes/{note}` | Note detail (403 for non-author). |
| DELETE | `/api/instructor/classes/{class}/notes/{note}` | Delete note. |
| GET | `/api/instructor/classes/{class}/heatmap` | Student × KC heatmap. |
| GET | `/api/instructor/classes/{class}/at-risk` | Students below `at_risk_threshold`. |
| POST | `/api/instructor/classes/{class}/analytics/snapshot` | Write a `cohort_analytics_snapshots` row. |
| GET | `/api/instructor/classes/{class}/announcements` | List announcements. |
| POST | `/api/instructor/classes/{class}/announcements` | Publish → database notifications to active members. |
| POST | `/api/instructor/classes/{class}/courses` | Assign a course → auto-enroll active members (capacity-checked). |
| POST | `/api/instructor/classes/{class}/students/{student}/lessons` | Assign one lesson to one student. |
| POST | `/api/instructor/classes/{class}/invitations` | Invite a student by email. |
| GET | `/api/instructor/classes/{class}/briefing` | AI briefing + suggested interventions (rule-based fallback). |

With the flag off these paths return **404** — they are not mounted at all.

### 7.3 Admin panel (always mounted)

| Method | Path | Min rank |
| :--- | :--- | :--- |
| GET | `/api/admin/dashboard` | moderator |
| GET | `/api/admin/users` | moderator (redacted payload) |
| GET | `/api/admin/users/{user}` | moderator (redacted payload) |
| POST | `/api/admin/users/{user}/warn` | moderator (lower-ranked target) |
| POST | `/api/admin/users/{user}/suspend` | moderator (≤ 30 days, lower-ranked target) |
| POST | `/api/admin/users/{user}/ban` | admin |
| POST | `/api/admin/users/{user}/unban` | admin |
| POST | `/api/admin/users/{user}/role` | admin (no escalation above own rank) |
| POST | `/api/admin/users/{user}/impersonate` | admin (target below admin) |
| POST | `/api/admin/impersonation/stop` | admin |
| GET | `/api/admin/reports` | moderator |
| GET | `/api/admin/reports/{report}` | moderator |
| POST | `/api/admin/reports/{report}/assign` | moderator |
| POST | `/api/admin/reports/{report}/resolve` | moderator |
| POST | `/api/admin/reports/{report}/dismiss` | moderator |
| POST | `/api/admin/reports/bulk-resolve` | moderator |
| POST | `/api/admin/courses/{course}/remove` | admin |
| POST | `/api/admin/courses/{course}/restore` | admin |
| POST | `/api/admin/forum/threads/{thread}/lock` | moderator |
| DELETE | `/api/admin/forum/threads/{thread}` | moderator |
| POST | `/api/admin/forum/posts/{post}/hide` | moderator |
| DELETE | `/api/admin/forum/posts/{post}` | moderator |
| GET | `/api/admin/audit-logs` | admin (owner: all rows; admin: own rows) |
| GET | `/api/admin/settings` | **owner only** |
| PUT | `/api/admin/settings` | **owner only** |
| POST | `/api/admin/staff/invitations` | owner (admin/moderator), admin (moderator only) |
| DELETE | `/api/admin/staff/invitations/{invitation}` | admin |
| POST | `/api/admin/staff/invitations/{token}/accept` | **public** (token + expiry validated) |

There is intentionally **no** update or delete endpoint for `admin_audit_logs`; the model itself
throws on `update()`/`delete()`, and retention pruning is the only sanctioned delete path
(`PruneOldAuditLogsJob`, query builder).

### 7.4 Community (only mounted with `FEATURE_SOCIAL=true`)

| Method | Path |
| :--- | :--- |
| GET | `/api/community/threads` |
| POST | `/api/community/threads` |
| GET | `/api/community/threads/{thread}` |
| PATCH | `/api/community/threads/{thread}` |
| POST | `/api/community/threads/{thread}/posts` |
| PATCH | `/api/community/posts/{post}` |
| DELETE | `/api/community/posts/{post}` |

---

## 8. Migration order (Phase 4 schema, applied verbatim)

Infrastructure first, then the mandated group order. The audit table is **last in its group**.

```
0001_01_01_000000  create_users_table                      (Laravel default)
0001_01_01_000001  create_cache_table
0001_01_01_000002  create_jobs_table
2022_08_03_000000  create_vector_extension                 (pgvector package)
…_155230          create_personal_access_tokens_table     (Sanctum)
…_155340          create_agent_conversations_table        (laravel/ai)
…_160000          enable_vector_extension                 (CREATE EXTENSION IF NOT EXISTS vector)
…_160050          create_notifications_table              (database notifications)
── 4.1 core domain ────────────────────────────────────────────────────────────
…_160100          add_cognita_columns_to_users_table      (role, display_name, avatar_url, status, suspended_until, last_seen_at)
…_160200          create_courses_table
…_160300          create_modules_table
…_160400          create_lessons_table
…_160500          create_enrollments_table
── 4.2 interaction & progress ─────────────────────────────────────────────────
…_160600          create_practice_sessions_table
…_160700          create_answer_history_table
── 4.3 knowledge tracing ──────────────────────────────────────────────────────
…_160800          create_knowledge_components_table       (+ deferred answer_history FK)
…_160900          create_lesson_kc_map_table
…_161000          create_student_kc_mastery_table
── 4.4 gamification ───────────────────────────────────────────────────────────
…_161100          create_participant_profiles_table
…_161200          create_leaderboard_entries_table
…_161300          create_achievements_table
…_161400          create_user_achievements_table
── 4.5 social (gated at runtime, migrated always) ─────────────────────────────
…_161500          create_forum_threads_table
…_161600          create_forum_posts_table
── 4.6 RAG vector store ───────────────────────────────────────────────────────
…_161700          create_document_chunks_table
…_161800          create_chunk_embeddings_table           (+ vector(1536), HNSW cosine index)
── 4.7 instructor domain (migrated unconditionally, dormant by default) ───────
…_161900          create_private_classes_table
…_162000          create_class_enrollments_table
…_162100          create_class_invitations_table
…_162200          create_class_course_assignments_table
…_162300          create_student_content_assignments_table
…_162400          create_announcements_table
…_162500          create_instructor_notes_table
…_162600          create_cohort_analytics_snapshots_table
── 4.8 admin/owner domain (always migrated, always mounted) ───────────────────
…_162700          create_content_reports_table
…_162800          create_moderation_actions_table
…_162900          create_system_settings_table
…_163000          create_staff_invitations_table
…_163100          create_admin_audit_logs_table           ← AUDIT TABLE LAST IN GROUP
```

Note: `answer_history` is created (4.2) before `knowledge_components` (4.3) as mandated, so its
`knowledge_component_id` foreign key is added by the `knowledge_components` migration — same schema,
same order, no forward reference.

---

## 9. Jobs, events, scheduler

**Queued jobs** — `UpdateStudentMastery` (KT HTTP call + BKT fallback), `GenerateEmbeddingsJob`,
`GenerateCourseJob`, `GenerateQuizJob`, `ComputeCohortAnalyticsJob` (no-op when flag off),
`SendStaffInvitationEmail`, `SendModerationNotification`, `PruneOldAuditLogsJob`.

**Events → listeners**

| Event | Listener(s) |
| :--- | :--- |
| `AnswerSubmitted` | `RecordAnswerHistory` → dispatch `UpdateStudentMastery` |
| `QuizCompleted` | `AwardGamificationOnQuizCompletion`, `TriggerAdaptiveRemediationOnQuizCompletion` |
| `MasteryDropped` | `FlagAtRiskStudentOnMasteryDrop` (instructor-only, zero queries when flag off) |
| `ContentReported` | `NotifyModeratorsOfContentReport` |
| `ModerationActionTaken` | `NotifyTargetOfModerationAction` |
| `UserRoleChanged` | `NotifyTargetOfRoleChange` |
| `ReportResolved` | `NotifyReporterOfResolution` |

**Scheduler** (`routes/console.php`)

| Schedule | Job / command | Gate |
| :--- | :--- | :--- |
| daily 02:00 | `ComputeCohortAnalyticsJob` | only when `features.instructor_path` |
| hourly | `cognita:rebuild-leaderboards` | always |
| monthly | `PruneOldAuditLogsJob` | always (retention from `system_settings`) |
| every 15 min | `cognita:expire-suspensions` | always |

---

## 10. How the adaptive loop works

1. `POST /api/practice-sessions/{session}/answers` persists `answer_history` and dispatches `AnswerSubmitted`.
2. `RecordAnswerHistory` queues `UpdateStudentMastery` (never inline — the student never waits on the KT service).
3. `UpdateStudentMastery` POSTs the KC history to `KT_SERVICE_URL/predict_mastery`. On any failure it logs
   `kt.service_unavailable_falling_back_to_bkt` with structured context and computes BKT locally
   (`App\Services\KnowledgeTracing\BktEstimator`), writing `student_kc_mastery` with `model_used=bkt`.
4. `POST /api/practice-sessions/{session}/complete` dispatches `QuizCompleted` → gamification + adaptive remediation.
5. `GET /api/adaptive/recommendations` returns KCs below `features.at_risk_threshold` plus the lessons that teach them.

The instructor portal only **reads** `student_kc_mastery`; it never computes mastery.

---

## 11. Deliverable documents

- [`FILE_TREE.md`](FILE_TREE.md) — every created file with a one-line purpose
- [`ACCEPTANCE.md`](ACCEPTANCE.md) — full Phase 12 transcript, raw evidence, test inventory
- [`kt-service/README.md`](kt-service/README.md) — KT endpoint contracts, engines, latency, fallback behaviour

## 11b. Acceptance results (Phase 12)

See [`ACCEPTANCE.md`](ACCEPTANCE.md) for the full transcript, per-item pass/fail, and the exact commands.
Summary:

| # | Criterion | Result |
| :-- | :--- | :--- |
| 1 | `migrate:fresh --seed` against pgvector image | ✅ PASS |
| 2 | `\d chunk_embeddings` shows `vector(1536)` + HNSW index | ✅ PASS |
| 3 | Full PHPUnit suite | ✅ PASS (106 tests, 368 assertions; KT service 13 tests) |
| 4 | AI-only mode end-to-end; `/instructor/*` 404 | ✅ PASS |
| 5 | KT service `/health` + `/predict_mastery` | ✅ PASS |
| 6 | Flip `FEATURE_INSTRUCTOR_PATH=true`: 200 for instructor, 403 for student | ✅ PASS |
| 7 | `KT_ENGINE=dkt` without DKT deps degrades to `engine: bkt` | ✅ PASS |
| 8 | Admin panel works with both flags off | ✅ PASS |
| 9 | Rank enforcement smoke (admin 403, owner allowed + audited) | ✅ PASS |
| 10 | Audit immutability + admin sees only own audit rows | ✅ PASS |

---

## 11c. Staff console (Inertia + React)

The admin panel and instructor portal now ship a browser UI. It is a separate
layer from the JSON API and follows the same authorization rules: the console
calls the existing services and policies directly, so a UI action can never do
something the API would refuse.

| Concern | Implementation |
| :--- | :--- |
| Stack | Laravel 13 + **Inertia v3** + **React 19** + TypeScript + Tailwind v4 + Vite 8 |
| Typed routes | **Wayfinder** generates `resources/js/routes` and `resources/js/actions`; pages never hardcode URLs |
| Pages | `resources/js/pages/**` (layout is applied in `resources/js/app.tsx`) |
| Design system | `resources/css/app.css` (`@layer components`) plus primitives in `resources/js/components/ui` |
| Auth | Session guard for the console (`Auth::attempt`), Sanctum unchanged for the API |
| Shared props | `app/Http/Middleware/HandleInertiaRequests.php` shares actor, flashes, panel and feature flags |
| Routes | `routes/web.php` (+ `web-admin.php`, `web-instructor.php`) |

```bash
cd cognita
npm install
npm run build          # or: npm run dev
php artisan serve      # console at http://127.0.0.1:8000/login
```

Console surfaces:

- `/admin` dashboard, `/admin/users`, `/admin/reports`, `/admin/courses`,
  `/admin/audit`, `/admin/invitations` (admin+), `/admin/settings` (owner only)
- `/instructor` dashboard, `/instructor/classes`, `/instructor/classes/{class}`,
  `/instructor/classes/{class}/students/{student}` — **mounted only when
  `FEATURE_INSTRUCTOR_PATH=true`**, exactly like the API
- `/login` staff sign-in; students see a short page stating the student
  experience is API-only

The console reuses the same server-side boundaries (no scoping logic is
duplicated in JavaScript):

- every admin request runs `role.min:moderator` + `admin.context`, so model
  writes made through the console are audited like API actions
- every instructor page/action resolves its class and student through
  `ClassAccessService` (a foreign class is a 403, a missing one a 404)
- system settings stay owner-only; moderators get the redacted user projection
- AI briefings load as an Inertia **deferred prop**, so an LLM call never blocks
  the class page paint (and falls back to the rule-based briefing)

---

## 12. Decisions & deviations

Deviations that matter operationally, all deliberate:

1. **`jaygaha/laravel-ai-quiz-engine` does not exist on Packagist** (404 on the metadata endpoint and
   zero search results). The quiz engine is implemented natively as `App\Ai\Agents\QuizGenerationAgent`
   (structured output) + `App\Services\QuizGenerationService`, preserving the intended capability.
2. **`spatie/laravel-permission` is not installed.** The Phase 14 guardrail explicitly forbids it
   ("Policies + the role hierarchy are sufficient"), which conflicts with the tech-stack line. The
   guardrail wins: roles live in `users.role` and boundaries compare `UserRole::rank()`.
3. **No `quizzes` table exists in the mandated Phase 4 schema**, so a generated quiz is persisted on its
   lesson: `lessons.content_type = quiz` with the question set in `lessons.content_body` (JSON).
   Answer keys are stripped from the student-facing lesson payload.
4. **Postgres host port 5433** instead of 5432 (5432 was already bound on this machine). Compose and
   `.env.example` document the switch back.
5. **Tests run on PostgreSQL**, not SQLite (`phpunit.xml` forces `cognita_test`), because the RAG
   migrations use `vector(1536)` and an HNSW index that SQLite cannot create.
6. **`AdminScopeService::assertCanManageUser` follows the spec literally** (actor must be admin+ AND
   strictly outrank the target). That literal reading would forbid moderators from warning students, so
   a sibling `assertCanModerateUser` (moderator+, strict outrank) backs warn/suspend — matching
   `UserPolicy::warn|suspend` = moderator+ and the required "moderator cannot ban, only warn/suspend".
7. **Two extra endpoints** beyond the listed surface, both required by the behaviour spec:
   `POST /api/admin/impersonation/stop` (so the stop is auditable) and
   `POST /api/admin/reports/bulk-resolve` (ReportService bulk support). Also
   `POST /api/admin/reports/{report}/assign` for `assignToSelf()` and
   `POST /api/admin/forum/posts/{post}/hide` for `hidePost()`.
8. **`content_reports.reportable_type` is not enum-cast**: the morph relation needs the raw alias
   string (`course`, `forum_thread`, …). The alias set is validated at the request boundary against
   `config('cognita.morph_map')`, and the morph map is registered in `AppServiceProvider`.
9. **`LogsAdminActivity` + explicit service audits.** Services write the one authoritative audit row and
   run inside `AdminContext::runWithoutModelAudit()`, so the trait (which audits admin-context model
   writes generically) can never produce a second row for the same action. Verified by
   `AuditLogCompletenessTest`.
10. **System setting values are stored as `{"value": <scalar>}`** inside the JSON column (the column is
    an array cast); `SystemSettingService` unwraps on read and re-wraps on write.
11. **Automatic audit actors.** `cognita:expire-suspensions` records the bootstrap owner as actor with
    `automatic: true` in `context` (audit rows require an actor FK); if no owner exists it lifts the
    suspension and logs a warning instead of inventing an actor.
12. **Laravel Boost was installed** (`laravel/boost`, dev-only) because the generated `AGENTS.md`
    requested it; it adds developer tooling only and no runtime dependency.
13. **RAG PDF extraction** prefers `pdftotext`; DOCX is parsed via `ZipArchive`. If neither a PDF text
    layer nor `pdftotext` is available the ingest raises a clear error instead of storing garbage.
14. **Instructor briefing** degrades to a deterministic rule-based briefing when no AI provider is
    configured — the portal never depends on a live LLM.
15. **`php artisan` environment wrapper** (`../.dev/artisan`) exists because this shell exports
    `DB_CONNECTION=sqlite`; it is dev tooling and not required in a clean environment.
16. **An owner may ban/unban/delete a peer owner** (`AdminScopeService::assertCanManageAccountState`).
    Phase 12 item 9 requires "owner bans an owner → succeed" while Phase 6 says "cannot act on someone
    of equal or higher rank". Resolution: the equal-rank prohibition stays absolute for **role changes**
    (`assertCanManageUser`, which `assertCanChangeRole` uses) and for every lower role, but account-state
    actions allow owner→owner because owner is the sovereign top rank and nothing can be escalated.
    Covered by `RoleHierarchyEnforcementTest::test_an_owner_may_ban_a_peer_owner_but_an_admin_may_not`.
17. **KT service runs on port 8011 during acceptance.** Port 8001 on this host is occupied by an
    unrelated PHP server, so the service was started with `--port 8011` and the Laravel side used
    `KT_SERVICE_URL=http://127.0.0.1:8011`. Defaults (`8001`) are unchanged in `.env.example`,
    `config/features.php`, the Dockerfile and `docker-compose.yml`.
18. **pyBKT is pinned to 1.4.3, not `1.0.*`.** The `pyBKT==1.0.*` sdist published on PyPI contains no
    `pyBKT/models` package (import fails), and numpy≥2 / scikit-learn≥1.6 break pyBKT's EM fitter at
    import time. The working pins are in `kt-service/requirements.txt` with the reasoning inline; the
    required behaviour (per-request CPU BKT fit with `num_fits=1`, `seed=42`) is preserved.

19. **The instructor console uses a typed path module instead of Wayfinder output.**
    `resources/js/lib/instructorRoutes.ts` holds the ten console URLs. Wayfinder regenerates
    `resources/js/routes` on every build, and the portal is mounted only when
    `FEATURE_INSTRUCTOR_PATH=true`; with the flag off the generated instructor helpers vanish and
    any page importing them would break the default build. Admin routes are always mounted, so they
    keep using generated Wayfinder helpers.
20. **`POST /admin/reports/{id}/resolve` returns 422 — not 403 — when the requested moderation action
    targets an author who outranks the actor.** The report itself is still resolvable; only the attached
    account action is refused, and the message tells the moderator to resolve without one. This avoids a
    confusing 403 that would have blocked the whole resolution.
21. **`admin_audit_logs` is intentionally empty after `migrate:fresh --seed`** — audit rows are only ever
    produced by real staff actions (verified by `AuditLogCompletenessTest`), never by seeders.

No feature flag requires a schema change — verified for both `FEATURE_INSTRUCTOR_PATH` and
`FEATURE_SOCIAL` (all their tables are migrated unconditionally), and for `KT_ENGINE` (string column).

---

## 13. Conventions enforced

- `env()` only inside `config/`; every flag read as `config('features.*')`.
- String columns + PHP backed-enum casts — no native database enums anywhere.
- Every instructor access goes through `ClassAccessService`; every admin access through
  `AdminScopeService` (no `User::find()` in a controller).
- Role changes and moderation actions are transactional with their audit row.
- Queued jobs for every LLM call and every KT HTTP call; the student flow is never blocked.
- Structured logging for every engine fallback and every moderation action.
