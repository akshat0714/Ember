// self-contained geometry
function _d2r(d) { return (d * Math.PI) / 180; }
function _r2d(r) { return (r * 180) / Math.PI; }
function _lerp(a, b, t) { return a + (b - a) * t; }
function _destPoint(lat, lng, distKm, bearingDeg) {
  const R = 6371, d = distKm / R, b = _d2r(bearingDeg);
  const la1 = _d2r(lat), ln1 = _d2r(lng);
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const ln2 = ln1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [_r2d(la2), _r2d(ln2)];
}
function _heatColor(t) {
  const stops = [
    [0.00, [255, 247, 200]], [0.18, [255, 210, 74]], [0.38, [255, 154, 31]],
    [0.58, [255, 74, 0]], [0.78, [200, 20, 0]], [1.00, [110, 12, 0]],
  ];
  let i = 0;
  while (i < stops.length - 1 && t > stops[i + 1][0]) i++;
  const [t0, c0] = stops[i];
  const [t1, c1] = stops[Math.min(i + 1, stops.length - 1)];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return `rgb(${Math.round(_lerp(c0[0], c1[0], f))},${Math.round(_lerp(c0[1], c1[1], f))},${Math.round(_lerp(c0[2], c1[2], f))})`;
}

// ---- generic wind-driven model (kept for Live mode / your own area later) ----
function lengthBreadthRatio(windKmh) {
  const U = windKmh / 3.6;
  const lb = 0.936 * Math.exp(0.2566 * U) + 0.461 * Math.exp(-0.1548 * U) - 0.397;
  return Math.min(2.0, Math.max(1.1, lb));
}
const ROS_FACTOR = 0.05;
function estimatedHeadRosKmh(windKmh) { return ROS_FACTOR * windKmh; }
function spreadPolygon(fireLat, fireLng, windKmh, windFromDeg, headKm) {
  const LB = lengthBreadthRatio(windKmh);
  const e = Math.sqrt(LB * LB - 1) / LB;
  const headBearing = (windFromDeg + 180) % 360;
  const pts = [];
  for (let b = 0; b <= 360; b += 6) {
    const theta = _d2r(b - headBearing);
    const dist = (headKm * (1 - e)) / (1 - e * Math.cos(theta));
    pts.push(_destPoint(fireLat, fireLng, dist, b));
  }
  return pts;
}
function drawProgression(layer, fireLat, fireLng, windKmh, windFromDeg, tHours) {
  if (tHours <= 0) return;
  const reach = estimatedHeadRosKmh(windKmh) * tHours;
  const N = 18;
  for (let i = N; i >= 1; i--) {
    const t = i / N;
    const pts = spreadPolygon(fireLat, fireLng, windKmh, windFromDeg, reach * t);
    const isFront = i === N;
    L.polygon(pts, {
      className: isFront ? "fire-front" : "fire-band", interactive: false,
      stroke: isFront, color: "#ffd24a", weight: isFront ? 2 : 0,
      fill: true, fillColor: _heatColor(t), fillOpacity: _lerp(0.55, 0.08, t),
    }).addTo(layer);
  }
}

// ---- Palisades reconstruction: a hand-drawn footprint that grows out of the ignition ----
function scalePolygon(ring, origin, f) {
  return ring.map(([la, ln]) => [origin[0] + (la - origin[0]) * f, origin[1] + (ln - origin[1]) * f]);
}
function drawScenarioFire(layer, ring, origin, f) {
  if (f <= 0) return;
  const bands = [
    { s: 1.00, color: "#ff9a1f", op: 0.30, front: true },
    { s: 0.80, color: "#ff5a00", op: 0.36 },
    { s: 0.58, color: "#c81400", op: 0.44 },
    { s: 0.35, color: "#5e1400", op: 0.58 },
  ];
  for (const b of bands) {
    const poly = scalePolygon(ring, origin, f * b.s);
    L.polygon(poly, {
      className: b.front ? "fire-front" : "fire-band", interactive: false, smoothFactor: 1,
      stroke: !!b.front, color: "#ffd24a", weight: b.front ? 2.5 : 0,
      fill: true, fillColor: b.color, fillOpacity: b.op,
    }).addTo(layer);
  }
}