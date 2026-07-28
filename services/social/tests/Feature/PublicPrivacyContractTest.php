<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicPrivacyContractTest extends TestCase
{
    private const CONTRACT_OPENING = 'Mōchirīī Social is a private, non-federated space for verified guild members.';

    #[Test]
    public function desktop_and_mobile_routes_render_the_same_reviewed_privacy_contract(): void
    {
        foreach (['/site/privacy', '/e/privacy'] as $route) {
            $response = $this->get($route);

            $response
                ->assertOk()
                ->assertSeeText(self::CONTRACT_OPENING)
                ->assertSeeText('Mōchirīī does not sell member information')
                ->assertSeeText('Direct conversations are intended for their participants, but they are not end-to-end encrypted.')
                ->assertSee('data-mochirii-privacy-contract', false)
                ->assertDontSee('different servers')
                ->assertDontSee('public and unlisted posts are available publicly')
                ->assertDontSee('This document is CC-BY-SA');

            $rendered = strtolower((string) $response->getContent());
            $this->assertStringNotContainsString('pixelfed', $rendered);
            $this->assertStringNotContainsString('fediverse', $rendered);
            $this->assertStringNotContainsString('mastodon', $rendered);
        }
    }

    #[Test]
    public function public_privacy_views_cannot_render_database_supplied_legacy_html(): void
    {
        foreach (['site/privacy.blade.php', 'mobile/privacy.blade.php'] as $relativePath) {
            $source = file_get_contents(resource_path('views/'.$relativePath));

            $this->assertIsString($source);
            $this->assertStringContainsString("@include('site.partial.privacy-contract')", $source);
            $this->assertStringNotContainsString('$page', $source);
            $this->assertStringNotContainsString('{!!', $source);
        }
    }
}
