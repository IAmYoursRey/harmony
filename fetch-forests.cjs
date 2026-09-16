const fs = require('fs');
const https = require('https');

const query = `[out:json][timeout:90];
area["ISO3166-1"="ID"]->.searchArea;
(
  relation["boundary"="national_park"](area.searchArea);
  relation["landuse"="forest"]["name"~"Taman Nasional|Hutan"](area.searchArea);
);
out body;
>;
out skel qt;`;

const postData = 'data=' + encodeURIComponent(query);

const options = {
  hostname: 'overpass-api.de',
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'HarmonyApp/1.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Got data from Overpass. Elements:', json.elements?.length);
      fs.writeFileSync('osm-temp.json', data);
      console.log('Saved to osm-temp.json. Use osmtogeojson to convert.');
      
      // Let's use the project's osmtogeojson to convert it immediately
      try {
        const osmtogeojson = require('./apps/server/node_modules/osmtogeojson');
        const geojson = osmtogeojson(json);
        
        // Remove point features to keep it clean (we only want polygons)
        geojson.features = geojson.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
        
        fs.writeFileSync('apps/web/public/indonesia-hutan.geojson', JSON.stringify(geojson));
        console.log('Successfully wrote true polygons to apps/web/public/indonesia-hutan.geojson');
      } catch (e) {
        console.error('Failed to run osmtogeojson:', e.message);
      }

    } catch(e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
