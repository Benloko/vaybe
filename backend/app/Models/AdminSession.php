<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AdminSession extends Model
{
    use HasFactory;

    protected $table = 'admin_sessions';

    protected $fillable = [
        'token_hash',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];
}
