/* CloudPin.js
   - native camera trigger
   - get geolocation & device orientation
   - project a point ahead (distance based on tilt) — DISTANCE IN MILES
   - show Leaflet satellite map (ESRI World Imagery) and add a red radius (5 miles)
   - each photo produces a new radius on the map
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
  let deviceHeading = null; // degrees 0..360 (0 = north)
  let tiltBeta = null;      // front/back tilt in degrees (beta)
  let leafletMap = null;
  let circles = [];         // store circles we add (one per photo)
  let markers = [];

  // helpers
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // Project a point from lat/lon by bearing (deg) and distance (KM)
  // (kept same math, but we'll pass distanceKm computed from miles)
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

  // Estimate distance in MILES using tilt (beta): more tilt (pointing up) => closer, level/horizon => farther.
  // Map beta (abs) range 0..60 to distance range 50 miles (far) .. 5 miles (near).
  function estimateDistanceMiles(beta) {
    if (beta === null || isNaN(beta)) return 10; // default ~10 miles
    const absB = Math.min(60, Math.abs(beta));
    // linear map: 0 -> 50 miles, 60 -> 5 miles
    const miles = 50 - ( (absB / 60) * (50 - 5) );
    return Math.max(3, Math.round(miles)); // ensure at least ~3 miles
  }

  // convert miles -> meters
  const milesToMeters = miles => Math.round(miles * 1609.34);
  // convert miles -> km
  const milesToKm = miles => miles * 1.60934;

  // Convert compass degrees to human text
  function bearingToText(b) {
    if (b == null || isNaN(b)) return "N/A";
    const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"];
    return dirs[Math.round(b / 22.5)];
  }

  // Enable device orientation on iOS
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

  // Listen for orientation (compass + tilt)
  window.addEventListener("deviceorientation", (e) => {
    if (typeof e.webkitCompassHeading === "number") {
      deviceHeading = e.webkitCompassHeading;
    } else if (typeof e.alpha === "number") {
      // alpha gives rotation around z-axis
      deviceHeading = e.alpha;
    }
    tiltBeta = (typeof e.beta === "number") ? e.beta : tiltBeta;
  }, { passive: true });

  // initialize leaflet map (satellite tiles from ESRI)
  function ensureMap(lat, lon) {
    if (!leafletMap) {
      leafletMap = L.map(mapDiv, { zoomControl: true });
      // ESRI World Imagery (satellite) - no API key
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri & OpenStreetMap contributors'
      }).addTo(leafletMap);
    }
    if (lat != null && lon != null) {
      leafletMap.setView([lat, lon], 10);
    }
  }

  // Show map & add circle + marker for this photo
  function addCloudCircle(lat, lon, radiusMeters) {
    ensureMap(lat, lon);
    const circle = L.circle([lat, lon], {
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.25,
      weight: 2,
      radius: radiusMeters
    }).addTo(leafletMap);
    const marker = L.circleMarker([lat, lon], { radius:6, color:"red", fillColor:"#f03", fillOpacity:1 }).addTo(leafletMap);
    circles.push(circle);
    markers.push(marker);
    // fit map to show marker+circle nicely
    const group = L.featureGroup([circle, marker]);
    leafletMap.fitBounds(group.getBounds().pad(0.4));
  }

  // Snap button opens native camera
  snapBtn.addEventListener("click", () => {
    cameraIn.click();
  });

  // Handle camera file selection (native camera returns an image file)
  cameraIn.addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    // Show preview (optional)
    try {
      const url = URL.createObjectURL(file);
      photoPrev.src = url;
      photoPrev.style.display = "block";
    } catch (e) {}

    // Get geolocation
    if (!navigator.geolocation) {
      statusEl.textContent = "❌ Geolocation not supported.";
      return;
    }

    statusEl.textContent = "📍 Locating...";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const userLat = pos.coords.latitude;
      const userLon = pos.coords.longitude;

      // warn if heading/tilt not available
      if (deviceHeading === null || isNaN(deviceHeading)) {
        statusEl.textContent = "⚠️ Compass not available — the projected location will use a default direction (east). Tap 'Enable Compass' to improve accuracy.";
      }

      // Determine projected distance (in miles) from tilt
      const distanceMiles = estimateDistanceMiles(tiltBeta); // e.g. 5..50 miles
      const distanceKm = milesToKm(distanceMiles);

      // If heading missing, use 90 (east) as fallback
      const bearing = (deviceHeading !== null && !isNaN(deviceHeading)) ? deviceHeading : 90;

      // Project point distanceKm ahead along bearing
      const projected = projectPoint(userLat, userLon, bearing, distanceKm);

      // Show map and draw circle (5 miles radius visible)
      mapDiv.style.display = "block";
      const radiusMiles = 5;
      const radiusMeters = milesToMeters(radiusMiles);
      try {
        addCloudCircle(projected.lat, projected.lon, radiusMeters);

        statusEl.innerHTML = `☁️ Cloud estimated ~${distanceMiles} mi away to the ${bearingToText(bearing)} (${Math.round(bearing||0)}°). Radius shown = ${radiusMiles} mi.`;
      } catch (err) {
        statusEl.textContent = "Map error: " + err.message;
      }
    }, (err) => {
      statusEl.textContent = `❌ GPS error: ${err.message}. Make sure location is allowed and the site is served over HTTPS.`;
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  // Test helper: call from console __cloudpin_test()
  window.__cloudpin_test = async function(fakeLat = 38.6270, fakeLon = -90.1994) {
    mapDiv.style.display = "block";
    ensureMap(fakeLat, fakeLon);
    addCloudCircle(fakeLat, fakeLon, milesToMeters(5));
    statusEl.textContent = "Test circle added at fake location (St. Louis).";
  };

})();
