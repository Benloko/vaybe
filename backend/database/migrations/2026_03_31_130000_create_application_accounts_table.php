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
        Schema::create('application_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete()->unique();

            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('password_hash')->nullable();

            $table->string('verification_code', 10)->nullable();
            $table->timestamp('verification_sent_at')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_accounts');
    }
};
