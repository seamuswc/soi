<!DOCTYPE html>
<html>
<head>
    <title>{{ $name }} Listings</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }
        .listing-card {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .listing-info {
            margin-bottom: 15px;
        }
        .renew-form {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        .network-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .network-option {
            flex: 1;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s;
        }
        .network-option.active {
            border-color: #007bff;
            background: #f0f8ff;
        }
        input, select {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background: #cc0000;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #a30000;
        }
        .expires {
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .expires.expired {
            color: #cc0000;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h2>🏢 Listings for {{ $name }}</h2>

    @foreach ($listings as $listing)
        <div class="listing-card">
            <div class="listing-info">
                <iframe width="300" height="200" src="{{ $listing->youtube_link }}" frameborder="0" allowfullscreen></iframe><br>
                <strong>{{ $listing->floor }} | {{ $listing->sqm }}㎡ | ¥{{ $listing->cost }}</strong><br>
                <p>{{ $listing->description }}</p>
                
                @php
                    $isExpired = $listing->expires_at->isPast();
                    $daysLeft = now()->diffInDays($listing->expires_at, false);
                @endphp
                
                <div class="expires {{ $isExpired ? 'expired' : '' }}">
                    @if($isExpired)
                        ⚠️ Expired {{ $listing->expires_at->diffForHumans() }}
                    @else
                        ✅ Expires in {{ $daysLeft }} days ({{ $listing->expires_at->format('M d, Y') }})
                    @endif
                </div>
            </div>

            <div class="renew-form">
                <h4>🔄 Renew Listing (1 USDC)</h4>
                <form method="POST" action="/renew/{{ $listing->id }}">
                    @csrf
                    <input type="hidden" name="payment_network" id="payment_network_{{ $listing->id }}" value="solana">
                    
                    <div class="network-selector">
                        <div class="network-option active" data-listing="{{ $listing->id }}" data-network="solana" onclick="selectNetwork({{ $listing->id }}, 'solana')">
                            <strong>Solana</strong>
                        </div>
                        <div class="network-option" data-listing="{{ $listing->id }}" data-network="aptos" onclick="selectNetwork({{ $listing->id }}, 'aptos')">
                            <strong>Aptos</strong>
                        </div>
                    </div>
                    
                    <input name="reference" placeholder="Payment reference" required>
                    <button type="submit">🔄 Renew for 30 days</button>
                </form>
            </div>
        </div>
    @endforeach

    <script>
        function selectNetwork(listingId, network) {
            // Update network selector for this listing
            const listingElement = document.querySelector(`[data-listing="${listingId}"]`).closest('.listing-card');
            listingElement.querySelectorAll('.network-option').forEach(opt => opt.classList.remove('active'));
            listingElement.querySelector(`[data-network="${network}"]`).classList.add('active');
            
            // Update hidden input
            listingElement.querySelector('#payment_network_' + listingId).value = network;
        }
    </script>
</body>
</html>
