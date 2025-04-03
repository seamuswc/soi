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
        $wallet = env('SOLANA_WALLET');
        $amountLamports = $this->amount * 1000000;

        // Get last 100 signatures
        $signaturesResponse = Http::post('https://api.mainnet-beta.solana.com', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'getSignaturesForAddress',
            'params' => [$wallet, ['limit' => 100]]
        ]);

        if (!$signaturesResponse->ok()) return false;

        $signatures = $signaturesResponse->json('result');

        foreach ($signatures as $sig) {
            $txResponse = Http::post('https://api.mainnet-beta.solana.com', [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getTransaction',
                'params' => [$sig['signature'], 'jsonParsed']
            ]);

            if (!$txResponse->ok()) continue;

            $tx = $txResponse->json('result');

            // Check for reference in memo or instructions
            $logs = json_encode($tx['meta']['logMessages'] ?? []);
            $msg = json_encode($tx['transaction']['message']);

            if (str_contains($msg, $this->reference) || str_contains($logs, $this->reference)) {
                return true;
            }
        }

        return false;
    }

    public function message()
    {
        return 'Solana Pay transaction not found or invalid.';
    }
}
