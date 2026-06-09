const FIRE_FEED_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=wildfires&status=open";

async function loadFires(map) {
  const res = await fetch(FIRE_FEED_URL);
  if (!res.ok) throw new Error("Fire feed failed: " + res.status);
  const data = await res.json();

  const fires = [];
  for (const feature of data.features) {
    const geom = feature.geometry;
    if (!geom || geom.type !== "Point") continue;
    const [lng, lat] = geom.coordinates; // GeoJSON is [lng, lat]
    fires.push({ lat, lng, title: feature.properties.title || "Wildfire" });
    L.circleMarker([lat, lng], {
      radius: 7, color: "#ff3b30", fillColor: "#ff6b35", fillOpacity: 0.8,
    }).addTo(map).bindPopup(feature.properties.title || "Wildfire");
  }
  return fires;
}