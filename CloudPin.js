// ===== Elements
const cameraInput = document.getElementById("cameraInput");
const snapBtn = document.getElementById("snapBtn");
const enableSensorsBtn = document.getElementById("enableSensorsBtn");
const statusEl = document.getElementById("status");
const photoPreview = document.getElementById("photoPreview");
const mapDiv = document.getElementById("map");

// ===== State
let deviceHeading = null; // 0..360 (0 = North, 90 = East)
let tiltBeta = null;      // phone tilt (optional)
let userPos = null;       // { lat, lon }
let map, cloudCircle, cloudMarker;

// ===== Utils
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

// Project a point from lat/lon by bearing (deg) and distance (km)
function projectPoint(latDeg, lonDeg, bearingDeg, distanceKm) {
  const R = 6371; // km
  const φ1 = toRad(latDeg);
  const λ1 = toRad(lonDeg);
  const θ  = toRad(bearingDeg);
  const δ  = distanceKm / R;

  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ), cosδ = Math.cos(δ);
  const sinθ = Math.sin(θ), cosθ = Math.cos(θ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosθ;
  const φ2 = Math.asin(sinφ2);

  const y = sinθ * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return { lat: toDeg(φ2), lon: toDeg(λ2) };
}

// Very rough distance guess from tilt; fallback if no tilt
function estimateDistanceKm(betaTilt) {
  if (betaTilt === null || isNaN(betaTilt)) return 20; // default ~20 km
  // If phone is closer to horizon (|beta| small), assume farther;
  // if tilted up a lot (|beta| big), assume closer.
  const abs = Math.min(60, Math.abs(betaTilt)); // cap influence
  const d = 30 - abs * 0.3; // 30km down to ~12km
  return Math.max(8, Math.round(d));
}

// ===== Map
function ensureMap() {
  if (!map) {
    map = L.map("map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }
  mapDiv.style.display = "block";
}

function showCloudOnMap(lat, lon) {
  ensureMap();
  const radiusMeters = 3000; // 3 km red radius (uncertainty)
  if (!cloudCircle) {
    cloudCircle = L.circle([lat, lon], {
      radius: radiusMeters,
      color: "red",
      fillColor: "red",
      fillOpacity: 0.25
    }).addTo(map);
    cloudMarker = L.marker([lat, lon]).addTo(map)
      .bindPopup("☁️ Estimated cloud location")
      .openPopup();
  } else {
    cloudCircle.setLatLng([lat, lon]);
    cloudCircle.setRadius(radiusMeters);
    cloudMarker.setLatLng([lat, lon]);
  }
  map.setView([lat, lon], 11);
}

// ===== Sensors (compass + tilt)
function onOrientation(e) {
  // iOS sometimes provides webkitCompassHeading (0 = North, clockwise)
  if (typeof e.webkitCompassHeading === "number") {
    deviceHeading = e.webkitCompassHeading;
  } else if (typeof e.alpha === "number") {
    // alpha is 0..360. Many browsers expose magnetic north.
    // Using as-is for MVP.
    deviceHeading = e.alpha;
  }
  tiltBeta = (typeof e.beta === "number") ? e.beta : tiltBeta;
}

window.addEventListener("deviceorientation", onOrientation, { passive: true });

// iOS: must request permission for motion/compass
enableSensorsBtn.addEventListener("click", async () => {
  try {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      const resp = await DeviceOrientationEvent.requestPermission();
      if (resp !== "granted") throw new Error("Permission not granted");
    }
    statusEl.textContent = "✅ Compass enabled. Now tap ‘Snap Cloud Photo’.";
  } catch (err) {
    statusEl.textContent = `⚠️ Couldn’t enable compass: ${err.message}`;
  }
});

// ===== Geolocation (must be HTTPS or localhost)
function getLocationOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// ===== Camera
snapBtn.addEventListener("click", () => {
  cameraInput.click(); // opens native camera
});

cameraInput.addEventListener("change", async (evt) => {
  const file = evt.target.files?.[0];
  if (!file) return;

  // Show a tiny preview (optional)
  const url = URL.createObjectURL(file);
  photoPreview.src = url;
  photoPreview.style.display = "block";

  // Get current location (each snap we re-read in case you moved)
  try {
    statusEl.textContent = "📍 Getting your location…";
    userPos = await getLocationOnce();
  } catch (e) {
    statusEl.textContent = `❌ Geolocation error: ${e.message}. Make sure the site is HTTPS and location allowed.`;
    return;
  }

  // Validate we have a heading
  if (deviceHeading === null || isNaN(deviceHeading)) {
    statusEl.textContent = "⚠️ No compass data. Tap ‘Enable Compass’, then try again.";
    return;
  }

  // Estimate distance based on tilt (or default)
  const distanceKm = estimateDistanceKm(tiltBeta);
  const bearing = Number(deviceHeading) % 360;

  // Project the cloud location from your spot
  const cloud = projectPoint(userPos.lat, userPos.lon, bearing, distanceKm);

  // Update UI + map
  statusEl.innerHTML = `
    ✅ Photo captured<br>
    🧭 Heading: ${Math.round(bearing)}° ${bearingToText(bearing)} &nbsp; | &nbsp; 📐 Tilt: ${tiltBeta !== null ? Math.round(tiltBeta) + "°" : "n/a"}<br>
    📍 You: ${userPos.lat.toFixed(4)}, ${userPos.lon.toFixed(4)}<br>
    ☁️ Cloud est.: ${cloud.lat.toFixed(4)}, ${cloud.lon.toFixed(4)} (~${distanceKm} km away)
  `;
  showCloudOnMap(cloud.lat, cloud.lon);
});

// Small helper to convert bearing to a compass label
function bearingToText(b) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                "S","SSW","SW","WSW","W","WNW","NW","NNW","N"];
  return dirs[Math.round(b / 22.5)];
}
