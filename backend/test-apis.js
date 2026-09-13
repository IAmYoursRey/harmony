import fs from "fs";

async function testAPIs() {
  const lat = -7.564722;
  const lng = 112.635278;

  try {
    const usgsRes = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=100&minmagnitude=4.5`,
    );
    const usgsData = await usgsRes.json();
    console.log("USGS Earthquakes:", usgsData.features.length);
  } catch (e) {
    console.error("USGS Error:", e.message);
  }

  try {
    const overpassQuery = `[out:json];way["waterway"](around:5000,${lat},${lng});out count;`;
    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    });
    const overpassData = await overpassRes.json();
    console.log("Overpass Waterways:", JSON.stringify(overpassData.elements));
  } catch (e) {
    console.error("Overpass Error:", e.message);
  }
}

testAPIs();
