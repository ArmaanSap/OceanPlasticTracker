import express from "express";
import { runSimulation } from "./path/run-calculate-path.mjs";

import * as turf from "@turf/turf";
import fs from "fs";


// keep, even if the gemini code doesnt work (it's used for other stuff)
const app = express(); 
app.use(express.json());



import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize Gemini outside the route to reuse the instance
const genAI = new GoogleGenerativeAI("YOUR_API_KEY_HERE");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });





const ocean = JSON.parse(fs.readFileSync("./ne_110m_ocean.json", "utf8"));

function isInOcean(lat, lon) {
  const point = turf.point([lon, lat]);
  return ocean.features.some(feature => 
    turf.booleanPointInPolygon(point, feature)
  );
}

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

app.post("/inocean", (req, res) => {
  const { lat, lon } = req.body;
  const point = turf.point([lon, lat]);
  const inOcean = ocean.features.some(feature =>
    turf.booleanPointInPolygon(point, feature)
  );
  res.json({ inOcean });
});

app.post("/api/gemini", async (req, res) => {
  const { region } = req.body;

  if (!region) {
    return res.status(400).json({ message: "Region is required." });
  }

  const prompt = `You are a marine biologist. A piece of plastic has entered the ${region} ecoregion. 
    Briefly name one sea animal found here and how this plastic specifically threatens it. 
    Keep it under 40 words and sound professional.`;

  try {
    const result = await model.generateContent(prompt);
    // Note: Use .text() as a function call
    const responseText = result.response.text(); 
    
    res.json({ message: responseText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signal interference. Unable to analyze." });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
