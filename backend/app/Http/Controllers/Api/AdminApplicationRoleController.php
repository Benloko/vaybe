<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationRole;
use Illuminate\Http\Request;

class AdminApplicationRoleController extends Controller
{
    public function index()
    {
        $roles = ApplicationRole::query()
            ->orderBy('label')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'min:2', 'max:50', 'regex:/^[a-z0-9_\-]+$/'],
            'label' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $key = trim((string) $data['key']);
        $label = trim((string) $data['label']);

        if (ApplicationRole::query()->where('key', $key)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rôle existe déjà.',
            ], 422);
        }

        $role = ApplicationRole::create([
            'key' => $key,
            'label' => $label,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rôle ajouté.',
            'data' => $role,
        ], 201);
    }

    public function update(Request $request, ApplicationRole $applicationRole)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $applicationRole->label = trim((string) $data['label']);
        $applicationRole->save();

        return response()->json([
            'success' => true,
            'message' => 'Rôle mis à jour.',
            'data' => $applicationRole,
        ]);
    }

    public function destroy(ApplicationRole $applicationRole)
    {
        $key = (string) ($applicationRole->key ?? '');
        $key = trim($key);

        if ($key !== '' && Application::query()->where('role', $key)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer: ce rôle est utilisé par une ou plusieurs candidatures/profils.',
            ], 422);
        }

        $applicationRole->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rôle supprimé.',
        ]);
    }
}
