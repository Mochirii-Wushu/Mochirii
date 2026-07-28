<?php

namespace Tests\Feature;

use App\Jobs\DeletePipeline\DeleteAccountPipeline;
use App\Services\OAuthTokenRevocationService;
use App\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Passport\AccessToken;
use Laravel\Passport\Passport;
use Laravel\Passport\Token;
use League\OAuth2\Server\ResourceServer;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OAuthTokenRevocationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'passport.connection' => null,
            'cache.limiter' => 'array',
        ]);

        DB::purge('sqlite');
        DB::reconnect('sqlite');
        $this->app->instance(ResourceServer::class, Mockery::mock(ResourceServer::class));

        Schema::create('oauth_access_tokens', function (Blueprint $table) {
            $table->string('id', 100)->primary();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('client_id');
            $table->string('name')->nullable();
            $table->text('scopes')->nullable();
            $table->boolean('revoked');
            $table->timestamps();
            $table->dateTime('expires_at')->nullable();
        });

        Schema::create('oauth_refresh_tokens', function (Blueprint $table) {
            $table->string('id', 100)->primary();
            $table->string('access_token_id', 100)->index();
            $table->boolean('revoked');
            $table->dateTime('expires_at')->nullable();
        });
    }

    #[Test]
    public function bearer_logout_revokes_only_the_current_token_pair(): void
    {
        config(['pixelfed.enforce_email_verification' => true]);

        $user = $this->user(11);
        $this->accessToken('current-token', 11);
        $this->refreshToken('current-refresh', 'current-token');
        $this->refreshToken('current-refresh-duplicate', 'current-token');
        $this->accessToken('other-device-token', 11);
        $this->refreshToken('other-device-refresh', 'other-device-token');

        $user->withAccessToken(new AccessToken([
            'oauth_access_token_id' => 'current-token',
            'oauth_client_id' => 1,
            'oauth_user_id' => 11,
            'oauth_scopes' => ['read'],
        ]));

        $response = $this
            ->actingAs($user, 'api')
            ->deleteJson('/api/v1/tokens/current', [
                'token_id' => 'other-device-token',
            ]);

        $response->assertNoContent();
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));

        $this->assertDatabaseHas('oauth_access_tokens', [
            'id' => 'current-token',
            'revoked' => true,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'current-refresh',
            'revoked' => true,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'current-refresh-duplicate',
            'revoked' => true,
        ]);
        $this->assertDatabaseHas('oauth_access_tokens', [
            'id' => 'other-device-token',
            'revoked' => false,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'other-device-refresh',
            'revoked' => false,
        ]);
    }

    #[Test]
    public function revoke_all_covers_every_refresh_token_without_touching_other_users(): void
    {
        $user = $this->user(21);
        $this->accessToken('active-token', 21);
        $this->refreshToken('active-refresh', 'active-token');
        $this->accessToken('already-revoked-token', 21, true);
        $this->refreshToken('stranded-refresh', 'already-revoked-token');
        $this->accessToken('different-user-token', 22);
        $this->refreshToken('different-user-refresh', 'different-user-token');

        app(OAuthTokenRevocationService::class)->revokeAllFor($user);

        foreach (['active-token', 'already-revoked-token'] as $tokenId) {
            $this->assertDatabaseHas('oauth_access_tokens', [
                'id' => $tokenId,
                'revoked' => true,
            ]);
        }

        foreach (['active-refresh', 'stranded-refresh'] as $refreshTokenId) {
            $this->assertDatabaseHas('oauth_refresh_tokens', [
                'id' => $refreshTokenId,
                'revoked' => true,
            ]);
        }

        $this->assertDatabaseHas('oauth_access_tokens', [
            'id' => 'different-user-token',
            'revoked' => false,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'different-user-refresh',
            'revoked' => false,
        ]);
    }

    #[Test]
    public function bearer_logout_rejects_a_token_owned_by_another_user(): void
    {
        $user = $this->user(31);
        $this->accessToken('foreign-token', 32);
        $this->refreshToken('foreign-refresh', 'foreign-token');

        $user->withAccessToken(new AccessToken([
            'oauth_access_token_id' => 'foreign-token',
            'oauth_client_id' => 1,
            'oauth_user_id' => 31,
            'oauth_scopes' => ['read'],
        ]));

        $this
            ->actingAs($user, 'api')
            ->deleteJson('/api/v1/tokens/current')
            ->assertUnauthorized();

        $this->assertDatabaseHas('oauth_access_tokens', [
            'id' => 'foreign-token',
            'revoked' => false,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'foreign-refresh',
            'revoked' => false,
        ]);
    }

    #[Test]
    public function current_token_route_requires_api_authentication(): void
    {
        $this->deleteJson('/api/v1/tokens/current')->assertUnauthorized();
    }

    #[Test]
    public function account_deletion_revokes_tokens_before_the_missing_profile_early_return(): void
    {
        $user = $this->user(41);
        $this->accessToken('profileless-token', 41);
        $this->refreshToken('profileless-refresh', 'profileless-token');

        (new DeleteAccountPipeline($user))->handle(app(OAuthTokenRevocationService::class));

        $this->assertDatabaseHas('oauth_access_tokens', [
            'id' => 'profileless-token',
            'revoked' => true,
        ]);
        $this->assertDatabaseHas('oauth_refresh_tokens', [
            'id' => 'profileless-refresh',
            'revoked' => true,
        ]);
    }

    private function user(int $id): User
    {
        $user = new User;
        $user->id = $id;

        return $user;
    }

    private function accessToken(string $id, int $userId, bool $revoked = false): Token
    {
        return Passport::token()->newQuery()->create([
            'id' => $id,
            'user_id' => $userId,
            'client_id' => 1,
            'name' => null,
            'scopes' => ['read'],
            'revoked' => $revoked,
            'expires_at' => now()->addHour(),
        ]);
    }

    private function refreshToken(string $id, string $accessTokenId, bool $revoked = false): void
    {
        Passport::refreshToken()->newQuery()->create([
            'id' => $id,
            'access_token_id' => $accessTokenId,
            'revoked' => $revoked,
            'expires_at' => now()->addDay(),
        ]);
    }
}
