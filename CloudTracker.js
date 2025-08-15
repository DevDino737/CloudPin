// ===== Camera & Cloud Info Logic =====
const cameraInput = document.getElementById("cameraInput");
const output = document.getElementById("output");

cameraInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Display the captured photo
    const imgURL = URL.createObjectURL(file);
    output.innerHTML = `<img src="${imgURL}" style="width:80%; border-radius:8px; margin-bottom:10px;">`;

    try {
        // 1️⃣ Get sensors: GPS, heading, tilt
        const sensors = await getSensors();

        // 2️⃣ Get weather info from OpenWeatherMap
        const weather = await getWeather(sensors.lat, sensors.lon);

        // 3️⃣ Estimate cloud location
        const cloudAltitude = estimateCloudAltitude(weather.cloudType);
        const distance = cloudAltitude / Math.tan(sensors.tilt * Math.PI / 180);
        const cloudCoords = destinationPoint(sensors.lat, sensors.lon, sensors.heading, distance);

        // 4️⃣ Display cloud info
        output.innerHTML += `
            <p><strong>Cloud info:</strong></p>
            <p>Heading: ${sensors.heading.toFixed(1)}°</p>
            <p>Tilt: ${sensors.tilt.toFixed(1)}°</p>
            <p>Cloud type: ${weather.cloudType}</p>
            <p>Cloudiness: ${weather.cloudiness}%</p>
            <p>Estimated cloud altitude: ${cloudAltitude} m</p>
            <p>Ground point: ${cloudCoords.lat.toFixed(4)}, ${cloudCoords.lon.toFixed(4)}</p>
            <p><a href="https://www.google.com/maps/search/?api=1&query=${cloudCoords.lat},${cloudCoords.lon}" target="_blank">Open in Google Maps</a></p>
        `;
    } catch (err) {
        output.innerHTML += `<p style="color:red;">Error getting sensors or weather info: ${err.message}</p>`;
        console.error(err);
    }
});

// ===== Helper Functions =====

// Get GPS + compass + tilt
function getSensors() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            window.addEventListener("deviceorientation", (event) => {
                const heading = event.alpha || 0; // compass
                const tilt = event.beta || 45;    // front/back tilt
                resolve({ lat, lon, heading, tilt });
            }, { once: true });

        }, reject);
    });
}

// Call OpenWeatherMap API
async function getWeather(lat, lon) {
    const apiKey = "YOUR_API_KEY_HERE"; // Replace with your key
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    const data = await response.json();
    return { cloudiness: data.clouds.all, cloudType: data.weather[0].description };
}

// Estimate cloud altitude based on type
function estimateCloudAltitude(type) {
    type = type.toLowerCase();
    if (type.includes("cirrus")) return 10000; // high clouds
    if (type.includes("cumulus")) return 8200; // mid-level
    if (type.includes("stratus")) return 2000; // low clouds
    return 5000; // default
}

// Calculate ground coordinates from heading and distance
function destinationPoint(lat, lon, bearing, distance) {
    const R = 6371000; // Earth radius in meters
    const brng = bearing * Math.PI / 180;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;

    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(distance / R) +
                         Math.cos(φ1) * Math.sin(distance / R) * Math.cos(brng));
    const λ2 = λ1 + Math.atan2(Math.sin(brng) * Math.sin(distance / R) * Math.cos(φ1),
                               Math.cos(distance / R) - Math.sin(φ1) * Math.sin(φ2));

    return { lat: φ2 * 180 / Math.PI, lon: λ2 * 180 / Math.PI };
}
