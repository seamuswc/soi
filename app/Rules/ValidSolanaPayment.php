<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\Http;

class ValidSolanaPayment implements Rule
{
    protected $reference;
    protected $amount;

    public function __construct($amount = 1)
    {
        $this->amount = $amount;
    }

    public function passes($attribute, $value)
    {
        $this->reference = $value;

        $url = 'https://api.helius.xyz/v0/addresses/' . env('SOLANA_WALLET') . '/transactions?api-key=' . env('HELIUS_API_KEY');
        $response = Http::get($url);

        if (!$response->ok()) return false;

        $transactions = $response->json();

        foreach ($transactions as $tx) {
            if (!isset($tx['events']['transfer'])) continue;

            foreach ($tx['events']['transfer'] as $transfer) {
                if (
                    isset($transfer['amount']) &&
                    $transfer['amount'] == $this->amount * 1_000_000 &&
                    str_contains($tx['transaction']['message'], $this->reference)
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    public function message()
    {
        return 'Solana Pay transaction not found or invalid.';
    }
}
