const FIRE_FEED_URL =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";

const FALLBACK_FIRES = [
  { lat: 34.05, lng: -118.55, title: "Sample fire — Pacific Palisades area" },
  { lat: 34.19, lng: -118.13, title: "Sample fire — Altadena area" },
];

function drawFires(layer, fires) {
  for (const f of fires) {
    L.circleMarker([f.lat, f.lng], {
      radius: 7, color: "#ff3b30", fillColor: "#ff6b35", fillOpacity: 0.8,
    }).addTo(layer).bindPopup(f.title);
  }
}

async function loadFires(layer) {
  try {
    const res = await fetch(FIRE_FEED_URL);
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    const fires = (data.features || [])
      .filter((f) => f.geometry && f.geometry.type === "Point")
      .map((f) => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        title: (f.properties && f.properties.IncidentName) || "Wildfire",
      }));
    if (fires.length === 0) throw new Error("no fires returned");
    drawFires(layer, fires);
    return { fires, live: true };
  } catch (err) {
    console.warn("Live fire feed unavailable, using fallback:", err);
    drawFires(layer, FALLBACK_FIRES);
    return { fires: FALLBACK_FIRES, live: false };
  }
}