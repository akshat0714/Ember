const OFFICIAL_LOCAL_FILE = "palisades_perimeter.geojson";

function drawOfficialFeatures(layer, feats) {
  feats.forEach((f, i) => {
    const isLatest = i === feats.length - 1;
    L.geoJSON(f, { interactive: false, style: {
      color: isLatest ? "#00e5ff" : "#4dd0e1", weight: isLatest ? 2.5 : 1,
      fill: isLatest, fillColor: "#00e5ff", fillOpacity: isLatest ? 0.12 : 0,
      dashArray: isLatest ? null : "4 4",
    }}).addTo(layer);
  });
}

async function loadOfficialPerimeter(layer, statusCb) {
  // 1) live NIFC/FIRIS operational service
  const params = new URLSearchParams({
    where: PALISADES_OFFICIAL.where,
    outFields: "incident_name,poly_DateCurrent,area_acres",
    orderByFields: "poly_DateCurrent ASC", returnGeometry: "true", f: "geojson",
  });
  try {
    const res = await fetch(`${PALISADES_OFFICIAL.url}?${params}`);
    if (res.ok) {
      const data = await res.json();
      const feats = data.features || [];
      if (feats.length > 0) {
        drawOfficialFeatures(layer, feats);
        const acres = feats[feats.length - 1].properties?.area_acres;
        statusCb(`Official perimeter (live NIFC/FIRIS) — ${feats.length} snapshot(s)${acres ? `, ~${Math.round(acres).toLocaleString()} acres` : ""}.`);
        return true;
      }
    }
  } catch (e) { /* fall through to local */ }

  // 2) bundled real footprint
  try {
    const res = await fetch(OFFICIAL_LOCAL_FILE);
    if (res.ok) {
      const data = await res.json();
      const feats = data.features || (data.type === "Feature" ? [data] : []);
      if (feats.length > 0) {
        drawOfficialFeatures(layer, feats);
        statusCb("Official recorded perimeter (NIFC/FIRIS, archived final footprint).");
        return true;
      }
    }
  } catch (e) { /* no local file */ }

  statusCb("No live snapshots, and no bundled perimeter found. Add palisades_perimeter.geojson.");
  return false;
}