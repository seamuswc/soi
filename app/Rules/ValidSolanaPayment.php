<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ValidSolanaPayment implements Rule
{
    protected $reference;
    protected $amount;

    public function __construct($amount = 1)
    {
        $this->amount = floatval($amount);
    }

    public function passes($attribute, $value)
    {
        $this->reference = $value;
        $apiKey = env('HELIUS_API_KEY');
        $usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

        $url = "https://api.helius.xyz/v0/addresses/{$this->reference}/transactions?api-key={$apiKey}&limit=10";

        Log::info("ValidSolanaPayment: Checking transactions for reference: {$this->reference}, URL: {$url}");

        $response = Http::get($url);

        if (!$response->successful()) {
            Log::error('ValidSolanaPayment: Failed to fetch transactions.', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            return false;
        }

        $data = $response->json();
        if (empty($data)) {
            Log::info('ValidSolanaPayment: No transactions returned from Helius.');
            return false;
        }

        foreach ($data as $tx) {
            if (!isset($tx['tokenTransfers'])) continue;

            foreach ($tx['tokenTransfers'] as $transfer) {
                Log::debug('ValidSolanaPayment: Found token transfer', $transfer);

                if (
                    $transfer['mint'] === $usdcMint &&
                    isset($transfer['amount']) &&
                    floatval($transfer['amount']) >= $this->amount
                ) {
                    Log::info("ValidSolanaPayment: Valid USDC payment found.", [
                        'amount' => $transfer['amount'],
                        'mint' => $transfer['mint']
                    ]);
                    return true;
                }
            }
        }

        Log::info("ValidSolanaPayment: No valid USDC payment found for reference {$this->reference}.");
        return false;
    }

    public function message()
    {
        return 'No matching USDC payment was found for the reference provided.';
    }
}
