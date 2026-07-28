<?php

namespace Tests\Feature;

use App\Http\Middleware\MochiriiRequestId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    private const REQUEST_ID = '8c455f20-91a6-4a4d-8f96-40f5c6d9494e';

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

    #[Test]
    public function health_responses_propagate_a_valid_proxy_request_id(): void
    {
        $response = $this
            ->withHeader(MochiriiRequestId::HEADER, self::REQUEST_ID)
            ->get('/api/service/health-check');

        $response->assertOk();
        $this->assertSame(self::REQUEST_ID, $response->headers->get(MochiriiRequestId::HEADER));
    }

    #[Test]
    public function malformed_request_ids_are_discarded_without_echoing_their_value(): void
    {
        $untrusted = 'member-private-secret';
        $response = $this
            ->withHeader(MochiriiRequestId::HEADER, $untrusted)
            ->get('/api/service/health-check');

        $requestId = (string) $response->headers->get(MochiriiRequestId::HEADER);

        $response->assertOk();
        $this->assertMatchesRegularExpression(
            '/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/',
            $requestId,
        );
        $this->assertNotSame($untrusted, $requestId);
        $this->assertStringNotContainsString('member', $requestId);
        $this->assertStringNotContainsString('secret', $requestId);
    }

    #[Test]
    public function readiness_requires_the_database_and_redis(): void
    {
        $database = Mockery::mock();
        $database->shouldReceive('selectOne')->once()->with('select 1 as ready')->andReturn((object) ['ready' => 1]);
        DB::shouldReceive('connection')->once()->with('readiness')->andReturn($database);

        $redis = Mockery::mock();
        $redis->shouldReceive('command')->once()->with('ping')->andReturn('PONG');
        Redis::shouldReceive('connection')->once()->with('readiness')->andReturn($redis);

        $response = $this->getReadinessFromLoopback();

        $response->assertOk()->assertSeeText('READY');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function readiness_fails_closed_when_a_dependency_is_unavailable(): void
    {
        DB::shouldReceive('connection')->once()->with('readiness')->andThrow(new RuntimeException('unavailable'));
        Redis::shouldReceive('connection')->never();

        $response = $this->getReadinessFromLoopback();

        $response->assertStatus(503)->assertSeeText('NOT READY');
        $this->assertSame('5', $response->headers->get('Retry-After'));
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function readiness_rejects_an_invalid_redis_reply(): void
    {
        $database = Mockery::mock();
        $database->shouldReceive('selectOne')->once()->with('select 1 as ready')->andReturn((object) ['ready' => 1]);
        DB::shouldReceive('connection')->once()->with('readiness')->andReturn($database);

        $redis = Mockery::mock();
        $redis->shouldReceive('command')->once()->with('ping')->andReturn(false);
        Redis::shouldReceive('connection')->once()->with('readiness')->andReturn($redis);

        $this->getReadinessFromLoopback()->assertStatus(503)->assertSeeText('NOT READY');
    }

    #[Test]
    public function readiness_is_opaque_to_public_requests_without_dependency_probes(): void
    {
        DB::shouldReceive('connection')->never();
        Redis::shouldReceive('connection')->never();

        $response = $this
            ->withServerVariables([
                'REMOTE_ADDR' => '203.0.113.10',
                'HTTP_HOST' => 'social.mochirii.com',
            ])
            ->get('/api/service/readiness-check');

        $response
            ->assertNotFound()
            ->assertContent('');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function readiness_is_opaque_to_reverse_proxy_requests_without_dependency_probes(): void
    {
        DB::shouldReceive('connection')->never();
        Redis::shouldReceive('connection')->never();

        $response = $this
            ->withServerVariables([
                'REMOTE_ADDR' => '127.0.0.1',
                'HTTP_HOST' => 'social.mochirii.com',
            ])
            ->withHeaders([
                'Forwarded' => 'for=203.0.113.10;proto=https',
                'X-Forwarded-For' => '203.0.113.10',
                'X-Forwarded-Host' => 'social.mochirii.com',
                'X-Forwarded-Proto' => 'https',
            ])
            ->get('/api/service/readiness-check');

        $response
            ->assertNotFound()
            ->assertContent('');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    private function getReadinessFromLoopback()
    {
        return $this
            ->withServerVariables([
                'REMOTE_ADDR' => '127.0.0.1',
            ])
            ->get('http://127.0.0.1:8080/api/service/readiness-check');
    }
}
