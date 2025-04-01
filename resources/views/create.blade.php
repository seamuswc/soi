<!DOCTYPE html>
<html>
<head>
    <title>Create Listing</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h2>Create New Listing</h2>

    @if ($errors->any())
        <div style="color:red;">
            <ul>@foreach ($errors->all() as $error) <li>{{ $error }}</li> @endforeach</ul>
        </div>
    @endif

    <form method="POST" action="/post">
    @csrf
    <input type="hidden" name="reference" value="{{ $reference }}">

    <label>Google Maps Coordinates:</label><br>
    <input name="coordinates" placeholder="13.736717,100.523186" value="{{ old('coordinates') }}"><br>

    <label>Building Name:</label><br>
    <input name="building_name" value="{{ old('building_name') }}"><br>

    <label>Floor:</label><br>
    <input name="floor" value="{{ old('floor') }}"><br>

    <label>SQM:</label><br>
    <input name="sqm" type="number" value="{{ old('sqm') }}"><br>

    <label>Cost (Baht):</label><br>
    <input name="cost" type="number" value="{{ old('cost') }}"><br>

    <label>Description:</label><br>
    <textarea name="description">{{ old('description') }}</textarea><br>

    <label>YouTube Link:</label><br>
    <input name="youtube_link" value="{{ old('youtube_link') }}"><br>

    <p>Scan this to pay 1 USDC:</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?data=solana:{{ $wallet }}?amount={{ $amount }}&reference={{ $reference }}&spl-token=Es9vMFrzaCERi95c6rWCgM9jA76wARt8PZ8f1zx6AbzP" width="200">

    <br><button type="submit">Submit</button>
    </form>

</body>
</html>
