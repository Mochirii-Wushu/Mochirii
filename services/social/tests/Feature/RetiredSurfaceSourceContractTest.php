<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RetiredSurfaceSourceContractTest extends TestCase
{
    #[Test]
    public function source_contains_no_legacy_creation_or_self_service_handlers(): void
    {
        $webRoutes = $this->source('routes/web.php');
        $apiRoutes = $this->source('routes/api.php');
        $appProvider = $this->source('app/Providers/AppServiceProvider.php');
        $passportProvider = $this->source('app/Providers/PassportServiceProvider.php');

        foreach ([
            'InstallController@',
            'AppRegisterController@',
            'CuratedRegisterController@',
            'AdminInviteController@',
            'UserInviteController@',
            'RemoteAuthController@',
            'inviteRegister',
            'ClientController@',
            'PersonalAccessTokenController@',
            'TransientTokenController@',
            'AuthorizedAccessTokenController@',
        ] as $retiredHandler) {
            $this->assertStringNotContainsString($retiredHandler, $webRoutes.$apiRoutes);
        }

        $this->assertStringContainsString("Auth::routes(['register' => false])", $webRoutes);
        $this->assertStringNotContainsString('enableImplicitGrant', $appProvider);
        $this->assertStringNotContainsString('personalAccessClientId', $appProvider);
        $this->assertStringNotContainsString('CachedPersonalAccessClientRepository', $passportProvider);
        $this->assertFileDoesNotExist(base_path('app/Http/Controllers/OAuth/OobAuthorizationController.php'));
        $this->assertFileDoesNotExist(base_path('app/Passport/CachedPersonalAccessClientRepository.php'));
    }

    #[Test]
    public function caddy_rejects_retired_paths_before_any_proxy(): void
    {
        $caddy = $this->source('caddy/Caddyfile');
        $matcher = $this->lineContaining($caddy, '@retiredCreationAndTokenManagement path ');

        foreach ([
            '/installer*',
            '/register*',
            '/auth/sign_up*',
            '/api/v1.1/auth*',
            '/oauth/clients*',
            '/oauth/personal-access-tokens*',
            '/oauth/scopes',
            '/settings/developers*',
            '/settings/applications*',
        ] as $path) {
            $this->assertStringContainsString($path, $matcher);
        }

        $tokens = preg_split('/\s+/', trim($matcher));
        $this->assertNotContains('/oauth/token', $tokens);
        $this->assertNotContains('/oauth/authorize', $tokens);
        $this->assertLessThan(
            strpos($caddy, 'reverse_proxy'),
            strpos($caddy, 'respond @retiredCreationAndTokenManagement 404'),
        );
    }

    #[Test]
    public function the_global_rejection_boundary_runs_before_request_body_and_session_middleware(): void
    {
        $kernel = $this->source('app/Http/Kernel.php');
        $globalStack = substr($kernel, strpos($kernel, 'protected $middleware = ['));
        $globalStack = substr($globalStack, 0, strpos($globalStack, '];') + 2);

        $this->assertLessThan(
            strpos($globalStack, 'ValidatePostSize::class'),
            strpos($globalStack, 'RejectRetiredPublicRoutes::class'),
        );
        $this->assertStringNotContainsString('StartSession::class', $globalStack);
    }

    private function source(string $path): string
    {
        $contents = file_get_contents(base_path($path));
        $this->assertNotFalse($contents, $path);

        return $contents;
    }

    private function lineContaining(string $source, string $needle): string
    {
        foreach (preg_split('/\R/', $source) as $line) {
            if (str_contains($line, $needle)) return $line;
        }

        $this->fail("Missing source line: {$needle}");
    }
}
