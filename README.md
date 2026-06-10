# Ember

## 3D Wildfire Spread Reconstruction and Evacuation

> GENIUS Olympiad Coding Hackathon submission

Ember reconstructs a real wildfire in interactive 3D, models where the fire could spread next, and suggests an evacuation route away from the modeled danger. The current build reconstructs the **Kenneth Fire** from January 9, 2025 in West Hills, Los Angeles over Google's photorealistic 3D terrain.

## Problem

Wildfires force split second evacuation decisions. People often cannot tell how close the danger is, which way the fire is moving, or which direction is safer to leave. Ember turns the spread of a fire and the decision of where to go into something people can actually see on real terrain.

## What it does

* **3D reconstruction over real terrain.** Ember plays the Kenneth Fire's reconstructed spread on Google photorealistic 3D tiles with a scrubbable play and replay timeline. The timeline moves from ignition to the early spread, broader spread, major spread, and final footprint. Burned ground appears in dark red and deepens as it ages.

* **Spread potential model.** From the current fire front, a minimum travel time model estimates the likely spread zone for the next 30 minutes. It draws the fastest advancing pathways and shows a wind direction overlay. The front grows in irregular terrain driven shapes, with fingers up slopes and through canyons instead of one smooth oval, while still matching the historical stage outlines.

* **Driver readout.** Ember reports the factors pushing the fire at the front, including wind, slope, fuel, canyon channeling, and structure edge resistance. Each factor is shown as High, Medium, or Low.

* **One button Help rescue flow.** Press **Help, I need to evacuate** and the app locates you, asks what you have to travel with, then gives plain language directions based on whether you have a car, bike, are on foot, or have limited mobility. It shows a compass heading, a step list, ETA, and distance along a route to a safe zone. The route is continuously scored against the live fire model and rejected if it would cross the fire, stay too close to the front, or lead back into the predicted zone. If nothing is safe, Ember says so honestly instead of inventing a route.

## How it works and what is real vs. modeled

* **Map.** Ember uses the Google Maps JavaScript API with the photorealistic 3D `maps3d` library.

* **Reconstruction.** The spread stages are a labeled historical reconstruction built from official incident facts, including start point, start time, spread direction, final size, and real geography. It is not a surveyed perimeter. The only acreage presented as official is the final size of 1,052 acres.

* **Spread model.** Ember uses a minimum travel time arrival model over a roughly 70 meter grid. The model uses Dijkstra style graph search with local spread driven by wind, slope, fuel patchiness, canyon alignment, and developed edge resistance. This follows the same general wind and slope driven tradition as FARSITE and Finney style models, but uses an arrival time field instead of the explicit elliptical wavelet construction used by FARSITE. A custom per vertex front advance method called **frontier warp** animates the perimeter between stages. Terrain elevation is an analytic approximation of the area's main landforms, not a downloaded DEM. Everything the model produces is labeled as spread potential, not an official forecast.

* **Rescue flow.** Candidate routes are author defined routes out of the area. They are re scored on every refresh against the modeled fire. The risk scorer rejects any route that crosses the fire, stays too close to the front, or leads back into the predicted zone. It also penalizes routes that flee downwind, where the head of the fire is most likely to travel. The user's position is a simulated GPS fix for the demo, and the safe zones are simulated. Ember is not emergency guidance.

## Data and sources

* **Google Maps Platform** for 3D map tiles and routing.
* **Kenneth Fire incident facts** from CAL FIRE and LAFD public reports.
* **NASA FIRMS** thermal detection data for the fire, included as reference data in `public/data/kenneth_firms.csv`.

## Run it locally

This app renders Google photorealistic 3D terrain, which requires a Google Maps API key with billing enabled.

1. In the [Google Cloud console](https://console.cloud.google.com/google/maps-apis), create an API key with billing on and enable both the **Maps JavaScript API** and the **Map Tiles API**.

2. Copy `.env.example` to `.env` and set your key.

```env
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

You can also set `VITE_GEMINI_API_KEY` if you want the rescue assistant's messages phrased by Google's Gemini. Without it, the app uses built in wording, so the Gemini key is not required.

3. Install and run the app.

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. Without a Google Maps key, the app shows a setup screen instead of the map.

**Tech stack**

React 18, TypeScript, Vite, Google Maps JavaScript API, `maps3d`, and route scoring logic.

## Limitations

* The reconstruction and spread potential model are estimates, not official perimeters or forecasts.
* Elevation is approximated and the physics are simplified.
* Evacuation routes and safe zones are model based and simulated.
* Ember is not official emergency guidance. In a real emergency, follow local authorities.
* The app needs a Google Maps API key with billing to display the 3D map.

## AI usage declaration

AI was used to help build parts of Ember, including

* visualizing wind vectors while the fire animates
* generating LLM style responses to evacuation requests
* fixing Google Maps API configuration errors
* debugging the evacuation pathway overlay alongside fire movement

I reviewed, tested, and modified the code so I could understand and explain the project.
