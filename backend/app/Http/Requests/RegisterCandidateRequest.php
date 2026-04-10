<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RegisterCandidateRequest extends FormRequest
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
            'full_name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:candidate_accounts,email'],
            'phone' => ['required', 'string', 'min:8', 'max:20', 'regex:/^[0-9+\s\-]+$/', 'unique:candidate_accounts,phone'],
            'password' => ['required', 'string', 'min:6', 'max:255', 'confirmed'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->email) {
            $this->merge(['email' => mb_strtolower(trim($this->email))]);
        }
    }

    public function messages(): array
    {
        return [
            'full_name.min' => 'Le nom doit contenir au moins 3 caractères.',
            'phone.regex' => 'Le numéro de téléphone ne doit contenir que des chiffres.',
            'phone.min' => 'Le numéro doit contenir au moins 8 chiffres.',
            'phone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'email.unique' => 'Cette adresse email est déjà utilisée.',
        ];
    }
}
