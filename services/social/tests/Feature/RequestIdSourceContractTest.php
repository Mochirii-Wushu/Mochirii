<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RequestIdSourceContractTest extends TestCase
{
    #[Test]
    public function caddy_overwrites_untrusted_request_ids_with_one_generated_uuid(): void
    {
        $source = file_get_contents(base_path('caddy/Caddyfile'));

        $this->assertStringContainsString('header_up X-Request-ID {http.request.uuid}', $source);
        $this->assertStringContainsString('header_down X-Request-ID {http.request.uuid}', $source);
        $this->assertStringNotContainsString('{http.request.header.X-Request-ID}', $source);
        $this->assertStringNotContainsString('{http.request.header.x-request-id}', $source);
    }

    #[Test]
    public function request_id_context_runs_before_every_application_boundary(): void
    {
        $kernel = file_get_contents(base_path('app/Http/Kernel.php'));
        $globalStack = substr($kernel, strpos($kernel, 'protected $middleware = ['));
        $globalStack = substr($globalStack, 0, strpos($globalStack, '];') + 2);

        $requestId = strpos($globalStack, 'MochiriiRequestId::class');
        $cors = strpos($globalStack, 'HandleCors::class');
        $retired = strpos($globalStack, 'RejectRetiredPublicRoutes::class');

        $this->assertNotFalse($requestId);
        $this->assertNotFalse($cors);
        $this->assertNotFalse($retired);
        $this->assertLessThan($cors, $requestId);
        $this->assertLessThan($retired, $requestId);
    }

    #[Test]
    public function correlation_context_contains_only_a_validated_request_id(): void
    {
        $middleware = file_get_contents(base_path('app/Http/Middleware/MochiriiRequestId.php'));
        $handler = file_get_contents(base_path('app/Exceptions/Handler.php'));
        $health = file_get_contents(base_path('app/Http/Controllers/HealthCheckController.php'));

        $this->assertStringContainsString("Log::withContext(['request_id' => \$requestId])", $middleware);
        $this->assertStringContainsString('MochiriiRequestId::logContext', $handler);
        $this->assertStringContainsString('MochiriiRequestId::logContext', $health);

        foreach ([$middleware, $handler, $health] as $source) {
            $this->assertStringNotContainsString("'member' =>", $source);
            $this->assertStringNotContainsString("'email' =>", $source);
            $this->assertStringNotContainsString("'token' =>", $source);
            $this->assertStringNotContainsString("'secret' =>", $source);
        }
    }
}
