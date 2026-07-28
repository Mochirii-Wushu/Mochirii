<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class MochiriiRequestId
{
    public const ATTRIBUTE = 'mochirii.request_id';

    public const HEADER = 'X-Request-ID';

    private const UUID_PATTERN = '/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/iD';

    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $this->validatedHeader($request) ?? strtolower((string) Str::uuid());

        $request->attributes->set(self::ATTRIBUTE, $requestId);
        Log::withContext(['request_id' => $requestId]);

        $response = $next($request);
        $response->headers->set(self::HEADER, $requestId);

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        Log::withoutContext(['request_id']);
    }

    public static function fromRequest(Request $request): ?string
    {
        $requestId = $request->attributes->get(self::ATTRIBUTE);

        return is_string($requestId) && preg_match(self::UUID_PATTERN, $requestId) === 1
            ? strtolower($requestId)
            : null;
    }

    public static function logContext(Request $request): array
    {
        $requestId = self::fromRequest($request);

        return $requestId === null ? [] : ['request_id' => $requestId];
    }

    private function validatedHeader(Request $request): ?string
    {
        $values = $request->headers->all(strtolower(self::HEADER));
        if (count($values) !== 1 || ! is_string($values[0])) {
            return null;
        }

        $value = trim($values[0]);

        return preg_match(self::UUID_PATTERN, $value) === 1
            ? strtolower($value)
            : null;
    }
}
