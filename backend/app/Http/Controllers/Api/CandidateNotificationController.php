<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationMessage;
use App\Models\CandidateMessageDismissal;
use Illuminate\Http\Request;

class CandidateNotificationController extends Controller
{
    public function dismiss(Request $request, ApplicationMessage $message)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = mb_strtolower(trim((string) $data['email']));

        $application = Application::query()->find($message->application_id);
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Candidature introuvable.',
            ], 404);
        }

        if (mb_strtolower(trim((string) $application->email)) !== $email) {
            return response()->json([
                'success' => false,
                'message' => 'Action non autorisée.',
            ], 403);
        }

        if (($message->sender ?? null) !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Suppression non autorisée pour ce message.',
            ], 403);
        }

        $dismissal = CandidateMessageDismissal::query()->firstOrCreate([
            'candidate_email' => $email,
            'application_id' => $application->id,
            'application_message_id' => $message->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification supprimée.',
            'data' => $dismissal,
        ], 201);
    }
}
