async function loadOfficialPerimeter(layer, statusCb) {
  const params = new URLSearchParams({
    where: PALISADES_OFFICIAL.where,
    outFields: "incident_name,poly_DateCurrent,area_acres",
    orderByFields: "poly_DateCurrent ASC",
    returnGeometry: "true",
    f: "geojson",
  });
  try {
    const res = await fetch(`${PALISADES_OFFICIAL.url}?${params}`);
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    const feats = data.features || [];
    if (feats.length === 0) {
      statusCb("No official Palisades snapshots in the live feed right now (it tracks current fires).");
      return false;
    }
    feats.forEach((f, i) => {
      const isLatest = i === feats.length - 1;
      L.geoJSON(f, {
        style: {
          color: isLatest ? "#00e5ff" : "#4dd0e1",
          weight: isLatest ? 2.5 : 1,
          fill: isLatest,
          fillColor: "#00e5ff",
          fillOpacity: isLatest ? 0.12 : 0,
          dashArray: isLatest ? null : "4 4",
        },
      }).addTo(layer);
    });
    const acres = feats[feats.length - 1].properties?.area_acres;
    statusCb(`Official perimeter loaded — ${feats.length} recorded snapshot(s)${acres ? `, latest ~${Math.round(acres).toLocaleString()} acres` : ""} (NIFC/FIRIS).`);
    return true;
  } catch (err) {
    console.warn("Official perimeter unavailable:", err);
    statusCb("Couldn't reach the official perimeter service.");
    return false;
  }
}