<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('application_roles', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label', 80);
            $table->timestamps();
        });

        $now = now();
        DB::table('application_roles')->insert([
            ['key' => 'dev', 'label' => 'Développeur', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'designer', 'label' => 'Designer', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_roles');
    }
};
