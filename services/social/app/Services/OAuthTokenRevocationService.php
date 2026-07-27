<?php

namespace App\Services;

use App\User;
use Laravel\Passport\AccessToken;
use Laravel\Passport\Passport;
use Laravel\Passport\Token;

class OAuthTokenRevocationService
{
    public function revokeCurrentFor(User $user, AccessToken $currentAccessToken): bool
    {
        $tokenId = $currentAccessToken->toArray()['oauth_access_token_id'] ?? null;

        if (! is_string($tokenId) || $tokenId === '') {
            return false;
        }

        return Passport::token()->getConnection()->transaction(function () use ($user, $tokenId) {
            $token = Passport::token()
                ->newQuery()
                ->whereKey($tokenId)
                ->where('user_id', $user->getAuthIdentifier())
                ->lockForUpdate()
                ->first();

            if (! $token) {
                return false;
            }

            $this->revokeTokenPair($token);

            return true;
        });
    }

    public function revokeAllFor(User $user): void
    {
        Passport::token()->getConnection()->transaction(function () use ($user) {
            Passport::token()
                ->newQuery()
                ->where('user_id', $user->getAuthIdentifier())
                ->lockForUpdate()
                ->get()
                ->each(function (Token $token) {
                    $this->revokeTokenPair($token);
                });
        });
    }

    private function revokeTokenPair(Token $token): void
    {
        Passport::refreshToken()
            ->newQuery()
            ->where('access_token_id', $token->getKey())
            ->lockForUpdate()
            ->get()
            ->each(function ($refreshToken) {
                if (! $refreshToken->revoked) {
                    $refreshToken->revoke();
                }
            });

        if (! $token->revoked) {
            $token->revoke();
        }
    }
}
