<?php

namespace App\Http\Controllers\OAuth;

use Illuminate\Http\Request;
use Laravel\Passport\Contracts\AuthorizationViewResponse;
use Laravel\Passport\Http\Controllers\AuthorizationController;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\HttpFoundation\Response;

class FirstPartyAuthorizationController extends AuthorizationController
{
    private const OOB_REDIRECT = 'urn:ietf:wg:oauth:2.0:oob';

    public function authorize(
        ServerRequestInterface $psrRequest,
        Request $request,
        ResponseInterface $psrResponse,
        AuthorizationViewResponse $viewResponse,
    ): Response|AuthorizationViewResponse {
        abort_if(
            $request->string('redirect_uri')->toString() === self::OOB_REDIRECT
                || $request->string('response_type')->toString() === 'token',
            404,
        );

        return parent::authorize($psrRequest, $request, $psrResponse, $viewResponse);
    }
}
