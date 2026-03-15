import express from "express";
import { runSimulation } from "./path/run-calculate-path.mjs";

import * as turf from "@turf/turf";
import fs from "fs";

const ocean = JSON.parse(fs.readFileSync("./ne_110m_ocean.json", "utf8"));

function isInOcean(lat, lon) {
  const point = turf.point([lon, lat]);
  return ocean.features.some(feature => 
    turf.booleanPointInPolygon(point, feature)
  );
}

const app = express();
app.use(express.json());
app.use(express.static(".", { etag: false, lastModified: false, maxAge: 0 }));  // serves index.html and path.json

app.post("/simulate", async (req, res) => {
  const { lat, lon, trashType, days, interval } = req.body;
  
  if (!isInOcean(lat, lon)) {
    return res.status(400).json({ error: "Coordinates are not in the ocean" });
  }

  try {
    runSimulation(lat, lon, trashType, days, interval);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(3000, () => console.log("Server running at http://localhost:3000/parameter-selection-interface.html"));
