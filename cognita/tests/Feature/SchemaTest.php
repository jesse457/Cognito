<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Cognita is a new system, not an update of an older one.
 *
 * These tests are the rule in executable form: the schema is written by a
 * single migration, and no table carries a column from a shape the product
 * does not have any more.
 */
class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_whole_schema_is_written_by_one_migration(): void
    {
        $files = glob(database_path('migrations/*.php'));

        $this->assertCount(
            1,
            $files,
            'Cognito is a new system: there is one migration, and no update migrations after it.',
        );

    }

    public function test_the_schema_has_no_column_from_an_earlier_shape(): void
    {
        // Ink was never kept, and the pen belongs to one lesson, not to a row.
        $this->assertFalse(Schema::hasColumn('class_boards', 'strokes'));
        $this->assertFalse(Schema::hasColumn('call_sessions', 'strokes'));
        $this->assertFalse(Schema::hasColumn('class_boards', 'students_can_annotate'));
        $this->assertFalse(Schema::hasColumn('enrollments', 'can_draw'));

        // The PDF lives in the class library; the board only points at it.
        $this->assertFalse(Schema::hasColumn('class_boards', 'document_path'));
        $this->assertFalse(Schema::hasColumn('class_boards', 'document_name'));
        $this->assertFalse(Schema::hasColumn('class_boards', 'document_pages'));

        $this->assertTrue(Schema::hasColumn('class_boards', 'document_id'));
        $this->assertTrue(Schema::hasColumn('class_documents', 'pages'));
    }

    public function test_every_table_of_the_product_is_created(): void
    {
        foreach ([
            'users',
            'sessions',
            'courses',
            'classrooms',
            'enrollments',
            'class_boards',
            'class_documents',
            'call_sessions',
            'attendance_records',
            'groups',
            'group_members',
            'questions',
            'answers',
            'question_votes',
            'answer_votes',
            'polls',
            'poll_options',
            'poll_responses',
            'call_seats',
            'post_media',
            'post_embeddings',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "The table `{$table}` is missing.");
        }
    }
}
