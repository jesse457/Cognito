# Cognita — file tree with one-line purposes

Repo root: `/home/jesse/Cognito`. Laravel app lives in `cognita/`, the KT microservice in `kt-service/`.

```
.
├── docker-compose.yml                       Postgres+pgvector (and optional kt-service profile)
├── docker/db/init/01-vector.sql             CREATE EXTENSION vector on first container boot
├── README.md                                product/architecture/setup/API/role docs
├── ACCEPTANCE.md                            Phase 12 acceptance transcript (23/23 harness checks)
├── FILE_TREE.md                             this file
├── .dev/artisan                             wrapper running artisan/test/composer with a clean env
├── .dev/acceptance.sh                       reproducible Phase-12 harness (items 1,2,4,8,9,10)
├── kt-service/                              Python Knowledge-Tracing microservice
│   ├── main.py                              FastAPI app: /health + /predict_mastery, BKT/DKT with fallbacks
│   ├── requirements.txt                     pinned deps (pyBKT 1.4.3, numpy 1.26.4, sklearn 1.5.2, scipy<1.14)
│   ├── Dockerfile                           python:3.11-slim image, uvicorn on 8001
│   ├── test_service.py                      13 black-box tests (health, predict, dkt fallback, timeout)
│   ├── README.md                            contracts, env vars, latency, fallback semantics
│   ├── .gitignore                           excludes .venv, __pycache__, checkpoints
│   └── checkpoints/.gitkeep                 optional DKT checkpoint location (never committed)
└── cognita/                                 Laravel 13 application
    ├── .env.example                         every flag documented inline
    ├── phpunit.xml                          forces PostgreSQL cognita_test + flag defaults
    ├── bootstrap/app.php                    middleware aliases (role, role.min, active, admin.context), JSON errors
    ├── routes/api.php                       stack: student always, admin always, instructor/social conditional
    ├── routes/student.php                   student + auth surface
    ├── routes/admin.php                     28 admin-panel routes (group supplies auth/rank/admin.context)
    ├── routes/instructor.php                22 instructor routes (only mounted when flag is on)
    ├── routes/community.php                 7 forum routes (only mounted when flag is on)
    ├── routes/console.php                   scheduler: analytics (flag-gated), leaderboards, prune, expire
    ├── config/features.php                  instructor_path, social, kt_engine, kt_service_url, class size, threshold
    ├── config/cognita.php                   morph map, KT HTTP tuning, XP constants, RAG chunking defaults
    ├── config/ai.php                        laravel/ai provider config (OpenAI default)
    │
    ├── app/Ai/Agents/
    │   ├── CourseGenerationAgent.php        structured-output agent: course→modules→lessons tree
    │   └── QuizGenerationAgent.php          structured-output agent: grounded MCQ question set
    │
    ├── app/Enums/
    │   ├── UserRole.php                     role hierarchy with rank()/atLeast()/isStaff()
    │   ├── UserStatus.php                   active|suspended|banned
    │   ├── ContentType.php                  text|video|quiz
    │   ├── CourseStatus.php                 draft|published|archived|removed
    │   ├── ForumStatus.php                  open|locked|removed
    │   ├── PostStatus.php                   visible|hidden|removed
    │   ├── LeaderboardPeriod.php            weekly|all_time
    │   ├── KtEngine.php                     bkt|dkt with fromConfig() safety
    │   ├── ReportStatus.php                 open|in_review|resolved|dismissed
    │   ├── ReportReason.php                 spam|abuse|misinformation|off_topic|other
    │   ├── ModerationAction.php             warn|suspend|ban|unban|restore + auditAction()
    │   ├── ClassStatus.php                  active|archived
    │   └── EnrollmentStatus.php             active|removed
    │
    ├── app/Models/                          (31 models, fillable + enum/json casts + both-direction relations)
    │   ├── User.php                         identity, role/status, presence, all user relations
    │   ├── Course.php                       course tree root, instructor/creator/removal, reports morphMany
    │   ├── Module.php                       ordered course section
    │   ├── Lesson.php                       content unit, KC many-to-many, quiz payload holder
    │   ├── Enrollment.php                   unique user×course membership
    │   ├── PracticeSession.php              quiz/practice attempt
    │   ├── AnswerHistory.php                one answer row (json payload/answer) — table `answer_history`
    │   ├── KnowledgeComponent.php           concept node, lessons + mastery + answers
    │   ├── LessonKcMap.php                  lesson↔KC pivot — table `lesson_kc_map`
    │   ├── StudentKcMastery.php             per student×KC probability + engine — table `student_kc_mastery`
    │   ├── ParticipantProfile.php           XP, level, streak
    │   ├── LeaderboardEntry.php             unique course×user×period score/rank
    │   ├── Achievement.php                  slug + criteria json
    │   ├── UserAchievement.php              awarded achievement
    │   ├── ForumThread.php                  discussion thread + reports morphMany
    │   ├── ForumPost.php                    thread reply (one nesting level)
    │   ├── DocumentChunk.php                RAG source chunk
    │   ├── ChunkEmbedding.php               pgvector row + nearest() cosine search helper
    │   ├── PrivateClass.php                 instructor cohort, join code, capacity helpers
    │   ├── ClassEnrollment.php              student membership in a private class
    │   ├── ClassInvitation.php              emailed class invite
    │   ├── ClassCourseAssignment.php        course assigned to a class
    │   ├── StudentContentAssignment.php     lesson assigned to one student
    │   ├── Announcement.php                 class announcement
    │   ├── InstructorNote.php               author-private note (never student-visible)
    │   ├── CohortAnalyticsSnapshot.php      daily class metrics json
    │   ├── AdminAuditLog.php                append-only audit row (update/delete throw)
    │   ├── ContentReport.php                report with morphTo reportable + open()/awaitingAction()
    │   ├── ModerationAction.php             warn/suspend/ban/unban/restore record
    │   ├── SystemSetting.php                owner-only key/json-value settings row
    │   ├── StaffInvitation.php              invite token + expiry + accepted_at
    │   └── Concerns/LogsAdminActivity.php   audits admin-context create/update/delete via AdminContext
    │
    ├── app/Support/AdminContext.php         request-scoped staff actor + audit suppression switch
    │
    ├── app/Policies/                        (11 policies; all flag-aware and rank-based)
    │   ├── UserPolicy.php                   view/warn/suspend (mod+), ban/unban/role/impersonate (admin+), rank checks
    │   ├── StudentPolicy.php                instructor→student scope = active member of an active class
    │   ├── CoursePolicy.php                 update degrades to admin-only when instructor flag is off
    │   ├── PrivateClassPolicy.php           ownership or admin
    │   ├── InstructorNotePolicy.php         authoring instructor only
    │   ├── ContentReportPolicy.php          moderator+ actions, any user may create
    │   ├── SystemSettingPolicy.php          owner only
    │   ├── StaffInvitationPolicy.php        owner→admin|moderator, admin→moderator
    │   ├── AdminAuditLogPolicy.php          admin+; owner all rows, admin own rows
    │   ├── ForumThreadPolicy.php            author edit; moderator lock/remove
    │   └── ForumPostPolicy.php              author edit; moderator hide/remove
    │
    ├── app/Services/                        (25 services; controllers stay thin)
    │   ├── AuditLogService.php              the single writer of admin_audit_logs (never updates/deletes)
    │   ├── AdminScopeService.php            rank/scope boundary for every admin action + audit row scoping
    │   ├── UserManagementService.php        warn/suspend/ban/unban/changeRole — transactional with audit
    │   ├── ModerationService.php            course remove/restore, thread lock/remove, post hide/remove
    │   ├── ReportService.php                listOpen/resolve/dismiss/assignToSelf/bulkResolve
    │   ├── SystemSettingService.php         owner-only get/set/all/reset + 60s cache + invalidation
    │   ├── StaffInvitationService.php       invite/accept/revoke with rank rules and queued mail
    │   ├── ImpersonationService.php         15-minute claimed Sanctum token + start/stop audits
    │   ├── ClassAccessService.php           instructor→class/student boundary; flag-off short-circuit
    │   ├── ClassDashboardService.php        per-portal and per-class KPIs
    │   ├── StudentProgressService.php       per-student mastery drill-down (reads student_kc_mastery)
    │   ├── CohortAnalyticsService.php       student×KC heatmap; no-op with zero queries when flag off
    │   ├── AtRiskDetectionService.php       below-threshold students; flag-aware
    │   ├── ContentAssignmentService.php     course/lesson assignment + auto enrollments + capacity caps
    │   ├── AnnouncementService.php          class announcements → database notifications
    │   ├── ClassBriefingAgent.php           AI briefing with deterministic rule-based fallback
    │   ├── RagIngestionService.php          PDF/DOCX/TXT extraction → chunking → queued embeddings + retrieval
    │   ├── CourseGenerationService.php      chunk set → persisted course/modules/lessons/KCs
    │   ├── QuizGenerationService.php        grounded structured questions persisted on the quiz lesson
    │   ├── KnowledgeTracingService.php      queues mastery work; reads KT_ENGINE from config only
    │   ├── AdaptiveContentService.php       weak KCs → remediation targets + lesson prioritisation
    │   ├── GamificationService.php          XP/level/streak/leaderboard/achievements
    │   ├── PracticeSessionService.php       start/answer/complete with server-side correctness + events
    │   └── KnowledgeTracing/{KtClient,BktEstimator}.php  HTTP client + local BKT fallback estimator
    │
    ├── app/Jobs/
    │   ├── UpdateStudentMastery.php         queued KT call, BKT fallback, never rethrows, writes mastery
    │   ├── GenerateEmbeddingsJob.php        embeds a chunk into chunk_embeddings (retry/backoff)
    │   ├── GenerateCourseJob.php            queued course generation
    │   ├── GenerateQuizJob.php              queued quiz generation
    │   ├── ComputeCohortAnalyticsJob.php    nightly snapshots; returns before any query when flag off
    │   ├── SendStaffInvitationEmail.php     queued invitation mail
    │   ├── SendModerationNotification.php   queued moderation notice
    │   └── PruneOldAuditLogsJob.php         retention pruning via query builder (model blocks deletes)
    │
    ├── app/Events/                          AnswerSubmitted, QuizCompleted, MasteryDropped, ContentReported,
    │                                        ModerationActionTaken, UserRoleChanged, ReportResolved
    ├── app/Listeners/                       RecordAnswerHistory, AwardGamificationOnQuizCompletion,
    │                                        TriggerAdaptiveRemediationOnQuizCompletion, FlagAtRiskStudentOnMasteryDrop,
    │                                        NotifyModeratorsOfContentReport, NotifyTargetOfModerationAction,
    │                                        NotifyTargetOfRoleChange, NotifyReporterOfResolution
    ├── app/Notifications/                   ClassAnnouncement, ContentReported, Moderation, ReportResolved,
    │                                        StaffInvitation, UserRoleChanged
    ├── app/Console/Commands/
    │   ├── ExpireSuspensions.php            cognita:expire-suspensions (audited, owner as automatic actor)
    │   └── RebuildLeaderboards.php          cognita:rebuild-leaderboards
    │
    ├── app/Http/Middleware/
    │   ├── EnsureUserHasRole.php            `role:admin,owner` exact-role gate
    │   ├── EnsureUserHasMinimumRank.php     `role.min:moderator` rank gate
    │   ├── EnsureUserIsActive.php           banned always blocked; suspended blocked except /account + /logout
    │   └── BindAdminContext.php             binds staff actor + request meta for auditing
    │
    ├── app/Http/Controllers/Admin/          Dashboard, AdminUser, Impersonation, AdminReport, CourseModeration,
    │                                        ForumModeration, AuditLog, SystemSetting, StaffInvitation (9)
    ├── app/Http/Controllers/Instructor/     Dashboard, Class, Student, Note, Analytics, Announcement,
    │                                        Assignment, Invitation, Briefing (9)
    ├── app/Http/Controllers/Student/        Auth, Account, Course, Enrollment, Lesson, PracticeSession,
    │                                        Adaptive, Gamification, Notification, Report (10)
    ├── app/Http/Controllers/Auth/           LoginController (session sign-in), LogoutController
    ├── app/Http/Controllers/Panel/          console (Inertia) controllers
    │   ├── HomeController.php               role-based landing; students see the API-only notice
    │   ├── Admin/                           Dashboard, User, UserAction, Report, Course, Audit, Setting, Invitation
    │   └── Instructor/                      Dashboard, Class, Student, Announcement, Assignment, Note,
    │                                        Analytics (snapshot), Invitation
    ├── app/Http/Middleware/HandleInertiaRequests.php   shares actor, flash, panel, feature flags
    ├── app/Http/Controllers/Community/      Thread, Post (2)
    ├── app/Http/Requests/                   Admin (12), Instructor (7), Student (6), Community (4) form requests
    ├── app/Http/Resources/                  Admin UserResource (redaction), Instructor (8), Student (2), Community (3)
    │
    ├── resources/views/app.blade.php         Inertia root template (@vite app.tsx, fonts, head)
    ├── resources/css/app.css                 console design system (tokens + component layer)
    ├── resources/js/app.tsx                  Inertia client bootstrap + layout resolution
    ├── resources/js/layouts/AppLayout.tsx    sidebar, topbar, actor menu, environment panel
    ├── resources/js/components/ui/           Button, Card, Badge, Stat, Meter, Table, Field, PageHeader,
    │                                        Flash, EmptyState, Pagination
    ├── resources/js/pages/                   Inertia page components
    │   ├── Auth/SignIn.tsx                   staff sign-in
    │   ├── Home.tsx                          "no staff surface" page for students
    │   ├── Admin/                            Dashboard, Users/Index, Users/Show, Reports/Index, Reports/Show,
    │   │                                     Courses/Index, AuditLog/Index, Settings/Index, Invitations/Index
    │   └── Instructor/                       Dashboard, Classes/Index, Classes/Show, Students/Show
    ├── resources/js/lib/utils.ts             cn(), date + percentage formatters
    ├── resources/js/lib/instructorRoutes.ts  typed console URLs for the conditionally mounted portal
    ├── resources/js/routes|actions|wayfinder Wayfinder-generated typed routes (admin panel + API)
    ├── routes/web.php                        console entry, auth, conditional instructor mount
    ├── routes/web-admin.php                  admin console routes (panel.admin.*)
    ├── routes/web-instructor.php             instructor console routes (panel.instructor.*)
    ├── vite.config.ts                        Inertia + React + Tailwind v4 + Wayfinder + self-hosted fonts
    ├── tsconfig.json                         strict TS, @/* path alias
    ├── database/migrations/                 38 migrations (see README §8): vector extension, notifications,
    │                                        users extension, then Phase 4.1–4.8 with audit table last
    ├── database/factories/                  25 factories matching every model used by tests/seeders
    ├── database/seeders/                    DatabaseSeeder + User, Course, Enrollment, KnowledgeTracing,
    │                                        PrivateClass, Achievement, SystemSetting, ContentReport (idempotent)
    │
    └── tests/
        ├── TestCase.php                     base case (flags default off)
        ├── InstructorEnabledTestCase.php    boots the app with FEATURE_INSTRUCTOR_PATH=true
        ├── SocialEnabledTestCase.php        boots the app with FEATURE_SOCIAL=true
        ├── Feature/Core/                    CourseGeneration, QuizGeneration, KnowledgeTracingFlow, KtFallback
        ├── Feature/Instructor/              RoutesDisabled, RoutesEnabled, ClassScoping, CohortAnalyticsShortCircuit
        ├── Feature/Admin/                   PanelAccess, RoleHierarchy, AuditLogCompleteness, SuspensionEnforcement,
        │                                    ReportWorkflow, Impersonation, StaffInvitation, SystemSettings
        ├── Feature/Shared/                  Gamification, ClassAssignment
        └── Unit/                            UserRole, EnumCasts, BktEstimator, AdminScopeService, ClassAccessService
```

**Counts:** 194 PHP files under `app/`, 38 migrations, 25 factories, 9 seeders, 23 test classes (106 tests),
11 policies, 25 services, 31 controllers, 8 jobs, 8 listeners, 7 events, 6 notifications, 13 enums, 31 models,
plus the 7-file Python KT service.
