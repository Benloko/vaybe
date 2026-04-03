<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Requests\UpdateApplicationStatusRequest;
use App\Models\Application;
use App\Models\ApplicationMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ApplicationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $applications = Application::query()
            ->with(['account', 'offer'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $applications,
        ]);
    }

    public function indexForCandidate(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = mb_strtolower(trim((string) $data['email']));

        $applications = Application::query()
            ->with(['account', 'offer'])
            ->whereRaw('lower(email) = ?', [$email])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $applications,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreApplicationRequest $request)
    {
        $validated = $request->validated();

        // CV obligatoire (PDF)
        $cvFile = $validated['cv'] ?? null;
        if ($cvFile) {
            $ext = strtolower((string) $cvFile->getClientOriginalExtension());
            if ($ext === '') {
                $ext = 'pdf';
            }

            $filename = sprintf('cv_%s.%s',
                (string) now()->format('Ymd_His_u'),
                preg_replace('/[^a-z0-9]/', '', $ext)
            );

            $path = $cvFile->storeAs('cvs', $filename, 'public');
            // Les fichiers du disque "public" sont exposés via /storage
            $validated['cv'] = '/storage/' . ltrim((string) $path, '/');
        }

        $email = mb_strtolower(trim((string) ($validated['email'] ?? '')));
        $offerId = (int) ($validated['offer_id'] ?? 0);

        $existingActive = Application::query()
            ->where('offer_id', $offerId)
            ->whereRaw('lower(email) = ?', [$email])
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existingActive) {
            return response()->json([
                'success' => false,
                'message' => 'Vous avez déjà une candidature en cours pour cette opportunité.',
            ], 409);
        }

        $validated['email'] = $email;
        $validated['score'] = $this->calculateScore($validated);
        $validated['status'] = 'pending';

        $application = Application::create($validated);
        $application->load(['account', 'offer']);

        return response()->json([
            'success' => true,
            'message' => 'Candidature soumise avec succès.',
            'data' => $application,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Application $application)
    {
        $application->load(['account', 'offer']);

        return response()->json([
            'success' => true,
            'data' => $application,
        ]);
    }

    public function updateStatus(UpdateApplicationStatusRequest $request, Application $application)
    {
        if (($application->status ?? 'pending') === 'rejected') {
            return response()->json([
                'success' => false,
                'message' => 'Candidature déjà rejetée : statut final.',
            ], 409);
        }

        $validated = $request->validated();
        $application->status = $validated['status'];
        $application->save();

        $status = (string) ($validated['status'] ?? 'pending');
        $message = trim((string) ($validated['message'] ?? ''));

        if ($message === '' && $status === 'approved') {
            $message = 'Votre candidature est approuvée. Vous pouvez maintenant échanger avec l\'équipe.';
        }

        if ($message !== '') {
            ApplicationMessage::create([
                'application_id' => $application->id,
                'sender' => 'admin',
                'kind' => 'status',
                'body' => $message,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Statut mis à jour.',
            'data' => $application,
        ]);
    }

    public function uploadAvatar(Request $request, Application $application)
    {
        $validated = $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $file = $validated['avatar'];
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext === '') {
            $ext = 'jpg';
        }

        $filename = sprintf('application_%d_%s.%s',
            (int) $application->id,
            (string) now()->format('Ymd_His_u'),
            preg_replace('/[^a-z0-9]/', '', $ext)
        );

        $disk = config('filesystems.default', 'public');
        $path = $file->storeAs('avatars', $filename, $disk);

        // Nettoie l'ancien avatar si existant
        try {
            $old = trim((string) ($application->avatar_path ?? ''));
            if ($old !== '' && Storage::disk($disk)->exists($old)) {
                Storage::disk($disk)->delete($old);
            }
        } catch (\Throwable $e) {
            // ignore
        }

        $application->avatar_path = $path;
        $application->save();
        $application->load(['account', 'offer']);

        return response()->json([
            'success' => true,
            'message' => 'Photo mise à jour.',
            'data' => $application,
        ]);
    }

    public function deleteAvatar(Application $application)
    {
        $disk = config('filesystems.default', 'public');

        try {
            $old = trim((string) ($application->avatar_path ?? ''));
            if ($old !== '' && Storage::disk($disk)->exists($old)) {
                Storage::disk($disk)->delete($old);
            }
        } catch (\Throwable $e) {
            // ignore
        }

        $application->avatar_path = null;
        $application->save();
        $application->load(['account', 'offer']);

        return response()->json([
            'success' => true,
            'message' => 'Photo supprimée.',
            'data' => $application,
        ]);
    }

    private function calculateScore(array $data): int
    {
        $score = 0;

        // +1 Email valide (déjà validé par le FormRequest)
        $score += 1;

        // +1 Portfolio renseigné
        if (!empty($data['portfolio'])) {
            $score += 1;
        }

        // +1 CV renseigné
        if (!empty($data['cv'])) {
            $score += 1;
        }

        // +1 Message avec mots-clés
        $keywords = [
            'passion',
            'motivé',
            'motivation',
            'startup',
            'équipe',
            'team',
            'apprentissage',
            'innovation',
        ];

        $message = mb_strtolower((string) ($data['message'] ?? ''));
        foreach ($keywords as $keyword) {
            if ($keyword !== '' && str_contains($message, $keyword)) {
                $score += 1;
                break;
            }
        }

        return min($score, 4);
    }
}
