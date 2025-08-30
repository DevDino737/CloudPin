/* CloudPin.js
   - native camera trigger
   - get geolocation & device orientation
   - project a point ahead (distance based on tilt)
   - show Leaflet satellite map (ESRI World Imagery) and add a red radius (approx 5 miles)
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
  let tiltBeta = null;      // front/back tilt in degrees
  let leafletMap = null;
  let circles = [];         // store circles we add (one per photo)
  let markers = [];

  // helper
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // Project a point from lat/lon by bearing (deg) and distance (km)
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

  // Estimate distance (km) using tilt: more tilt (pointing up) => closer, level/horizon => farther.
  // Map beta (abs) range 0..60 to distance range 80km (far) .. 8km (near).
  function estimateDistanceKm(beta) {
    if (beta === null || isNaN(beta)) return 16; // default ~10 miles (~16 km)
    const absB = Math.min(60, Math.abs(beta));
    // linear map: 0 -> 80 km, 60 -> 8 km
    const dist = 80 - ( (absB / 60) * (80 - 8) );
    return Math.max(8, Math.round(dist)); // ensure at least 8 km
  }

  // convert km -> meters
  const kmToMeters = km => Math.round(km * 1000);

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

  // Listen for orientation
  window.addEventListener("deviceorientation", (e) => {
    // iOS may provide webkitCompassHeading
    if (typeof e.webkitCompassHeading === "number") {
      deviceHeading = e.webkitCompassHeading;
    } else if (typeof e.alpha === "number") {
      // many browsers provide alpha (0..360)
      deviceHeading = e.alpha;
    }
    // beta is front/back tilt
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
    // fit the map so the circle is visible
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

      // If heading missing warn but still proceed (use default)
      if (deviceHeading === null || isNaN(deviceHeading)) {
        statusEl.textContent = "⚠️ Compass not available — try 'Enable Compass' before snapping next time.";
      }

      // Estimate distance using tilt
      const distanceKm = estimateDistanceKm(tiltBeta); // e.g. 8..80 km
      // But user requested about 5 miles radius display; we'll still project the point and draw a 5-mile radius
      // convert distance to project (use distanceKm), and radiusMeters ~ 5 miles (~8046 m)
      const projected = projectPoint(userLat, userLon, deviceHeading || 90, distanceKm);

      // Show map and draw circle (5 miles radius)
      mapDiv.style.display = "block";
      const radiusMeters = Math.round(5 * 1.60934 * 1000); // 5 miles -> meters (~8046)
      try {
        addCloudCircle(projected.lat, projected.lon, radiusMeters);
        statusEl.innerHTML = `☁️ Cloud estimated ~${distanceKm} km away to the ${bearingToText(deviceHeading)} (${Math.round(deviceHeading||0)}°).`;
      } catch (err) {
        statusEl.textContent = "Map error: " + err.message;
      }
    }, (err) => {
      statusEl.textContent = `❌ GPS error: ${err.message}. Make sure location is allowed and the site is served over HTTPS.`;
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  // Optional convenience: allow a test mode if you can't use camera (useful for night/testing)
  window.__cloudpin_test = async function(fakeLat = 38.6270, fakeLon = -90.1994) {
    // show map around a fake point (St. Louis by default)
    mapDiv.style.display = "block";
    ensureMap(fakeLat, fakeLon);
    addCloudCircle(fakeLat, fakeLon, Math.round(5 * 1.60934 * 1000));
    statusEl.textContent = "Test circle added at fake location.";
  };

})();
