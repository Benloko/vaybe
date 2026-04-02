<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InitApplicationAccountRequest extends FormRequest
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
            'channel' => ['required', 'string', 'in:email,phone'],
            'value' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->sometimes('value', ['email'], function ($input) {
            return ($input->channel ?? null) === 'email';
        });
    }

    public function messages(): array
    {
        return [
            'channel.required' => 'Choisissez un mode de validation (email ou téléphone).',
            'channel.in' => 'Le mode doit être email ou phone.',
            'value.required' => 'La valeur à confirmer est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        ];
    }
}
