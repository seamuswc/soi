<?php

function prompt($message) {
    echo $message . ": ";
    return trim(fgets(STDIN));
}

$apiKey = prompt("Enter your Helius API key");
$reference = prompt("Enter reference public key (used in Solana Pay)");
$amountUsdc = prompt("Enter expected amount in USDC (e.g. 2.00)");

$expectedAmount = floatval($amountUsdc);
$usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

$url = "https://api.helius.xyz/v0/addresses/{$reference}/transactions?api-key={$apiKey}&limit=10";

$response = file_get_contents($url);

if ($response === false) {
    echo "❌ Failed to contact Helius API.\n";
    exit(1);
}

$data = json_decode($response, true);
if (empty($data)) {
    echo "ℹ️ No transactions found for this reference.\n";
    exit(0);
}

$found = false;

foreach ($data as $tx) {
    if (!isset($tx['tokenTransfers'])) continue;

    foreach ($tx['tokenTransfers'] as $transfer) {
        if (
            $transfer['mint'] === $usdcMint &&
            isset($transfer['amount']) &&
            floatval($transfer['amount']) >= $expectedAmount
        ) {
            echo "✅ USDC Payment Found!\n";
            echo "Amount: " . $transfer['amount'] . " USDC\n";
            echo "From: " . $transfer['fromUserAccount'] . "\n";
            echo "To: " . $transfer['toUserAccount'] . "\n";
            echo "Signature: " . $tx['signature'] . "\n";
            $found = true;
            break 2;
        }
    }
}

if (!$found) {
    echo "❌ No matching USDC payment found.\n";
}
