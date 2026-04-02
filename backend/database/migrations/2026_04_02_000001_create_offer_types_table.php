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
        Schema::create('offer_types', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label', 80);
            $table->timestamps();
        });

        $now = now();
        DB::table('offer_types')->insert([
            ['key' => 'dev', 'label' => 'Dev', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'designer', 'label' => 'Designer', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'other', 'label' => 'Autre', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offer_types');
    }
};
