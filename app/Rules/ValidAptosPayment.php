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
        $usdcMint = '0xf22bede237a07e121b56d91a491eb7bcdfd1f5906926a1fd406f32c364d5117::usdc::USDC'; // Correct LayerZero USDC on Aptos mainnet
        $recipientWallet = env('APTOS_WALLET', '');

        if (empty($recipientWallet)) {
            Log::error('ValidAptosPayment: Missing wallet address');
            return false;
        }

        // Using Aptos public API to check transactions for the RECIPIENT wallet
        $url = "https://mainnet.aptoslabs.com/v1/accounts/{$recipientWallet}/transactions?limit=50"; // Increased limit for better coverage

        Log::info("ValidAptosPayment: Checking transactions for recipient: {$recipientWallet}, reference: {$this->reference} (note: reference not verifiable on Aptos)");

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
                
                // Check if amount matches
                // NOTE: No reference check possible without custom contract - this is a limitation
                if ($amount >= $this->amount) {
                    Log::info("ValidAptosPayment: Valid USDC payment found (reference not verified).", [
                        'amount' => $amount,
                        'reference' => $this->reference,
                        'version' => $tx['version'] ?? 'unknown'
                    ]);
                    return true;
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
