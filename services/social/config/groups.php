<?php

return [
    'enabled' => env('GROUPS_ENABLED', false),
    'federation' => env('GROUPS_FEDERATION', false),

    'acl' => [
        'create_group' => [
            'admins' => env('GROUPS_ACL_CREATE_ADMINS', true),
            'users' => env('GROUPS_ACL_CREATE_USERS', true),
        ]
    ]
];
