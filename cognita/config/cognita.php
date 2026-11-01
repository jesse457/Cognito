<?php

declare(strict_types=1);
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\Lesson;

/*
|--------------------------------------------------------------------------
| Cognita application config
|--------------------------------------------------------------------------
*/

return [

    /*
    | Morph aliases used by `content_reports.reportable_type`. Values in the
    | database are these short aliases (course, forum_thread, forum_post,
    | lesson), never fully-qualified class names, per the Phase 4 schema.
    */
    'morph_map' => [
        'course' => Course::class,
        'forum_thread' => ForumThread::class,
        'forum_post' => ForumPost::class,
        'lesson' => Lesson::class,
    ],

    /*
    | Knowledge Tracing behaviour.
    */
    'kt' => [
        'http_timeout_seconds' => (int) env('KT_HTTP_TIMEOUT', 10),
        'default_history_limit' => (int) env('KT_HISTORY_LIMIT', 500),
    ],

    /*
    | Gamification tuning (XP awards are intentionally simple constants).
    */
    'gamification' => [
        'xp_per_correct_answer' => (int) env('XP_PER_CORRECT_ANSWER', 10),
        'xp_per_quiz_completion' => (int) env('XP_PER_QUIZ_COMPLETION', 50),
        'xp_per_level' => (int) env('XP_PER_LEVEL', 500),
    ],

    /*
    | RAG chunking.
    */
    'rag' => [
        'chunk_size' => (int) env('RAG_CHUNK_SIZE', 1200),
        'chunk_overlap' => (int) env('RAG_CHUNK_OVERLAP', 200),
        'embedding_dimensions' => (int) env('RAG_EMBEDDING_DIMENSIONS', 1536),
        'top_k' => (int) env('RAG_TOP_K', 8),
    ],

];
