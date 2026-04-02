<?php

namespace Database\Seeders;

use App\Models\Offer;
use Illuminate\Database\Seeder;

class OfferSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            [
                'slug' => 'candidature-dev',
                'title' => 'Développeur — Candidature',
                'type' => 'dev',
                'description' => "Rejoignez l'équipe technique.\n\n- Stack: Laravel + React\n- Missions: features produit, qualité, collaboration\n- Profil: rigoureux, autonome, curieux",
                'is_open' => true,
            ],
            [
                'slug' => 'candidature-designer',
                'title' => 'Designer — Candidature',
                'type' => 'designer',
                'description' => "Rejoignez l'équipe design.\n\n- UI/UX: parcours simples et efficaces\n- Design system: composants cohérents\n- Profil: sens du détail, empathie utilisateur",
                'is_open' => true,
            ],
        ];

        foreach ($defaults as $data) {
            Offer::query()->updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }
    }
}
