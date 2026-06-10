async function loadWind(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Wind request failed: " + res.status);
  const data = await res.json();
  const cw = data.current_weather;
  return { speed: cw.windspeed, direction: cw.winddirection }; // km/h, degrees (FROM)
}