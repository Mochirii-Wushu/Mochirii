<?php

namespace App\Services;

use App\DirectMessage;
use App\Follower;
use App\Media;
use App\Models\Group;
use App\Models\GroupBlock;
use App\Models\GroupComment;
use App\Models\GroupMedia;
use App\Models\GroupMember;
use App\Models\GroupPost;
use App\Profile;
use App\Status;
use App\Story;
use App\UserFilter;

class MochiriiPrivateMediaAccess
{
    public function media(Media $media, int $requesterProfileId): bool
    {
        if (! $media->status_id) {
            return (int) $media->profile_id === $requesterProfileId;
        }

        $isOwner = (int) $media->profile_id === $requesterProfileId;
        $status = $media->relationLoaded('status') ? $media->status : $media->status()->first();
        if ($status) {
            return (int) $status->profile_id === (int) $media->profile_id
                && ($isOwner || $this->status($status, $requesterProfileId));
        }

        // Group videos use the core Media model while group images use
        // GroupMedia. The attached group post is therefore an intentional
        // second resource type, not a fallback to an enumerable object ID.
        $path = (string) $media->getRawOriginal('media_path');
        if ((! str_starts_with($path, 'public/g/') && ! str_starts_with($path, 'public/g1/'))
            || ! str_starts_with(strtolower((string) $media->mime), 'video/')) {
            return false;
        }

        $post = GroupPost::query()
            ->where('group_id', '>', 0)
            ->where('profile_id', $media->profile_id)
            ->where('type', 'video')
            ->whereNull('status')
            ->find($media->status_id);

        return $post
            ? $this->groupContent($post->group, $post->visibility, (int) $post->profile_id, $requesterProfileId)
            : false;
    }

    public function profile(Profile $profile, int $requesterProfileId): bool
    {
        return (int) $profile->id === $requesterProfileId
            || ! $this->profilesBlockEachOther($requesterProfileId, (int) $profile->id);
    }

    public function story(Story $story, int $requesterProfileId): bool
    {
        if (! $story->expires_at || ! $story->expires_at->isFuture()) {
            return false;
        }

        if ((int) $story->profile_id === $requesterProfileId) {
            return true;
        }

        return (bool) $story->active
            && ! $this->profilesBlockEachOther($requesterProfileId, (int) $story->profile_id)
            && $this->follows($requesterProfileId, (int) $story->profile_id);
    }

    public function group(Group $group, int $requesterProfileId): bool
    {
        $admin = $group->admin;
        if (! $group->local
            || $group->status !== null
            || ! $admin
            || $admin->status !== null
            || $admin->deleted_at !== null
            || ! $admin->user
            || $admin->user->status !== null
            || $admin->user->deleted_at !== null) {
            return false;
        }

        if ((int) $group->profile_id === $requesterProfileId) {
            return true;
        }

        if (GroupBlock::query()
            ->where('group_id', $group->id)
            ->where('profile_id', $requesterProfileId)
            ->where('is_user', true)
            ->exists()) {
            return false;
        }

        return ! $group->is_private || $this->acceptedGroupMember((int) $group->id, $requesterProfileId);
    }

    public function groupMedia(GroupMedia $media, int $requesterProfileId): bool
    {
        if (! $media->group || ! $this->group($media->group, $requesterProfileId)) {
            return false;
        }

        if (! $media->status_id) {
            return (int) $media->profile_id === $requesterProfileId;
        }

        $isOwner = (int) $media->profile_id === $requesterProfileId;
        if (! $isOwner && $this->profilesBlockEachOther($requesterProfileId, (int) $media->profile_id)) {
            return false;
        }

        if ($media->is_comment) {
            $comment = GroupComment::query()
                ->where('group_id', $media->group_id)
                ->where('profile_id', $media->profile_id)
                ->whereNull('status')
                ->find($media->status_id);
            if (! $comment) {
                return false;
            }

            $rootPostExists = GroupPost::query()
                ->where('group_id', $media->group_id)
                ->whereNull('status')
                ->where('visibility', 'public')
                ->whereKey($comment->status_id)
                ->exists();

            return $rootPostExists && ($isOwner || $comment->visibility === 'public');
        }

        $post = GroupPost::query()
            ->where('group_id', $media->group_id)
            ->where('profile_id', $media->profile_id)
            ->whereNull('status')
            ->find($media->status_id);

        return $post && ($isOwner || $post->visibility === 'public');
    }

    private function status(Status $status, int $requesterProfileId): bool
    {
        if ((int) $status->profile_id === $requesterProfileId) {
            return true;
        }

        if ($this->profilesBlockEachOther($requesterProfileId, (int) $status->profile_id)) {
            return false;
        }

        $visibility = $status->scope ?? $status->visibility;

        return match ($visibility) {
            'public', 'unlisted' => ! $status->profile?->is_private
                || $this->follows($requesterProfileId, (int) $status->profile_id),
            'private' => $this->follows($requesterProfileId, (int) $status->profile_id),
            'direct' => DirectMessage::query()
                ->where('status_id', $status->id)
                ->where('from_id', $status->profile_id)
                ->where('to_id', $status->in_reply_to_profile_id)
                ->where(function ($query) use ($requesterProfileId) {
                    $query->where('from_id', $requesterProfileId)
                        ->orWhere('to_id', $requesterProfileId);
                })
                ->exists(),
            default => false,
        };
    }

    private function groupContent(?Group $group, ?string $visibility, int $ownerProfileId, int $requesterProfileId): bool
    {
        if (! $group) {
            return false;
        }

        if ($ownerProfileId === $requesterProfileId) {
            return $this->group($group, $requesterProfileId);
        }

        return $visibility === 'public'
            && ! $this->profilesBlockEachOther($requesterProfileId, $ownerProfileId)
            && $this->group($group, $requesterProfileId);
    }

    private function follows(int $requesterProfileId, int $ownerProfileId): bool
    {
        return Follower::query()
            ->where('profile_id', $requesterProfileId)
            ->where('following_id', $ownerProfileId)
            ->exists();
    }

    private function acceptedGroupMember(int $groupId, int $requesterProfileId): bool
    {
        return GroupMember::query()
            ->where('group_id', $groupId)
            ->where('profile_id', $requesterProfileId)
            ->where('join_request', false)
            ->whereNull('rejected_at')
            ->exists();
    }

    private function profilesBlockEachOther(int $leftProfileId, int $rightProfileId): bool
    {
        return UserFilter::query()
            ->where('filterable_type', Profile::class)
            ->where('filter_type', 'block')
            ->where(function ($query) use ($leftProfileId, $rightProfileId) {
                $query->where(function ($pair) use ($leftProfileId, $rightProfileId) {
                    $pair->where('user_id', $leftProfileId)
                        ->where('filterable_id', $rightProfileId);
                })->orWhere(function ($pair) use ($leftProfileId, $rightProfileId) {
                    $pair->where('user_id', $rightProfileId)
                        ->where('filterable_id', $leftProfileId);
                });
            })
            ->exists();
    }
}
