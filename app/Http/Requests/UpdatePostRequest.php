<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePostRequest extends FormRequest
{
    private const MAX_IMAGES = 7;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $post = $this->route('post');

        if (! $user || ! $post) {
            return false;
        }

        return $post->user_id === $user->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $post = $this->route('post');
        $requiresContent = ! $post || ! $post->shared_post_id;

        return [
            'content' => [Rule::requiredIf($requiresContent), 'nullable', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
            'video' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime', 'max:10240'],
            'remove_video' => ['nullable', 'boolean'],
            'visibility' => ['required', 'string', 'in:public,followers'],
        ];
    }

    /**
     * Get the validation messages for the defined rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'content.required' => 'Please enter a post message.',
            'content.max' => 'Post content may not be greater than 2000 characters.',
            'images.max' => 'You can upload up to '.self::MAX_IMAGES.' images.',
            'images.*.image' => 'Each file must be an image.',
            'images.*.max' => 'Each image must be 5MB or smaller.',
            'remove_image.boolean' => 'Remove image must be true or false.',
            'video.mimetypes' => 'Videos must be MP4, WebM, or MOV files.',
            'video.max' => 'Videos must be 10MB or smaller.',
            'remove_video.boolean' => 'Remove video must be true or false.',
            'visibility.in' => 'Visibility must be public or followers only.',
        ];
    }
}
