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
            // Get emergency contacts from form
            const contacts = [];
            document.querySelectorAll('.emergency-contact').forEach(input => {
                if (input.value.trim()) contacts.push(input.value.trim());
            });

            // Get user details
            const userName = document.getElementById('user-name').value || 'Anonymous';

            // Get location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    sendAlert({
                        contacts: contacts,
                        user_name: userName,
                        location: `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`
                    });
                }, () => {
                    sendAlert({
                        contacts: contacts,
                        user_name: userName,
                        location: "Location unavailable"
                    });
                });
            } else {
                sendAlert({
                    contacts: contacts,
                    user_name: userName,
                    location: "Location service blocked"
                });
            }
        });
    }

    function sendAlert(data) {
        fetch('/api/trigger-sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                if (data.errors) {
                    alert(`Partial success: ${data.message}\nErrors: ${data.errors.join(', ')}`);
                } else {
                    alert(data.message);
                }
            })
            .catch(() => alert('Failed to send alerts'));
    }

    // Form validation and backend submission for standalone report page
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // Validate consent checkbox
            if (!document.getElementById('consent').checked) {
                alert('You must consent to submit the report.');
                return;
            }
            // Collect form data
            const data = {
                type: document.getElementById('incidentType').value,
                date: document.getElementById('incidentDate').value,
                time: document.getElementById('incidentTime').value,
                location: document.getElementById('incidentLocation').value,
                description: document.getElementById('incidentDescription').value,
                perpetrator: document.getElementById('perpetratorDescription').value,
                policeReport: document.getElementById('policeReport').checked,
                anonymous: document.getElementById('anonymous').checked,
                contactInfo: document.getElementById('contactInfo').value
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
        });
    }
});

let map, directionsService, directionsRenderer;

function initMap() {
    const mapElement = document.getElementById('safety-map');
    map = new google.maps.Map(mapElement, {
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

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: false });

    // Optionally, show user location
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
}

// This function is called when the user clicks "Find Safest Route"
async function calculateSafeRoute() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;

    if (!start || !end) {
        alert('Please enter both start and end locations.');
        return;
    }

    directionsService.route({
        origin: start,
        destination: end,
        travelMode: 'WALKING',
        provideRouteAlternatives: true
    }, async function (response, status) {
        if (status === 'OK') {
            // Fetch incident data
            const incidents = await fetch('/api/incidents').then(res => res.json());
            // Score each route
            const scoredRoutes = response.routes.map(route => {
                let dangerScore = 0;
                route.overview_path.forEach(point => {
                    incidents.forEach(incident => {
                        if (incident.location && isNear(point, incident.location, 0.002)) { // ~200m
                            dangerScore += incident.severity || 1;
                        }
                    });
                });
                return { route, dangerScore };
            });
            // Find safest route (lowest dangerScore)
            const safest = scoredRoutes.reduce((a, b) => a.dangerScore < b.dangerScore ? a : b);
            directionsRenderer.setDirections({ routes: [safest.route] });

            // Optionally, color safest route green and others red
            // (Advanced: requires custom Polyline drawing, see Google Maps docs)
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
}

// Helper: check if point is near incident
function isNear(point, incidentLocation, threshold) {
    const latDiff = Math.abs(point.lat() - incidentLocation.lat);
    const lngDiff = Math.abs(point.lng() - incidentLocation.lng);
    return latDiff < threshold && lngDiff < threshold;
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
