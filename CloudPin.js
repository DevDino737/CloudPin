// ====== Elements ======
const cameraInput = document.getElementById("cameraInput");
const openCameraBtn = document.getElementById("openCameraBtn");
const enableSensorsBtn = document.getElementById("enableSensorsBtn");
const output = document.getElementById("output");
const mapDiv = document.getElementById("map");

// ====== State ======
let deviceHeading = null;  // degrees (0..360), 0 = North, 90 = East
let tiltAngle = null;      // beta tilt, not required but can improve distance guess
let map, userMarker, cloudCircle, cloudMarker, lineToCloud;

// ====== Helpers ======
const toRad = d => (d * Math.PI) / 180;
const toDeg = r => (r * 180) / Math.PI;

// Project a destination lat/lon given start, bearing (deg), distance (km)
function projectPoint(latDeg, lonDeg, bearingDeg, distanceKm) {
  const R = 6371.0; // Earth radius (km)
  const φ1 = toRad(latDeg);
  const λ1 = toRad(lonDeg);
  const θ = toRad(bearingDeg);
  const δ = distanceKm / R;

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

// Very rough distance estimate from phone tilt.
// If you hold phone ~level at horizon (tilt ~0), cloud is "far".
// If you tilt up (negative beta), we assume closer.
// We clamp to a reasonable range (10–80 km) for visible low clouds.
function estimateDistanceKm(betaTilt) {
  // Defaults if we can’t read tilt:
  if (betaTilt === null || isNaN(betaTilt)) return 40;

  // beta: front/back tilt ~ (-180..180)
  // Assume 0° ≈ horizon-ish when holding phone upright-ish.
  // Map |beta| to distance range. More up (negative) => closer.
  const abs = Math.abs(betaTilt);
  let d = 60 - (abs * 0.6); // crude linear map
  d = Math.max(10, Math.min(80, d));
  return Math.round(d);
}

// Build a friendly place name from Nominatim reverse result
function formatPlaceName(addr) {
  if (!addr) return "unknown place";
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    "unknown place"
  ) + (addr.state ? `, ${addr.state}` : "");
}

// Initialize Leaflet map (once)
function ensureMap(lat, lon) {
  if (!map) {
    map = L.map("map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }
  // Fit to user by default
  map.setView([lat, lon], 10);
  mapDiv.style.display = "block";
}

// Draw/update markers & radius on map
function drawOnMap(user, cloud, cityLabel) {
  ensureMap(user.lat, user.lon);

  // User marker
  if (!userMarker) {
    userMarker = L.marker([user.lat, user.lon], { title: "Your location" }).addTo(map);
  } else {
    userMarker.setLatLng([user.lat, user.lon]);
  }

  // Cloud circle + marker
  const radiusMeters = 3000; // radius showing uncertainty (~3 km)
  if (!cloudCircle) {
    cloudCircle = L.circle([cloud.lat, cloud.lon], {
      radius: radiusMeters,
      color: "red",
      fillColor: "red",
      fillOpacity: 0.25
    }).addTo(map);
  } else {
    cloudCircle.setLatLng([cloud.lat, cloud.lon]);
    cloudCircle.setRadius(radiusMeters);
  }

  if (!cloudMarker) {
    cloudMarker = L.marker([cloud.lat, cloud.lon], { title: "Estimated cloud position" })
      .addTo(map)
      .bindPopup(`☁️ Cloud above ~<b>${cityLabel}</b>`);
  } else {
    cloudMarker.setLatLng([cloud.lat, cloud.lon]);
    cloudMarker.setPopupContent(`☁️ Cloud above ~<b>${cityLabel}</b>`);
  }

  // Line from you to cloud
  if (lineToCloud) {
    map.removeLayer(lineToCloud);
  }
  lineToCloud = L.polyline([[user.lat, user.lon], [cloud.lat, cloud.lon]], {
    color: "red",
    weight: 2,
    opacity: 0.7
  }).addTo(map);

  // Fit map to both points
  const group = L.featureGroup([userMarker, cloudCircle]);
  map.fitBounds(group.getBounds().pad(0.4));
}

// Reverse geocode the projected cloud point to get a city name
async function reverseGeocode(lat, lon) {
  // Note: Please be polite with Nominatim (cache, low rate). This MVP does a single lookup per photo.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en" }
  });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  return await res.json();
}

// ====== Device orientation (compass + tilt) ======
function handleOrientation(e) {
  // alpha: compass (0..360). Some Androids need webkitCompassHeading from DeviceOrientationAbsolute.
  if (typeof e.webkitCompassHeading === "number") {
    deviceHeading = e.webkitCompassHeading.toFixed(0); // iOS alternative
  } else {
    deviceHeading = (typeof e.alpha === "number") ? e.alpha.toFixed(0) : null;
    // Convert alpha from 0 = device coordinate frame to compass? Many browsers already provide magnetic north.
    // For MVP we use it as-is. You may calibrate/compensate later if needed.
  }

  tiltAngle = (typeof e.beta === "number") ? e.beta.toFixed(0) : null;
}

window.addEventListener("deviceorientation", handleOrientation, { passive: true });

// iOS needs a user gesture to grant sensor access
enableSensorsBtn.addEventListener("click", async () => {
  try {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      const resp = await DeviceOrientationEvent.requestPermission();
      if (resp !== "granted") throw new Error("Permission not granted");
    }
    output.innerHTML = "✅ Compass/tilt enabled. Now snap a cloud photo.";
  } catch (err) {
    output.innerHTML = `⚠️ Couldn’t enable compass: ${err.message}. You can still take a photo.`;
  }
});

// ====== Camera flow ======
openCameraBtn.addEventListener("click", () => cameraInput.click());

cameraInput.addEventListener("change", async (evt) => {
  const file = evt.target.files?.[0];
  if (!file) return;

  // Show photo preview
  output.innerHTML = "";
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = "Cloud photo";
  output.appendChild(img);

  // Get location
  if (!navigator.geolocation) {
    output.innerHTML += `<div class="info">❌ Geolocation not supported.</div>`;
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = +pos.coords.latitude.toFixed(6);
    const lon = +pos.coords.longitude.toFixed(6);

    // Read compass heading & tilt; if missing, fall back to a reasonable heading/distance
    const heading = deviceHeading !== null ? +deviceHeading : 90; // default East
    const distanceKm = estimateDistanceKm(tiltAngle);            // 10–80 km typical

    // Project the cloud position out in the heading direction
    const projected = projectPoint(lat, lon, heading, distanceKm);

    // Reverse-geocode that projected point to get nearest city/town
    let placeName = "unknown place";
    try {
      const rev = await reverseGeocode(projected.lat, projected.lon);
      placeName = formatPlaceName(rev.address);
    } catch (err) {
      // If reverse geocode fails, we still show the point
      console.warn(err);
    }

    // Human-readable summary
    const headingLabel = `${Math.round(heading)}°`;
    output.innerHTML += `
      <div class="info">📍 You: ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
      <div class="info">🧭 Heading: ${headingLabel}${tiltAngle !== null ? ` | 📐 Tilt: ${tiltAngle}°` : ""}</div>
      <div class="info"><b>☁️ Estimated cloud is above:</b> ${placeName}</div>
      <div class="muted">(~${distanceKm} km in that direction from you)</div>
    `;

    // Draw map with red radius at projected point
    drawOnMap({ lat, lon }, { lat: projected.lat, lon: projected.lon }, placeName);
  }, (err) => {
    output.innerHTML += `<div class="info">❌ GPS error: ${err.message}</div>`;
  }, { enableHighAccuracy: true, timeout: 15000 });
});