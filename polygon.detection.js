var ecoregionsLayer;

fetch('meow_ecos.json')
  .then(res => res.json())
  .then(data => {
    // This adds the entire global grid to your map!
    ecoregionsLayer = L.geoJSON(data, {
      style: { color: "#3388ff", weight: 1, fillOpacity: 0.1 }
    }).addTo(map);
    
    // Save the data to use for our "Impact" check
    window.meowData = data; 
  });
function checkImpact(currentTrashCoords) {
  var point = turf.point(currentTrashCoords);
  
  // Use Turf to find which polygon from the MEOW file contains the trash
  var foundRegion = null;
  
  window.meowData.features.forEach(feature => {
    if (turf.booleanPointInPolygon(point, feature)) {
      foundRegion = feature.properties.ECOREGION; // This pulls the name like "Agulhas Bank"
    }
  });

  if (foundRegion) {
    // Now you have the name! Send it to your AI function
    getAIImpactStatus(foundRegion);
  }
}

async function getAIImpactStatus(regionName) {
  // This is where you call your AI API (like OpenAI or Gemini)
  // Your prompt would be: "Tell me how plastic impacts the ${regionName} ecosystem"
  console.log("Asking AI about: " + regionName);
}
