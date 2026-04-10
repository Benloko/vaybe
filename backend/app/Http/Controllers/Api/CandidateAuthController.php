<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginCandidateRequest;
use App\Http\Requests\RegisterCandidateRequest;
use App\Models\CandidateAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class CandidateAuthController extends Controller
{
    public function sendVerificationCode(Request $request): JsonResponse
    {
        $request->validate(
            ['email' => ['required', 'email', 'unique:candidate_accounts,email']],
            ['email.unique' => 'Cette adresse email est déjà utilisée. Connectez-vous plutôt.']
        );

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Stocker le code en cache pendant 15 minutes
        cache()->put('email_verify:' . $request->email, $code, now()->addMinutes(15));

        try {
            Mail::raw(
                "Bonjour,\n\nVotre code de vérification Vaybe est : {$code}\n\nCe code expire dans 15 minutes.",
                fn($m) => $m->to($request->email)->subject('Votre code de vérification Vaybe')
            );
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => "Impossible d'envoyer l'email."], 500);
        }

        return response()->json(['success' => true, 'message' => 'Code envoyé.']);
    }

    public function checkVerificationCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $stored = cache()->get('email_verify:' . $request->email);

        if (!$stored || $stored !== $request->code) {
            return response()->json(['success' => false, 'message' => 'Code invalide ou expiré.'], 422);
        }

        return response()->json(['success' => true, 'message' => 'Code valide.']);
    }

    public function register(RegisterCandidateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $account = CandidateAccount::create([
            'full_name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password_hash' => Hash::make($validated['password']),
            'email_verified_at' => now(),
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

    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $account = CandidateAccount::where('email', $request->email)->first();

        if (!$account || $account->email_verification_code !== $request->code) {
            return response()->json(['success' => false, 'message' => 'Code invalide.'], 422);
        }

        if ($account->email_verification_expires_at < now()) {
            return response()->json(['success' => false, 'message' => 'Code expiré.'], 422);
        }

        $account->update([
            'email_verified_at' => now(),
            'email_verification_code' => null,
            'email_verification_expires_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Email vérifié.',
            'data' => [
                'id' => $account->id,
                'full_name' => $account->full_name,
                'email' => $account->email,
                'phone' => $account->phone,
                'city' => $account->city,
            ],
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['identifier' => ['required', 'string']]);

        $identifier = trim($request->identifier);
        $account = CandidateAccount::where('email', $identifier)
            ->orWhere('phone', $identifier)
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Aucun compte trouvé avec ces informations.'], 404);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        cache()->put('reset_password:' . $account->email, $code, now()->addMinutes(15));

        try {
            Mail::raw(
                "Bonjour {$account->full_name},\n\nVotre code de réinitialisation Vaybe est : {$code}\n\nCe code expire dans 15 minutes.",
                fn($m) => $m->to($account->email)->subject('Réinitialisation de mot de passe Vaybe')
            );
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => "Impossible d'envoyer l'email."], 500);
        }

        return response()->json(['success' => true, 'message' => 'Code envoyé.', 'data' => ['email' => $account->email]]);
    }

    public function checkResetCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $stored = cache()->get('reset_password:' . $request->email);
        if (!$stored || $stored !== $request->code) {
            return response()->json(['success' => false, 'message' => 'Code invalide ou expiré.'], 422);
        }

        return response()->json(['success' => true, 'message' => 'Code valide.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $stored = cache()->get('reset_password:' . $request->email);
        if (!$stored || $stored !== $request->code) {
            return response()->json(['success' => false, 'message' => 'Code invalide ou expiré.'], 422);
        }

        $account = CandidateAccount::where('email', $request->email)->first();
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Compte introuvable.'], 404);
        }

        $account->update(['password_hash' => Hash::make($request->password)]);
        cache()->forget('reset_password:' . $request->email);

        return response()->json(['success' => true, 'message' => 'Mot de passe réinitialisé.']);
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
            return response()->json(['success' => false, 'message' => 'Identifiants invalides.'], 401);
        }

        if (!$account->email_verified_at) {
            return response()->json(['success' => false, 'message' => 'Veuillez vérifier votre email avant de vous connecter.'], 403);
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
