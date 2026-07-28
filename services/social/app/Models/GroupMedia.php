<?php

namespace App\Models;

use App\Profile;
use App\Services\MochiriiPrivateMedia;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupMedia extends Model
{
    use HasFactory;

    protected $hidden = [
        'cdn_url',
        'media_path',
        'thumbnail_url',
        'url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'json',
            'processed_at' => 'datetime',
            'thumbnail_generated' => 'datetime',
        ];
    }

    public function url()
    {
        return app(MochiriiPrivateMedia::class)->groupMedia($this);
    }

    public function thumbnailUrl()
    {
        return app(MochiriiPrivateMedia::class)->groupMedia($this, MochiriiPrivateMedia::PREVIEW);
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
