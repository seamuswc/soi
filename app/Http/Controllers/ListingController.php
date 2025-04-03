<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
//use App\Rules\ValidSolanaPayment;

class ListingController extends Controller
{
    public function index()
    {
        $listings = Listing::all()->groupBy('building_name');
        return view('map', compact('listings'));
    }

    public function create()
    {
        return view('create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'building_name' => 'required|string',
            'coordinates' => 'required|string',
            'floor' => 'required|string',
            'sqm' => 'required|integer',
            'cost' => 'required|integer',
            'description' => 'required|string',
            'youtube_link' => 'required|url',
            'reference' => 'required|string'
            //'reference' => ['required', 'string', new ValidSolanaPayment()],
        ]);

        [$lat, $lng] = explode(',', str_replace(' ', '', $request->coordinates));

        
        
        Listing::create([
            'building_name' => $request->building_name,
            'latitude' => $lat,
            'longitude' => $lng,
            'floor' => $request->floor,
            'sqm' => $request->sqm,
            'cost' => $request->cost,
            'description' => $request->description,
            'youtube_link' => $request->youtube_link,
            'reference' => $request->reference,
            'expires_at' => now()->addDays(30),
        ]);

        return redirect('/');
    }

    public function show($name)
    {
        $listings = Listing::where('building_name', $name)->get();
        abort_if($listings->isEmpty(), 404);
        return view('detail', compact('listings', 'name'));
    }

    public function renew(Listing $listing, Request $request)
    {
        $request->validate(['reference' => 'required|string']);

        $listing->expires_at = now()->addDays(30);
        $listing->reference = $request->reference;
        $listing->save();

        return back()->with('message', 'Listing renewed for 30 more days.');
    }

    protected function checkSolanaPayment($reference, $amount)
    {
        $url = 'https://api.helius.xyz/v0/addresses/' . env('SOLANA_WALLET') . '/transactions?api-key=' . env('HELIUS_API_KEY');

        $response = Http::get($url);

        if (!$response->ok()) return false;

        $transactions = $response->json();

        foreach ($transactions as $tx) {
            if (!isset($tx['events']['transfer'])) continue;

            foreach ($tx['events']['transfer'] as $transfer) {
                if (
                    isset($transfer['amount']) &&
                    $transfer['amount'] == $amount * 1_000_000 &&
                    str_contains($tx['transaction']['message'], $reference)
                ) {
                    return true;
                }
            }
        }

        return false;
    }


}
