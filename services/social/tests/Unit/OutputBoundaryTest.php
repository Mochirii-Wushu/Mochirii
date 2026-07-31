<?php

namespace Tests\Unit;

use App\Services\Account\RemoteAuthService;
use App\Util\Site\Config as SiteConfig;
use Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OutputBoundaryTest extends TestCase
{
    #[Test]
    public function siteConfigJsonRoundTripsWithoutAHtmlScriptBreakout(): void
    {
        $hostileUrl = "https://example.com/</script><img src=x onerror=alert(1)>&\"'";
        config(['app.url' => $hostileUrl]);
        Cache::forget(SiteConfig::CACHE_KEY);

        $expected = SiteConfig::get();
        $encoded = SiteConfig::json();

        $this->assertSame($expected, json_decode($encoded, true, 512, JSON_THROW_ON_ERROR));
        $this->assertStringNotContainsString('</script', strtolower($encoded));
        $this->assertStringNotContainsString('<img', strtolower($encoded));
        $this->assertStringContainsString('\\u003C', $encoded);
        $this->assertStringContainsString('\\u0026', $encoded);
        $this->assertStringContainsString('\\u0022', $encoded);
        $this->assertStringContainsString('\\u0027', $encoded);
    }

    #[Test]
    public function remoteAuthConfigRoundTripsWithoutAHtmlAttributeBreakout(): void
    {
        $hostileValue = "</remote-auth-start-component><img src=x onerror=alert(1)>&\"'";
        config([
            'remote-auth.mastodon.domains.only_default' => $hostileValue,
            'remote-auth.mastodon.domains.only_custom' => false,
        ]);

        $encoded = RemoteAuthService::getConfig();
        $decoded = json_decode($encoded, true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame($hostileValue, $decoded['default_only']);
        $this->assertFalse($decoded['custom_only']);
        $this->assertStringNotContainsString('</remote-auth-start-component', strtolower($encoded));
        $this->assertStringNotContainsString('<img', strtolower($encoded));
        $this->assertStringNotContainsString("'", $encoded);
        $this->assertStringContainsString('\\u003C', $encoded);
        $this->assertStringContainsString('\\u0027', $encoded);
    }
}
