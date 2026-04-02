<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('application_messages', function (Blueprint $table) {
            $table->string('kind', 20)->default('message')->after('sender');
            $table->index(['application_id', 'kind', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('application_messages', function (Blueprint $table) {
            $table->dropIndex(['application_id', 'kind', 'created_at']);
            $table->dropColumn('kind');
        });
    }
};
