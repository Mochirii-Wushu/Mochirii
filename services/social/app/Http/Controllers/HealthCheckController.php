<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use RuntimeException;
use Throwable;

class HealthCheckController extends Controller
{
    public function get(Request $request)
    {
        return response('OK')->withHeaders([
            'Content-Type' => 'text/plain',
            'Cache-Control' => 'max-age=0, must-revalidate, no-cache, no-store',
        ]);
    }

    public function readiness(Request $request)
    {
        if (! $this->isDirectLoopbackRequest($request)) {
            return response('', 404)->withHeaders([
                'Content-Type' => 'text/plain',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        try {
            $database = DB::connection('readiness')->selectOne('select 1 as ready');
            if ((int) ($database->ready ?? 0) !== 1) {
                throw new RuntimeException('Database readiness failed.');
            }

            $redis = Redis::connection('readiness')->command('ping');
            if ($redis !== true && ! in_array(strtoupper((string) $redis), ['PONG', '+PONG'], true)) {
                throw new RuntimeException('Redis readiness failed.');
            }
        } catch (Throwable) {
            return response('NOT READY', 503)->withHeaders([
                'Content-Type' => 'text/plain',
                'Cache-Control' => 'max-age=0, must-revalidate, no-cache, no-store',
                'Retry-After' => '5',
            ]);
        }

        return response('READY')->withHeaders([
            'Content-Type' => 'text/plain',
            'Cache-Control' => 'max-age=0, must-revalidate, no-cache, no-store',
        ]);
    }

    private function isDirectLoopbackRequest(Request $request): bool
    {
        if (! in_array($request->server('REMOTE_ADDR'), ['127.0.0.1', '::1'], true)) {
            return false;
        }

        $host = strtolower((string) $request->server('HTTP_HOST'));
        if (! in_array($host, ['127.0.0.1', '127.0.0.1:8080', '[::1]', '[::1]:8080'], true)) {
            return false;
        }

        foreach (array_keys($request->headers->all()) as $header) {
            if ($header === 'forwarded' || $header === 'x-real-ip' || str_starts_with($header, 'x-forwarded-')) {
                return false;
            }
        }

        return true;
    }
}
