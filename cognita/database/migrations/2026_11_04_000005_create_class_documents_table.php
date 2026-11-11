<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('path');
            $table->unsignedInteger('pages')->default(1);
            $table->unsignedBigInteger('size')->default(0);
            $table->string('checksum', 64)->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'created_at']);
        });

        Schema::table('class_boards', function (Blueprint $table): void {
            $table->foreignId('document_id')->nullable()->after('title')
                ->constrained('class_documents')->nullOnDelete();
        });

        // Keep every PDF already attached to a class in its new library so the
        // upgrade itself does not make an existing board lose its document.
        foreach (DB::table('class_boards')->whereNotNull('document_path')->get() as $board) {
            $documentId = DB::table('class_documents')->insertGetId([
                'classroom_id' => $board->classroom_id,
                'uploaded_by' => null,
                'name' => $board->document_name ?: 'Document.pdf',
                'path' => $board->document_path,
                'pages' => max(1, (int) $board->document_pages),
                'size' => 0,
                'checksum' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('class_boards')->where('id', $board->id)->update(['document_id' => $documentId]);
        }
    }

    public function down(): void
    {
        Schema::table('class_boards', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('document_id');
        });

        Schema::dropIfExists('class_documents');
    }
};
