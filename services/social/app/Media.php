<?php

namespace App;

use App\Util\Media\License;
use App\Services\MochiriiPrivateMedia;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Media extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $hidden = [
        'cdn_url',
        'hls_path',
        'media_path',
        'optimized_url',
        'remote_url',
        'thumbnail_path',
        'thumbnail_url',
    ];

    protected function casts(): array
    {
        return [
            'srcset' => 'array',
            'deleted_at' => 'datetime',
            'skip_optimize' => 'boolean',
        ];
    }

    public function status()
    {
        return $this->belongsTo(Status::class);
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }

    public function url()
    {
        if ($this->remote_media) {
            return app(MochiriiPrivateMedia::class)->placeholder();
        }

        return app(MochiriiPrivateMedia::class)->media($this);
    }

    public function thumbnailUrl()
    {
        if ($this->remote_media) {
            return app(MochiriiPrivateMedia::class)->placeholder();
        }

        return app(MochiriiPrivateMedia::class)->media($this, MochiriiPrivateMedia::PREVIEW);
    }

    public function optimizedUrl()
    {
        if ($this->remote_media) {
            return app(MochiriiPrivateMedia::class)->placeholder();
        }

        return app(MochiriiPrivateMedia::class)->media($this, MochiriiPrivateMedia::OPTIMIZED);
    }

    public function thumb()
    {
        return $this->thumbnailUrl();
    }

    public function mimeType()
    {
        if (! $this->mime) {
            return;
        }

        return explode('/', $this->mime)[0];
    }

    public function activityVerb()
    {
        $verb = 'Document';
        switch ($this->mimeType()) {
            case 'audio':
                $verb = 'Audio';
                break;

            case 'image':
                $verb = 'Document';
                break;

            case 'video':
                $verb = 'Video';
                break;

            default:
                $verb = 'Document';
                break;
        }

        return $verb;
    }

    public function mediaType()
    {
        $verb = 'Document';
        switch ($this->mimeType()) {
            case 'audio':
                $verb = 'Audio';
                break;

            case 'image':
                $verb = 'Image';
                break;

            case 'video':
                $verb = 'Video';
                break;

            default:
                $verb = 'Image';
                break;
        }

        return $verb;
    }

    public function getMetadata()
    {
        return json_decode($this->metadata, true, 3);
    }

    public function getModel()
    {
        if (empty($this->metadata)) {
            return false;
        }
        $meta = $this->getMetadata();
        if ($meta && isset($meta['Model'])) {
            return $meta['Model'];
        }
    }

    public function getLicense()
    {
        $license = $this->license;

        if (! $license || strlen($license) > 2 || $license == 1) {
            return null;
        }

        if (! in_array($license, License::keys())) {
            return null;
        }

        $res = License::get()[$license];

        return [
            'id' => $res['id'],
            'title' => $res['title'],
            'url' => $res['url'],
        ];
    }
}
