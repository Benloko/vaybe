<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfferType;
use App\Models\Offer;
use Illuminate\Http\Request;

class AdminOfferTypeController extends Controller
{
    public function index()
    {
        $types = OfferType::query()
            ->orderBy('label')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'min:2', 'max:50', 'regex:/^[a-z0-9_\-]+$/'],
            'label' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $key = trim((string) $data['key']);
        $label = trim((string) $data['label']);

        if (OfferType::query()->where('key', $key)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce type existe déjà.',
            ], 422);
        }

        $type = OfferType::create([
            'key' => $key,
            'label' => $label,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Type ajouté.',
            'data' => $type,
        ], 201);
    }

    public function update(Request $request, OfferType $offerType)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $offerType->label = trim((string) $data['label']);
        $offerType->save();

        return response()->json([
            'success' => true,
            'message' => 'Type mis à jour.',
            'data' => $offerType,
        ]);
    }

    public function destroy(OfferType $offerType)
    {
        $key = (string) ($offerType->key ?? '');
        $key = trim($key);

        if ($key !== '' && Offer::query()->where('type', $key)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer: ce type est utilisé par une ou plusieurs offres.',
            ], 422);
        }

        $offerType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Type supprimé.',
        ]);
    }
}
