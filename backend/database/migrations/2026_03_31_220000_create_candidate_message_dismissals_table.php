<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('candidate_message_dismissals', function (Blueprint $table) {
            $table->id();
            $table->string('candidate_email');
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete();
            $table->foreignId('application_message_id')->constrained('application_messages')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['candidate_email', 'application_message_id']);
            $table->index(['candidate_email', 'application_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidate_message_dismissals');
    }
};
