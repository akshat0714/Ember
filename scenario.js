const PALISADES_SCENARIO = {
  name: "2025 Palisades Fire",
  fire: { lat: 34.0725, lng: -118.5425, title: "Palisades Fire (ignition)" },
  person: { lat: 34.050, lng: -118.540 }, // sample person inside the burn area
  windKmh: 70,
  windFromDeg: 45,
};

// Hand-drawn approximate final burn outline, kept ON LAND (never the ocean).
// Illustrative reconstruction for the demo; the real recorded perimeter is the cyan overlay.
const PALISADES_FINAL = [
  [34.0860, -118.5250],
  [34.0800, -118.5100],
  [34.0560, -118.5090],
  [34.0450, -118.5230],
  [34.0430, -118.5450],
  [34.0460, -118.5680],
  [34.0560, -118.5860],
  [34.0720, -118.5870],
  [34.0830, -118.5740],
  [34.0880, -118.5500],
  [34.0880, -118.5300],
];

const PALISADES_OFFICIAL = {
  url: "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CA_Perimeters_NIFC_FIRIS_public_view/FeatureServer/0/query",
  where: "incident_name LIKE '%Palisades%'",
};