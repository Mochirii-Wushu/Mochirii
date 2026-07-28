<?php

namespace Tests\Feature;

use App\Exceptions\Handler;
use App\Http\Middleware\MochiriiRequestId;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ExceptionHandlerTest extends TestCase
{
    private const SENTINEL = 'SQLSTATE password=secret-token C:\\private\\runtime.env';

    private const REQUEST_ID = '75000dc3-89ca-43f1-b9b6-6ba6e535b2a4';

    protected function setUp(): void
    {
        parent::setUp();

        $this->app['env'] = 'production';
        config(['app.env' => 'production', 'app.debug' => false]);
    }

    #[Test]
    public function unexpected_json_errors_are_generic_in_production(): void
    {
        $response = app(Handler::class)->render(
            $this->jsonRequest(),
            new RuntimeException(self::SENTINEL),
        );

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame(['error' => 'Server error.'], json_decode($response->getContent(), true));
        $this->assertStringNotContainsString(self::SENTINEL, $response->getContent());
    }

    #[Test]
    public function production_http_errors_use_allowlisted_text_not_exception_messages(): void
    {
        $response = app(Handler::class)->render(
            $this->jsonRequest(),
            new HttpException(403, self::SENTINEL, null, ['X-Secret' => 'secret-token']),
        );

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame(['error' => 'Forbidden.'], json_decode($response->getContent(), true));
        $this->assertStringNotContainsString(self::SENTINEL, $response->getContent());
        $this->assertNull($response->headers->get('X-Secret'));
    }

    #[Test]
    public function authentication_errors_keep_their_intended_status(): void
    {
        $response = app(Handler::class)->render(
            $this->jsonRequest(),
            new AuthenticationException,
        );

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame(['error' => 'Unauthenticated.'], json_decode($response->getContent(), true));
    }

    #[Test]
    public function production_reporting_logs_only_redacted_metadata(): void
    {
        $request = $this->jsonRequest();
        $request->attributes->set(MochiriiRequestId::ATTRIBUTE, self::REQUEST_ID);
        $this->app->instance('request', $request);

        Log::shouldReceive('error')
            ->once()
            ->with('Unhandled application exception.', Mockery::on(function (array $context): bool {
                $encoded = json_encode($context);

                return $context['exception_type'] === RuntimeException::class
                    && $context['http_status'] === 500
                    && $context['request_id'] === self::REQUEST_ID
                    && ! str_contains($encoded, self::SENTINEL)
                    && ! str_contains($encoded, 'secret-token');
            }));

        app(Handler::class)->report(new RuntimeException(self::SENTINEL));
        $this->addToAssertionCount(1);
    }

    private function jsonRequest(): Request
    {
        return Request::create('/api/private', 'GET', server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);
    }
}
