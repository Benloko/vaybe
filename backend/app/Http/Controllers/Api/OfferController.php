<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOfferRequest;
use App\Http\Requests\UpdateOfferRequest;
use App\Models\Offer;
use Illuminate\Http\JsonResponse;
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
}
