<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApplicationAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'email',
        'phone',
        'password_hash',
        'verification_code',
        'verification_sent_at',
        'verified_at',
    ];

    protected $casts = [
        'verification_sent_at' => 'datetime',
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}
