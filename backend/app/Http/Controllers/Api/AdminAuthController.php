<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminCredential;
use App\Models\AdminSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $expectedEmail = env('ADMIN_EMAIL', 'admin@admin.com');
        $expectedPassword = env('ADMIN_PASSWORD', 'admin');

        $credential = AdminCredential::query()->first();
        $emailToReturn = (string) $expectedEmail;

        if ($credential) {
            $emailOk = hash_equals((string) $credential->email, (string) $data['email']);
            $passwordOk = Hash::check((string) $data['password'], (string) $credential->password_hash);

            if (!$emailOk || !$passwordOk) {
                return response()->json(['message' => 'Identifiants admin invalides.'], 422);
            }

            $emailToReturn = (string) $credential->email;
        } else {
            if (!hash_equals((string) $expectedEmail, (string) $data['email']) ||
                !hash_equals((string) $expectedPassword, (string) $data['password'])) {
                return response()->json(['message' => 'Identifiants admin invalides.'], 422);
            }

            AdminCredential::query()->create([
                'email' => (string) $expectedEmail,
                'password_hash' => Hash::make((string) $expectedPassword),
            ]);
        }

        $rawToken = Str::random(64);
        $hash = hash('sha256', $rawToken);

        $expiresAt = now()->addHours((int) env('ADMIN_SESSION_HOURS', 12));

        AdminSession::query()->create([
            'token_hash' => $hash,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'data' => [
                'token' => $rawToken,
                'email' => $emailToReturn,
                'expires_at' => $expiresAt->toIso8601String(),
            ]
        ]);
    }
}
