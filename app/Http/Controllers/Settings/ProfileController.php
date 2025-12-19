<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->fill($request->safe()->except(['avatar', 'cover']));

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $user->avatar_path = $this->storeCroppedAvatar($request->file('avatar'));
        }

        if ($request->hasFile('cover')) {
            if ($user->cover_path) {
                Storage::disk('public')->delete($user->cover_path);
            }

            $user->cover_path = $this->storeCoverImage($request->file('cover'));
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return back();
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        if ($user->cover_path) {
            Storage::disk('public')->delete($user->cover_path);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Crop the uploaded avatar to a square and store it on the public disk.
     */
    protected function storeCroppedAvatar(UploadedFile $file, int $size = 512): string
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

        // Create the destination canvas with alpha support.
        $canvas = imagecreatetruecolor($size, $size);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);

        // Crop and resize to a square.
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

        $path = 'avatars/'.Str::uuid()->toString().'.png';

        ob_start();
        imagepng($canvas);
        $contents = ob_get_clean();

        imagedestroy($image);
        imagedestroy($canvas);

        Storage::disk('public')->put($path, $contents);

        return $path;
    }

    protected function storeCoverImage(UploadedFile $file): string
    {
        return $file->store('covers', 'public');
    }
}
