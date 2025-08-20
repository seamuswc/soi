<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ValidAptosPayment implements Rule
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
        $usdcMint = '0x1::coin::USDC'; // Aptos USDC mint address
        $recipientWallet = env('APTOS_WALLET', '');

        if (empty($recipientWallet)) {
            Log::error('ValidAptosPayment: Missing wallet address');
            return false;
        }

        // Using Aptos public API to check transactions for the RECIPIENT wallet
        $url = "https://mainnet.aptoslabs.com/v1/accounts/{$recipientWallet}/transactions?limit=10";

        Log::info("ValidAptosPayment: Checking transactions for recipient: {$recipientWallet}, reference: {$this->reference}");

        $response = Http::get($url);

        if (!$response->successful()) {
            Log::error('ValidAptosPayment: Failed to fetch transactions.', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            return false;
        }

        $data = $response->json();
        if (empty($data)) {
            Log::info('ValidAptosPayment: No transactions returned from Aptos API.');
            return false;
        }

        foreach ($data as $tx) {
            if (!isset($tx['payload']['function']) || 
                $tx['payload']['function'] !== '0x1::coin::transfer') {
                continue;
            }

            // Check if this is a USDC transfer to our wallet
            if (isset($tx['payload']['type_arguments']) && 
                in_array($usdcMint, $tx['payload']['type_arguments'])) {
                
                // Check amount (Aptos uses 6 decimals for USDC)
                $amount = isset($tx['payload']['arguments'][1]) ? 
                         floatval($tx['payload']['arguments'][1]) / 1000000 : 0;
                
                // Check if amount matches and reference is in the transaction
                if ($amount >= $this->amount) {
                    $txData = json_encode($tx);
                    if (str_contains($txData, $this->reference)) {
                        Log::info("ValidAptosPayment: Valid USDC payment found with matching reference.", [
                            'amount' => $amount,
                            'reference' => $this->reference,
                            'version' => $tx['version'] ?? 'unknown'
                        ]);
                        return true;
                    }
                }
            }
        }

        Log::info("ValidAptosPayment: No valid USDC payment found for reference {$this->reference}.");
        return false;
    }

    public function message()
    {
        return 'No matching USDC payment was found for the reference provided on Aptos.';
    }
}
