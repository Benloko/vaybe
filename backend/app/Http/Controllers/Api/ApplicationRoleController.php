<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicationRole;

class ApplicationRoleController extends Controller
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
}
