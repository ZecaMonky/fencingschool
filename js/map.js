document.addEventListener('DOMContentLoaded', function() {
    const mapElement = document.getElementById('map');
    
    if (mapElement) {
        const map = L.map('map').setView([55.7558, 37.6173], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([55.7558, 37.6173]).addTo(map);
        marker.bindPopup("<b>Школа боевых искусств</b><br>Шоссейная 44 А, 5А").openPopup();
    } else {
        console.error('Map element not found');
    }
}); 