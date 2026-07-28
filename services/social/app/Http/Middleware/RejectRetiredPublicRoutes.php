<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RejectRetiredPublicRoutes
{
    private const RETIRED_PATHS = [
        'installer',
        'register',
        'auth/sign_up',
        'auth/invite',
        'auth/pci',
        'auth/raw/mastodon',
        'auth/mastodon',
        'i/app-email-verify',
        'i/app-email-resend',
        'api/auth/app-code-verify',
        'api/auth/onboarding',
        'api/v1.1/auth',
        'oauth/clients',
        'oauth/personal-access-tokens',
        'oauth/scopes',
        'oauth/token/refresh',
        'oauth/tokens',
        'settings/developers',
        'settings/applications',
        'settings/invites',
    ];

    public function handle(Request $request, Closure $next)
    {
        $path = trim($request->path(), '/');

        foreach (self::RETIRED_PATHS as $retiredPath) {
            if ($path === $retiredPath || str_starts_with($path, $retiredPath.'/')) {
                return response('', 404, [
                    'Cache-Control' => 'private, no-store',
                ]);
            }
        }

        return $next($request);
    }
}
