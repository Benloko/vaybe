<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CandidateMessageDismissal extends Model
{
    use HasFactory;

    protected $table = 'candidate_message_dismissals';

    protected $fillable = [
        'candidate_email',
        'application_id',
        'application_message_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
