<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminProfileController extends Controller
{
    public function show()
    {
        $credential = $this->resolveCredential();

        return response()->json([
            'success' => true,
            'data' => [
                'email' => $credential->email,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $credential = $this->resolveCredential();

        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255', 'unique:admin_credentials,email,' . $credential->id],
            'current_password' => ['required', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $nextEmail = array_key_exists('email', $data) ? (is_null($data['email']) ? null : trim((string) $data['email'])) : null;
        $nextPassword = array_key_exists('new_password', $data) ? (is_null($data['new_password']) ? null : (string) $data['new_password']) : null;

        if (($nextEmail === null || $nextEmail === '' || $nextEmail === $credential->email) && ($nextPassword === null || $nextPassword === '')) {
            return response()->json([
                'message' => 'Aucune modification.',
            ], 422);
        }

        if (!Hash::check((string) $data['current_password'], (string) $credential->password_hash)) {
            return response()->json([
                'message' => 'Mot de passe actuel incorrect.',
            ], 422);
        }

        if ($nextEmail !== null && $nextEmail !== '' && $nextEmail !== $credential->email) {
            $credential->email = $nextEmail;
        }

        if ($nextPassword !== null && $nextPassword !== '') {
            $credential->password_hash = Hash::make($nextPassword);
        }

        $credential->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil admin mis à jour.',
            'data' => [
                'email' => $credential->email,
            ],
        ]);
    }

    private function resolveCredential(): AdminCredential
    {
        $existing = AdminCredential::query()->first();
        if ($existing) return $existing;

        $expectedEmail = env('ADMIN_EMAIL', 'admin@admin.com');
        $expectedPassword = env('ADMIN_PASSWORD', 'admin');

        return AdminCredential::query()->create([
            'email' => (string) $expectedEmail,
            'password_hash' => Hash::make((string) $expectedPassword),
        ]);
    }
}
