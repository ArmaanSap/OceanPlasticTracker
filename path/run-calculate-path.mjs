import { simulateDrift, loadCurrentGrid, buildGridMap, buildLatLons } from "./calculating-path.mjs";
import fs from "fs";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Resolve the grid file path relative to this module so that it works
// regardless of the current working directory.
const gridFile = new URL("./miamicurrents_adb9_d715_505d.json", import.meta.url);
const grid = loadCurrentGrid(gridFile);
const gridMap = buildGridMap(grid);
const { allLats, allLons } = buildLatLons(grid);

export function runSimulation(startLat, startLon, trashType, days) {
  const path = simulateDrift(startLat, startLon, trashType, days, gridMap, allLats, allLons);

  const result = {
    trashType: trashType,
    startLat:  startLat,
    startLon:  startLon,
    days:      days,
    path:      path
  };

  

  const __dirname = dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(join(__dirname, "path.json"), JSON.stringify(result, null, 2));
  console.log("Exported path.json");

}