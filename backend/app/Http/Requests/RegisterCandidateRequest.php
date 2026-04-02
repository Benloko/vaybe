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
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:candidate_accounts,email'],
            'phone' => ['required', 'string', 'max:50', 'unique:candidate_accounts,phone'],
            'password' => ['required', 'string', 'min:6', 'max:255', 'confirmed'],
        ];
    }
}
