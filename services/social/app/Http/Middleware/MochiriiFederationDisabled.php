<?php

namespace App\Http\Middleware;

use Closure;

class MochiriiFederationDisabled
{
    /**
     * Federation is intentionally unavailable for the private Mochirii service.
     * Keep the boundary source-controlled rather than relying on controller fallbacks.
     */
    public function handle($request, Closure $next)
    {
        abort(404);
    }
}
