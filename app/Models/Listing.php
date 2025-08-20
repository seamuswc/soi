<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Listing extends Model
{
    protected $fillable = [
        'building_name',
        'latitude',
        'longitude',
        'floor',
        'sqm',
        'cost',
        'description',
        'youtube_link',
        'reference',
        'payment_network',
        'expires_at'
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'sqm' => 'integer',
        'cost' => 'integer',
        'expires_at' => 'datetime'
    ];
}
