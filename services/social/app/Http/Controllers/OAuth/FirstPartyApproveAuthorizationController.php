<?php

namespace App\Http\Controllers\OAuth;

use Illuminate\Http\Request;
use Laravel\Passport\Http\Controllers\ApproveAuthorizationController;
use Psr\Http\Message\ResponseInterface;
use Symfony\Component\HttpFoundation\Response;

class FirstPartyApproveAuthorizationController extends ApproveAuthorizationController
{
    private const OOB_REDIRECT = 'urn:ietf:wg:oauth:2.0:oob';

    public function approve(Request $request, ResponseInterface $psrResponse): Response
    {
        $authorization = $this->getAuthRequestFromSession($request);

        abort_if($authorization->getRedirectUri() === self::OOB_REDIRECT, 404);

        return parent::approve($request, $psrResponse);
    }
}
