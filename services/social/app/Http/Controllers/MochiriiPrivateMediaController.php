<?php

namespace App\Http\Controllers;

use App\Avatar;
use App\Media;
use App\Models\Group;
use App\Models\GroupMedia;
use App\Services\MochiriiPrivateMediaAccess;
use App\Story;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MochiriiPrivateMediaController extends Controller
{
    private const ALLOWED_PREFIXES = [
        'public/m/',
        'public/_esm.t3/',
        'public/avatars/',
        'public/cache/avatars/',
        'cache/avatars/',
        'public/g/',
        'public/g1/',
    ];

    public function __construct(private MochiriiPrivateMediaAccess $access) {}

    public function show(Request $request, string $kind, string $id, string $variant = 'original')
    {
        abort_unless((bool) config('mochirii-private-media.enabled'), 404);
        abort_unless($request->user() && ctype_digit($id) && (int) $id > 0, 404);

        $resource = match ($kind) {
            'media' => $this->media((int) $id, $variant, (int) $request->user()->profile_id),
            'avatar' => $this->avatar((int) $id, $variant, (int) $request->user()->profile_id),
            'story' => $this->story((int) $id, $variant, (int) $request->user()->profile_id),
            'group' => $this->group((int) $id, $variant, (int) $request->user()->profile_id),
            'group-media' => $this->groupMedia((int) $id, $variant, (int) $request->user()->profile_id),
            default => null,
        };

        abort_unless($resource, 404);

        [$path, $cloud, $mime] = $resource;
        abort_unless($this->isSafeMemberPath($path), 404);

        return $cloud
            ? $this->redirectToTemporaryObject($path, $mime)
            : $this->streamLocalObject($request, $path, $mime);
    }

    private function media(int $id, string $variant, int $requesterProfileId): ?array
    {
        if (! in_array($variant, ['original', 'preview', 'optimized'], true)) {
            return null;
        }

        $media = Media::query()
            ->with(['profile.user', 'status'])
            ->where('remote_media', false)
            ->find($id);

        if (! $media || ! $this->activeProfile($media->profile) || ! $this->access->media($media, $requesterProfileId)) {
            return null;
        }

        $path = $variant === 'preview' && $media->thumbnail_path
            ? $media->thumbnail_path
            : $media->media_path;

        return $this->resource($path, (bool) $media->getRawOriginal('cdn_url'), $media->mime);
    }

    private function avatar(int $profileId, string $variant, int $requesterProfileId): ?array
    {
        if ($variant !== 'original') {
            return null;
        }

        $avatar = Avatar::query()
            ->with('profile.user')
            ->where('profile_id', $profileId)
            ->first();

        if (! $avatar || ! $this->activeProfile($avatar->profile) || $avatar->is_remote || ! $this->access->profile($avatar->profile, $requesterProfileId)) {
            return null;
        }

        return $this->resource(
            $avatar->media_path,
            (bool) $avatar->getRawOriginal('cdn_url'),
            $avatar->mime ?? null,
        );
    }

    private function story(int $id, string $variant, int $requesterProfileId): ?array
    {
        if ($variant !== 'original') {
            return null;
        }

        $story = Story::query()->with('profile.user')->find($id);
        if (! $story || ! $story->local || ! $this->activeProfile($story->profile) || ! $this->access->story($story, $requesterProfileId)) {
            return null;
        }

        return $this->resource($story->path, $this->cloudStorageEnabled(), $story->mime);
    }

    private function group(int $id, string $variant, int $requesterProfileId): ?array
    {
        if (! in_array($variant, ['avatar', 'header'], true)) {
            return null;
        }

        $group = Group::query()->with('admin.user')->whereNull('status')->find($id);
        if (! $group || ! $group->local || ! $this->activeProfile($group->admin) || ! $this->access->group($group, $requesterProfileId)) {
            return null;
        }

        $metadata = $group->metadata;
        $path = is_array($metadata) ? data_get($metadata, $variant.'.path') : null;

        return $this->resource($path, $this->cloudStorageEnabled(), null);
    }

    private function groupMedia(int $id, string $variant, int $requesterProfileId): ?array
    {
        if (! in_array($variant, ['original', 'preview'], true)) {
            return null;
        }

        $media = GroupMedia::query()
            ->with(['profile.user', 'group'])
            ->find($id);
        if (! $media || ! $media->group || $media->group->status !== null || ! $this->activeProfile($media->profile) || ! $this->access->groupMedia($media, $requesterProfileId)) {
            return null;
        }

        return $this->resource(
            $media->media_path,
            (bool) $media->getRawOriginal('cdn_url'),
            $media->mime,
        );
    }

    private function resource($path, bool $cloud, ?string $mime): ?array
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return [$path, $cloud, $mime];
    }

    private function activeProfile($profile): bool
    {
        return $profile
            && $profile->status === null
            && $profile->deleted_at === null
            && $profile->user
            && $profile->user->status === null
            && $profile->user->deleted_at === null;
    }

    private function isSafeMemberPath(string $path): bool
    {
        if ($path === '' || str_contains($path, "\0") || str_contains($path, '\\')) {
            return false;
        }

        if (str_contains($path, '..') || str_contains($path, '://') || str_starts_with($path, '/')) {
            return false;
        }

        if (! preg_match('/\A[A-Za-z0-9._\/-]+\z/', $path)) {
            return false;
        }

        foreach (self::ALLOWED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function redirectToTemporaryObject(string $path, ?string $mime)
    {
        try {
            $disk = Storage::disk(config('filesystems.cloud'));
            $url = $disk->temporaryUrl(
                $path,
                now()->addSeconds((int) config('mochirii-private-media.temporary_url_seconds')),
                array_filter([
                    'ResponseContentDisposition' => 'inline',
                    'ResponseContentType' => $mime,
                    'ResponseCacheControl' => 'private, no-store, max-age=0',
                ]),
            );
        } catch (\Throwable) {
            abort(404);
        }

        abort_unless($this->isAllowedTemporaryUrl($url), 404);

        return redirect()->away($url, 302, $this->privateHeaders());
    }

    private function isAllowedTemporaryUrl($url): bool
    {
        if (! is_string($url) || ! str_starts_with($url, 'https://')) {
            return false;
        }

        $parts = parse_url($url);
        $endpoint = parse_url((string) config('filesystems.disks.'.config('filesystems.cloud').'.endpoint'));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $endpointHost = strtolower((string) ($endpoint['host'] ?? ''));

        if (! $host || ! $endpointHost || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) {
            return false;
        }

        if ($host !== $endpointHost && ! str_ends_with($host, '.'.$endpointHost)) {
            return false;
        }

        parse_str((string) ($parts['query'] ?? ''), $query);

        return isset($query['X-Amz-Signature'], $query['X-Amz-Expires'])
            && ctype_digit((string) $query['X-Amz-Expires'])
            && (int) $query['X-Amz-Expires'] <= (int) config('mochirii-private-media.temporary_url_seconds');
    }

    private function streamLocalObject(Request $request, string $path, ?string $mime)
    {
        $disk = Storage::disk('local');
        abort_unless($disk->exists($path), 404);

        $absolutePath = $disk->path($path);
        abort_unless(is_file($absolutePath), 404);

        $headers = $this->privateHeaders();
        $headers['Content-Disposition'] = 'inline; filename="'.addcslashes(basename($path), '"\\').'"';
        if ($mime && preg_match('/\A(?:image|video)\/[A-Za-z0-9.+-]+\z/', $mime)) {
            $headers['Content-Type'] = $mime;
        }

        // Symfony's BinaryFileResponse provides standards-compliant Range and
        // If-Range handling for local image and video requests.
        $response = response()->file($absolutePath, $headers);
        $response->setPrivate();
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');

        return $response;
    }

    private function privateHeaders(): array
    {
        return [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'Vary' => 'Authorization, Cookie',
        ];
    }

    private function cloudStorageEnabled(): bool
    {
        return (bool) config_cache('pixelfed.cloud_storage');
    }
}
