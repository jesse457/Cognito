# Cognita — Phase 12 acceptance record

Executed on this machine against the pgvector Docker image. Reproduce with:

```bash
cd /home/jesse/Cognito
docker compose up -d db                       # pgvector/pgvector:pg16 on host port 5433
.dev/artisan migrate:fresh --seed             # item 1
.dev/artisan serve --port=8123 &              # Laravel (KT_SERVICE_URL=http://127.0.0.1:8011 for item 4)
cd kt-service && .venv/bin/uvicorn main:app --port 8011 &   # KT service (8001 is taken on this host)
cd .. && .dev/acceptance.sh                   # items 1,2,4,8,9,10 (23 checks)
.dev/artisan test                             # item 3
```

Environment notes that shape the results:

- Host port **5432 is occupied** by an unrelated container, so Cognita's Postgres maps **5433 → 5432**
  (`DB_PORT=5433`).
- Host port **8001 is occupied** by an unrelated PHP server, so the KT service was run on **8011** with
  `KT_SERVICE_URL=http://127.0.0.1:8011`. The service and compose file default to 8001.
- This shell exports stale Laravel variables (`DB_CONNECTION=sqlite`, …), so artisan is invoked through
  `.dev/artisan`, which strips them. In a clean shell plain `php artisan` behaves identically.

---

## Item-by-item results

| # | Criterion | Result | Evidence |
| :-- | :--- | :--- | :--- |
| 1 | `migrate:fresh --seed` against the pgvector image | **PASS** | 38 local migrations + vendor/sanctum/AI migrations ran with zero errors; seeders created 7 users, 1 course, 2 modules, 4 lessons, 4 KCs, 3 enrollments, 1 class, 2 class enrollments, 2 achievements, 7 settings, 2 reports, 6 lesson↔KC links, `admin_audit_logs` = 0 |
| 2 | `\d chunk_embeddings` shows `vector(1536)` + HNSW index | **PASS** | `embedding | vector(1536)`; `chunk_embeddings_hnsw_idx hnsw (embedding vector_cosine_ops)` |
| 3 | Full PHPUnit suite passes | **PASS** | `Tests: 106 passed (368 assertions)` — 23 test classes (unit + feature); KT service `13 passed` |
| 4 | AI-only mode end-to-end; `/instructor/*` 404 | **PASS** | student1 logs in → enrolls in course 1 → starts session on quiz lesson 4 → submits 3 answers (`answer_history` rows) → completes quiz → queued `UpdateStudentMastery` writes `student_kc_mastery` with `model_used=bkt` → student3 gets 4 adaptive remediation targets; `/api/instructor/dashboard` = **404** |
| 5 | KT service `/health` + `/predict_mastery` | **PASS** | `/health` → `{"status":"ok","engine":"bkt",...}`; `/predict_mastery` first call **275 ms**, repeat **18 ms** (cache), returns `{"mastery":[{"kc_id":1,"probability":0.6125},{"kc_id":2,"probability":0.2161}],"engine":"bkt"}` |
| 6 | Flip `FEATURE_INSTRUCTOR_PATH=true`: instructor 200, student 403 | **PASS** | after flipping `.env` and restarting: instructor `GET /instructor/dashboard` = **200**, student = **403**; `migrate:status` showed **0 pending migrations** |
| 7 | `KT_ENGINE=dkt` without DKT deps degrades to `bkt` | **PASS** | restart with `KT_ENGINE=dkt`: `/health` → `engine:"bkt", dkt_available:false, checkpoint:false`; `/predict_mastery` → `{"mastery":[...],"engine":"bkt"}` HTTP 200 |
| 8 | Admin panel works with both flags off | **PASS** | owner: `/admin/dashboard`, `/admin/users`, `/admin/reports`, `/admin/settings`, `/admin/audit-logs` → all **200**; dashboard body reports 7 users / 1 open report |
| 9 | Rank enforcement smoke | **PASS** | admin → promote to owner **403**, admin → ban owner **403**; owner → promote **200**, owner → ban peer owner **201**; audit rows `user.role_change` = 1 and `user.ban` = 1 for the target |
| 10 | Audit immutability + admin row scoping | **PASS** | non-owner admin `GET /admin/audit-logs` returns only `actor_id = 2` (own) rows while owner sees actors `{1,2}`; `PUT`/`DELETE`/`PATCH /admin/audit-logs/1` → **404**; model-level `update()` throws `LogicException: admin_audit_logs is append-only` |

`./.dev/acceptance.sh` output (final run): **23 passed, 0 failed**.

```
== ACCEPTANCE 1: migrate:fresh --seed ==
  PASS migrate:fresh --seed completed
== ACCEPTANCE 2: chunk_embeddings vector column + HNSW index ==
  PASS embedding column type (expected vector(1536), got vector(1536))
  PASS HNSW cosine index present
== ACCEPTANCE 4: AI-only mode (instructor path off) ==
  PASS student login / enrolled in course 1 (200) / practice session started
  PASS quiz completed (200)
  PASS student_kc_mastery updated with bkt
  PASS adaptive remediation returns 4 weak components
  PASS GET /instructor/dashboard returns 404 when flag off
== ACCEPTANCE 8: admin panel works with both flags off ==
  PASS GET /admin/dashboard|users|reports|settings|audit-logs (owner) (200 ×5)
== ACCEPTANCE 9: rank enforcement ==
  PASS admin promotes to owner -> 403
  PASS admin bans owner -> 403
  PASS owner promotes to owner -> 200
  PASS owner bans peer owner -> 201
  PASS audit rows for role change and ban (1/1)
== ACCEPTANCE 10: audit immutability + row scoping ==
  PASS non-owner admin sees only own audit rows
  PASS PUT /admin/audit-logs/1 is not routed (404)
  PASS DELETE /admin/audit-logs/1 is not routed (404)
SUMMARY: 23 passed, 0 failed
```

---

## Raw evidence captured during the run

### Item 2 — schema

```
$ docker exec cognita-db psql -U postgres -d cognita -c "\d chunk_embeddings"
                    Table "public.chunk_embeddings"
   Column   |            Type             | Nullable |             Default
------------+-----------------------------+----------+----------------------------------
 id         | bigint                      | not null | nextval('..._id_seq'::regclass)
 chunk_id   | bigint                      | not null |
 created_at | timestamp(0) without time zone |      |
 updated_at | timestamp(0) without time zone |      |
 embedding  | vector(1536)                |          |
Indexes:
    "chunk_embeddings_hnsw_idx" hnsw (embedding vector_cosine_ops)
Foreign-key constraints:
    "chunk_embeddings_chunk_id_foreign" FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE
```

### Item 5 — KT service

```
$ curl -s localhost:8011/health
{"status":"ok","engine":"bkt","dkt_available":false,"checkpoint":false,"bkt_available":true,"fit_timeout_s":10.0,"cache_entries":0}

$ curl -s -X POST localhost:8011/predict_mastery -H 'Content-Type: application/json' \
    -d '{"user_id":1,"history":[{"kc_id":1,"correct":1},{"kc_id":1,"correct":0},{"kc_id":2,"correct":1}]}'
{"mastery":[{"kc_id":1,"probability":0.6125},{"kc_id":2,"probability":0.2161}],"engine":"bkt"}     # 275 ms
# identical repeat: 18 ms
```

### Item 7 — DKT fallback

```
$ KT_ENGINE=dkt uvicorn main:app --port 8011
$ curl -s localhost:8011/health
{"status":"ok","engine":"bkt","dkt_available":false,"checkpoint":false,...}
$ curl -s -X POST localhost:8011/predict_mastery -d '{"user_id":1,"history":[...]}'
{"mastery":[{"kc_id":1,"probability":0.6125}],"engine":"bkt"}    # HTTP 200, no crash
```

### Item 9 — rank enforcement (live HTTP)

```
ADMIN  POST /api/admin/users/6/role  {"role":"owner"}  -> 403 "You cannot grant a role with a higher rank than your own."
ADMIN  POST /api/admin/users/1/ban   {"reason":...}    -> 403 "You cannot manage a user with an equal or higher role rank."
OWNER  POST /api/admin/users/6/role  {"role":"owner"}  -> 200 role=owner
OWNER  POST /api/admin/users/6/ban   {"reason":...}    -> 201 moderation_action_id=1
audit: [{"actor_id":1,"actor_role":"owner","action":"user.role_change","target_type":"user","target_id":6,
         "context":{"reason":"Second owner onboarding","previous_role":"student","new_role":"owner",...}},
        {"actor_id":1,"actor_role":"owner","action":"user.ban","target_type":"user","target_id":6,
         "context":{"reason":"Compromised owner account revoked","moderation_action_id":1,...}}]
```

### Item 10 — audit immutability

```
ADMIN  GET    /api/admin/audit-logs          -> 200, 1 row, actors = [2]
OWNER  GET    /api/admin/audit-logs          -> 200, 3 rows, actors = [1, 2]
OWNER  PUT    /api/admin/audit-logs/1        -> 404
OWNER  DELETE /api/admin/audit-logs/1        -> 404
tinker $log->update([...])                   -> LogicException: admin_audit_logs is append-only
```

---

## Test inventory (item 3, 106 tests)

| Suite | Tests |
| :--- | :--- |
| `Feature/Core/CourseGenerationTest` | 2 |
| `Feature/Core/QuizGenerationTest` | 2 |
| `Feature/Core/KnowledgeTracingFlowTest` | 3 |
| `Feature/Core/KtFallbackTest` | 3 |
| `Feature/Instructor/InstructorRoutesDisabledTest` | 3 |
| `Feature/Instructor/InstructorRoutesEnabledTest` | 3 |
| `Feature/Instructor/ClassScopingTest` (critical) | 6 |
| `Feature/Instructor/CohortAnalyticsShortCircuitTest` | 2 |
| `Feature/Admin/AdminPanelAccessTest` | 7 |
| `Feature/Admin/RoleHierarchyEnforcementTest` (critical) | 9 |
| `Feature/Admin/AuditLogCompletenessTest` (critical) | 6 |
| `Feature/Admin/SuspensionEnforcementTest` | 5 |
| `Feature/Admin/ReportWorkflowTest` | 5 |
| `Feature/Admin/ImpersonationTest` | 4 |
| `Feature/Admin/StaffInvitationTest` | 6 |
| `Feature/Admin/SystemSettingsTest` | 4 |
| `Feature/Shared/GamificationTest` | 3 |
| `Feature/Shared/ClassAssignmentTest` | 3 |
| `Unit/UserRoleTest` | 8 |
| `Unit/EnumCastsTest` | 7 |
| `Unit/BktEstimatorTest` | 4 |
| `Unit/AdminScopeServiceTest` | 7 |
| `Unit/ClassAccessServiceTest` | 4 |
| **Total** | **106 passing (368 assertions)** |

KT microservice: `13 passed` (`kt-service/test_service.py`).

---

## Phase 13 extension: staff console (Inertia + React)

Not part of the original backend brief; added on request after Phase 12 was signed off.
The console is a second presentation layer over the same services and policies; the
JSON API is unchanged and all 106 backend tests still pass.

### Verification

| Check | Result |
| :--- | :--- |
| `npm run build` (Vite 8 + Inertia + React 19 + Tailwind v4 + Wayfinder) | **PASS** (599+ modules, 480 kB JS / 47.7 kB CSS) |
| `npx tsc --noEmit` (strict TypeScript) | **PASS** (0 errors; `baseUrl` removed for TypeScript 7) |
| Backend regression suite after console work | **PASS** (106 tests / 368 assertions) |
| Console smoke, both flags OFF (`.dev/ui-smoke.sh`) | **14/14 PASS** |
| Console smoke, `FEATURE_INSTRUCTOR_PATH=true` | **19/19 PASS** |
| Instructor write paths (announcement, note, snapshot, assign course, assign lesson, invite) | **6/6 created their rows** |
| Console data scoping (foreign class / non-member student / missing class) | **403 / 403 / 404** |
| Student blocked from `/admin` and from `/instructor` | **403 / 403** |
| Moderator blocked from `/admin/settings` | **403** |
| `/instructor/*` with flag off | **404** (not mounted) |

### Smoke output (default flags)

```
PASS owner sign in (302 redirect)
PASS admin dashboard (/admin -> 200, Inertia Admin/Dashboard)
PASS admin users index (/admin/users -> 200, Inertia Admin/Users/Index)
PASS admin reports index (/admin/reports -> 200, Inertia Admin/Reports/Index)
PASS admin courses index (/admin/courses -> 200, Inertia Admin/Courses/Index)
PASS admin audit log (/admin/audit -> 200, Inertia Admin/AuditLog/Index)
PASS admin settings (owner) (/admin/settings -> 200, Inertia Admin/Settings/Index)
PASS admin invitations (/admin/invitations -> 200, Inertia Admin/Invitations/Index)
PASS moderator sign in
PASS moderator users index (/admin/users -> 200, Inertia Admin/Users/Index)
PASS moderator blocked from settings (403)
PASS student sign in
PASS student blocked from admin (403)
PASS instructor portal unmounted with flag off (404)
SUMMARY: 14 passed, 0 failed
```

With `FEATURE_INSTRUCTOR_PATH=true` the remaining five checks pass as well:
instructor sign-in, `/instructor`, `/instructor/classes`, `/instructor/classes/1`,
`/instructor/classes/1/students/5` (all 200 with the matching Inertia component), and a
student receives 403 on `/instructor`.

Reproduce:

```bash
cd cognita && npm install && npm run build
php artisan migrate:fresh --seed
php artisan serve --port=8125
../.dev/ui-smoke.sh http://127.0.0.1:8125
```
