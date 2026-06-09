const map = L.map("map").setView([34.0522, -118.2437], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors", maxZoom: 19,
}).addTo(map);

loadFires(map).then((fires) => {
  document.getElementById("status-text").textContent =
    fires.length + " active wildfires loaded. Finding your location…";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      L.marker([latitude, longitude]).addTo(map).bindPopup("You are here");
      map.setView([latitude, longitude], 9);
      const km = nearestFireKm(latitude, longitude, fires);
      document.getElementById("status-text").textContent =
        `Risk: ${riskLevel(km)} — nearest fire ${km.toFixed(1)} km away.`;
    },
    () => {
      document.getElementById("status-text").textContent =
        "Location denied — showing the map and fires only.";
    }
  );
}).catch((err) => {
  document.getElementById("status-text").textContent = "Couldn't load fire data.";
  console.error(err);
});