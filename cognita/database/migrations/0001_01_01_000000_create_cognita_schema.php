<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Support\MediaDisk;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The whole Cognita schema, written once.
 *
 * Cognita is a new system, not an update of an older one. There is no earlier
 * shape to carry data over from, so this file builds the finished schema from
 * nothing: every table, every column and every key the product uses, in one
 * place, with no follow-up migrations and no data being moved between shapes.
 *
 * The install path is therefore always the same — `migrate` on an empty
 * database — and there is never a question of what a half-updated database
 * looks like.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->users();
        $this->courses();
        $this->curriculum();
        $this->courseMaterials();
        $this->classrooms();
        $this->enrollments();
        $this->classDocuments();
        $this->classBoards();
        $this->callSessions();
        $this->sessionMaterials();
        $this->attendanceRecords();
        $this->groups();
        $this->questions();
        $this->polls();
        $this->callSeats();
        $this->postMedia();
        $this->postEmbeddings();
    }

    public function down(): void
    {
        Schema::dropIfExists('post_embeddings');
        Schema::dropIfExists('post_media');
        Schema::dropIfExists('call_seats');
        Schema::dropIfExists('poll_responses');
        Schema::dropIfExists('poll_options');
        Schema::dropIfExists('polls');
        Schema::dropIfExists('answer_votes');
        Schema::dropIfExists('question_votes');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('group_members');
        Schema::dropIfExists('groups');
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('session_materials');
        Schema::dropIfExists('call_sessions');
        Schema::dropIfExists('class_documents');
        Schema::dropIfExists('class_boards');
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('classrooms');
        Schema::dropIfExists('course_materials');
        Schema::dropIfExists('lesson_progress');
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }

    /** The people who use Cognito, and the sessions they are signed in with. */
    private function users(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->string('role')->default(UserRole::Student->value)->index();
            $table->string('status', 16)->default('active')->index();
            $table->timestamps();
        });

        Schema::create('sessions', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /** A course a teacher owns; the classes hang off it. */
    private function courses(): void
    {
        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 16)->default('published')->index();
            $table->boolean('is_paid')->default(false)->index();
            $table->unsignedInteger('price_cents')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('payment_url')->nullable();
            $table->text('payment_instructions')->nullable();
            $table->timestamps();
        });
    }

    /** Sections and lessons: the self-paced part of a course. */
    private function curriculum(): void
    {
        Schema::create('sections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['course_id', 'position']);
        });

        Schema::create('lessons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->string('title');
            $table->string('type', 16)->default('article');
            $table->string('status', 16)->default('published')->index();
            $table->longText('content')->nullable();
            $table->string('video_url')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['section_id', 'position']);
        });

        Schema::create('lesson_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('status', 16)->default('not_started')->index();
            $table->unsignedInteger('watched_seconds')->default(0);
            $table->timestamp('last_viewed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'lesson_id']);
        });
    }

    /** Files attached to one lesson; the course id is kept for scoped access. */
    private function courseMaterials(): void
    {
        Schema::create('course_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('path');
            $table->string('disk', 32)->default(MediaDisk::name());
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();

            $table->index(['lesson_id', 'created_at']);
            $table->index(['course_id', 'created_at']);
        });
    }

    /** A class: one teacher, a join code and the students inside it. */
    private function classrooms(): void
    {
        Schema::create('classrooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->string('name');
            $table->string('join_code', 12)->unique();
            $table->timestamps();
        });
    }

    /** A student's membership of one class. */
    private function enrollments(): void
    {
        Schema::create('enrollments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            $table->string('payment_status', 16)->default('free')->index();
            $table->unsignedInteger('amount_paid_cents')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference')->nullable();
            $table->timestamps();

            $table->unique(['classroom_id', 'student_id']);
        });
    }

    /**
     * The PDFs a class keeps.
     *
     * The file itself lives on the media disk; this row is its name, its size
     * and where the bytes are.
     */
    private function classDocuments(): void
    {
        Schema::create('class_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('disk', 32)->default(MediaDisk::name());
            $table->unsignedInteger('pages')->default(1);
            $table->unsignedBigInteger('size')->default(0);
            $table->string('checksum', 64)->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'created_at']);
        });
    }

    /**
     * The board a class shows.
     *
     * The board points at the PDF on it and remembers the page; ink is never
     * written down, so there is nowhere here for a stroke to land.
     */
    private function classBoards(): void
    {
        Schema::create('class_boards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->unique()->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('class_documents')->nullOnDelete();
            $table->string('surface')->default('canvas');
            $table->string('title')->nullable();
            $table->unsignedInteger('page')->default(1);
            $table->timestamps();
        });
    }

    /** A room the teacher opened: a time, a token and who opened it. */
    private function callSessions(): void
    {
        Schema::create('call_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->foreignId('lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('status', 16)->default('live');
            $table->string('token', 32)->unique();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_seen_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'ended_at']);
            $table->index(['classroom_id', 'status']);
            $table->index(['course_id', 'starts_at']);
        });
    }

    /**
     * The PDFs the instructor attached to one session.
     *
     * A document lives in the class library; this pivot is what says which
     * lesson it belongs to, so a student can download it before the room opens.
     */
    private function sessionMaterials(): void
    {
        Schema::create('session_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('call_session_id')->constrained('call_sessions')->cascadeOnDelete();
            $table->foreignId('class_document_id')->constrained('class_documents')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['call_session_id', 'class_document_id']);
        });
    }

    /** Who was in which room, for how long. */
    private function attendanceRecords(): void
    {
        Schema::create('attendance_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('call_session_id')->nullable()->constrained('call_sessions')->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('attended_on');
            $table->timestamp('joined_at');
            $table->timestamp('last_seen_at');
            $table->timestamp('left_at')->nullable();
            $table->unsignedInteger('present_seconds')->default(0);
            $table->timestamps();

            $table->index(['classroom_id', 'attended_on']);
            $table->index(['user_id', 'attended_on']);
            $table->unique(['call_session_id', 'user_id']);
        });
    }

    /** Learner-made groups: the only place questions belong now. */
    private function groups(): void
    {
        Schema::create('groups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['name', 'created_at']);
        });

        Schema::create('group_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->unique(['group_id', 'user_id']);
        });
    }

    /** Community posts: a group question, or a general post for everyone. */
    private function questions(): void
    {
        Schema::create('questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->nullable()->constrained('groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('body');
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index(['group_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_accepted')->default(false);
            $table->timestamps();

            $table->index(['question_id', 'is_accepted']);
        });

        Schema::create('question_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('value');
            $table->timestamps();

            $table->unique(['question_id', 'user_id']);
        });

        Schema::create('answer_votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('answer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('value');
            $table->timestamps();

            $table->unique(['answer_id', 'user_id']);
        });
    }

    /** Live polls opened in a room. */
    private function polls(): void
    {
        Schema::create('polls', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('call_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('question', 240);
            $table->timestamp('ends_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['call_session_id', 'id']);
            $table->index(['classroom_id', 'created_at']);
        });

        Schema::create('poll_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_id')->constrained()->cascadeOnDelete();
            $table->string('label', 120);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['poll_id', 'position']);
        });

        Schema::create('poll_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('poll_option_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->timestamps();

            $table->unique(['poll_id', 'user_id']);
        });
    }

    /** Who is in a room right now: one seat per person per class. */
    private function callSeats(): void
    {
        Schema::create('call_seats', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('session_id', 64);
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique(['classroom_id', 'user_id']);
            $table->index('last_seen_at');
        });
    }

    /** Photos attached to a question or an answer. */
    private function postMedia(): void
    {
        Schema::create('post_media', function (Blueprint $table): void {
            $table->id();
            $table->morphs('mediable');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('disk', 32)->default(MediaDisk::name());
            $table->string('mime', 100);
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });
    }

    /** The search vectors that make the community board findable by meaning. */
    private function postEmbeddings(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        $dimensions = max(1, (int) config('embeddings.dimensions', 768));

        Schema::create('post_embeddings', function (Blueprint $table) use ($dimensions): void {
            $table->id();
            $table->morphs('embeddable');
            $table->text('content');
            $table->vector('embedding', $dimensions);
            $table->timestamps();

            $table->unique(['embeddable_type', 'embeddable_id']);
        });

        // Cosine distance is the right default for text embeddings: direction
        // matters, magnitude does not. HNSW keeps the community search fast as
        // the board grows without needing a training pass.
        DB::statement('CREATE INDEX post_embeddings_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops)');
    }
};
