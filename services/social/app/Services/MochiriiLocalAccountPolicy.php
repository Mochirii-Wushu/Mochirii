<?php

namespace App\Services;

use App\User;

class MochiriiLocalAccountPolicy
{
    /**
     * These two local states are intentionally cleared by the existing
     * AuthLogin listener when the member signs in again.
     */
    private const REACTIVATABLE_STATUSES = ['disabled', 'delete'];

    public function mayAuthenticate(User $user): bool
    {
        return $this->statusMayAuthenticate($user->status)
            && $this->statusMayAuthenticate($this->profileStatus($user));
    }

    public function mayAccess(User $user): bool
    {
        return $user->status === null && $this->profileStatus($user) === null;
    }

    private function statusMayAuthenticate($status): bool
    {
        return $status === null || in_array($status, self::REACTIVATABLE_STATUSES, true);
    }

    private function profileStatus(User $user)
    {
        return $user->profile_id ? optional($user->profile)->status : null;
    }
}
