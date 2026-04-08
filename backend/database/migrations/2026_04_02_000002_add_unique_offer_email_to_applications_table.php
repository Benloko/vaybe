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
        // Normalise les emails pour éviter des doublons "Case sensitive".
        try {
            DB::statement('UPDATE applications SET email = LOWER(email) WHERE email <> LOWER(email)');
        } catch (\Throwable $e) {
            // Si la DB ne supporte pas LOWER() ou que la table n'existe pas encore,
            // on laisse la migration échouer plus loin si nécessaire.
        }

        // Déduplique les candidatures existantes avant d'ajouter la contrainte.
        // Règle: on garde la candidature la plus "avancée" (approved > rejected > pending),
        // puis la plus récente.
        try {
            $groups = DB::table('applications')
                ->select('offer_id', 'email')
                ->whereNotNull('offer_id')
                ->whereNotNull('email')
                ->groupBy('offer_id', 'email')
                ->havingRaw('COUNT(*) > 1')
                ->get();

            foreach ($groups as $g) {
                $offerId = $g->offer_id;
                $email = $g->email;
                if ($offerId === null || $email === null) {
                    continue;
                }

                $rows = DB::table('applications')
                    ->where('offer_id', $offerId)
                    ->where('email', $email)
                    ->orderByRaw("CASE status WHEN 'approved' THEN 3 WHEN 'rejected' THEN 2 ELSE 1 END DESC")
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->get(['id']);

                if (($rows->count() ?? 0) <= 1) {
                    continue;
                }

                $keepId = $rows[0]->id ?? null;
                if (!$keepId) {
                    continue;
                }

                $deleteIds = [];
                foreach ($rows as $row) {
                    if (($row->id ?? null) && $row->id !== $keepId) {
                        $deleteIds[] = $row->id;
                    }
                }

                if (!empty($deleteIds)) {
                    DB::table('applications')->whereIn('id', $deleteIds)->delete();
                }
            }
        } catch (\Throwable $e) {
            // On laisse la migration échouer si quelque chose ne va pas: mieux vaut
            // une erreur explicite qu'une contrainte unique partiellement appliquée.
            throw $e;
        }

        Schema::table('applications', function (Blueprint $table) {
            $table->unique(['offer_id', 'email'], 'applications_offer_id_email_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropUnique('applications_offer_id_email_unique');
        });
    }
};
