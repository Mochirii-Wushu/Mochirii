<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Pixelfed\Snowflake\HasSnowflakePrimary;

/**
 * @property int $id
 * @property int $story_id
 * @property string|null $media_path
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class StoryItem extends Model
{
    use HasSnowflakePrimary;

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    protected $visible = ['id'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function story()
    {
        return $this->belongsTo(Story::class);
    }

    public function url()
    {
        // The legacy story_items table was removed. Keep this retired model
        // incapable of reintroducing a raw storage URL if referenced by old
        // extension code; current stories use the authenticated Story gateway.
        return app(Services\MochiriiPrivateMedia::class)->placeholder();
    }
}
