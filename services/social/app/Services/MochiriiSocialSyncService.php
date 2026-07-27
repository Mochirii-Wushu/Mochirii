<?php

namespace App\Services;

use App\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MochiriiSocialSyncService
{
    private const ACCESS_CACHE_SECONDS = 300;

    public function hasCurrentAccess(User $user, string $oidcId): bool
    {
        $cacheKey = $this->accessCacheKey($user, $oidcId);
        if (Cache::get($cacheKey) === true) {
            return true;
        }

        return $this->sync($user, $oidcId, 'access_check');
    }

    public function sync(User $user, string $oidcId, string $event = 'login'): bool
    {
        $cacheKey = $this->accessCacheKey($user, $oidcId);
        $endpoint = trim((string) config('remote-auth.social_sync.endpoint'));
        $secret = trim((string) config('remote-auth.social_sync.secret'));

        if (! $endpoint || ! $secret) {
            Log::warning('Mochirii Social account sync is not configured.', [
                'has_endpoint' => (bool) $endpoint,
                'has_secret' => (bool) $secret,
            ]);

            Cache::forget($cacheKey);

            return false;
        }

        $payload = [
            'sub' => $oidcId,
            'provider_user_id' => (string) $user->id,
            'username' => $user->username,
            'profile_url' => url($user->username),
            'event' => $event,
            'timestamp' => now()->toJSON(),
        ];

        try {
            $response = Http::timeout((int) config('remote-auth.social_sync.timeout', 5))
                ->acceptJson()
                ->withHeaders([
                    'x-mochirii-social-sync-secret' => $secret,
                ])
                ->post($endpoint, $payload);
        } catch (\Throwable $error) {
            Log::warning('Mochirii Social account sync request failed.', [
                'exception' => get_class($error),
                'code' => is_int($error->getCode()) || is_string($error->getCode())
                    ? substr((string) $error->getCode(), 0, 40)
                    : null,
            ]);

            Cache::forget($cacheKey);

            return false;
        }

        if (! $response->successful()) {
            Log::warning('Mochirii Social account sync was rejected.', [
                'status' => $response->status(),
            ]);

            Cache::forget($cacheKey);

            return false;
        }

        $body = $response->json();
        if (! is_array($body) || ($body['ok'] ?? false) !== true || ($body['status'] ?? null) !== 'synced') {
            Log::warning('Mochirii Social account sync returned an invalid response.', [
                'status' => $response->status(),
            ]);
            Cache::forget($cacheKey);

            return false;
        }

        Cache::put($cacheKey, true, self::ACCESS_CACHE_SECONDS);

        return true;
    }

    private function accessCacheKey(User $user, string $oidcId): string
    {
        return 'mochirii:social:member-access:'.hash('sha256', (string) $user->getAuthIdentifier().'|'.$oidcId);
    }
}
