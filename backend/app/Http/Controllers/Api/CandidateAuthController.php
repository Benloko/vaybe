<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginCandidateRequest;
use App\Http\Requests\RegisterCandidateRequest;
use App\Models\CandidateAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class CandidateAuthController extends Controller
{
    public function register(RegisterCandidateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $account = CandidateAccount::create([
            'full_name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password_hash' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Compte créé.',
            'data' => [
                'id' => $account->id,
                'full_name' => $account->full_name,
                'email' => $account->email,
                'phone' => $account->phone,
                'city' => $account->city,
            ],
        ], 201);
    }

    public function login(LoginCandidateRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $identifier = trim((string) $validated['identifier']);

        $account = CandidateAccount::query()
            ->where('email', $identifier)
            ->orWhere('phone', $identifier)
            ->first();

        if (!$account || !Hash::check($validated['password'], $account->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiants invalides.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie.',
            'data' => [
                'id' => $account->id,
                'full_name' => $account->full_name,
                'email' => $account->email,
                'phone' => $account->phone,
                'city' => $account->city,
            ],
        ]);
    }
}
