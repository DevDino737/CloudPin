/* CloudPin.js — accurate 5-mile radius version for YOUR layout */

let pitch = 0;
let heading = 0;
let lat = null, lng = null;
let tiltSamples = [];
let map, circleLayer, userMarker;

// UI
const enableBtn = document.getElementById("enableSensorsBtn");
const snapBtn = document.getElementById("snapBtn");
const cameraInput = document.getElementById("cameraInput");
const preview = document.getElementById("photoPreview");
const statusBox = document.getElementById("status");

// Debug
function debug(msg) {
    const box = document.getElementById("debugConsole");
    box.textContent += msg + "\n";
    box.scrollTop = box.scrollHeight;
}

// ---------------------------
// INIT MAP (hidden until photo)
// ---------------------------
function initMap() {
    if (map) return;

    document.getElementById("map").style.display = "block";

    map = L.map("map").setView([38.627, -90.199], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
    }).addTo(map);
}

// ---------------------------
// PERMISSIONS
// ---------------------------
enableBtn.onclick = async () => {
    try {
        if (DeviceOrientationEvent?.requestPermission) {
            const res = await DeviceOrientationEvent.requestPermission();
            if (res !== "granted") {
                alert("Compass permission denied");
                return;
            }
        }
        startOrientationTracking();
        startGPS();
        statusBox.textContent = "Compass + GPS active. Take a photo.";
    } catch (err) {
        debug("Permission error: " + err);
    }
};

// ---------------------------
// ORIENTATION
// ---------------------------
function startOrientationTracking() {
    window.addEventListener("deviceorientation", (e) => {
        if (e.beta == null || e.alpha == null) return;

        pitch = smoothTilt(e.beta);   // front/back tilt
        heading = e.alpha;            // compass heading

        debug(`pitch: ${pitch.toFixed(1)}°, heading: ${heading.toFixed(1)}°`);
    });
}

function smoothTilt(v) {
    tiltSamples.push(v);
    if (tiltSamples.length > 10) tiltSamples.shift();
    return tiltSamples.reduce((a, b) => a + b, 0) / tiltSamples.length;
}

// ---------------------------
// GPS
// ---------------------------
function startGPS() {
    navigator.geolocation.watchPosition((pos) => {
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;

        if (!map) return;
        if (!userMarker) {
            userMarker = L.marker([lat, lng]).addTo(map);
        } else {
            userMarker.setLatLng([lat, lng]);
        }
    });
}

// ---------------------------
// TAKE PHOTO
// ---------------------------
snapBtn.onclick = () => {
    cameraInput.click();
};

cameraInput.onchange = () => {
    const file = cameraInput.files[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

    initMap();
    calculateCloudPoint();
};

// ---------------------------
// CLOUD POINT MATH
// ---------------------------
function calculateCloudPoint() {
    if (!lat || !pitch) {
        alert("Still getting GPS or tilt… try again.");
        return;
    }

    // Choose a reasonable cloud height
    const cloudHeightFt = 12000; 
    const cloudMiles = cloudHeightFt / 5280;

    const pitchRad = (pitch * Math.PI) / 180;

    // distance ahead based on tilt
    const distanceMiles = cloudMiles / Math.tan(pitchRad);

    debug(`distance ahead: ${distanceMiles.toFixed(2)} miles`);

    // project using Haversine
    const point = movePoint(lat, lng, distanceMiles, heading);

    debug(`projected: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);

    // clear old circle
    if (circleLayer) map.removeLayer(circleLayer);

    circleLayer = L.circle([point.lat, point.lng], {
        radius: 8046.72, // 5 miles in meters
        color: "red",
        fillOpacity: 0.25,
    }).addTo(map);

    map.setView([point.lat, point.lng], 12);

    statusBox.textContent = "Cloud marked on map!";
}

// ---------------------------
// HAVERSINE PROJECTION
// ---------------------------
function movePoint(lat, lng, distMiles, bearingDeg) {
    const R = 3958.8; // earth radius (miles)
    const br = (bearingDeg * Math.PI) / 180;

    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distMiles / R) +
        Math.cos(lat1) * Math.sin(distMiles / R) * Math.cos(br)
    );

    const lng2 =
        lng1 +
        Math.atan2(
            Math.sin(br) * Math.sin(distMiles / R) * Math.cos(lat1),
            Math.cos(distMiles / R) - Math.sin(lat1) * Math.sin(lat2)
        );

    return {
        lat: (lat2 * 180) / Math.PI,
        lng: (lng2 * 180) / Math.PI,
    };
}
