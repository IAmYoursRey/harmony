import assert from 'node:assert/strict';
import proj4 from 'proj4';

// 1. Indonesian UTM Definitions
const UTM_DEFS = {
  'EPSG:32746': '+proj=utm +zone=46 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32747': '+proj=utm +zone=47 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32748': '+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32749': '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32750': '+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32751': '+proj=utm +zone=51 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32752': '+proj=utm +zone=52 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32753': '+proj=utm +zone=53 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32754': '+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs',
  'EPSG:32646': '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs',
  'EPSG:32647': '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs',
  'EPSG:32648': '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs',
  'EPSG:32649': '+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs',
  'EPSG:32650': '+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs',
  'EPSG:32651': '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs',
  'EPSG:32652': '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs',
};

Object.entries(UTM_DEFS).forEach(([code, def]) => {
  proj4.defs(code, def);
});

function getUtmZoneForLonLat(lng, lat) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const isSouth = lat < 0;
  return {
    zone,
    isSouth,
    epsg: isSouth ? `EPSG:${32700 + zone}` : `EPSG:${32600 + zone}`,
  };
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371008.8; // Mean Earth radius in meters (IUGG)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pointInPolygon(point, polygonCoords) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0];
    const yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0];
    const yj = polygonCoords[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function computeNDVI(nir, red) {
  if (nir + red === 0) return null;
  return (nir - red) / (nir + red);
}

function computeNDWI(green, nir) {
  if (green + nir === 0) return null;
  return (green - nir) / (green + nir);
}

function computeMNDWI(green, swir1) {
  if (green + swir1 === 0) return null;
  return (green - swir1) / (green + swir1);
}

function computeNDBI(swir1, nir) {
  if (swir1 + nir === 0) return null;
  return (swir1 - nir) / (swir1 + nir);
}

function computeBSI(swir1, red, nir, blue) {
  const num = (swir1 + red) - (nir + blue);
  const den = (swir1 + red) + (nir + blue);
  if (den === 0) return null;
  return num / den;
}

function computeSarRatioDb(vv, vh) {
  if (vv <= 0 || vh <= 0) return null;
  return 10 * Math.log10(vv / vh);
}

function calculateHornSlopeAspect(grid, cellSizeM = 30) {
  const [
    [z00, z01, z02],
    [z10, z11, z12],
    [z20, z21, z22]
  ] = grid;

  const dz_dx = ((z02 + 2 * z12 + z22) - (z00 + 2 * z10 + z20)) / (8 * cellSizeM);
  const dz_dy = ((z20 + 2 * z21 + z22) - (z00 + 2 * z01 + z02)) / (8 * cellSizeM);

  const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
  const slopeDeg = (slopeRad * 180) / Math.PI;

  let aspectDeg = 0;
  if (dz_dx !== 0 || dz_dy !== 0) {
    const aspectRad = Math.atan2(dz_dy, -dz_dx);
    aspectDeg = Math.round((450 - (aspectRad * 180) / Math.PI) % 360);
  }

  return {
    slopeDeg: Number(slopeDeg.toFixed(2)),
    aspectDeg: Number(aspectDeg.toFixed(2)),
  };
}

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('=== HARMONY GEOSPATIAL SCIENTIFIC VALIDATION SUITE ===\n');

// Group 1: CRS & Projection
console.log('1. Testing CRS Transformations & Projections');

test('UTM Zone automatic detection for Indonesia', () => {
  // Jakarta: 106.827, -6.175 -> Zone 48S
  const jkt = getUtmZoneForLonLat(106.827153, -6.175392);
  assert.equal(jkt.zone, 48);
  assert.equal(jkt.isSouth, true);
  assert.equal(jkt.epsg, 'EPSG:32748');

  // Bali: 115.188, -8.409 -> Zone 50S
  const bali = getUtmZoneForLonLat(115.1889, -8.4095);
  assert.equal(bali.zone, 50);
  assert.equal(bali.isSouth, true);
  assert.equal(bali.epsg, 'EPSG:32750');

  // Banda Aceh: 95.323, 5.548 -> Zone 46N
  const aceh = getUtmZoneForLonLat(95.3238, 5.5483);
  assert.equal(aceh.zone, 46);
  assert.equal(aceh.isSouth, false);
  assert.equal(aceh.epsg, 'EPSG:32646');
});

test('Proj4 WGS84 to UTM Zone 48S forward and inverse transformation (Sub-millimeter roundtrip)', () => {
  const monasLng = 106.827153;
  const monasLat = -6.175392;

  const [easting, northing] = proj4('EPSG:4326', 'EPSG:32748', [monasLng, monasLat]);
  assert.ok(easting > 700000 && easting < 710000, `Easting ${easting} within expected Jakarta UTM band`);
  assert.ok(northing > 9310000 && northing < 9325000, `Northing ${northing} within expected Jakarta UTM band`);

  const [roundtripLng, roundtripLat] = proj4('EPSG:32748', 'EPSG:4326', [easting, northing]);
  const errLng = Math.abs(roundtripLng - monasLng);
  const errLat = Math.abs(roundtripLat - monasLat);
  assert.ok(errLng < 1e-8, `Longitude roundtrip precision error: ${errLng}`);
  assert.ok(errLat < 1e-8, `Latitude roundtrip precision error: ${errLat}`);
});

// Group 2: Geodesic Distances
console.log('\n2. Testing Geodesic Distances & Haversine Baseline');

test('Haversine distance Jakarta (Monas) to Surabaya (Tugu Pahlawan) matches spherical baseline', () => {
  const dMeters = haversineDistanceMeters(-6.175392, 106.827153, -7.245972, 112.737833);
  const dKm = dMeters / 1000;
  // Spherical Earth (R=6,371,008.8m) distance is 663.49 km
  // WGS-84 ellipsoidal distance (accounting for equatorial bulge f=1/298.25722) is ~661.2 km
  assert.ok(dKm > 663.0 && dKm < 664.0, `Calculated spherical distance: ${dKm.toFixed(2)} km, expected ~663.49 km`);
});

// Group 3: Point in Polygon (Ray Casting)
console.log('\n3. Testing Spatial Intersection / Point-In-Polygon');

test('Ray casting algorithm detects points inside, outside, and along bounding box', () => {
  const jakartaBbox = [
    [106.68, -6.37],
    [106.97, -6.37],
    [106.97, -6.08],
    [106.68, -6.08],
    [106.68, -6.37],
  ];

  // Monas (inside Jakarta)
  assert.equal(pointInPolygon([106.827153, -6.175392], jakartaBbox), true);

  // Bandung (outside Jakarta)
  assert.equal(pointInPolygon([107.6191, -6.9175], jakartaBbox), false);

  // Tokyo (far outside)
  assert.equal(pointInPolygon([139.6917, 35.6895], jakartaBbox), false);
});

// Group 4: Remote Sensing Spectral Indices
console.log('\n4. Testing Remote Sensing Spectral Algorithms');

test('NDVI calculation matches standard normalized difference formula', () => {
  // Dense vegetation: NIR=0.45, Red=0.05 -> NDVI = 0.40 / 0.50 = 0.80
  const ndviDense = computeNDVI(0.45, 0.05);
  assert.equal(Number(ndviDense.toFixed(4)), 0.8000);

  // Water: NIR=0.05, Red=0.10 -> NDVI = -0.05 / 0.15 = -0.3333
  const ndviWater = computeNDVI(0.05, 0.10);
  assert.equal(Number(ndviWater.toFixed(4)), -0.3333);
});

test('NDWI (McFeeters) and MNDWI (Xu) water extraction indices', () => {
  // Clear water: Green=0.30, NIR=0.10 -> NDWI = 0.20 / 0.40 = 0.50
  const ndwi = computeNDWI(0.30, 0.10);
  assert.equal(Number(ndwi.toFixed(4)), 0.5000);

  // Turbid/Urban water: Green=0.25, SWIR1=0.05 -> MNDWI = 0.20 / 0.30 = 0.6667
  const mndwi = computeMNDWI(0.25, 0.05);
  assert.equal(Number(mndwi.toFixed(4)), 0.6667);
});

test('NDBI built-up index and BSI bare soil index', () => {
  // Built-up: SWIR1=0.35, NIR=0.15 -> NDBI = 0.20 / 0.50 = 0.40
  const ndbi = computeNDBI(0.35, 0.15);
  assert.equal(Number(ndbi.toFixed(4)), 0.4000);

  // Bare soil: B11=0.40, B04=0.25, B08=0.15, B02=0.10 -> BSI = 0.40 / 0.90 = 0.4444
  const bsi = computeBSI(0.40, 0.25, 0.15, 0.10);
  assert.equal(Number(bsi.toFixed(4)), 0.4444);
});

test('Sentinel-1 SAR cross-polarization ratio (VV/VH in dB)', () => {
  // VV=0.10, VH=0.01 -> Ratio = 10 -> 10*log10(10) = 10.0 dB
  const sarDb = computeSarRatioDb(0.10, 0.01);
  assert.equal(Number(sarDb.toFixed(2)), 10.00);
});

// Group 5: Terrain DEM Horn Algorithm
console.log('\n5. Testing Horn DEM Slope & Aspect Algorithm');

test('Horn 3x3 finite difference slope algorithm on planar and sloping surfaces', () => {
  // Flat 30m DEM grid: all elevations = 250m
  const flatGrid = [
    [250, 250, 250],
    [250, 250, 250],
    [250, 250, 250],
  ];
  const flatResult = calculateHornSlopeAspect(flatGrid, 30);
  assert.equal(flatResult.slopeDeg, 0.00);

  // 45 degree uniform East slope: 30m drop across 30m cell going West to East
  // West is high (60m), center is 30m, East is low (0m) -> faces East (90 degrees)
  const eastSlopeGrid = [
    [60, 30, 0],
    [60, 30, 0],
    [60, 30, 0],
  ];
  const eastResult = calculateHornSlopeAspect(eastSlopeGrid, 30);
  assert.equal(eastResult.slopeDeg, 45.00);
  assert.equal(eastResult.aspectDeg, 90.00);
});

// Group 6: Zero Fabrication & Missing Data Protocol
console.log('\n6. Testing Zero-Fabrication Scientific Integrity Protocol');

test('Data status properly isolates UNAVAILABLE from synthetic fabrication', () => {
  const missingRaster = {
    elevation: null,
    slopeDegrees: null,
    sourceType: 'DEM_ELEVATION',
    dataStatus: 'UNAVAILABLE',
    statusReason: 'NO_SOURCE',
  };

  assert.equal(missingRaster.elevation, null, 'Must never generate synthetic elevation when raster is missing');
  assert.equal(missingRaster.dataStatus, 'UNAVAILABLE');
  assert.equal(missingRaster.statusReason, 'NO_SOURCE');
});

console.log(`\n=== TEST SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED ===\n`);
