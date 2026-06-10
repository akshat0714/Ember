# Ember — 3D Wildfire Spread Reconstruction & Evacuation

> GENIUS Olympiad — Coding Hackathon submission

Ember reconstructs a real wildfire in interactive 3D, models where the fire could spread next, and suggests an evacuation route away from the modeled danger. The current build reconstructs the **Kenneth Fire** (January 9, 2025 — West Hills, Los Angeles) over Google's photorealistic 3D terrain.

## Problem

Wildfires force split-second evacuation decisions, and people often can't tell how close the danger is, which way it's moving, or which direction is safe to leave. Ember turns the spread of a fire — and the choice of where to go — into something you can actually see on real terrain.

## What it does

- **3D reconstruction over real terrain.** Plays the Kenneth Fire's reconstructed spread on Google photorealistic 3D tiles, with a scrubbable, play/replay timeline (ignition → early → broader → major → final footprint). Burned ground paints in dark red and deepens as it ages.
- **Spread-potential model.** From the current front, a minimum-travel-time model estimates a "likely spread in the next 30 minutes" zone, draws the fastest advancing pathways, and shows a wind-direction overlay. The front grows in irregular, terrain-driven shapes — fingers up slopes and down canyons rather than one smooth oval — while still matching the historical stage outlines.
- **Driver readout.** Reports the factors pushing the fire at the front — wind, slope, fuel, canyon channeling, structure-edge resistance — as High / Medium / Low.
- **One-button "Help" rescue flow.** Press *Help — I need to evacuate* and the app locates you, asks what you have to travel with (car, bike, on foot, or mobility-limited), then gives plain-language, turn-by-turn directions — a compass heading, a step list, ETA, and distance — along a road route to a safe zone, walking you there in the fire's own timeline. The route is continuously re-scored against the live fire model and rejected if it would cross the fire, hug the front, or lead back into the predicted zone; if nothing is safe, the app says so honestly rather than inventing a route.

## How it works — and what's real vs. modeled

- **Map:** Google Maps JavaScript API, photorealistic 3D Maps (`maps3d` library).
- **Reconstruction:** the spread stages are a **labeled historical reconstruction** built from official incident facts (start point and time, spread direction, final size) plus the real geography — **not** a surveyed perimeter. The only acreage presented as official is the final size (1,052 acres).
- **Spread model:** a minimum-travel-time arrival-time model (Dijkstra / fast-marching) over a ~70 m grid, with anisotropic local spread driven by wind, slope, fuel patchiness, canyon alignment, and developed-edge resistance — the same wind-and-slope-driven FARSITE/Finney tradition, though it uses an arrival-time field rather than the explicit elliptical-wavelet construction FARSITE draws. A custom per-vertex front advance (the "frontier-warp") then animates the perimeter between stages. **Terrain elevation is an analytic approximation** of the area's main landforms, not a downloaded DEM. Everything the model produces is labeled "spread potential," never an official forecast.
- **Rescue flow:** the candidate roads are author-defined routes out of the area, re-scored on every refresh against the modeled fire; a pure risk scorer rejects any route that crosses the fire, hugs the front, or leads back into the predicted zone (including a penalty for fleeing downwind, where the fire's head travels) and keeps the safest survivor. Your position is a **simulated GPS fix** for the demo, and **safe zones are simulated — not official shelters. This is not emergency guidance.**

## Data & sources

- **Google Maps Platform** — 3D map tiles and Directions.
- **Kenneth Fire incident facts** — CAL FIRE / LAFD public reports.
- **NASA FIRMS** thermal-detection data for the fire is included as reference data (`public/data/kenneth_firms.csv`).

## Run it locally

This app renders Google photorealistic 3D terrain, which requires a Google Maps API key **with billing enabled**.

1. In the [Google Cloud console](https://console.cloud.google.com/google/maps-apis), create an API key (billing on) and enable both the **Maps JavaScript API** and the **Map Tiles API**.
2. Copy `.env.example` to `.env` and set your key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_key_here
   ```
   Optionally also set `VITE_GEMINI_API_KEY` to have the rescue assistant's messages phrased by Google's Gemini; without it the app uses built-in wording, so the key is not required.
3. Install and run:
   ```
   npm install
   npm run dev
   ```
   Open the printed `localhost` URL. Without a key, the app shows a setup screen instead of the map.

**Tech stack:** React 18 · TypeScript · Vite · Google Maps JS API (`maps3d` + routes).

## Limitations

- The reconstruction and the spread-potential model are **estimates**, not official perimeters or forecasts; elevation is approximated and the physics is simplified.
- Evacuation routes and safe zones are **model-based and simulated** — not official emergency guidance. In a real emergency, follow local authorities.
- The app needs a Google Maps API key with billing to display anything.

## AI-usage declaration

This project was built with substantial assistance from an AI coding assistant (Anthropic's Claude), and that assistance is disclosed here in full, as the hackathon requires.

**What AI did:** AI wrote and structured the large majority of the code in this repository — including the fire-spread model (the Dijkstra minimum-travel-time arrival field and the frontier-warp front animation), the prediction-band contouring (marching squares + smoothing), the irregular terrain-driven spread shaping, the one-button "Help" rescue flow and its route risk-scoring (including the movement and downwind-penalty fixes), the React/TypeScript components and UI, the typed data and configuration modules, and the build setup. AI was also used for background research and to help draft this README.

**Runtime AI:** the running app can also call Google's Gemini API to phrase the rescue assistant's messages when a `VITE_GEMINI_API_KEY` is provided; it falls back to built-in wording when no key is set.

**What I did:** _[Fill this in honestly — only what is actually true. For example: the original concept and goals for Ember; choosing the Kenneth Fire as the case study and selecting the data sources; design and feature decisions; running, testing, and debugging the app (such as the API-key and build setup); and integrating and deploying the final result. Replace this sentence with your real contribution.]_

— _[Your name]_
