<!DOCTYPE html>
<html>
<head>
    <title>{{ $name }} Listings</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h2>Listings for {{ $name }}</h2>

    @foreach ($listings as $listing)
        <div style="margin-bottom:20px;">
            <iframe width="300" height="200" src="{{ $listing->youtube_link }}" frameborder="0" allowfullscreen></iframe><br>
            <strong>{{ $listing->floor }} | {{ $listing->sqm }}㎡ | ¥{{ $listing->cost }}</strong><br>
            <p>{{ $listing->description }}</p>

            <form method="POST" action="/renew/{{ $listing->id }}">
                @csrf
                <input name="reference" placeholder="Payment reference UUID"><br>
                <button type="submit">Renew for 30 days</button>
            </form>
        </div>
    @endforeach
</body>
</html>
