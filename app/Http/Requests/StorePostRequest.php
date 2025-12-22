<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    private const MAX_IMAGES = 7;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'max:5120'],
            'video' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime', 'max:10240'],
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
            'video.mimetypes' => 'Videos must be MP4, WebM, or MOV files.',
            'video.max' => 'Videos must be 10MB or smaller.',
            'visibility.in' => 'Visibility must be public or followers only.',
        ];
    }
}
