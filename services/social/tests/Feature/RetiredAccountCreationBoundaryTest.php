<?php

namespace Tests\Feature;

use App\Http\Middleware\RejectRetiredPublicRoutes;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RetiredAccountCreationBoundaryTest extends TestCase
{
    private const RETIRED_PATHS = [
        '/installer/api/requirements',
        '/installer/precheck/database',
        '/installer/store',
        '/register',
        '/auth/sign_up',
        '/auth/sign_up/confirm',
        '/auth/invite/a/example',
        '/auth/pci/1/example',
        '/auth/raw/mastodon/start',
        '/auth/mastodon/callback',
        '/i/app-email-verify',
        '/i/app-email-resend',
        '/api/auth/app-code-verify',
        '/api/auth/onboarding',
        '/api/v1.1/auth/iarpfc',
        '/api/v1.1/auth/iar',
        '/api/v1.1/auth/invite/admin/verify',
        '/api/v1.1/auth/invite/admin/re',
        '/settings/invites',
        '/settings/invites/create',
    ];

    #[Test]
    public function retired_creation_surfaces_are_rejected_before_the_application_stack(): void
    {
        $middleware = new RejectRetiredPublicRoutes;

        foreach (self::RETIRED_PATHS as $path) {
            foreach (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
                $nextCalls = 0;
                $response = $middleware->handle(
                    Request::create($path, $method, ['untrusted' => 'must-not-be-read']),
                    function () use (&$nextCalls) {
                        $nextCalls++;

                        return response('unexpected');
                    },
                );

                $this->assertSame(404, $response->getStatusCode(), "{$method} {$path}");
                $this->assertSame('', $response->getContent(), "{$method} {$path}");
                $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
                $this->assertSame(0, $nextCalls, "{$method} {$path} reached the application stack");
            }
        }
    }

    #[Test]
    public function first_party_oauth_and_token_revocation_paths_are_not_caught(): void
    {
        $middleware = new RejectRetiredPublicRoutes;

        foreach ([
            '/oauth/token',
            '/oauth/authorize',
            '/auth/oidc/start',
            '/auth/oidc/callback',
            '/api/v1/tokens/current',
            '/installer-helper',
        ] as $path) {
            $response = $middleware->handle(
                Request::create($path, 'GET'),
                static fn () => response('', 204),
            );

            $this->assertSame(204, $response->getStatusCode(), $path);
        }
    }

    #[Test]
    public function every_registration_switch_defaults_closed(): void
    {
        $this->assertFalse(config('auth.in_app_registration'));
        $this->assertFalse(config('pixelfed.open_registration'));
        $this->assertFalse(config('pixelfed.allow_app_registration'));
        $this->assertFalse(config('instance.admin_invites.enabled'));
        $this->assertFalse(config('instance.oauth.pat.enabled'));
    }
}
