<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SiteSetting extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'logo_path',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'logo',
    ];

    /**
     * Return the public URL for the stored logo.
     */
    protected function logo(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->logo_path) {
                return null;
            }

            return Storage::disk('public')->url($this->logo_path);
        });
    }
}
