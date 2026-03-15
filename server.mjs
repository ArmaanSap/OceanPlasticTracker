
import 'dotenv/config';

import express from "express";
import { runSimulation } from "./path/run-calculate-path.mjs";
import * as turf from "@turf/turf";
import fs from "fs";


import Groq from "groq-sdk";

const app = express();
app.use(express.json());


const token = process.env.API_KEY;
const groq = new Groq({ apiKey: token });

const ocean = JSON.parse(fs.readFileSync("./ne_110m_ocean.json", "utf8"));

function isInOcean(lat, lon) {
  const point = turf.point([lon, lat]);
  return ocean.features.some(feature =>
    turf.booleanPointInPolygon(point, feature)
  );
}

app.use(express.static(".", { etag: false, lastModified: false, maxAge: 0 }));

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

app.post("/inocean", (req, res) => {
  const { lat, lon } = req.body;
  const point = turf.point([lon, lat]);
  const inOcean = ocean.features.some(feature =>
    turf.booleanPointInPolygon(point, feature)
  );
  res.json({ inOcean });
});

app.post("/ecosystem", async (req, res) => {
  const { lat, lon, trashType, ecoregion } = req.body;

  const location = ecoregion
    ? `the ${ecoregion} ecoregion (coordinates ${lat}, ${lon})`
    : `open ocean at coordinates ${lat}, ${lon}`;

  const prompt = `A ${trashType.replace("_", " ")} is floating in ${location}. In a few short bullet points, no more than 150 words, describe how this specific type of trash affects the local marine ecosystem at this location, including animals, plants, and non-living components. Be specific to the region (particularly, specific species to that region) and trash type. At the end, include brief links to external sources to learn more.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });
    const text = completion.choices[0].message.content;
    console.log("Groq response:", text);
    res.json({ text });
  } catch (err) {
    console.log("groq error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));