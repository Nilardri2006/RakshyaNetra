// script.js

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
            alert('Emergency alert sent to your emergency contacts!');
        });
    }

    // Form validation
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function (e) {
            e.preventDefault();
            validateForm();
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

    const safetyData = [
        { location: new google.maps.LatLng(40.712, -74.006), weight: 5 },
        { location: new google.maps.LatLng(40.715, -74.009), weight: 3 },
        { location: new google.maps.LatLng(40.718, -74.015), weight: 8 },
        { location: new google.maps.LatLng(40.722, -74.001), weight: 2 },
        { location: new google.maps.LatLng(40.725, -74.011), weight: 6 }
    ];

    const heatmap = new google.maps.visualization.HeatmapLayer({
        data: safetyData,
        map: map,
        radius: 50,
        gradient: [
            'rgba(0, 255, 0, 0)',
            'rgba(0, 255, 0, 1)',
            'rgba(255, 255, 0, 1)',
            'rgba(255, 0, 0, 1)'
        ]
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
        showReportIncidentForm({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        });
    });
}

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
                    <input type="hidden" id="incident-lat" value="${location.lat}">
                    <input type="hidden" id="incident-lng" value="${location.lng}">
                    <div class="form-group">
                        <label for="incident-type">Incident Type:</label>
                        <select id="incident-type" required>
                            <option value="">Select type</option>
                            <option value="theft">Theft</option>
                            <option value="harassment">Harassment</option>
                            <option value="assault">Assault</option>
                            <option value="unsafe_area">Unsafe Area</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="incident-description">Description:</label>
                        <textarea id="incident-description" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="incident-date">Date & Time:</label>
                        <input type="datetime-local" id="incident-date" required>
                    </div>
                    <button type="submit" class="submit-button">Submit Report</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('incident-lat').value = location.lat;
    document.getElementById('incident-lng').value = location.lng;
    modal.style.display = 'block';

    const closeButton = modal.querySelector('.close-button');
    closeButton.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    const form = document.getElementById('incident-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const incidentData = {
            location: {
                lat: parseFloat(document.getElementById('incident-lat').value),
                lng: parseFloat(document.getElementById('incident-lng').value)
            },
            type: document.getElementById('incident-type').value,
            description: document.getElementById('incident-description').value,
            dateTime: document.getElementById('incident-date').value
        };

        console.log('Reporting incident:', incidentData);
        alert('Incident reported successfully!');
        modal.style.display = 'none';
    });
}

function validateForm() {
    const reportForm = document.getElementById('reportForm');
    let isValid = true;

    const requiredFields = reportForm.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });

    if (isValid) {
        const formData = new FormData(reportForm);
        console.log('Form submitted!');
        alert('Your report has been submitted successfully!');
        reportForm.reset();
    } else {
        alert('Please fill in all required fields.');
    }
}
