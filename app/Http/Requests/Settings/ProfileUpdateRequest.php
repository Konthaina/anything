<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],

            'avatar' => ['nullable', 'image', 'max:5120'],
            'cover' => ['nullable', 'image', 'max:5120'],
            'bio' => ['nullable', 'string', 'max:500'],
            'github_url' => [
                'nullable',
                'string',
                'max:255',
                'url',
                'regex:/^https?:\\/\\/(www\\.)?github\\.com(\\/.*)?$/i',
            ],
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
            'github_url.regex' => 'The GitHub URL must be a github.com link.',
        ];
    }
}
