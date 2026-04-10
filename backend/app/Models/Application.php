<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\ApplicationAccount;
use App\Models\ApplicationRole;
use App\Models\Offer;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;

class Application extends Model
{
    use HasFactory;

    private static ?array $roleLabelMap = null;

    protected $appends = [
        'profile_verified',
        'profile_verified_at',
        'offer_title',
        'offer_slug',
        'offer_type_label',
        'avatar_url',
        'role_label',
    ];

    protected $fillable = [
        'nom',
        'email',
        'telephone',
        'ville',
        'role',
        'message',
        'portfolio',
        'cv',
        'avatar_path',
        'score',
        'status',
        'offer_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(ApplicationMessage::class);
    }

    public function account()
    {
        return $this->hasOne(ApplicationAccount::class);
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class);
    }

    public function getProfileVerifiedAttribute(): bool
    {
        return !is_null($this->account?->verified_at);
    }

    public function getProfileVerifiedAtAttribute(): ?string
    {
        return $this->account?->verified_at?->toISOString();
    }

    public function getOfferTitleAttribute(): ?string
    {
        return $this->offer?->title;
    }

    public function getOfferSlugAttribute(): ?string
    {
        return $this->offer?->slug;
    }

    public function getOfferTypeLabelAttribute(): ?string
    {
        $type = $this->offer?->type;
        if (!$type) return null;
        return $this->offer?->type_label ?? ucfirst($type);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        $path = (string) ($this->avatar_path ?? '');
        $path = trim($path);
        if ($path === '') return null;

        try {
            /** @var FilesystemAdapter $disk */
            $disk = Storage::disk(config('filesystems.default', 'public'));
            $diskUrl = (string) $disk->url($path);
            $diskUrl = trim($diskUrl);
            if ($diskUrl === '') return null;

            // Si Storage::url() renvoie déjà une URL absolue, on la renvoie telle quelle.
            if (preg_match('#^https?://#i', $diskUrl)) {
                return $diskUrl;
            }

            // Sinon (ex: "/storage/..."), on la rend absolue via l'helper url().
            return url($diskUrl);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function getRoleLabelAttribute(): ?string
    {
        $key = (string) ($this->role ?? '');
        $key = trim($key);
        if ($key === '') return null;

        try {
            if (self::$roleLabelMap === null) {
                self::$roleLabelMap = ApplicationRole::query()
                    ->pluck('label', 'key')
                    ->toArray();
            }

            $label = self::$roleLabelMap[$key] ?? null;
            return $label ? (string) $label : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
