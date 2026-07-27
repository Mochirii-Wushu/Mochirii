<?php

return [
    /*
    | Member media is served only through the authenticated same-origin
    | gateway. Static application artwork remains on the public disk.
    */
    'enabled' => (bool) env('MOCHIRII_PRIVATE_MEDIA_ENABLED', true),

    /* Keep cloud grants short enough to limit reuse while allowing a player
       to follow the redirect and begin an image or video request. */
    'temporary_url_seconds' => max(
        10,
        min(60, (int) env('MOCHIRII_PRIVATE_MEDIA_URL_TTL_SECONDS', 20))
    ),
];
