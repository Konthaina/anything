<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Post extends Model
{
    /** @use HasFactory<\Database\Factories\PostFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'content',
        'visibility',
        'image_paths',
        'video_path',
        'likes_count',
        'comments_count',
        'shares_count',
        'shared_post_id',
    ];

    protected $appends = [
        'image_urls',
        'video_url',
    ];

    protected function casts(): array
    {
        return [
            'likes_count' => 'integer',
            'comments_count' => 'integer',
            'shares_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function rootComments(): HasMany
    {
        return $this->comments()->whereNull('parent_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(PostShare::class);
    }

    public function sharedPost(): BelongsTo
    {
        return $this->belongsTo(self::class, 'shared_post_id');
    }

    public function isLikedBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($this->relationLoaded('likes')) {
            return $this->likes->contains('user_id', $user->id);
        }

        return $this->likes()->where('user_id', $user->id)->exists();
    }

    public function getImagePathsAttribute($value): array
    {
        if (! $value) {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values(array_filter($decoded)) : [];
    }

    public function setImagePathsAttribute($value): void
    {
        $paths = array_values(array_filter((array) $value));
        $this->attributes['image_paths'] = $paths ? json_encode($paths) : null;
    }

    protected function imageUrls(): Attribute
    {
        return Attribute::get(function () {
            $urls = array_map(
                fn (?string $path) => $this->resolveImageUrl($path),
                $this->image_paths ?? [],
            );

            return array_values(array_filter($urls));
        });
    }

    protected function videoUrl(): Attribute
    {
        return Attribute::get(function () {
            return $this->resolveImageUrl($this->video_path);
        });
    }

    private function resolveImageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
