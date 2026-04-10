<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCandidateAccountRequest;
use App\Models\CandidateAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class CandidateAccountController extends Controller
{
    public function update(UpdateCandidateAccountRequest $request, CandidateAccount $candidateAccount): JsonResponse
    {
        $validated = $request->validated();

        $candidateAccount->update([
            'full_name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'city' => $validated['city'] ?? null,
            ...( isset($validated['password']) ? ['password_hash' => Hash::make($validated['password'])] : [] ),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour.',
            'data' => [
                'id' => $candidateAccount->id,
                'full_name' => $candidateAccount->full_name,
                'email' => $candidateAccount->email,
                'phone' => $candidateAccount->phone,
                'city' => $candidateAccount->city,
            ],
        ]);
    }
}
