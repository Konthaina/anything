<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Post extends Model
{
    /** @use HasFactory<\Database\Factories\PostFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'content',
        'image_paths',
        'likes_count',
        'comments_count',
        'shares_count',
    ];

    protected $appends = [
        'image_urls',
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
