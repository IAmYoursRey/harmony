const fs = require('fs');
const path = require('path');

const RAW_VILLAGES_FILE = 'd:/vscode/Harmony/apps/web/public/desa-extract/indonesia_villages_border.geojson';
const OUT_DESA = 'd:/vscode/Harmony/apps/web/public/indonesia-desa.geojson';
const OUT_KELURAHAN = 'd:/vscode/Harmony/apps/web/public/indonesia-kelurahan.geojson';

console.log("Loading raw villages data...");
const rawData = JSON.parse(fs.readFileSync(RAW_VILLAGES_FILE, 'utf8'));

console.log(`Loaded ${rawData.length} villages. Converting to GeoJSON...`);

const desaFeatures = [];
const kelurahanFeatures = [];

for (const item of rawData) {
    if (!item.border || !Array.isArray(item.border) || item.border.length === 0) continue;
    
    // Check if it's a kelurahan
    const isKelurahan = item.village.toUpperCase().startsWith('KELURAHAN');
    
    const feature = {
        type: "Feature",
        properties: {
            name: item.village,
            province: item.province,
            district: item.district,
            sub_district: item.sub_district
        },
        geometry: {
            type: "Polygon",
            coordinates: [item.border]
        }
    };
    
    if (isKelurahan) {
        kelurahanFeatures.push(feature);
    } else {
        desaFeatures.push(feature);
    }
}

const desaFC = {
    type: "FeatureCollection",
    features: desaFeatures
};

const kelurahanFC = {
    type: "FeatureCollection",
    features: kelurahanFeatures
};

console.log(`Writing ${desaFeatures.length} desas...`);
fs.writeFileSync(OUT_DESA, JSON.stringify(desaFC));

console.log(`Writing ${kelurahanFeatures.length} kelurahans...`);
fs.writeFileSync(OUT_KELURAHAN, JSON.stringify(kelurahanFC));

console.log("Done generating Desa and Kelurahan GeoJSONs.");
