<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\OfferType;

class Offer extends Model
{
    use HasFactory;

    protected $appends = ['type_label'];

    protected $fillable = [
        'slug',
        'title',
        'type',
        'description',
        'is_open',
    ];

    protected $casts = [
        'is_open' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function getTypeLabelAttribute(): ?string
    {
        $key = (string) ($this->type ?? '');
        if ($key === '') return null;
        $offerType = OfferType::where('key', $key)->first();
        return $offerType ? $offerType->label : ucfirst($key);
    }
}
