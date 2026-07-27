<?php

namespace Tests\Feature;

use App\Services\Account\RemoteAuthService;
use App\Services\Internal\BeagleService;
use App\Services\NotificationAppGatewayService;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DisabledUpstreamServicesTest extends TestCase
{
    #[Test]
    public function upstream_discovery_and_push_services_default_to_disabled(): void
    {
        $this->assertFalse((bool) config('groups.federation'));
        $this->assertFalse((bool) config('instance.discover.beagle_api'));
        $this->assertFalse((bool) config('instance.notifications.nag.enabled'));
    }

    #[Test]
    public function disabled_upstream_services_never_make_network_requests(): void
    {
        config()->set('instance.discover.beagle_api', false);
        config()->set('instance.notifications.nag.enabled', false);
        Http::preventStrayRequests();

        $this->assertSame([], BeagleService::getDefaultRules());
        $this->assertSame([], BeagleService::getDiscover());
        $this->assertSame([], BeagleService::getDiscoverPosts());
        $this->assertFalse(RemoteAuthService::isDomainCompatible('example.com'));
        $this->assertFalse(RemoteAuthService::lookupWebfingerUses('member@example.com'));
        $this->assertNull(RemoteAuthService::submitToBeagle('a', 'b', 'c', 'd'));
        $this->assertFalse(NotificationAppGatewayService::enabled());
        $this->assertFalse(NotificationAppGatewayService::checkServerSupport());
        Http::assertNothingSent();
    }
}
