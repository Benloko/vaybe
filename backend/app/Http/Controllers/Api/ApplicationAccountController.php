<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmApplicationAccountRequest;
use App\Http\Requests\InitApplicationAccountRequest;
use App\Models\Application;
use App\Models\ApplicationAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class ApplicationAccountController extends Controller
{
    public function show(Application $application): JsonResponse
    {
        $account = $application->account;

        return response()->json([
            'data' => $account ? $this->serializeAccount($account) : null,
        ]);
    }

    public function init(InitApplicationAccountRequest $request, Application $application): JsonResponse
    {
        $validated = $request->validated();
        $channel = $validated['channel'];
        $value = trim($validated['value']);

        $account = $application->account;
        if (!$account) {
            $account = new ApplicationAccount();
            $account->application_id = $application->id;
        }

        if ($channel === 'email') {
            $account->email = $value;
        } else {
            $account->phone = $value;
        }

        $account->password_hash = Hash::make($validated['password']);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $account->verification_code = $code;
        $account->verification_sent_at = Carbon::now();
        $account->verified_at = null;
        $account->save();

        $payload = [
            'data' => [
                'verification_required' => true,
                'channel' => $channel,
                'sent_at' => $account->verification_sent_at?->toISOString(),
                'target' => $this->maskValue($channel, $value),
            ],
        ];

        if (app()->environment(['local', 'testing'])) {
            $payload['data']['dev_code'] = $code;
        }

        return response()->json($payload);
    }

    public function confirm(ConfirmApplicationAccountRequest $request, Application $application): JsonResponse
    {
        $validated = $request->validated();
        $code = trim((string) $validated['code']);

        $account = $application->account;
        if (!$account || !$account->verification_code) {
            return response()->json([
                'message' => 'Aucune validation en cours pour ce profil.',
            ], 400);
        }

        if (!hash_equals((string) $account->verification_code, $code)) {
            return response()->json([
                'message' => 'Code invalide.',
            ], 422);
        }

        $account->verified_at = Carbon::now();
        $account->verification_code = null;
        $account->save();

        return response()->json([
            'data' => $this->serializeAccount($account),
        ]);
    }

    private function serializeAccount(ApplicationAccount $account): array
    {
        return [
            'email' => $account->email,
            'phone' => $account->phone,
            'verified_at' => $account->verified_at?->toISOString(),
        ];
    }

    private function maskValue(string $channel, string $value): string
    {
        if ($channel === 'email') {
            $parts = explode('@', $value);
            if (count($parts) !== 2) return $value;
            $name = $parts[0];
            $domain = $parts[1];
            $prefix = mb_substr($name, 0, 1);
            return $prefix . str_repeat('*', max(1, mb_strlen($name) - 1)) . '@' . $domain;
        }

        // phone
        $digits = preg_replace('/\D+/', '', $value) ?? '';
        if (strlen($digits) <= 4) return $value;
        $last4 = substr($digits, -4);
        return '****' . $last4;
    }
}
