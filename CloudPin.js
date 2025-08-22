document.addEventListener("DOMContentLoaded", () => {
  const snapBtn = document.getElementById("snapBtn");
  const cameraInput = document.getElementById("cameraInput");
  const mapDiv = document.getElementById("map");
  let map;

  snapBtn.addEventListener("click", () => {
    cameraInput.click();
  });

  cameraInput.addEventListener("change", () => {
    if (cameraInput.files.length > 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showMapWithRadius, showError);
      } else {
        alert("Geolocation not supported.");
      }
    }
  });

  function showMapWithRadius(position) {
    const userLatLng = [position.coords.latitude, position.coords.longitude];

    mapDiv.style.display = "block";

    // Init Leaflet map
    map = L.map("map").setView(userLatLng, 12);

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Red radius (~5 miles = ~8046 meters)
    L.circle(userLatLng, {
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.35,
      radius: 8046
    }).addTo(map);
  }

  function showError(error) {
    alert("Error getting location: " + error.message);
  }
});
