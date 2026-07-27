<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LoginTest extends TestCase
{
    private const PUBLIC_DESCRIPTION = 'Internal guild social platform for profiles, photos & staying connected. Only verified members can access here & everything is private with no data sharing outside.';

    #[Test]
    public function view_login_page()
    {
        $this->useMochiriiPublicConfiguration();

        $response = $this->get('login');

        $response
            ->assertOk()
            ->assertSee(self::PUBLIC_DESCRIPTION)
            ->assertSee('<meta name="description"', false)
            ->assertSee('href="/auth/oidc/start"', false)
            ->assertSeeText('Mōchirīī Social Login')
            ->assertSeeText('Continue with Mōchirīī')
            ->assertSee('<meta name="csrf-token" content="', false)
            ->assertDontSee('name="email"', false)
            ->assertDontSee('name="password"', false)
            ->assertDontSee('Direct account login')
            ->assertDontSee('maximum-scale=1', false)
            ->assertDontSee('padding-inline: 0.75rem', false);

        $rendered = strtolower((string) $response->getContent());
        $this->assertStringNotContainsString('pixelfed', $rendered);
        $this->assertStringNotContainsString('fediverse', $rendered);
        $this->assertStringNotContainsString('mastodon', $rendered);
    }

    #[Test]
    public function guest_landing_uses_the_mochirii_identity_doorway_without_a_return_loop()
    {
        $this->useMochiriiPublicConfiguration();

        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertSee(self::PUBLIC_DESCRIPTION)
            ->assertSee('<title>Mōchirīī Social</title>', false)
            ->assertSee('<meta name="description"', false)
            ->assertSee('href="/auth/oidc/start"', false)
            ->assertSee('>Continue with Mōchirīī</a>', false)
            ->assertSee('href="https://mochirii.com/"', false)
            ->assertSee('>Return to Mōchirīī</a>', false)
            ->assertDontSee('https://mochirii.com/social', false)
            ->assertDontSee('Pixelfed');

        $rendered = strtolower((string) $response->getContent());
        $this->assertStringNotContainsString('pixelfed', $rendered);
        $this->assertStringNotContainsString('fediverse', $rendered);
        $this->assertStringNotContainsString('mastodon', $rendered);
    }

    #[Test]
    public function direct_password_login_is_unavailable_when_mochirii_oidc_is_enabled(): void
    {
        $this->useMochiriiPublicConfiguration();

        $this->post('/login', [
            'email' => 'member@example.com',
            'password' => 'not-a-real-password',
        ])->assertNotFound();
    }

    private function useMochiriiPublicConfiguration(): void
    {
        config([
            // Runtime/provider identifiers deliberately remain ASCII. The
            // customer-visible mark is owned by mochirii-branding.php.
            'app.name' => 'Mochirii Social',
            'app.url' => 'https://social.mochirii.com',
            'pixelfed.domain.app' => 'Mochirii Social',
            'remote-auth.oidc.enabled' => true,
        ]);
    }
}
