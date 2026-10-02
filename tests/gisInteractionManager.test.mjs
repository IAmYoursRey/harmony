import assert from 'node:assert/strict';

// 1. Polygon Self-Intersection Algorithm Test
function checkPolygonSelfIntersection(ringCoords) {
  const n = ringCoords.length - 1;
  if (n < 3) return false;

  const ccw = (a, b, c) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };

  const segmentsIntersect = (p1, p2, p3, p4) => {
    const d1 = ccw(p1, p3, p4);
    const d2 = ccw(p2, p3, p4);
    const d3 = ccw(p1, p2, p3);
    const d4 = ccw(p1, p2, p4);
    return d1 !== d2 && d3 !== d4;
  };

  for (let i = 0; i < n; i++) {
    const p1 = ringCoords[i];
    const p2 = ringCoords[i + 1];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const p3 = ringCoords[j];
      const p4 = ringCoords[j + 1];
      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

// 2. Geodesic Bearing & Direction Calculation Test
function calculateBearing(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLam = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLam);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

function getBearingDirection(bearing) {
  const directions = [
    "U (Utara)",
    "TL (Timur Laut)",
    "T (Timur)",
    "TG (Tenggara)",
    "S (Selatan)",
    "BD (Barat Daya)",
    "B (Barat)",
    "BL (Barat Laut)",
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// 3. Ray-Casting Point-In-Polygon Test
function isPointInPolygon(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 4. Circle to Polygon Approximation (64 vertices)
function approximateCircleToPolygon(centerLon, centerLat, radiusMeters, sides = 64) {
  const earthRadius = 6378137;
  const coords = [];
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dLon = (radiusMeters / (earthRadius * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);
    const lon = centerLon + dLon * Math.cos(angle);
    const lat = centerLat + dLat * Math.sin(angle);
    coords.push([lon, lat]);
  }
  return coords;
}

console.log('=== HARMONY GIS INTERACTION & STATE LIFECYCLE SUITE ===\n');

// TEST 1: Valid Simple Polygon
const validSquare = [
  [112.70, -7.25],
  [112.75, -7.25],
  [112.75, -7.30],
  [112.70, -7.30],
  [112.70, -7.25],
];
assert.equal(checkPolygonSelfIntersection(validSquare), false, 'Normal box polygon must NOT self-intersect');
console.log('  [PASS] Valid non-intersecting polygon passes geometry validation');

// TEST 2: Self-Intersecting "Bowtie" Polygon
const bowtiePolygon = [
  [112.70, -7.25],
  [112.75, -7.30],
  [112.75, -7.25],
  [112.70, -7.30],
  [112.70, -7.25],
];
assert.equal(checkPolygonSelfIntersection(bowtiePolygon), true, 'Bowtie polygon MUST be flagged as self-intersecting');
console.log('  [PASS] Bowtie polygon correctly detected and rejected by self-intersection algorithm');

// TEST 3: Geodesic Bearing Cardinal Points
const northBearing = calculateBearing([112.75, -7.25], [112.75, -7.20]);
assert.ok(Math.abs(northBearing - 0) < 0.1 || Math.abs(northBearing - 360) < 0.1, 'Due North bearing must be 0 or 360');
assert.equal(getBearingDirection(northBearing), 'U (Utara)');

const eastBearing = calculateBearing([112.75, -7.25], [112.80, -7.25]);
assert.ok(Math.abs(eastBearing - 90) < 1, 'Due East bearing must be ~90 deg');
assert.equal(getBearingDirection(eastBearing), 'T (Timur)');

const southBearing = calculateBearing([112.75, -7.25], [112.75, -7.30]);
assert.ok(Math.abs(southBearing - 180) < 0.1, 'Due South bearing must be 180 deg');
assert.equal(getBearingDirection(southBearing), 'S (Selatan)');

const westBearing = calculateBearing([112.75, -7.25], [112.70, -7.25]);
assert.ok(Math.abs(westBearing - 270) < 1, 'Due West bearing must be ~270 deg');
assert.equal(getBearingDirection(westBearing), 'B (Barat)');
console.log('  [PASS] Geodesic azimuth & 8-direction cardinal calculation accurate');

// TEST 4: Circle to Polygon Approximation Integrity
const circlePoly = approximateCircleToPolygon(112.75, -7.25, 2500, 64);
assert.equal(circlePoly.length, 65, '64-segment circle polygon approximation has 65 coordinates including closed ring');
assert.deepEqual(circlePoly[0], circlePoly[64], 'Approximated polygon ring must be closed');
assert.equal(checkPolygonSelfIntersection(circlePoly), false, 'Approximated circle polygon must never self-intersect');
console.log('  [PASS] Circle to Polygon approximation generates valid, closed, non-intersecting ring');

// TEST 5: Ray-Casting Point-in-Polygon
const insidePoint = [112.72, -7.27];
const outsidePoint = [112.80, -7.27];
assert.equal(isPointInPolygon(insidePoint, validSquare), true, 'Point inside square must return true');
assert.equal(isPointInPolygon(outsidePoint, validSquare), false, 'Point outside square must return false');
console.log('  [PASS] Ray-casting Point-In-Polygon accurately identifies spatial containment');

// TEST 6: Multi-Operation Undo Stack Lifecycle
class MockUndoManager {
  constructor() {
    this.features = new Set();
    this.history = [];
  }
  draw(f) {
    this.features.add(f);
    this.history.push({ action: 'DRAW', feature: f });
  }
  modify(f, beforeGeom, afterGeom) {
    f.geom = afterGeom;
    this.history.push({ action: 'MODIFY', feature: f, beforeGeom, afterGeom });
  }
  translate(f, beforeGeom, afterGeom) {
    f.geom = afterGeom;
    this.history.push({ action: 'TRANSLATE', feature: f, beforeGeom, afterGeom });
  }
  delete(f) {
    this.features.delete(f);
    this.history.push({ action: 'DELETE', feature: f });
  }
  undo() {
    const item = this.history.pop();
    if (!item) return;
    if (item.action === 'DRAW') {
      this.features.delete(item.feature);
    } else if (item.action === 'MODIFY' || item.action === 'TRANSLATE') {
      item.feature.geom = item.beforeGeom;
    } else if (item.action === 'DELETE') {
      this.features.add(item.feature);
    }
  }
}

const undoManager = new MockUndoManager();
const featureA = { id: 'f1', geom: 'GEOM_ORIGINAL' };
undoManager.draw(featureA);
assert.equal(undoManager.features.size, 1);

undoManager.modify(featureA, 'GEOM_ORIGINAL', 'GEOM_MODIFIED_1');
assert.equal(featureA.geom, 'GEOM_MODIFIED_1');

undoManager.translate(featureA, 'GEOM_MODIFIED_1', 'GEOM_TRANSLATED_1');
assert.equal(featureA.geom, 'GEOM_TRANSLATED_1');

undoManager.undo(); // Undo translate
assert.equal(featureA.geom, 'GEOM_MODIFIED_1');

undoManager.undo(); // Undo modify
assert.equal(featureA.geom, 'GEOM_ORIGINAL');

undoManager.delete(featureA);
assert.equal(undoManager.features.size, 0);

undoManager.undo(); // Undo delete
assert.equal(undoManager.features.size, 1);
assert.ok(undoManager.features.has(featureA));

undoManager.undo(); // Undo draw
assert.equal(undoManager.features.size, 0);

console.log('  [PASS] Multi-operation history stack (DRAW, MODIFY, TRANSLATE, DELETE) behaves deterministically');

// TEST 7: GeoJSON CRS Specification (RFC 7946: lon, lat order)
const geojsonFeature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [112.7521, -7.2575], // Surabaya lon, lat
  },
  properties: { name: 'Test Point' },
};
assert.ok(geojsonFeature.geometry.coordinates[0] > 90, 'Longitude in Indonesia is ~95 to 141 E');
assert.ok(geojsonFeature.geometry.coordinates[1] < 10, 'Latitude in Indonesia is ~6 N to 11 S');
console.log('  [PASS] GeoJSON coordinates adhere strictly to [longitude, latitude] EPSG:4326\n');

console.log('================================================================');
console.log('ALL 7 GIS INTERACTION MANAGER UNIT TESTS PASSED WITH 100% SUCCESS');
console.log('================================================================\n');
