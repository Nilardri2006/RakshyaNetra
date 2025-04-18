document.addEventListener('DOMContentLoaded', function () {
    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            navLinks.classList.toggle('active');
        });
    }

    // Initialize map if on map page
    const mapElement = document.getElementById('safety-map');
    if (mapElement) {
        window.initMap = initMap;
    }

    // SOS Button functionality
    const sosButton = document.querySelector('.sos-button');
    if (sosButton) {
        sosButton.addEventListener('click', function () {
            // Send POST request to Flask backend
            fetch('/api/trigger-sos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "EMERGENCY: I need immediate help!" })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || 'Emergency alert sent to your emergency contacts!');
            })
            .catch(() => {
                alert('Failed to send emergency alert.');
            });
        });
    }

    // Form validation and backend submission for standalone report page
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (validateForm(reportForm)) {
                const formData = new FormData(reportForm);
                const data = {
                    type: formData.get('incident-type'),
                    description: formData.get('incident-description'),
                    location: {
                        lat: parseFloat(formData.get('incident-lat')),
                        lng: parseFloat(formData.get('incident-lng'))
                    },
                    dateTime: formData.get('incident-date')
                };
                fetch('/api/report-incident', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message || 'Your report has been submitted successfully!');
                    reportForm.reset();
                })
                .catch(() => {
                    alert('Failed to submit report.');
                });
            } else {
                alert('Please fill in all required fields.');
            }
        });
    }
});

// Initialize Google Maps
function initMap() {
    const mapElement = document.getElementById('safety-map');
    const map = new google.maps.Map(mapElement, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    // Fetch heatmap data from backend
    fetch('/api/heatmap-data')
        .then(response => response.json())
        .then(safetyData => {
            const heatmapData = safetyData.map(item => ({
                location: new google.maps.LatLng(item.lat, item.lng),
                weight: item.weight || 1
            }));
            const heatmap = new google.maps.visualization.HeatmapLayer({
                data: heatmapData,
                map: map,
                radius: 50,
                gradient: [
                    'rgba(0, 255, 0, 0)',
                    'rgba(0, 255, 0, 1)',
                    'rgba(255, 255, 0, 1)',
                    'rgba(255, 0, 0, 1)'
                ]
            });
        });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            new google.maps.Marker({
                position: userLocation,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                },
                title: 'Your Location'
            });
            map.setCenter(userLocation);
        });
    }

    map.addListener('click', function (event) {
        showReportIncidentForm({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });
}

// Show modal and submit incident to backend
function showReportIncidentForm(location) {
    let modal = document.getElementById('incident-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'incident-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Report Incident</h2>
                <form id="incident-form">
                    <label for="incident-type">Type:</label>
                    <input type="text" id="incident-type" name="incident-type" required>
                    <label for="incident-description">Description:</label>
                    <textarea id="incident-description" name="incident-description" required></textarea>
                    <label for="incident-date">Date & Time:</label>
                    <input type="datetime-local" id="incident-date" name="incident-date" required>
                    <input type="hidden" id="incident-lat" name="incident-lat" value="${location.lat}">
                    <input type="hidden" id="incident-lng" name="incident-lng" value="${location.lng}">
                    <button type="submit">Submit</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        document.getElementById('incident-lat').value = location.lat;
        document.getElementById('incident-lng').value = location.lng;
    }
    modal.style.display = 'block';

    const closeButton = modal.querySelector('.close-button');
    closeButton.onclick = function () {
        modal.style.display = 'none';
    };

    const form = document.getElementById('incident-form');
    form.onsubmit = function (e) {
        e.preventDefault();
        // Gather data
        const data = {
            type: document.getElementById('incident-type').value,
            description: document.getElementById('incident-description').value,
            location: {
                lat: parseFloat(document.getElementById('incident-lat').value),
                lng: parseFloat(document.getElementById('incident-lng').value)
            },
            dateTime: document.getElementById('incident-date').value
        };
        // Send to backend
        fetch('/api/report-incident', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || 'Incident reported successfully!');
            modal.style.display = 'none';
        })
        .catch(() => {
            alert('Failed to report incident.');
        });
    };
}

// Form validation helper
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    return isValid;
}
