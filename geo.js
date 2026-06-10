function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestFireKm(lat, lng, fires) {
  let min = Infinity;
  for (const f of fires) {
    const d = haversineKm(lat, lng, f.lat, f.lng);
    if (d < min) min = d;
  }
  return min;
}

function riskLevel(km) {
  if (km < 3) return "EXTREME";
  if (km < 10) return "HIGH";
  if (km < 30) return "MODERATE";
  return "LOW";
}

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function deg2rad(d) { return (d * Math.PI) / 180; }
function rad2deg(r) { return (r * 180) / Math.PI; }

function destinationPoint(lat, lng, distKm, bearingDeg) {
  const R = 6371, d = distKm / R, b = deg2rad(bearingDeg);
  const la1 = deg2rad(lat), ln1 = deg2rad(lng);
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const ln2 = ln1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [rad2deg(la2), rad2deg(ln2)];
}