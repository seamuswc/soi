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
        $recipientWallet = env('SOLANA_WALLET'); // The wallet that should receive payments
        $usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

        if (empty($apiKey) || empty($recipientWallet)) {
            Log::error('ValidSolanaPayment: Missing API key or wallet address');
            return false;
        }

        // Check transactions for the RECIPIENT wallet (not the reference)
        $url = "https://api.helius.xyz/v0/addresses/{$recipientWallet}/transactions?api-key={$apiKey}&limit=10";

        Log::info("ValidSolanaPayment: Checking transactions for recipient: {$recipientWallet}, reference: {$this->reference}");

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

                // Check if this is a USDC transfer to our wallet
                if (
                    $transfer['mint'] === $usdcMint &&
                    isset($transfer['amount']) &&
                    floatval($transfer['amount']) >= $this->amount &&
                    $transfer['toUserAccount'] === $recipientWallet
                ) {
                    // Check if the reference is included in the transaction
                    $txData = json_encode($tx);
                    if (str_contains($txData, $this->reference)) {
                        Log::info("ValidSolanaPayment: Valid USDC payment found with matching reference.", [
                            'amount' => $transfer['amount'],
                            'mint' => $transfer['mint'],
                            'reference' => $this->reference,
                            'signature' => $tx['signature'] ?? 'unknown'
                        ]);
                        return true;
                    }
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
