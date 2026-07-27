<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Avatar extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'deleted_at' => 'datetime',
            'last_fetched_at' => 'datetime',
            'last_processed_at' => 'datetime',
        ];
    }

    protected $visible = [
        'id',
        'profile_id',
        'size',
    ];

    protected $hidden = [
        'cdn_url',
        'media_path',
        'remote_url',
    ];

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }
}
