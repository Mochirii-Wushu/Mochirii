<?php

namespace App\Services;

use App\Media;
use App\Models\Group;
use App\Models\GroupMedia;
use App\Profile;
use App\Story;

class MochiriiPrivateMedia
{
    public const ORIGINAL = 'original';
    public const PREVIEW = 'preview';
    public const OPTIMIZED = 'optimized';

    public function media(Media $media, string $variant = self::ORIGINAL): string
    {
        return $this->gateway('media', $media->getKey(), $variant);
    }

    public function avatar(Profile $profile): string
    {
        return $this->gateway('avatar', $profile->getKey(), self::ORIGINAL);
    }

    public function story(Story $story): string
    {
        return $this->gateway('story', $story->getKey(), self::ORIGINAL);
    }

    public function group(Group $group, string $variant): string
    {
        if (! in_array($variant, ['avatar', 'header'], true)) {
            return $this->placeholder();
        }

        return $this->gateway('group', $group->getKey(), $variant);
    }

    public function groupMedia(GroupMedia $media, string $variant = self::ORIGINAL): string
    {
        return $this->gateway('group-media', $media->getKey(), $variant);
    }

    public function placeholder(): string
    {
        return url('/storage/no-preview.png');
    }

    private function gateway(string $kind, $id, string $variant): string
    {
        if (! config('mochirii-private-media.enabled')) {
            return $this->placeholder();
        }

        $id = filter_var($id, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        if (! $id) {
            return $this->placeholder();
        }

        return url('/media/private/'.$kind.'/'.$id.'/'.$variant);
    }
}
