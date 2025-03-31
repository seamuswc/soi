<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ListingController;

Route::get('/', [ListingController::class, 'index']);
Route::get('/post', [ListingController::class, 'create']);
Route::post('/post', [ListingController::class, 'store']);
Route::get('/building/{name}', [ListingController::class, 'show']);
Route::post('/renew/{listing}', [ListingController::class, 'renew']);

