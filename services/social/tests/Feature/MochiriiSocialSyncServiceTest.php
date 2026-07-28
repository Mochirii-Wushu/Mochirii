<?php

namespace Tests\Feature;

use App\Services\MochiriiSocialSyncService;
use App\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MochiriiSocialSyncServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'remote-auth.social_sync.endpoint' => 'https://example.test/functions/v1/social-sync',
            'remote-auth.social_sync.secret' => 'test-only-secret',
            'remote-auth.social_sync.timeout' => 2,
        ]);
        Cache::flush();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    #[Test]
    public function current_access_uses_a_bounded_five_minute_success_cache(): void
    {
        Carbon::setTestNow('2026-07-27T12:00:00Z');
        Http::fake(['*' => Http::response(['ok' => true, 'status' => 'synced'], 200)]);
        $service = app(MochiriiSocialSyncService::class);
        $user = $this->user(42);

        $this->assertTrue($service->hasCurrentAccess($user, '8ccaa7af-909f-44e7-84cb-67cdccb56be6'));
        $this->assertTrue($service->hasCurrentAccess($user, '8ccaa7af-909f-44e7-84cb-67cdccb56be6'));
        Http::assertSentCount(1);

        Carbon::setTestNow(now()->addSeconds(301));
        $this->assertTrue($service->hasCurrentAccess($user, '8ccaa7af-909f-44e7-84cb-67cdccb56be6'));
        Http::assertSentCount(2);
    }

    #[Test]
    public function rejected_or_malformed_sync_responses_fail_closed_and_are_not_cached(): void
    {
        Http::fakeSequence()
            ->push(['ok' => false, 'error' => 'current_member_access_required'], 403)
            ->push(['status' => 'synced'], 200);
        $service = app(MochiriiSocialSyncService::class);
        $user = $this->user(43);

        $this->assertFalse($service->hasCurrentAccess($user, '8ccaa7af-909f-44e7-84cb-67cdccb56be6'));
        $this->assertFalse($service->hasCurrentAccess($user, '8ccaa7af-909f-44e7-84cb-67cdccb56be6'));
        Http::assertSentCount(2);
    }

    #[Test]
    public function transport_failures_do_not_log_raw_exception_messages(): void
    {
        Log::spy();
        Http::fake(function () {
            throw new \RuntimeException('client_secret=must-not-appear access_token=must-not-appear');
        });

        $service = app(MochiriiSocialSyncService::class);
        $this->assertFalse($service->sync(
            $this->user(44),
            '8ccaa7af-909f-44e7-84cb-67cdccb56be6',
            'access_check',
        ));

        Log::shouldHaveReceived('warning')
            ->once()
            ->with(
                'Mochirii Social account sync request failed.',
                \Mockery::on(fn ($context) =>
                    is_array($context) &&
                    ($context['exception'] ?? null) === \RuntimeException::class &&
                    ! array_key_exists('message', $context) &&
                    ! str_contains(json_encode($context), 'must-not-appear')),
            );
    }

    private function user(int $id): User
    {
        $user = new User([
            'name' => 'Verified Member',
            'username' => 'verifiedmember',
            'email' => 'verified.member@example.test',
        ]);
        $user->id = $id;

        return $user;
    }
}
