<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar_path',
        'cover_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * The attributes that should be appended to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar',
        'cover',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * The roles assigned to the user.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_followers', 'following_id', 'follower_id')
            ->withTimestamps();
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_followers', 'follower_id', 'following_id')
            ->withTimestamps();
    }

    public function likedPosts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_likes')->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function postLikes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    /**
     * Determine if the user has a given role by slug.
     */
    public function hasRole(string $slug): bool
    {
        return $this->roles->contains(fn ($role) => $role->slug === $slug);
    }

    /**
     * Determine if the user has a given permission via their roles.
     */
    public function hasPermission(string $slug): bool
    {
        return $this->roles->contains(function ($role) use ($slug) {
            /** @var \App\Models\Role $role */
            return $role->permissions->contains(fn ($perm) => $perm->slug === $slug);
        });
    }

    /**
     * Get the user's avatar URL if it exists.
     */
    protected function avatar(): Attribute
    {
        return Attribute::get(function () {
            if ($this->avatar_path) {
                return Storage::disk('public')->url($this->avatar_path);
            }

            // Fallback to Gravatar (or any identicon) so we always have an image URL.
            $hash = md5(strtolower(trim($this->email)));

            return "https://www.gravatar.com/avatar/{$hash}?s=256&d=identicon";
        });
    }

    protected function cover(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->cover_path) {
                return null;
            }

            return Storage::disk('public')->url($this->cover_path);
        });
    }
}
