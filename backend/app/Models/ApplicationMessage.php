<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApplicationMessage extends Model
{
    use HasFactory;

    protected $table = 'application_messages';

    protected $fillable = [
        'application_id',
        'sender',
        'kind',
        'body',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}
