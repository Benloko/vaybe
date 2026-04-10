<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email'))),
            'portfolio' => $this->input('portfolio') !== '' ? $this->input('portfolio') : null,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'offer_id' => ['required', 'integer', 'exists:offers,id'],
            'nom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'telephone' => ['required', 'string', 'max:30'],
            'ville' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'exists:application_roles,key'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'portfolio' => ['nullable', 'string', 'url', 'max:2048'],
            'cv' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'offer_id.required' => 'Choisissez une opportunité.',
            'offer_id.exists' => 'Opportunité invalide.',
            'nom.required' => 'Le nom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'Le format de l\'email est invalide.',
            'telephone.required' => 'Le numéro de téléphone est obligatoire.',
            'ville.required' => 'La ville de résidence est obligatoire.',
            'role.required' => 'Le rôle est obligatoire.',
            'role.exists' => 'Rôle invalide.',
            'message.required' => 'Le message de motivation est obligatoire.',
            'message.min' => 'Le message doit contenir au moins :min caractères.',
            'portfolio.url' => 'Le portfolio doit être une URL valide.',
            'cv.required' => 'Le CV (PDF) est obligatoire.',
            'cv.mimes' => 'Le CV doit être un fichier PDF.',
            'cv.max' => 'Le CV ne doit pas dépasser :max Ko.',
        ];
    }
}
