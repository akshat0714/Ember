const map = L.map("map").setView([34.0522, -118.2437], 9);

const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap", maxZoom: 19,
});
const satellite = L.tileLayer(
  "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
);
const terrain = L.tileLayer(
  "https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  { attribution: "&copy; Esri", maxZoom: 19 }
);
street.addTo(map);
L.control.layers({ Street: street, Satellite: satellite, Terrain: terrain }, null, { position: "topright" }).addTo(map);

const dataLayer = L.layerGroup().addTo(map);
const spreadLayer = L.layerGroup().addTo(map);
const officialLayer = L.layerGroup().addTo(map);

let mode = "live";
let animTimer = null;

function personIcon() {
  return L.divIcon({ className: "", iconSize: [0, 0],
    html: '<div class="marker person"><span class="ring"></span><span class="dot"></span></div>' });
}
function fireIcon() {
  return L.divIcon({ className: "", iconSize: [0, 0],
    html: '<div class="marker fire"><span class="ring"></span><span class="dot"></span></div>' });
}

function setRisk(level, detail) {
  const b = document.getElementById("risk-badge");
  b.textContent = level;
  b.className = "risk-badge risk-" + level.toLowerCase();
  document.getElementById("risk-detail").textContent = detail;
}
function setWind(main, detail) {
  document.getElementById("wind-main").textContent = main;
  document.getElementById("wind-detail").textContent = detail || "";
}

const playBtn = document.getElementById("play-btn");
const slider = document.getElementById("time-slider");
const readout = document.getElementById("time-readout");
const officialBtn = document.getElementById("official-btn");
const officialStatus = document.getElementById("official-status");

function stopAnim() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
  playBtn.textContent = "Play";
}
function renderModelAt(pct) {
  const s = PALISADES_SCENARIO;
  spreadLayer.clearLayers();
  drawScenarioFire(spreadLayer, PALISADES_FINAL, [s.fire.lat, s.fire.lng], pct / 100);
  readout.textContent = `Reconstruction · ${Math.round(pct)}% of final burn area`;
}
function playModel() {
  if (animTimer) { stopAnim(); return; }
  playBtn.textContent = "Pause";
  let v = parseFloat(slider.value) || 0;
  if (v >= 100) v = 0;
  animTimer = setInterval(() => {
    v += 2;
    if (v >= 100) { v = 100; slider.value = "100"; renderModelAt(100); stopAnim(); return; }
    slider.value = String(Math.round(v));
    renderModelAt(v);
  }, 120);
}
slider.addEventListener("input", () => { stopAnim(); renderModelAt(parseFloat(slider.value)); });
playBtn.addEventListener("click", playModel);
officialBtn.addEventListener("click", () => {
  officialLayer.clearLayers();
  officialStatus.textContent = "Loading official perimeter…";
  loadOfficialPerimeter(officialLayer, (msg) => { officialStatus.textContent = msg; });
});

function startLive() {
  stopAnim();
  dataLayer.clearLayers(); spreadLayer.clearLayers(); officialLayer.clearLayers();
  setRisk("—", "Locating…"); setWind("—", "");
  loadFires(dataLayer).then(({ fires, live }) => {
    if (mode !== "live") return;
    setRisk("—", `${fires.length} fires loaded (${live ? "live" : "sample"}). Locating…`);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mode !== "live") return;
        const { latitude, longitude } = pos.coords;
        L.marker([latitude, longitude], { icon: personIcon() }).addTo(dataLayer).bindPopup("You are here");
        map.setView([latitude, longitude], 9);
        const km = nearestFireKm(latitude, longitude, fires);
        setRisk(riskLevel(km), `Nearest fire ${km.toFixed(1)} km away · ${live ? "live data" : "sample data"}`);
        loadWind(latitude, longitude)
          .then((w) => { if (mode !== "live") return; setWind(`${w.speed.toFixed(0)} km/h ${compass(w.direction)}`, `From ${Math.round(w.direction)}°`); })
          .catch(() => {});
      },
      () => { if (mode !== "live") return; setRisk("—", "Location denied — map and fires only."); }
    );
  });
}

function startScenario() {
  stopAnim();
  dataLayer.clearLayers(); spreadLayer.clearLayers(); officialLayer.clearLayers();
  officialStatus.textContent = "";
  map.removeLayer(street); map.removeLayer(terrain); satellite.addTo(map);
  const s = PALISADES_SCENARIO;
  L.marker([s.fire.lat, s.fire.lng], { icon: fireIcon() }).addTo(dataLayer).bindPopup(s.fire.title);
  L.marker([s.person.lat, s.person.lng], { icon: personIcon() }).addTo(dataLayer).bindPopup("Your position");
  map.fitBounds(L.latLngBounds(PALISADES_FINAL), { padding: [40, 40] });
  const km = haversineKm(s.person.lat, s.person.lng, s.fire.lat, s.fire.lng);
  setRisk(riskLevel(km), `You are ${km.toFixed(1)} km from the ignition`);
  setWind(`${s.windKmh} km/h ${compass(s.windFromDeg)}`, `Driving the fire to the ${compass((s.windFromDeg + 180) % 360)}`);
  slider.value = "25";
  renderModelAt(25);
}

const liveBtn = document.getElementById("mode-live");
const scenarioBtn = document.getElementById("mode-scenario");
function setMode(m) {
  mode = m;
  liveBtn.classList.toggle("active", m === "live");
  scenarioBtn.classList.toggle("active", m === "scenario");
  document.getElementById("scenario-card").hidden = m !== "scenario";
  if (m === "live") startLive(); else startScenario();
}
liveBtn.onclick = () => setMode("live");
scenarioBtn.onclick = () => setMode("scenario");

setMode("live");