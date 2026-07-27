<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OAuthTokenRevocationService;
use Illuminate\Http\Request;
use Laravel\Passport\AccessToken;

class CurrentAccessTokenController extends Controller
{
    public function destroy(Request $request, OAuthTokenRevocationService $tokenRevocation)
    {
        $user = $request->user();
        $currentAccessToken = $user?->currentAccessToken();

        abort_unless($user && $currentAccessToken instanceof AccessToken, 401);
        abort_unless($tokenRevocation->revokeCurrentFor($user, $currentAccessToken), 401);

        return response()->noContent()->withHeaders([
            'Cache-Control' => 'no-store',
        ]);
    }
}
