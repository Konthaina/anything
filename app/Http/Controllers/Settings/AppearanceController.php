<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AppearanceUpdateRequest;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AppearanceController extends Controller
{
    /**
     * Show the appearance settings page.
     */
    public function edit(): Response
    {
        $site = SiteSetting::query()->latest()->first();

        return Inertia::render('settings/appearance', [
            'site' => $site ?: [
                'name' => config('app.name'),
                'logo' => null,
                'updated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Update site name and logo.
     */
    public function update(AppearanceUpdateRequest $request): RedirectResponse
    {
        $site = SiteSetting::query()->latest()->first() ?? new SiteSetting();

        $site->name = $request->string('name');

        if ($request->hasFile('logo')) {
            if ($site->logo_path) {
                Storage::disk('public')->delete($site->logo_path);
            }

            $site->logo_path = $this->storeCroppedLogo($request->file('logo'));
        }

        $site->save();

        return to_route('appearance.edit');
    }

    /**
     * Crop the uploaded logo to a square and store it on the public disk.
     */
    protected function storeCroppedLogo(UploadedFile $file, int $size = 512): string
    {
        $image = imagecreatefromstring(file_get_contents($file->getRealPath()));

        if (! $image) {
            throw new \RuntimeException('Unable to read uploaded image.');
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $squareSize = min($width, $height);
        $srcX = (int) (($width - $squareSize) / 2);
        $srcY = (int) (($height - $squareSize) / 2);

        $canvas = imagecreatetruecolor($size, $size);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);

        imagecopyresampled(
            $canvas,
            $image,
            0,
            0,
            $srcX,
            $srcY,
            $size,
            $size,
            $squareSize,
            $squareSize
        );

        $path = 'logos/'.Str::uuid()->toString().'.png';

        ob_start();
        imagepng($canvas);
        $contents = ob_get_clean();

        imagedestroy($image);
        imagedestroy($canvas);

        Storage::disk('public')->put($path, $contents);

        return $path;
    }
}
