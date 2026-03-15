import express from "express";
import { runSimulation } from "./path/run-calculate-path.mjs";
import * as turf from "@turf/turf";
import fs from "fs";
// 1. Swap the import to Google Generative AI
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(express.json());

// 2. Initialize Gemini 1.5 Flash
const genAI = new GoogleGenerativeAI("AIzaSyDd2dnSAltB9t9vwjRiFZTUw6j51FmM5CQ");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

// 3. Updated Gemini Route
app.post("/api/gemini", async (req, res) => {
  const { region } = req.body;

  if (!region) {
    return res.status(400).json({ message: "Region is required." });
  }

  try {
    // Ensure you are using 'model.generateContent' (Gemini syntax)
    // NOT 'anthropic.messages.create'
    const result = await model.generateContent(`You are a marine biologist. A piece of plastic has entered the ${region} ecoregion. Briefly name one sea animal found here and how this plastic specifically threatens it. Keep it under 40 words.`);
    
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });
  } catch (err) {
    console.error("AI Error:", err);
    // This helps you see if the error is actually a 401 (Auth) or something else
    res.status(err.status || 500).json({ message: "AI Link Failed", detail: err.message });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));