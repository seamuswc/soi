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
        $this->amount = $amount;
    }

    public function passes($attribute, $value)
    {
        $this->reference = $value;
        $wallet = env('SOLANA_WALLET');
        $amountLamports = $this->amount * 1_000_000;

        Log::info('🔍 Checking Solana payment', [
            'reference' => $this->reference,
            'wallet' => $wallet,
            'amount' => $amountLamports
        ]);

        // Step 1: Get ALL USDC token accounts
        $tokenAccountResp = Http::post('https://api.mainnet-beta.solana.com', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'getTokenAccountsByOwner',
            'params' => [
                $wallet,
                ['mint' => 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
                ['encoding' => 'jsonParsed']
            ]
        ]);

        if (!$tokenAccountResp->ok()) {
            Log::error('❌ Failed to get token account', ['response' => $tokenAccountResp->body()]);
            return false;
        }

        $accounts = $tokenAccountResp->json('result.value');
        if (empty($accounts)) {
            Log::warning('⚠️ No USDC token account found');
            return false;
        }

        // Step 2: Loop over each token account
        foreach ($accounts as $account) {
            $tokenAccount = $account['pubkey'];

            $signaturesResponse = Http::post('https://api.mainnet-beta.solana.com', [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getSignaturesForAddress',
                'params' => [$tokenAccount, ['limit' => 100]]
            ]);

            if (!$signaturesResponse->ok()) {
                Log::error('❌ Failed to get signatures', ['response' => $signaturesResponse->body()]);
                continue;
            }

            $signatures = $signaturesResponse->json('result');

            foreach ($signatures as $sig) {
                $txid = $sig['signature'];

                $txResponse = Http::post('https://api.mainnet-beta.solana.com', [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'getTransaction',
                    'params' => [$txid, 'jsonParsed']
                ]);

                if (!$txResponse->ok()) {
                    Log::warning('⚠️ Failed to fetch transaction', ['txid' => $txid]);
                    continue;
                }

                $tx = $txResponse->json('result');
                $logs = json_encode($tx['meta']['logMessages'] ?? []);
                $msg = json_encode($tx['transaction']['message'] ?? []);

                if (str_contains($msg, $this->reference) || str_contains($logs, $this->reference)) {
                    Log::info('✅ Found valid transaction', ['txid' => $txid]);
                    return true;
                } else {
                    Log::debug('🕵️ Reference not found in tx', ['txid' => $txid]);
                }
            }
        }

        Log::warning('⚠️ No valid transaction found for reference', ['reference' => $this->reference]);
        return false;
    }

    public function message()
    {
        return 'Solana Pay transaction not found. If sent, please wait a few seconds and try again.';
    }
}
