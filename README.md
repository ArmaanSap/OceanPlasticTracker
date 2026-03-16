
2026 smathhacks project

# Ocean Plastic Tracker

## Team

- **Henry Liu**
- **Armaan Sapra**
- **Burton Briggs**
- **August Gordon**

A real-time ocean plastic drift simulator built for hackathon. Drop a piece of trash anywhere in the Atlantic, choose a trash type, and watch it drift along real NOAA ocean current data — with AI-generated ecosystem impact analysis at every point along the path.

---

## Demo

Play around with all the buttons!

https://oceanplastictracker-production.up.railway.app/

OR

1. Clone the repo
2. Add your Groq API key to a `.env` file in the root:
   ```
   API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Install dependencies and start the server:
   ```bash
   npm install
   node server.mjs
   ```
4. Open `http://localhost:3000`

---

## How it works

### Simulation

The core simulation runs in Node.js. At each timestep:

1. **Interpolation** — the trash position falls between grid points, so we use bilinear interpolation across the 4 surrounding grid cells to get a smooth current velocity at any arbitrary lat/lon
2. **Physics** — velocity (m/s) is converted to degrees of movement using the haversine approximation: `1° lat ≈ 111,000m`, `1° lon ≈ 111,000m × cos(lat)`
3. **Drag factor** — each trash type has a multiplier on the current velocity to approximate surface drag and windage (e.g. plastic bags move ~20% faster than the current, bottles ~15% slower)
4. **Timestep** — default 6 hours. The simulation runs for up to 730 days and records every position as `{lat, lon, day}`

The output is written to `path/path.json` and served to the frontend.

### Current Data

Real surface current data from **NOAA Miami Geostrophic Currents** (`miamicurrents` dataset), downloaded from ERDDAP:

```
https://cwcgom.aoml.noaa.gov/erddap/griddap/miamicurrents.html
```

- **Variables**: `u_current` (eastward m/s), `v_current` (northward m/s)
- **Resolution**: 0.2° (~22km per grid cell)
- **Coverage**: Global
- **Points**: 842,747 grid cells

The dataset is loaded once at server start and kept in memory as a `Map` keyed by `"lat,lon"` for O(1) lookup during interpolation.

### Ecoregion Detection

Ocean ecoregions are sourced from the **Marine Ecoregions of the World (MEOW)** dataset. When a user clicks anywhere on the path or the ocean, we use **Turf.js** `booleanPointInPolygon` to check which of the 232 ecoregion polygons contains that point. If no polygon matches, it's classified as open ocean.

### AI Ecosystem Analysis

When the user clicks a point on the drift path, the server sends a context-aware prompt to **Groq** (LLaMA 3.1 8B) including:
- Trash type
- Coordinates
- Ecoregion name (if detected)

The model returns a short ecological impact summary specific to that region and trash type, displayed in a floating panel on the map.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Simulation | Node.js (ES Modules) |
| Server | Express.js |
| Current data | NOAA ERDDAP / Miami Geostrophic Currents |
| Ecoregion data | MEOW GeoJSON |
| Ocean/land detection | Turf.js + Natural Earth GeoJSON |
| Map | Leaflet.js + OpenStreetMap / Esri Satellite |
| AI | Groq API (LLaMA 3.1 8B Instant) |
| Frontend | Vanilla HTML/CSS/JS |

---

## File Structure

```
OceanPlasticTracker/
  server.mjs                        — Express server, simulation endpoint, AI endpoint
  index.html                        — Parameter selection UI
  ne_110m_ocean.json                — Natural Earth ocean polygons (land detection)
  meow_ecos.json                    — Marine Ecoregions of the World polygons
  path/
    calculating-path.mjs            — Core simulation logic
    run-calculate-path.mjs          — Simulation entry point, exports runSimulation()
    demo.html                       — Leaflet map with animation and controls
    path.json                       — Generated drift path output
    miamicurrents_adb9_d715_505d.json  — NOAA current grid data
    pictures/                       — Trash type icons
```

---

## Trash Types

| Type | Drag Factor | Notes |
|---|---|---|
| Plastic bag | 1.4 | Light, high surface area, wind-driven |
| Bottle | 1.1 | Partially submerged, slower than current |
| Fishing net | 0.8 | Neutral, follows current exactly |
| Styrofoam | 1.7 | Very light, fastest moving |

---
