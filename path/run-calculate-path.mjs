import { simulateDrift, loadCurrentGrid, buildGridMap, buildLatLons } from "./calculating-path.mjs";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

let grid, gridMap, allLats, allLons;

export function runSimulation(startLat, startLon, trashType, days) {
  if (!grid) {
    const gridFile = new URL("./miamicurrents_adb9_d715_505d.json", import.meta.url);
    grid = loadCurrentGrid(gridFile);
    gridMap = buildGridMap(grid);
    ({ allLats, allLons } = buildLatLons(grid));
  }

  const path = simulateDrift(startLat, startLon, trashType, days, gridMap, allLats, allLons);
  const result = { trashType, startLat, startLon, days, path };
  const __dirname = dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(join(__dirname, "path.json"), JSON.stringify(result, null, 2));
  console.log("Exported path.json");
}
