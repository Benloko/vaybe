<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationMessage;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function send(Request $request)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:1'],
            'scope' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'application_id' => ['nullable', 'integer', 'min:1'],
            'offer_id' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected'],
        ]);

        $body = trim((string) $data['body']);
        $scope = trim((string) $data['scope']);

        $appsQuery = Application::query();

        if ($scope === 'all_active') {
            $appsQuery->where('status', '!=', 'rejected');
        } elseif ($scope === 'status') {
            $status = (string) ($data['status'] ?? '');
            if ($status === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Statut manquant.',
                ], 422);
            }
            $appsQuery->where('status', $status);
        } elseif ($scope === 'offer') {
            $offerId = (int) ($data['offer_id'] ?? 0);
            if ($offerId <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Offre manquante.',
                ], 422);
            }
            $appsQuery->where('offer_id', $offerId);
        } elseif ($scope === 'offer_status') {
            $offerId = (int) ($data['offer_id'] ?? 0);
            $status = (string) ($data['status'] ?? '');
            if ($offerId <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Offre manquante.',
                ], 422);
            }
            if ($status === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Statut manquant.',
                ], 422);
            }
            $appsQuery->where('offer_id', $offerId)->where('status', $status);
        } elseif ($scope === 'email') {
            $email = mb_strtolower(trim((string) ($data['email'] ?? '')));
            if ($email === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Email manquant.',
                ], 422);
            }
            $appsQuery->whereRaw('lower(email) = ?', [$email]);
        } elseif ($scope === 'application') {
            $applicationId = (int) ($data['application_id'] ?? 0);
            if ($applicationId <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Candidature manquante.',
                ], 422);
            }
            $appsQuery->where('id', $applicationId);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Scope invalide.',
            ], 422);
        }

        $apps = $appsQuery->get(['id']);
        $created = 0;

        foreach ($apps as $app) {
            ApplicationMessage::create([
                'application_id' => $app->id,
                'sender' => 'admin',
                'kind' => 'notification',
                'body' => $body,
            ]);
            $created += 1;
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification envoyée.',
            'data' => [
                'count' => $created,
            ],
        ], 201);
    }

    public function broadcast(Request $request)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:1'],
        ]);

        $body = trim((string) $data['body']);

        $apps = Application::query()
            ->where('status', '!=', 'rejected')
            ->get(['id']);

        $created = 0;

        foreach ($apps as $app) {
            ApplicationMessage::create([
                'application_id' => $app->id,
                'sender' => 'admin',
                'kind' => 'notification',
                'body' => $body,
            ]);
            $created += 1;
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification envoyée.',
            'data' => [
                'count' => $created,
            ],
        ], 201);
    }
}
