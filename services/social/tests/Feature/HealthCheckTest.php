<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    #[Test]
    public function service_health_check_is_bounded_and_not_cacheable(): void
    {
        $response = $this->get('/api/service/health-check');

        $response->assertOk()->assertSeeText('OK');
        $this->assertStringContainsString(
            'no-store',
            (string) $response->headers->get('Cache-Control'),
        );
    }
}
