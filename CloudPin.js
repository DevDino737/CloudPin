// ===============================
// CloudPin Phase 1 (MERGED)
// ===============================

let heading = null;
let pitch = null;
let map = null;
let cloudMarker = null;

const statusEl = document.getElementById("status");
const cityEl = document.getElementById("city");
const enableBtn = document.getElementById("enableSensorsBtn");
const estimateBtn = document.getElementById("estimateBtn");

// -------------------------------
// Enable Compass / Sensors
// -------------------------------
enableBtn.addEventListener("click", async () => {
  // iOS permission handling
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        statusEl.textContent = "Compass permission denied.";
        return;
      }
    } catch (err) {
      statusEl.textContent = "Compass permission error.";
      return;
    }
  }

  window.addEventListener("deviceorientation", (e) => {
    if (e.alpha !== null) heading = e.alpha;
    if (e.beta !== null) pitch = e.beta;
  });

  statusEl.textContent = "Compass enabled. Point phone at a cloud.";
});

// -------------------------------
// Estimate Cloud Location
// -------------------------------
estimateBtn.addEventListener("click", () => {
  if (heading === null || pitch === null) {
    statusEl.textContent = "Move phone so compass & tilt update.";
    return;
  }

  if (!navigator.geolocation) {
    statusEl.textContent = "Geolocation not supported.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      estimateCloud(
        pos.coords.latitude,
        pos.coords.longitude
      );
    },
    () => {
      statusEl.textContent = "Location permission denied.";
    },
    { enableHighAccuracy: true }
  );
});

// -------------------------------
// Core Math (WORKING)
// -------------------------------
function estimateCloud(userLat, userLon) {
  const cloudHeightFt = parseFloat(
    document.getElementById("cloudType").value
  );

  const pitchRad = pitch * Math.PI / 180;

  if (pitchRad <= 0) {
    statusEl.textContent = "Tilt phone upward toward the cloud.";
    return;
  }

  const distanceMiles =
    (cloudHeightFt / 5280) / Math.tan(pitchRad);

  const headingRad = heading * Math.PI / 180;
  const earthRadius = 3958.8;

  const cloudLat =
    userLat +
    (distanceMiles / earthRadius) *
    (180 / Math.PI) *
    Math.cos(headingRad);

  const cloudLon =
    userLon +
    (distanceMiles / earthRadius) *
    (180 / Math.PI) *
    Math.sin(headingRad) /
    Math.cos(userLat * Math.PI / 180);

  statusEl.textContent =
    `Estimated cloud position: ${cloudLat.toFixed(4)}, ${cloudLon.toFixed(4)}`;

  showMap(cloudLat, cloudLon);
  reverseGeocode(cloudLat, cloudLon);
}

// -------------------------------
// Map Display
// -------------------------------
function showMap(lat, lon) {
  const mapEl = document.getElementById("map");
  mapEl.style.display = "block";

  if (!map) {
    map = L.map("map").setView([lat, lon], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);
  } else {
    map.setView([lat, lon], 10);
  }

  if (cloudMarker) {
    map.removeLayer(cloudMarker);
  }

  cloudMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup("Estimated cloud location")
    .openPopup();
}

// -------------------------------
// City Lookup (FREE)
// -------------------------------
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await res.json();

    const place =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      "Unknown area";

    cityEl.textContent = `Cloud is over: ${place}`;
  } catch {
    cityEl.textContent = "City lookup failed.";
  }
}
