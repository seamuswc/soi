<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Listing extends Model
{
    public function up()
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->string('building_name');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('floor');
            $table->integer('sqm');
            $table->integer('cost');
            $table->text('description');
            $table->string('youtube_link');
            $table->uuid('reference')->unique();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

}
