<?php

namespace Tests\Feature;

use App\Http\Middleware\MochiriiPrivateSocial;
use App\Models\UserOidcMapping;
use App\Services\MochiriiSocialSyncService;
use App\User;
use Illuminate\Http\Request;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Passport\AccessToken;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class PrivateSocialBoundaryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->nullable();
            $table->string('username')->nullable()->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->rememberToken();
            $table->boolean('is_admin')->default(false);
            $table->string('status')->nullable();
            $table->unsignedBigInteger('profile_id')->nullable();
            $table->string('app_register_ip')->nullable();
            $table->string('register_source')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('user_oidc_mappings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->index();
            $table->string('oidc_id')->unique();
            $table->timestamps();
        });
        Schema::create('oauth_access_tokens', function (Blueprint $table) {
            $table->char('id', 80)->primary();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('client_id');
            $table->string('name')->nullable();
            $table->text('scopes')->nullable();
            $table->boolean('revoked')->default(false);
            $table->timestamps();
            $table->dateTime('expires_at')->nullable();
        });
        Schema::create('oauth_refresh_tokens', function (Blueprint $table) {
            $table->char('id', 80)->primary();
            $table->char('access_token_id', 80)->index();
            $table->boolean('revoked')->default(false);
            $table->dateTime('expires_at')->nullable();
        });
        User::unsetEventDispatcher();
    }

    #[Test]
    public function signed_out_member_content_fails_closed(): void
    {
        $this->get('/guildmember')->assertNotFound();
        $this->get('/p/guildmember/1')->assertNotFound();
        $this->get('/timeline/public')->assertNotFound();
        $this->get('/groups/example')->assertNotFound();
    }

    #[Test]
    public function an_oidc_verified_social_member_passes_the_private_boundary(): void
    {
        $user = User::create([
            'name' => 'Verified Member',
            'username' => 'verifiedmember',
            'email' => 'verified.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $mapping = UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => '8ccaa7af-909f-44e7-84cb-67cdccb56be6',
        ]);
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($user, $mapping) {
            $mock->shouldReceive('hasCurrentAccess')
                ->once()
                ->with($user, $mapping->oidc_id)
                ->andReturn(true);
        });
        Auth::guard('web')->setUser($user);

        $request = Request::create('/guildmember', 'GET');
        $response = app(MochiriiPrivateSocial::class)->handle(
            $request,
            fn () => response('member content'),
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('member content', $response->getContent());
    }

    #[Test]
    public function historical_oidc_state_cannot_bypass_a_current_access_rejection(): void
    {
        $user = User::create([
            'name' => 'Former Member',
            'username' => 'formermember',
            'email' => 'former.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $mapping = UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => '655f54be-6ae5-47af-9f29-f249c490a24b',
        ]);
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($user, $mapping) {
            $mock->shouldReceive('hasCurrentAccess')
                ->once()
                ->with($user, $mapping->oidc_id)
                ->andReturn(false);
        });
        Auth::guard('web')->setUser($user);

        $request = Request::create('/guildmember', 'GET');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('mochirii_oidc_verified', true);
        $request->session()->put('mochirii_oidc_verified_at', now()->subDay()->getTimestamp());

        try {
            app(MochiriiPrivateSocial::class)->handle($request, fn () => response('member content'));
            $this->fail('Historical OIDC state must not grant current Social access.');
        } catch (NotFoundHttpException) {
            $this->assertFalse($request->session()->has('mochirii_oidc_verified'));
            $this->assertFalse($request->session()->has('mochirii_oidc_verified_at'));
        }
    }

    #[Test]
    public function a_locally_suspended_web_member_is_logged_out_and_the_session_is_invalidated(): void
    {
        $user = User::create([
            'name' => 'Suspended Web Member',
            'username' => 'suspendedwebmember',
            'email' => 'suspended.web.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $user->forceFill(['status' => 'suspended'])->save();
        UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => 'f4d588ec-b5f7-4934-b154-60d442f37f2d',
        ]);
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('hasCurrentAccess');
        });
        Auth::guard('web')->setUser($user);

        $request = Request::create('/oauth/authorize', 'POST');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('mochirii_oidc_verified_at', now()->getTimestamp());
        $previousSessionId = $request->session()->getId();

        try {
            app(MochiriiPrivateSocial::class)->handle($request, fn () => response('authorization'));
            $this->fail('A suspended local account must not retain a web session.');
        } catch (NotFoundHttpException) {
            $this->assertGuest();
            $this->assertFalse($request->session()->has('mochirii_oidc_verified_at'));
            $this->assertNotSame($previousSessionId, $request->session()->getId());
        }
    }

    #[Test]
    public function a_finalized_deleted_local_account_is_denied_before_remote_sync(): void
    {
        $user = User::create([
            'name' => 'Deleted Member',
            'username' => 'deletedmember',
            'email' => 'deleted.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $user->forceFill(['status' => 'deleted'])->save();
        UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => 'd66e97c1-b344-4c1b-93aa-76782aa874dc',
        ]);
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('hasCurrentAccess');
        });
        Auth::guard('web')->setUser($user);

        $this->expectException(NotFoundHttpException::class);
        app(MochiriiPrivateSocial::class)->handle(
            Request::create('/guildmember', 'GET'),
            fn () => response('member content'),
        );
    }

    #[Test]
    public function signed_out_authorization_and_logout_entry_points_remain_reachable(): void
    {
        $authorize = app(MochiriiPrivateSocial::class)->handle(
            Request::create('/oauth/authorize', 'GET'),
            fn () => response('authorize'),
        );
        $logout = app(MochiriiPrivateSocial::class)->handle(
            Request::create('/logout', 'POST'),
            fn () => response('logout'),
        );

        $this->assertSame('authorize', $authorize->getContent());
        $this->assertSame('logout', $logout->getContent());
    }

    #[Test]
    public function mapped_api_tokens_still_require_the_bounded_current_access_check(): void
    {
        $user = User::create([
            'name' => 'Former API Member',
            'username' => 'formerapimember',
            'email' => 'former.api.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $mapping = UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => '818eb4b7-cac2-472e-a86a-b7e933fb4da6',
        ]);
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($user, $mapping) {
            $mock->shouldReceive('hasCurrentAccess')
                ->once()
                ->with($user, $mapping->oidc_id)
                ->andReturn(false);
        });
        $guard = Mockery::mock();
        $guard->shouldReceive('user')->once()->andReturn($user);
        Auth::shouldReceive('guard')->with('api')->once()->andReturn($guard);

        $this->expectException(NotFoundHttpException::class);
        app(MochiriiPrivateSocial::class)->handle(
            Request::create('/api/v1/accounts/verify_credentials', 'GET'),
            fn () => response()->json(['ok' => true]),
            'api',
        );
    }

    #[Test]
    public function denied_api_access_revokes_the_current_access_and_refresh_tokens(): void
    {
        $user = User::create([
            'name' => 'Suspended API Member',
            'username' => 'suspendedapimember',
            'email' => 'suspended.api.member@gmail.com',
            'password' => 'not-used',
            'register_source' => 'oidc',
        ]);
        $user->forceFill(['status' => 'suspended'])->save();
        UserOidcMapping::create([
            'user_id' => $user->id,
            'oidc_id' => 'b75c258a-8679-4652-b840-f480416fdf92',
        ]);
        $token = Token::create([
            'id' => 'denied-access-token',
            'user_id' => $user->id,
            'client_id' => 'first-party-client',
            'name' => 'Mochirii Social',
            'scopes' => [],
            'revoked' => false,
            'expires_at' => now()->addHour(),
        ]);
        RefreshToken::create([
            'id' => 'denied-refresh-token',
            'access_token_id' => $token->getKey(),
            'revoked' => false,
            'expires_at' => now()->addDay(),
        ]);
        $user->withAccessToken(new AccessToken([
            'oauth_access_token_id' => $token->getKey(),
            'oauth_user_id' => (string) $user->getKey(),
            'oauth_client_id' => 'first-party-client',
            'oauth_scopes' => [],
        ]));
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('hasCurrentAccess');
        });
        $guard = Mockery::mock();
        $guard->shouldReceive('user')->once()->andReturn($user);
        Auth::shouldReceive('guard')->with('api')->once()->andReturn($guard);

        try {
            app(MochiriiPrivateSocial::class)->handle(
                Request::create('/api/v1/accounts/verify_credentials', 'GET'),
                fn () => response()->json(['ok' => true]),
                'api',
            );
            $this->fail('Denied API access must fail closed.');
        } catch (NotFoundHttpException) {
            $this->assertTrue((bool) $token->fresh()->revoked);
            $this->assertTrue((bool) RefreshToken::find('denied-refresh-token')->revoked);
        }
    }

    #[Test]
    public function anonymous_oauth_client_registration_is_unavailable(): void
    {
        $this->postJson('/api/v1/apps', [
            'client_name' => 'untrusted-client',
            'redirect_uris' => 'https://example.invalid/callback',
            'scopes' => 'read write',
            'website' => 'https://example.invalid',
        ])->assertNotFound();
    }

    #[Test]
    public function signed_out_api_profile_and_instance_surfaces_do_not_render_member_data(): void
    {
        $guard = Mockery::mock();
        $guard->shouldReceive('user')->andReturn(null);
        Auth::shouldReceive('guard')->with('api')->andReturn($guard);

        $this->getJson('/api/v1/accounts/lookup?acct=guildmember')->assertNotFound();
        $this->getJson('/api/v1/accounts/42')->assertNotFound();
        $this->getJson('/api/v1/timelines/public')->assertNotFound();
        $this->getJson('/api/v1/instance')->assertNotFound();
        $this->getJson('/api/v2/instance')->assertNotFound();
        $this->getJson('/api/v1/custom_emojis')->assertNotFound();
    }

    #[Test]
    public function federation_endpoints_stay_unavailable(): void
    {
        $this->assertFalse((bool) config('federation.activitypub.enabled'));
        $this->assertFalse((bool) config('federation.activitypub.inbox'));
        $this->assertFalse((bool) config('federation.activitypub.outbox'));
        $this->assertFalse((bool) config('federation.activitypub.sharedInbox'));
        $this->assertFalse((bool) config('federation.webfinger.enabled'));
        $this->assertFalse((bool) config('federation.nodeinfo.enabled'));
        $this->assertFalse((bool) config('federation.atom.enabled'));

        $this->get('/.well-known/webfinger')->assertNotFound();
        $this->get('/.well-known/nodeinfo')->assertNotFound();
        $this->post('/f/inbox')->assertNotFound();
        $this->get('/users/guildmember.atom')->assertNotFound();
    }
}
