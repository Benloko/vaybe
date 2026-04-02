<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationMessageRequest;
use App\Models\Application;
use App\Models\ApplicationMessage;
use Illuminate\Http\Request;

class ApplicationMessageController extends Controller
{
    public function index(Request $request, Application $application)
    {
        $query = ApplicationMessage::query()
            ->where('application_id', $application->id);

        $candidateEmail = trim((string) $request->query('candidate_email', ''));
        if ($candidateEmail !== '') {
            $email = mb_strtolower($candidateEmail);

            $query->whereNotExists(function ($q) use ($email) {
                $q->selectRaw('1')
                    ->from('candidate_message_dismissals')
                    ->whereColumn('candidate_message_dismissals.application_message_id', 'application_messages.id')
                    ->whereRaw('lower(candidate_message_dismissals.candidate_email) = ?', [$email]);
            });
        }

        $messages = $query->orderBy('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    public function storeAdmin(StoreApplicationMessageRequest $request, Application $application)
    {
        if (($application->status ?? 'pending') === 'rejected') {
            return response()->json([
                'success' => false,
                'message' => 'Candidature rejetée : vous ne pouvez plus envoyer de messages.',
            ], 409);
        }

        $message = ApplicationMessage::create([
            'application_id' => $application->id,
            'sender' => 'admin',
            'kind' => 'message',
            'body' => $request->validated()['body'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message envoyé.',
            'data' => $message,
        ], 201);
    }

    public function storeCandidate(StoreApplicationMessageRequest $request, Application $application)
    {
        if (($application->status ?? 'pending') !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas répondre tant que la candidature n\'est pas approuvée.',
            ], 403);
        }

        $message = ApplicationMessage::create([
            'application_id' => $application->id,
            'sender' => 'candidate',
            'kind' => 'message',
            'body' => $request->validated()['body'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message envoyé.',
            'data' => $message,
        ], 201);
    }
}
