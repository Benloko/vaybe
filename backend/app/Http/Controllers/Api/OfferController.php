<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOfferRequest;
use App\Http\Requests\UpdateOfferRequest;
use App\Models\Application;
use App\Models\Offer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OfferController extends Controller
{
    public function index(): JsonResponse
    {
        $offers = Offer::query()
            ->orderByDesc('is_open')
            ->orderBy('title')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $offers,
        ]);
    }

    public function show(Offer $offer): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $offer,
        ]);
    }

    public function store(StoreOfferRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $baseSlug = Str::slug($validated['title']);
        $slug = $baseSlug !== '' ? $baseSlug : Str::random(8);
        $candidate = $slug;
        $i = 2;

        while (Offer::query()->where('slug', $candidate)->exists()) {
            $candidate = $slug . '-' . $i;
            $i += 1;
        }

        $offer = Offer::create([
            'slug' => $candidate,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'is_open' => array_key_exists('is_open', $validated) ? (bool) $validated['is_open'] : true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Offre créée.',
            'data' => $offer,
        ], 201);
    }

    public function update(UpdateOfferRequest $request, Offer $offer): JsonResponse
    {
        $validated = $request->validated();

        $offer->fill($validated);
        $offer->save();

        return response()->json([
            'success' => true,
            'message' => 'Offre mise à jour.',
            'data' => $offer,
        ]);
    }

    public function deletionCheck(Offer $offer): JsonResponse
    {
        $base = Application::query()->where('offer_id', $offer->id);

        $total = (clone $base)->count();
        $pending = (clone $base)->where('status', 'pending')->count();
        $approved = (clone $base)->where('status', 'approved')->count();
        $rejected = (clone $base)->where('status', 'rejected')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'offer_id' => $offer->id,
                'applications_total' => $total,
                'applications_pending' => $pending,
                'applications_approved' => $approved,
                'applications_rejected' => $rejected,
                'has_linked_profiles' => $total > 0,
                'needs_force_delete' => $total > 0,
            ],
        ]);
    }

    public function destroy(Request $request, Offer $offer): JsonResponse
    {
        $force = $request->boolean('force');

        $applicationsQuery = Application::query()->where('offer_id', $offer->id);
        $total = (clone $applicationsQuery)->count();
        $approved = (clone $applicationsQuery)->where('status', 'approved')->count();

        if ($total > 0 && !$force) {
            return response()->json([
                'success' => false,
                'message' => 'Cette offre a des profils/candidatures liés. Confirme la suppression forcée.',
                'data' => [
                    'offer_id' => $offer->id,
                    'applications_total' => $total,
                    'applications_approved' => $approved,
                    'needs_force_delete' => true,
                ],
            ], 409);
        }

        DB::transaction(function () use ($offer) {
            // IMPORTANT: l'FK applications.offer_id est en nullOnDelete().
            // Donc on supprime explicitement les candidatures liées avant de supprimer l'offre.
            Application::query()->where('offer_id', $offer->id)->delete();
            $offer->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Offre supprimée.',
        ]);
    }
}
