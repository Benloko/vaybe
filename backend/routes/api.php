<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\ApplicationMessageController;
use App\Http\Controllers\Api\ApplicationAccountController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\CandidateAuthController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminProfileController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\AdminOfferTypeController;
use App\Http\Controllers\Api\AdminApplicationRoleController;
use App\Http\Controllers\Api\CandidateNotificationController;
use App\Http\Controllers\Api\CandidateAccountController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\ApplicationRoleController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'env' => app()->environment(),
    'timestamp' => now()->toIso8601String(),
]));

// Routes pour les candidatures (sans authentification pour ce test)
Route::apiResource('applications', ApplicationController::class, [
    'only' => ['store', 'show']
]);

Route::post('applications/{application}/avatar', [ApplicationController::class, 'uploadAvatar']);
Route::delete('applications/{application}/avatar', [ApplicationController::class, 'deleteAvatar']);

// Liste des candidatures d'un candidat (filtrée par email)
Route::get('candidates/applications', [ApplicationController::class, 'indexForCandidate']);

// Admin auth (admin unique)
Route::post('admin/login', [AdminAuthController::class, 'login']);

// Liste publique des rôles (pour alimenter le formulaire de candidature)
Route::get('roles', [ApplicationRoleController::class, 'index']);

// Admin endpoints
Route::middleware('admin')->group(function () {
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::patch('applications/{application}/status', [ApplicationController::class, 'updateStatus']);

    Route::post('applications/{application}/messages/admin', [ApplicationMessageController::class, 'storeAdmin']);

    Route::post('admin/notifications/send', [AdminNotificationController::class, 'send']);
    Route::post('admin/notifications/broadcast', [AdminNotificationController::class, 'broadcast']);

    Route::get('admin/offer-types', [AdminOfferTypeController::class, 'index']);
    Route::post('admin/offer-types', [AdminOfferTypeController::class, 'store']);
    Route::patch('admin/offer-types/{offerType}', [AdminOfferTypeController::class, 'update']);
    Route::delete('admin/offer-types/{offerType}', [AdminOfferTypeController::class, 'destroy']);

    Route::get('admin/roles', [AdminApplicationRoleController::class, 'index']);
    Route::post('admin/roles', [AdminApplicationRoleController::class, 'store']);
    Route::patch('admin/roles/{applicationRole}', [AdminApplicationRoleController::class, 'update']);
    Route::delete('admin/roles/{applicationRole}', [AdminApplicationRoleController::class, 'destroy']);

    Route::get('admin/profile', [AdminProfileController::class, 'show']);
    Route::patch('admin/profile', [AdminProfileController::class, 'update']);

    Route::post('offers', [OfferController::class, 'store']);
    Route::patch('offers/{offer}', [OfferController::class, 'update']);
    Route::get('admin/offers/{offer}/deletion-check', [OfferController::class, 'deletionCheck']);
    Route::delete('offers/{offer}', [OfferController::class, 'destroy']);
});

Route::get('applications/{application}/messages', [ApplicationMessageController::class, 'index']);
Route::post('applications/{application}/messages/candidate', [ApplicationMessageController::class, 'storeCandidate']);

// Candidat — suppression (persistante) d'une notification
Route::post('candidates/notifications/{message}/dismiss', [CandidateNotificationController::class, 'dismiss']);

Route::get('applications/{application}/account', [ApplicationAccountController::class, 'show']);
Route::post('applications/{application}/account/init', [ApplicationAccountController::class, 'init']);
Route::post('applications/{application}/account/confirm', [ApplicationAccountController::class, 'confirm']);

Route::get('offers', [OfferController::class, 'index']);
Route::get('offers/{offer}', [OfferController::class, 'show']);

Route::post('candidates/send-verification', [CandidateAuthController::class, 'sendVerificationCode']);
Route::post('candidates/check-verification', [CandidateAuthController::class, 'checkVerificationCode']);
Route::post('candidates/forgot-password', [CandidateAuthController::class, 'forgotPassword']);
Route::post('candidates/check-reset-code', [CandidateAuthController::class, 'checkResetCode']);
Route::post('candidates/reset-password', [CandidateAuthController::class, 'resetPassword']);
Route::post('candidates/register', [CandidateAuthController::class, 'register']);
Route::post('candidates/verify-email', [CandidateAuthController::class, 'verifyEmail']);
Route::post('candidates/login', [CandidateAuthController::class, 'login']);

Route::patch('candidates/{candidateAccount}', [CandidateAccountController::class, 'update']);

// Profil candidat (profil "candidature" par défaut): retourne ou crée une candidature brouillon sans offre
Route::get('candidates/{candidateAccount}/profile', [CandidateProfileController::class, 'showOrCreate']);
