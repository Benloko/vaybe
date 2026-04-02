<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:2', 'max:150'],
            'type' => ['sometimes', 'string', 'min:2', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'is_open' => ['sometimes', 'boolean'],
        ];
    }
}
