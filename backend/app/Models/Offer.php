<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    use HasFactory;

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
}
