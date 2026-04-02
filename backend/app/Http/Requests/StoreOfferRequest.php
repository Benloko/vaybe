<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOfferRequest extends FormRequest
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
            'title' => ['required', 'string', 'min:2', 'max:150'],
            'type' => ['required', 'string', 'min:2', 'max:50'],
            'description' => ['nullable', 'string', 'max:20000'],
            'is_open' => ['nullable', 'boolean'],
        ];
    }
}
