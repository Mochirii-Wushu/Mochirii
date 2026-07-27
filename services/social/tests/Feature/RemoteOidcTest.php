<?php

namespace Tests\Feature;

use App\Models\UserOidcMapping;
use App\Services\UserOidcService;
use App\User;
use Auth;
use League\OAuth2\Client\Provider\GenericResourceOwner;
use League\OAuth2\Client\Token\AccessToken;
use App\Services\MochiriiSocialSyncService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RemoteOidcTest extends TestCase
{
    use MockeryPHPUnitIntegration;

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

        Event::fake();
        User::unsetEventDispatcher();
    }

    #[Test]
    public function view_oidc_start()
    {
        config([
            'remote-auth.oidc.enabled'=> true,
            'remote-auth.oidc.clientId' => 'fake',
            'remote-auth.oidc.clientSecret' => 'fakeSecret',
            'remote-auth.oidc.authorizeURL' => 'http://fakeserver.oidc/authorizeURL',
            'remote-auth.oidc.tokenURL' => 'http://fakeserver.oidc/tokenURL',
            'remote-auth.oidc.profileURL' => 'http://fakeserver.oidc/profile',
        ]);
        $response = $this->withoutExceptionHandling()->get('auth/oidc/start');

        $state = session()->get('oauth2state');
        $pkceVerifier = session()->get('oauth2pkceCode');
        $this->assertIsString($pkceVerifier);
        $expectedChallenge = rtrim(strtr(base64_encode(hash('sha256', $pkceVerifier, true)), '+/', '-_'), '=');
        $response->assertRedirectContains('http://fakeserver.oidc/authorizeURL?');

        $location = $response->headers->get('Location');
        parse_str((string) parse_url((string) $location, PHP_URL_QUERY), $query);

        $this->assertSame('openid profile email', $query['scope'] ?? null);
        $this->assertSame($state, $query['state'] ?? null);
        $this->assertSame('code', $query['response_type'] ?? null);
        $this->assertSame(url('auth/oidc/callback'), $query['redirect_uri'] ?? null);
        $this->assertSame('fake', $query['client_id'] ?? null);
        $this->assertSame('auto', $query['approval_prompt'] ?? null);
        $this->assertSame($expectedChallenge, $query['code_challenge'] ?? null);
        $this->assertSame('S256', $query['code_challenge_method'] ?? null);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $query['code_challenge'] ?? '');
        $this->assertNotEmpty($pkceVerifier);
        $this->assertArrayNotHasKey('client_secret', $query);
    }

    #[Test]
    public function authenticated_oidc_start_resumes_the_pending_authorization(): void
    {
        config(['remote-auth.oidc.enabled' => true]);
        $user = User::create([
            'name' => 'Guild Member',
            'username' => 'guildmember',
            'email' => 'guildmember@example.com',
            'password' => 'not-used-for-oidc',
            'email_verified_at' => now(),
        ]);
        $intendedUrl = url('/oauth/authorize?client_id=42&response_type=code&state=outer-state&code_challenge=outer-challenge&code_challenge_method=S256');

        $this->mock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('getAuthorizationUrl');
        });

        $response = $this
            ->actingAs($user)
            ->withSession(['url.intended' => $intendedUrl])
            ->get('auth/oidc/start');

        $response->assertRedirect($intendedUrl);
        $response->assertSessionMissing('url.intended');
    }

    #[Test]
    public function authenticated_oidc_callback_resumes_only_with_matching_server_state(): void
    {
        config(['remote-auth.oidc.enabled' => true]);
        $user = User::create([
            'name' => 'Guild Member',
            'username' => 'guildmembercallback',
            'email' => 'guildmember.callback@example.com',
            'password' => 'not-used-for-oidc',
            'email_verified_at' => now(),
        ]);
        $intendedUrl = url('/oauth/authorize?client_id=42&response_type=code&state=outer-state&code_challenge=outer-challenge&code_challenge_method=S256');

        $this->mock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setPkceCode');
            $mock->shouldNotReceive('getAccessToken');
        });

        $response = $this
            ->actingAs($user)
            ->withSession([
                'oauth2state' => 'abc123',
                'oauth2pkceCode' => 'inner-pkce-verifier',
                'url.intended' => $intendedUrl,
            ])
            ->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect($intendedUrl);
        $response->assertSessionMissing('url.intended');

        $mismatch = $this
            ->actingAs($user)
            ->withSession([
                'oauth2state' => 'expected-state',
                'oauth2pkceCode' => 'inner-pkce-verifier',
                'url.intended' => $intendedUrl,
            ])
            ->get('auth/oidc/callback?state=wrong-state&code=1');

        $mismatch->assertRedirect('/');
        $mismatch->assertSessionHas('url.intended', $intendedUrl);
    }

    #[Test]
    public function view_oidc_callback_new_user()
    {
        $originalUserCount = User::count();
        $this->assertDatabaseCount('users', $originalUserCount);

        config(['remote-auth.oidc.enabled' => true]);

        $oauthData = array(
            "sub" => "subject-new-user",
            "preferred_username" => "memberone",
            "email" => "member.one@gmail.com",
        );

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(["access_token" => "token" ]));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
            return $mock;
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('sync')->once()->withArgs(function ($user, $oidcId, $event) use ($oauthData) {
                return $user instanceof User &&
                    $oidcId === $oauthData['sub'] &&
                    $event === 'account_created';
            })->andReturn(true);
            return $mock;
        });

        $this->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
        ]);
        $previousSessionId = session()->getId();
        $response = $this->withoutExceptionHandling()->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect('/');

        $mappedUser = UserOidcMapping::where('oidc_id', $oauthData['sub'])->first();
        $this->assertNotNull($mappedUser, "mapping is found");
        $user = $mappedUser->user;
        $this->assertEquals($user->username, $oauthData['preferred_username']);
        $this->assertEquals($user->email, $oauthData['email']);
        $this->assertEquals(Auth::guard()->user()->id, $user->id);
        $this->assertNotSame($previousSessionId, session()->getId());
        $this->assertFalse(session()->has('mochirii_oidc_verified'));
        $this->assertIsInt(session()->get('mochirii_oidc_verified_at'));

        $this->assertDatabaseCount('users', $originalUserCount+1);
    }

    #[Test]
    public function view_oidc_callback_new_user_without_preferred_username()
    {
        $originalUserCount = User::count();
        $this->assertDatabaseCount('users', $originalUserCount);

        config(['remote-auth.oidc.enabled' => true]);

        $oauthData = array(
            "sub" => "8ccaa7af-909f-44e7-84cb-67cdccb56be6",
            "name" => "Fay Lui",
            "email" => "fay.lui@gmail.com",
        );

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(["access_token" => "token" ]));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
            return $mock;
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('sync')->once()->withArgs(function ($user, $oidcId, $event) use ($oauthData) {
                return $user instanceof User &&
                    $oidcId === $oauthData['sub'] &&
                    $event === 'account_created';
            })->andReturn(true);
            return $mock;
        });

        $intendedUrl = url('/oauth/authorize?client_id=42&response_type=code&state=outer-state&code_challenge=outer-challenge&code_challenge_method=S256');
        $response = $this->withoutExceptionHandling()->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
            'url.intended' => $intendedUrl,
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect($intendedUrl);
        $response->assertSessionMissing('url.intended');

        $mappedUser = UserOidcMapping::where('oidc_id', $oauthData['sub'])->first();
        $this->assertNotNull($mappedUser, "mapping is found");
        $user = $mappedUser->user;
        $this->assertEquals('faylui_'.substr(sha1($oauthData['sub']), 0, 8), $user->username);
        $this->assertEquals($oauthData['email'], $user->email);
        $this->assertEquals(Auth::guard()->user()->id, $user->id);

        $this->assertDatabaseCount('users', $originalUserCount+1);
    }

    #[Test]
    public function view_oidc_callback_existing_user()
    {
        $user = User::create([
            'name' => 'Existing Member',
            'username' => 'existingmember',
            'email' => 'existing.member@gmail.com',
            'password' => 'not-used-for-oidc',
        ]);
        $originalUserCount = User::count();
        $this->assertDatabaseCount('users', $originalUserCount);

        config(['remote-auth.oidc.enabled' => true]);

        $oauthData = array(
            "sub" => "subject-existing-user",
            "preferred_username" => $user->username,
            "email" => $user->email,
        );

        UserOidcMapping::create([
            'oidc_id' => $oauthData['sub'],
            'user_id' => $user->id,
        ]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(["access_token" => "token" ]));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
            return $mock;
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($oauthData, $user) {
            $mock->shouldReceive('sync')->once()->withArgs(function ($syncedUser, $oidcId, $event) use ($oauthData, $user) {
                return $syncedUser instanceof User &&
                    $syncedUser->id === $user->id &&
                    $oidcId === $oauthData['sub'] &&
                    $event === 'login';
            })->andReturn(true);
            return $mock;
        });

        $intendedUrl = url('/oauth/authorize?client_id=42&response_type=code&state=outer-state&code_challenge=outer-challenge&code_challenge_method=S256');
        $response = $this->withoutExceptionHandling()->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
            'url.intended' => $intendedUrl,
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect($intendedUrl);
        $response->assertSessionMissing('url.intended');

        $mappedUser = UserOidcMapping::where('oidc_id', $oauthData['sub'])->first();
        $this->assertNotNull($mappedUser, "mapping is found");
        $user = $mappedUser->user;
        $this->assertEquals($user->username, $oauthData['preferred_username']);
        $this->assertEquals($user->email, $oauthData['email']);
        $this->assertEquals(Auth::guard()->user()->id, $user->id);

        $this->assertDatabaseCount('users', $originalUserCount);
    }

    #[Test]
    public function oidc_callback_denies_an_existing_mapping_when_current_membership_sync_fails(): void
    {
        $user = User::create([
            'name' => 'Former Member',
            'username' => 'formermember',
            'email' => 'former.member@gmail.com',
            'password' => 'not-used-for-oidc',
            'register_source' => 'oidc',
        ]);
        $oauthData = [
            'sub' => '655f54be-6ae5-47af-9f29-f249c490a24b',
            'preferred_username' => $user->username,
            'email' => $user->email,
        ];
        UserOidcMapping::create([
            'oidc_id' => $oauthData['sub'],
            'user_id' => $user->id,
        ]);
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(['access_token' => 'token']));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($oauthData, $user) {
            $mock->shouldReceive('sync')
                ->once()
                ->withArgs(fn ($syncedUser, $oidcId, $event) =>
                    $syncedUser instanceof User &&
                    $syncedUser->id === $user->id &&
                    $oidcId === $oauthData['sub'] &&
                    $event === 'login')
                ->andReturn(false);
        });

        $response = $this->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
            'mochirii_oidc_verified' => true,
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect('/login');
        $response->assertSessionHasErrors('login');
        $this->assertGuest();
        $this->assertFalse(session()->has('mochirii_oidc_verified'));
        $this->assertFalse(session()->has('mochirii_oidc_verified_at'));
    }

    #[Test]
    public function oidc_callback_denies_a_locally_suspended_mapped_user_before_remote_sync(): void
    {
        $user = User::create([
            'name' => 'Suspended Member',
            'username' => 'suspendedmember',
            'email' => 'suspended.member@gmail.com',
            'password' => 'not-used-for-oidc',
            'register_source' => 'oidc',
        ]);
        $user->forceFill(['status' => 'suspended'])->save();
        $oauthData = [
            'sub' => 'c4f0e036-bc6e-48cf-9f09-60c40d0543f9',
            'preferred_username' => $user->username,
            'email' => $user->email,
        ];
        UserOidcMapping::create([
            'oidc_id' => $oauthData['sub'],
            'user_id' => $user->id,
        ]);
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(['access_token' => 'token']));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('sync');
        });

        $response = $this->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
            'mochirii_oidc_verified' => true,
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect('/login');
        $response->assertSessionHasErrors('login');
        $this->assertGuest();
        $this->assertFalse(session()->has('mochirii_oidc_verified'));
        $this->assertFalse(session()->has('mochirii_oidc_verified_at'));
    }

    #[Test]
    public function oidc_callback_rolls_back_a_new_social_account_when_current_membership_sync_fails(): void
    {
        config(['remote-auth.oidc.enabled' => true]);
        $originalUserCount = User::count();
        $oauthData = [
            'sub' => '2d049851-deb3-4821-b3f7-e4886a7d98cf',
            'preferred_username' => 'unverifiedmember',
            'email' => 'unverified.member@gmail.com',
        ];

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('setPkceCode')->once()->with('test-verifier');
            $mock->shouldReceive('getAccessToken')->once()->andReturn(new AccessToken(['access_token' => 'token']));
            $mock->shouldReceive('getResourceOwner')->once()->andReturn(new GenericResourceOwner($oauthData, 'sub'));
        });
        $this->partialMock(MochiriiSocialSyncService::class, function (MockInterface $mock) use ($oauthData) {
            $mock->shouldReceive('sync')
                ->once()
                ->withArgs(fn ($user, $oidcId, $event) =>
                    $user instanceof User &&
                    $oidcId === $oauthData['sub'] &&
                    $event === 'account_created')
                ->andReturn(false);
        });

        $response = $this->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertRedirect('/login');
        $response->assertSessionHasErrors('login');
        $this->assertGuest();
        $this->assertDatabaseCount('users', $originalUserCount);
        $this->assertDatabaseMissing('user_oidc_mappings', ['oidc_id' => $oauthData['sub']]);
    }

    #[Test]
    public function oidc_callback_rejects_a_missing_pkce_verifier_before_token_exchange(): void
    {
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setPkceCode');
            $mock->shouldNotReceive('getAccessToken');
        });

        $response = $this->withSession([
            'oauth2state' => 'abc123',
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertStatus(400);
    }

    #[Test]
    public function oidc_callback_rejects_a_missing_stored_state_before_token_exchange(): void
    {
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setPkceCode');
            $mock->shouldNotReceive('getAccessToken');
        });

        $response = $this->withSession([
            'oauth2pkceCode' => 'test-verifier',
        ])->get('auth/oidc/callback?state=abc123&code=1');

        $response->assertStatus(400);
    }

    #[Test]
    public function oidc_callback_rejects_a_mismatched_state_before_token_exchange(): void
    {
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setPkceCode');
            $mock->shouldNotReceive('getAccessToken');
        });

        $response = $this->withSession([
            'oauth2state' => 'expected-state',
            'oauth2pkceCode' => 'test-verifier',
        ])->get('auth/oidc/callback?state=wrong-state&code=1');

        $response->assertStatus(400);
    }

    #[Test]
    public function oidc_callback_rejects_array_valued_parameters_before_token_exchange(): void
    {
        config(['remote-auth.oidc.enabled' => true]);

        $this->partialMock(UserOidcService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setPkceCode');
            $mock->shouldNotReceive('getAccessToken');
        });

        $response = $this->withSession([
            'oauth2state' => 'abc123',
            'oauth2pkceCode' => 'test-verifier',
        ])->get('auth/oidc/callback?state%5B%5D=abc123&code%5B%5D=1');

        $response->assertStatus(400);
    }
}
