<!DOCTYPE html>
<html>
<head>
    <title>soipattaya Map</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
        }
        .new-post-btn {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 999;
            background: #f33;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <a href="/post" class="new-post-btn">New Listing</a>
    <div id="map"></div>

    <script>
        function initMap() {
            const map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 12.9276, lng: 100.8771 }, 
                zoom: 13,
                gestureHandling: "greedy",
                disableDefaultUI: true  
            });

            function getColorByPrice(price) {
                if (price < 10000) return "#4CAF50";       // green: cheap
                if (price < 30000) return "#FF9800";       // orange: mid
                return "#F44336";                          // red: expensive
            }

            const data = @json($listings);

            Object.keys(data).forEach(building => {
                const first = data[building][0];
                const marker = new google.maps.Marker({
                    position: { lat: parseFloat(first.latitude), lng: parseFloat(first.longitude) },
                    map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: getColorByPrice(first.cost),
                        fillOpacity: 1,
                        strokeWeight: 0
                    }
                });

                const content = `
                    <div>
                        <a href="/building/${building}"><strong>${building}</strong></a><br>
                        ${data[building].map(l =>
                            `${l.floor} | ${l.sqm}㎡ | ¥${l.cost}`
                        ).join('<br>')}
                    </div>
                `;

                const info = new google.maps.InfoWindow({ content });

                marker.addListener('click', () => {
                    info.open(map, marker);
                });
            });
        }
    </script>

    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBVdAS-3mrNYARIDmqn2dP1tG1Khqv5GoM&callback=initMap" async defer></script>
</body>
</html>
