<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationRole;
use App\Models\CandidateAccount;
use Illuminate\Http\JsonResponse;

class CandidateProfileController extends Controller
{
    public function showOrCreate(CandidateAccount $candidateAccount): JsonResponse
    {
        $email = mb_strtolower(trim((string) ($candidateAccount->email ?? '')));
        if ($email === '') {
            return response()->json([
                'success' => false,
                'message' => 'Email candidat manquant.',
            ], 422);
        }

        $draft = Application::query()
            ->with(['account', 'offer'])
            ->whereNull('offer_id')
            ->whereRaw('lower(email) = ?', [$email])
            ->orderByDesc('created_at')
            ->first();

        if (!$draft) {
            $fullName = trim((string) ($candidateAccount->full_name ?? ''));

            $defaultRoleKey = 'dev';
            try {
                $first = ApplicationRole::query()->orderBy('label')->first();
                if ($first?->key) {
                    $defaultRoleKey = (string) $first->key;
                }
            } catch (\Throwable $e) {
                // ignore: table peut ne pas exister pendant certaines phases de migration
            }

            $draft = Application::create([
                'nom' => $fullName !== '' ? $fullName : 'Mon profil',
                'email' => $email,
                'telephone' => $candidateAccount->phone,
                'ville' => $candidateAccount->city,
                'role' => $defaultRoleKey,
                'message' => 'Profil candidat',
                'portfolio' => null,
                'cv' => null,
                'score' => 0,
                'status' => 'draft',
                'offer_id' => null,
            ]);

            $draft->load(['account', 'offer']);
        }

        return response()->json([
            'success' => true,
            'data' => $draft,
        ]);
    }
}
