<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCandidateAccountRequest extends FormRequest
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
        $accountId = $this->route('candidateAccount')?->id ?? null;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:candidate_accounts,email,' . $accountId],
            'phone' => ['required', 'string', 'max:50', 'unique:candidate_accounts,phone,' . $accountId],
            'city' => ['nullable', 'string', 'max:255'],
        ];
    }
}
