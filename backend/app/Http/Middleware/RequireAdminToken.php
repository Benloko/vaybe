<?php

namespace App\Http\Middleware;

use App\Models\AdminSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdminToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);
        if (!$token) {
            return response()->json(['message' => 'Non authentifié (admin).'], 401);
        }

        $hash = hash('sha256', $token);
        $session = AdminSession::query()->where('token_hash', $hash)->first();

        if (!$session || ($session->expires_at && $session->expires_at->isPast())) {
            return response()->json(['message' => 'Session admin expirée.'], 401);
        }

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $candidate = trim(substr($auth, 7));
            if ($candidate !== '') return $candidate;
        }

        $alt = $request->header('X-Admin-Token');
        if (is_string($alt) && trim($alt) !== '') return trim($alt);

        return null;
    }
}
