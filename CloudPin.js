const cameraInput = document.getElementById("cameraInput");
const output = document.getElementById("output");

// Handle photo capture
cameraInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    // Display photo
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "300px";
    img.style.display = "block";
    output.innerHTML = ""; // clear old
    output.appendChild(img);

    // Get GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);

          // Show GPS
          const gpsInfo = document.createElement("p");
          gpsInfo.textContent = `📍 Location: ${lat}, ${lon}`;
          output.appendChild(gpsInfo);

          // Get weather
          const weather = await getWeather(lat, lon);
          const weatherInfo = document.createElement("p");
          weatherInfo.textContent = `☁️ Cloud cover: ${weather}%`;
          output.appendChild(weatherInfo);
        },
        (err) => {
          const errorMsg = document.createElement("p");
          errorMsg.textContent = "❌ GPS error: " + err.message;
          output.appendChild(errorMsg);
        }
      );
    } else {
      output.innerHTML += "<p>❌ Geolocation not supported.</p>";
    }
  }
});

// Weather API (Open-Meteo, free)
async function getWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloudcover`;
    const res = await fetch(url);
    const data = await res.json();
    return data.current?.cloudcover ?? "N/A";
  } catch (e) {
    console.error("Weather error:", e);
    return "Error";
  }
}

// Phone orientation / compass
window.addEventListener("deviceorientation", (event) => {
  const compass = Math.round(event.alpha); // 0-360 degrees
  document.getElementById("compass")?.remove(); // remove old

  const compassInfo = document.createElement("p");
  compassInfo.id = "compass";
  compassInfo.textContent = `🧭 Compass heading: ${compass}°`;
  output.appendChild(compassInfo);
});
