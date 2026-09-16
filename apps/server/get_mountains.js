import fs from 'fs';

async function fetchOSM() {
  const query = `
    [out:json][timeout:180];
    area["ISO3166-1"="ID"]->.searchArea;
    (
      node["natural"="volcano"](area.searchArea);
      node["natural"="peak"](area.searchArea);
    );
    out;
  `;

  console.log("Fetching from Overpass API...");
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GeoRiskApp/1.0'
      },
      body: 'data=' + encodeURIComponent(query)
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    
    console.log(`Total features found: ${data.elements.length}`);
    
    let volcanoes = 0;
    let peaks = 0;
    
    const mountains = data.elements.map(el => {
      const isVolcano = el.tags.natural === 'volcano';
      if (isVolcano) volcanoes++;
      else peaks++;
      
      const vStatus = (el.tags['volcano:status'] || '').toLowerCase();
      const vType = (el.tags['volcano:type'] || '').toLowerCase();
      
      let status = "Inactive";
      if (isVolcano) {
        if (vStatus.includes('active') || vType.includes('stratovolcano') || (el.tags.name && el.tags.name.toLowerCase().includes('gunung api'))) {
          status = "Active";
        } else if (vStatus.includes('dormant')) {
          status = "Dormant";
        } else {
          status = "Inactive"; 
        }
      }
      
      return {
        id: el.id,
        name: el.tags.name || "Unnamed Peak",
        lat: el.lat,
        lng: el.lon,
        type: isVolcano ? 'volcano' : 'peak',
        status: isVolcano ? status : 'Inactive',
        elevation: el.tags.ele || "Unknown"
      };
    }).filter(m => m.name !== "Unnamed Peak");

    console.log(`Volcanoes: ${volcanoes}, Peaks: ${peaks}`);
    console.log(`Named mountains after filtering: ${mountains.length}`);
    
    fs.writeFileSync('src/database/data/mountains.json', JSON.stringify(mountains, null, 2));
    console.log("Saved to src/database/data/mountains.json");
    
  } catch(e) {
    console.error(e);
  }
}

fetchOSM();
