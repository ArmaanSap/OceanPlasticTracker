import fs from "fs";

// these values are currently just made up
const TRASH_TYPES = {
  plastic_bag:  { dragFactor: 0.6 },
  bottle:       { dragFactor: 0.85 },
  fishing_net:  { dragFactor: 1.0 },
  styrofoam:    { dragFactor: 0.7 },
};



function loadCurrentGrid(filename) {
  const raw = fs.readFileSync(filename, "utf8");
  const data = JSON.parse(raw);
  const { columnNames, rows } = data.table;

  const latIdx = columnNames.indexOf("latitude");
  const lonIdx = columnNames.indexOf("longitude");
  const uIdx   = columnNames.indexOf("u_current");
  const vIdx   = columnNames.indexOf("v_current");

  const grid = [];
  for (const row of rows) {
    const u = row[uIdx];
    const v = row[vIdx];
    if (u === null || v === null) continue;
    grid.push({ lat: row[latIdx], lon: row[lonIdx], u: u, v: v });
  }

  console.log("Loaded " + grid.length + " grid points");
  console.log("First point:", grid[0]);
  
  return grid;
}

function buildGridMap(grid) {
  const map = new Map();
  for (const point of grid) {
    const key = point.lat.toFixed(2) + "," + point.lon.toFixed(2);
    map.set(key, point);
  }
  return map;
}


function interpolateCurrent(lat, lon, gridMap, allLats, allLons) {

  // --- find the 4 surrounding grid lines ---

  // find the grid latitude just below our position
  let lat0 = null;
  for (const l of allLats) {
    if (l <= lat) {
      lat0 = l;
    }
  }

  // find the grid latitude just above our position
  let lat1 = null;
  for (const l of allLats) {
    if (l >= lat && lat1 === null) {
      lat1 = l;
    }
  }

  // find the grid longitude just left of our position
  let lon0 = null;
  for (const l of allLons) {
    if (l <= lon) {
      lon0 = l;
    }
  }

  // find the grid longitude just right of our position
  let lon1 = null;
  for (const l of allLons) {
    if (l >= lon && lon1 === null) {
      lon1 = l;
    }
  }

  // if we are outside the grid entirely, return zero current
  if (lat0 === null || lat1 === null || lon0 === null || lon1 === null) {
    return { u: 0, v: 0 };
  }

  // --- how far between the grid lines are we? ---
  // 0 = sitting on the lower line, 1 = sitting on the upper line

  let tLat;
  if (lat0 === lat1) {
    tLat = 0; // exactly on a grid line, avoid dividing by zero
  } else {
    tLat = (lat - lat0) / (lat1 - lat0);
  }

  let tLon;
  if (lon0 === lon1) {
    tLon = 0;
  } else {
    tLon = (lon - lon0) / (lon1 - lon0);
  }

  // --- look up the current at each of the 4 corners ---

  function lookup(la, lo) {
    const key = la.toFixed(2) + "," + lo.toFixed(2);
    const point = gridMap.get(key);
    if (point === undefined) {
      return { u: 0, v: 0 }; // land cell, no current
    }
    return point;
  }

  const bottomLeft  = lookup(lat0, lon0);
  const bottomRight = lookup(lat0, lon1);
  const topLeft     = lookup(lat1, lon0);
  const topRight    = lookup(lat1, lon1);

  // --- blend the 4 corners ---
  const bottomU = (1 - tLon) * bottomLeft.u + tLon * bottomRight.u;
  const bottomV = (1 - tLon) * bottomLeft.v + tLon * bottomRight.v;

  const topU = (1 - tLon) * topLeft.u + tLon * topRight.u;
  const topV = (1 - tLon) * topLeft.v + tLon * topRight.v;

  // finally blend top and bottom together
  const u = (1 - tLat) * bottomU + tLat * topU;
  const v = (1 - tLat) * bottomV + tLat * topV;

  return {u, v};
}

function updatePosition(lat, lon, u, v, dragFactor, dtSeconds) {
  const metersPerDegLat = 111132;
  const metersPerDegLon = 111132 * Math.cos(lat * Math.PI / 180);

  const newLat = lat + (v * dragFactor * dtSeconds) / metersPerDegLat;
  const newLon = lon + (u * dragFactor * dtSeconds) / metersPerDegLon;

  return { lat: newLat, lon: newLon };
}



function simulateDrift(startLat, startLon, trashType, days) {
  const dragFactor = TRASH_TYPES[trashType].dragFactor;
  const hour_interval = 6;
  const dtSeconds = hour_interval * 3600;  // move in hour_interval hour steps
  const totalSteps = (days * 24) / hour_interval;

  let lat = startLat;
  let lon = startLon;
  const path = [];

  for (let step = 0; step < totalSteps; step++) {
    const day = (step * hour_interval) / 24;

    // record current position
    path.push({ lat: lat, lon: lon, day: day });

    // get current at this position
    const current = interpolateCurrent(lat, lon, gridMap, allLats, allLons);

    // move to next position
    const newPos = updatePosition(lat, lon, current.u, current.v, dragFactor, dtSeconds);
    lat = newPos.lat;
    lon = newPos.lon;
  }

  return path;
}





/*
const dragFactor = TRASH_TYPES.plastic_bag.dragFactor;
const newPos = updatePosition(28.5, -79.0, 0.0472, 0.2189, dragFactor, 21600);
console.log("New position:", newPos);
*/


// build the grid and helper data structures once
const grid = loadCurrentGrid("miamicurrents_adb9_d715_505d.json");
const gridMap = buildGridMap(grid);

const allLats = [];
for (const point of grid) {
  if (!allLats.includes(point.lat)) {
    allLats.push(point.lat);
  }
}
allLats.sort((a, b) => a - b);

const allLons = [];
for (const point of grid) {
  if (!allLons.includes(point.lon)) {
    allLons.push(point.lon);
  }
}
allLons.sort((a, b) => a - b);


// running the simulation and exporting to json
const startlat = 48.452089;
const startlon = -20.239962;
const trashtype = "plastic_bag";
const days = 3000;

const path = simulateDrift(startlat, startlon, trashtype, days);

const result = {
  trashType: trashtype,
  startLat: startlat,
  startLon: startlon,
  days: days,
  path: path
};

fs.writeFileSync("path.json", JSON.stringify(result, null, 2));
console.log("Exported path.json");