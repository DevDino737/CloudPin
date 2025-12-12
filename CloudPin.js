const estimateBtn = document.getElementById("estimateBtn");
const cityEl = document.getElementById("city");
const status = document.getElementById("status");

let map, cloudMarker;

estimateBtn.onclick = () => {
  if (!navigator.geolocation || !window.DeviceOrientationEvent) {
    status.textContent = "Device or browser does not support sensors.";
    return;
  }

  const cloudHeight = parseFloat(document.getElementById("cloudType").value);
  const readingCount = 5;
  const readings = [];

  status.textContent = "Gathering sensor readings...";

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat1 = pos.coords.latitude;
    const lon1 = pos.coords.longitude;

    const handleOrientation = (e) => {
      const heading = e.alpha || 0;
      const pitch = e.beta || 0;
      readings.push({ heading, pitch });

      if (readings.length >= readingCount) {
        window.removeEventListener("deviceorientation", handleOrientation);
        processReadings(lat1, lon1, cloudHeight, readings);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation);
  });
};

async function processReadings(lat1, lon1, cloudHeight, readings) {
  const R = 3958.8; // Earth radius in miles
  let latSum = 0;
  let lonSum = 0;

  readings.forEach((r) => {
    const headingRad = (r.heading * Math.PI) / 180;
    const pitchRad = (r.pitch * Math.PI) / 180;
    const distanceMiles = cloudHeight / Math.tan(pitchRad);

    const latRad = (lat1 * Math.PI) / 180;

    const lat2 = lat1 + (distanceMiles / R) * (180 / Math.PI) * Math.cos(headingRad);
    const lon2 = lon1 + (distanceMiles / R) * (180 / Math.PI) * Math.sin(headingRad) / Math.cos(latRad);

    latSum += lat2;
    lonSum += lon2;
  });

  const avgLat = latSum / readings.length;
  const avgLon = lonSum / readings.length;

  status.textContent = `Estimated cloud coordinates: ${avgLat.toFixed(4)}, ${avgLon.toFixed(4)}`;

  // --- Reverse geocode ---
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${avgLat}&lon=${avgLon}&format=json`);
    const data = await res.json();
    const city = data.address.city || data.address.town || data.address.village || data.address.county || "Unknown";
    cityEl.textContent = `Cloud is over: ${city}`;
  } catch (err) {
    cityEl.textContent = `Reverse geocode failed: ${err}`;
  }

  // --- Show map ---
  if (!map) {
    map = L.map('map').setView([avgLat, avgLon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([avgLat, avgLon], 10);
    if (cloudMarker) map.removeLayer(cloudMarker);
  }

  cloudMarker = L.marker([avgLat, avgLon]).addTo(map)
    .bindPopup(`Cloud over: ${city}`)
    .openPopup();

  document.getElementById("map").style.display = "block";
}
