<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReadinessBoundarySourceContractTest extends TestCase
{
    #[Test]
    public function public_caddy_path_never_reaches_the_dependency_probe(): void
    {
        $source = file_get_contents(base_path('caddy/Caddyfile'));

        $matcher = strpos($source, '@dependencyReadiness path /api/service/readiness-check');
        $response = strpos($source, 'respond @dependencyReadiness 404');
        $proxy = strpos($source, 'reverse_proxy 127.0.0.1:8080');

        $this->assertNotFalse($matcher);
        $this->assertNotFalse($response);
        $this->assertNotFalse($proxy);
        $this->assertLessThan($response, $matcher);
        $this->assertLessThan($proxy, $response);
        $this->assertStringContainsString('header @dependencyReadiness Cache-Control "private, no-store"', $source);
    }

    #[Test]
    public function application_dependency_probes_follow_the_loopback_gate(): void
    {
        $source = file_get_contents(base_path('app/Http/Controllers/HealthCheckController.php'));

        $gate = strpos($source, 'if (! $this->isDirectLoopbackRequest($request))');
        $database = strpos($source, "DB::connection('readiness')");
        $redis = strpos($source, "Redis::connection('readiness')");

        $this->assertNotFalse($gate);
        $this->assertNotFalse($database);
        $this->assertNotFalse($redis);
        $this->assertLessThan($database, $gate);
        $this->assertLessThan($redis, $gate);
        $this->assertStringContainsString("['127.0.0.1', '::1']", $source);
        $this->assertStringContainsString("str_starts_with(\$header, 'x-forwarded-')", $source);
    }

    #[Test]
    public function runtime_uses_only_the_container_loopback_readiness_path(): void
    {
        foreach (['docker-compose.yml', 'docker-compose.production.yml'] as $file) {
            $source = file_get_contents(base_path($file));
            $this->assertStringContainsString(
                'http://127.0.0.1:8080/api/service/readiness-check',
                $source,
                $file,
            );
        }

        $runtime = file_get_contents(base_path('scripts/production-runtime-lib.sh'));
        $this->assertStringContainsString('docker exec pixelfed-app curl', $runtime);
        $this->assertStringContainsString(
            'http://127.0.0.1:8080/api/service/readiness-check',
            $runtime,
        );
    }
}
