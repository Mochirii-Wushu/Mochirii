<?php

namespace Tests\Feature;

use App\Http\Controllers\OAuth\FirstPartyApproveAuthorizationController;
use App\Http\Controllers\OAuth\FirstPartyAuthorizationController;
use Illuminate\Http\Request;
use Laravel\Passport\Contracts\AuthorizationViewResponse;
use League\OAuth2\Server\RequestTypes\AuthorizationRequestInterface;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class PassportSurfaceBoundaryTest extends TestCase
{
    #[Test]
    public function authorization_get_rejects_oob_and_implicit_before_passport(): void
    {
        $controller = (new \ReflectionClass(FirstPartyAuthorizationController::class))
            ->newInstanceWithoutConstructor();

        foreach ([
            ['redirect_uri' => 'urn:ietf:wg:oauth:2.0:oob', 'response_type' => 'code'],
            ['redirect_uri' => 'https://social.mochirii.com/auth/oidc/callback', 'response_type' => 'token'],
        ] as $query) {
            try {
                $controller->authorize(
                    Mockery::mock(ServerRequestInterface::class),
                    Request::create('/oauth/authorize', 'GET', $query),
                    Mockery::mock(ResponseInterface::class),
                    Mockery::mock(AuthorizationViewResponse::class),
                );
                $this->fail('The retired grant reached Passport.');
            } catch (NotFoundHttpException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    #[Test]
    public function authorization_post_rejects_session_bound_oob_before_completion(): void
    {
        $authorization = Mockery::mock(AuthorizationRequestInterface::class);
        $authorization->shouldReceive('getRedirectUri')
            ->once()
            ->andReturn('urn:ietf:wg:oauth:2.0:oob');

        $controller = new class($authorization) extends FirstPartyApproveAuthorizationController
        {
            public function __construct(private AuthorizationRequestInterface $authorization) {}

            protected function getAuthRequestFromSession(Request $request): AuthorizationRequestInterface
            {
                return $this->authorization;
            }
        };

        $this->expectException(NotFoundHttpException::class);
        $controller->approve(
            Request::create('/oauth/authorize', 'POST'),
            Mockery::mock(ResponseInterface::class),
        );
    }
}
