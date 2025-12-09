/* CloudPin.js
   - native camera trigger
   - get geolocation & device orientation (fixed for device rotation)
   - project a point ahead (distance estimated by tilt) - distances shown in MILES
   - show Leaflet satellite map and add a red radius (5 miles)
   - each photo clears previous circle and creates a new one
*/

(() => {
  // DOM
  const enableBtn = document.getElementById("enableSensorsBtn");
  const snapBtn   = document.getElementById("snapBtn");
  const cameraIn  = document.getElementById("cameraInput");
  const mapDiv    = document.getElementById("map");
  const statusEl  = document.getElementById("status");
  const photoPrev = document.getElementById("photoPreview");

  // state
  let userHeading = null; // corrected heading used for projection
  let tiltBeta = null;    // front/back tilt
  let leafletMap = null;

  // helpers
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // Project a point from lat/lon by bearing (deg) and distance (KM)
  function projectPoint(latDeg, lonDeg, bearingDeg, distanceKm) {
    const R = 6371.0; // Earth radius km
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

  // convert miles -> km and miles -> meters
  const milesToKm = miles => miles * 1.60934;
  const milesToMeters = miles => Math.round(miles * 1609.34);

  // Estimate distance in MILES using tilt (beta)
  function estimateDistanceMiles(beta) {
    if (beta === null || isNaN(beta)) return 10; 
    const absB = Math.min(60, Math.abs(beta));

    const miles = 50 - ((absB / 60) * (50 - 5));

    return Math.max(3, Math.round(miles));
  }

  function bearingToText() {
    if (userHeading == null || isNaN(userHeading)) return "N/A";
    const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                  "S","SSW","SW","WSW","W","WNW","NW","NNW","N"];
    return dirs[Math.round(userHeading / 22.5)];
  }

  // Enable sensors (iOS)
  enableBtn.addEventListener("click", async () => {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp !== "granted") {
          statusEl.textContent = "Compass permission denied.";
          return;
        }
      }
      statusEl.textContent = "Compass enabled. Now tap 'Snap Cloud Photo'.";
    } catch (err) {
      statusEl.textContent = `Compass enable failed: ${err.message}`;
    }
  });

  // initialize leaflet map
  function ensureMap(lat, lon) {
    if (!leafletMap) {
      leafletMap = L.map(mapDiv, { zoomControl: true });

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
        {
          maxZoom: 19,
          attribution: 'Tiles © Esri & OpenStreetMap contributors'
        }
      ).addTo(leafletMap);
    }

    if (lat != null && lon != null) {
      leafletMap.setView([lat, lon], 10);
    }
  }

  function clearPreviousCircles() {
    if (!leafletMap) return;
    leafletMap.eachLayer(layer => {
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        leafletMap.removeLayer(layer);
      }
    });
  }

  function addCloudCircle(lat, lon, radiusMeters) {
    ensureMap(lat, lon);
    clearPreviousCircles();

    const circle = L.circle([lat, lon], {
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.25,
      weight: 2,
      radius: radiusMeters
    }).addTo(leafletMap);

    const marker = L.circleMarker([lat, lon], {
      radius: 6,
      color: "red",
      fillColor: "#f03",
      fillOpacity: 1
    }).addTo(leafletMap);

    const group = L.featureGroup([circle, marker]);
    leafletMap.fitBounds(group.getBounds().pad(0.4));
  }

  // Snap camera
  snapBtn.addEventListener("click", () => {
    cameraIn.click();
  });

  // Handle camera file
  cameraIn.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    try {
      const url = URL.createObjectURL(file);
      photoPrev.src = url;
      photoPrev.style.display = "block";
    } catch (e) {}

    statusEl.textContent = "📍 Locating...";

    if (!navigator.geolocation) {
      statusEl.textContent = "❌ Geolocation not supported.";
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const userLat = pos.coords.latitude;
      const userLon = pos.coords.longitude;

      if (userHeading === null || isNaN(userHeading)) {
        statusEl.textContent =
          "⚠️ Compass not available — defaulting to east (90°).";
      }

      const distanceMiles = estimateDistanceMiles(tiltBeta);
      const distanceKm = milesToKm(distanceMiles);

      const bearing = (!isNaN(userHeading)) ? userHeading : 90;

      const projected = projectPoint(userLat, userLon, bearing, distanceKm);

      mapDiv.style.display = "block";

      const radiusMiles = 5;
      const radiusMeters = milesToMeters(radiusMiles);

      try {
        addCloudCircle(projected.lat, projected.lon, radiusMeters);

        statusEl.innerHTML =
          `☁️ Cloud estimated ~${distanceMiles} mi away ` +
          `to the ${bearingToText()} (${Math.round(bearing)}°). ` +
          `Radius shown = ${radiusMiles} mi.`;
      } catch (err) {
        statusEl.textContent = "Map error: " + err.message;
      }

    }, (err) => {
      statusEl.textContent =
        `❌ GPS error: ${err.message}. Make sure location is allowed and HTTPS is used.`;
    }, { enableHighAccuracy: true, timeout: 15000 });
  });



  // -----------------------------
  // DEBUG PANEL
  // -----------------------------
  const debugPanel = document.createElement("div");
  debugPanel.id = "debugPanel";
  debugPanel.style.position = "absolute";
  debugPanel.style.bottom = "10px";
  debugPanel.style.left = "10px";
  debugPanel.style.color = "lime";
  debugPanel.style.fontSize = "14px";
  debugPanel.style.background = "rgba(0,0,0,0.6)";
  debugPanel.style.padding = "8px 12px";
  debugPanel.style.borderRadius = "6px";
  debugPanel.style.zIndex = "9999";
  debugPanel.style.pointerEvents = "none";
  document.body.appendChild(debugPanel);

  function debug(msg) {
      debugPanel.innerHTML = msg;
  }


  // -----------------------------
  // FIXED COMPASS + ORIENTATION SYSTEM
  // -----------------------------
  window.addEventListener("deviceorientation", (e) => {

      let compass = null;

      if (e.webkitCompassHeading != null) {
          compass = e.webkitCompassHeading; // iPad/iPhone true heading
      } else if (e.alpha != null) {
          compass = 360 - e.alpha; // Android fallback
      }

      const orientation =
          (screen.orientation && screen.orientation.angle) ??
          window.orientation ??
          0;

      if (compass != null) {
        compass = (compass + orientation + 360) % 360;
        userHeading = compass;
      }

      tiltBeta = e.beta;

      debug(
          `alpha: ${e.alpha}<br>
           webkit: ${e.webkitCompassHeading}<br>
           screen angle: ${orientation}<br>
           corrected heading: ${userHeading?.toFixed(1)}°<br>
           tilt beta: ${tiltBeta?.toFixed(1)}`
      );
  });

})();
