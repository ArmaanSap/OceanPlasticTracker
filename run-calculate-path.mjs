import { simulateDrift, loadCurrentGrid, buildGridMap, buildLatLons } from "./calculating-path.mjs";
import fs from "fs";

const grid = loadCurrentGrid("miamicurrents_adb9_d715_505d.json");
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

  fs.writeFileSync("path.json", JSON.stringify(result, null, 2));
  console.log("Exported path.json");

}