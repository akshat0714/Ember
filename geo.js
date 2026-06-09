function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
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