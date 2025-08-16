const cameraInput = document.getElementById("cameraInput");
const output = document.getElementById("output");
const canvas = document.getElementById("skyMap");
const ctx = canvas.getContext("2d");

let deviceHeading = null;
let tiltAngle = null;

// Listen for device orientation
window.addEventListener("deviceorientation", (event) => {
    deviceHeading = event.alpha ? event.alpha.toFixed(0) : null; // compass
    tiltAngle = event.beta ? event.beta.toFixed(0) : null;       // front/back tilt
});

// Trigger camera button
document.getElementById('openCameraBtn').addEventListener('click', () => {
    cameraInput.click();
});

// Draw sky map with red dot
function drawSkyMap(heading, tilt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky background
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Horizon line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Map heading (0-360) to x
    const x = (heading / 360) * canvas.width;

    // Map tilt (-90 to 90) to y
    const y = ((-tilt + 90) / 180) * canvas.height;

    // Draw red circle for cloud
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
}

// Estimate cloud location using heading, tilt, and user location
function estimateCloudLocation(userLat, userLon, heading, tilt) {
    const cloudHeight = 2000; // 2 km typical low cloud
    const tiltRad = (tilt * Math.PI) / 180;
    const headingRad = (heading * Math.PI) / 180;

    const horizontalDist = Math.tan(tiltRad) * cloudHeight;

    const deltaLat = (horizontalDist * Math.cos(headingRad)) / 111320;
    const deltaLon = (horizontalDist * Math.sin(headingRad)) / (111320 * Math.cos(userLat * Math.PI / 180));

    const cloudLat = (parseFloat(userLat) + deltaLat).toFixed(4);
    const cloudLon = (parseFloat(userLon) + deltaLon).toFixed(4);

    return { cloudLat, cloudLon };
}

// Handle photo selection
cameraInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show photo preview
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "300px";
    output.innerHTML = "";
    output.appendChild(img);

    // Show sky map
    canvas.style.display = "block";
    if (deviceHeading !== null && tiltAngle !== null) {
        drawSkyMap(deviceHeading, tiltAngle);
        const orientationInfo = document.createElement("p");
        orientationInfo.textContent = `🧭 Heading: ${deviceHeading}° | 📐 Tilt: ${tiltAngle}°`;
        output.appendChild(orientationInfo);
    }

    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lon = pos.coords.longitude.toFixed(4);

            const gpsInfo = document.createElement("p");
            gpsInfo.textContent = `📍 Location: ${lat}, ${lon}`;
            output.appendChild(gpsInfo);

            // Fetch weather from Open-Meteo
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=cloudcover`);
                const data = await res.json();

                const current = data.current_weather;
                const clouds = data.hourly.cloudcover[0]; 

                const weatherInfo = document.createElement("p");
                weatherInfo.textContent = `☁️ Cloud Cover: ${clouds}% | 🌡️ Temp: ${current.temperature}°C | 🌬️ Wind: ${current.windspeed} km/h`;
                output.appendChild(weatherInfo);

                // Estimate cloud location
                if (deviceHeading !== null && tiltAngle !== null) {
                    const cloudPos = estimateCloudLocation(lat, lon, deviceHeading, tiltAngle);
                    const cloudInfo = document.createElement("p");
                    cloudInfo.textContent = `☁️ Estimated cloud location: ${cloudPos.cloudLat}, ${cloudPos.cloudLon}`;
                    output.appendChild(cloudInfo);
                }

            } catch (err) {
                output.innerHTML += "<p>❌ Could not fetch weather data.</p>";
                console.error(err);
            }

        }, (err) => {
            output.innerHTML += `<p>❌ GPS error: ${err.message}</p>`;
        });
    } else {
        output.innerHTML += "<p>❌ Geolocation not supported.</p>";
    }
});
