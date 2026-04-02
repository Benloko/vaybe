<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Offer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationReapplyTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_blocks_duplicate_active_application_for_same_offer_and_email(): void
    {
        $offer = Offer::create([
            'slug' => 'dev-test',
            'title' => 'Dev Test',
            'type' => 'dev',
            'description' => 'Test',
            'is_open' => true,
        ]);

        $payload = [
            'offer_id' => $offer->id,
            'nom' => 'Paul',
            'email' => 'paul@example.com',
            'telephone' => '0600000000',
            'ville' => 'Paris',
            'role' => 'dev',
            'message' => 'Je suis très motivé et passionné par ce poste.',
            'portfolio' => null,
            'cv' => null,
        ];

        $first = $this->postJson('/api/applications', $payload);
        $first->assertStatus(201);

        $duplicate = $this->postJson('/api/applications', $payload);
        $duplicate->assertStatus(409);

        $duplicate->assertJson([
            'success' => false,
        ]);
    }

    public function test_it_allows_reapply_after_rejected_application(): void
    {
        $offer = Offer::create([
            'slug' => 'dev-test-2',
            'title' => 'Dev Test 2',
            'type' => 'dev',
            'description' => 'Test',
            'is_open' => true,
        ]);

        $payload = [
            'offer_id' => $offer->id,
            'nom' => 'Paul',
            'email' => 'PAUL@example.com',
            'telephone' => '0600000000',
            'ville' => 'Paris',
            'role' => 'dev',
            'message' => 'Je suis très motivé et passionné par ce poste.',
            'portfolio' => null,
            'cv' => null,
        ];

        $first = $this->postJson('/api/applications', $payload);
        $first->assertStatus(201);

        $firstId = $first->json('data.id');
        $this->assertNotNull($firstId);

        $app = Application::query()->findOrFail($firstId);
        $app->status = 'rejected';
        $app->save();

        $second = $this->postJson('/api/applications', $payload);
        $second->assertStatus(201);

        $this->assertNotEquals($firstId, $second->json('data.id'));
    }
}
