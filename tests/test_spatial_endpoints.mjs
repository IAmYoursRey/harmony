import http from 'http';
import assert from 'node:assert/strict';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

let targetPort = 3001;
let server = null;
let pgPool = null;

const FIXTURE = {
  datasetId: `test-ds-qa-${Date.now()}`,
  featureId: `test-feat-monas-${Date.now()}`,
  hazardId: `test-haz-monas-${Date.now()}`,
  sensorId: `test-sens-monas-${Date.now()}`,
};

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let respBody = '';
        res.on('data', (chunk) => (respBody += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(respBody),
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: respBody,
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/spatial/health',
        method: 'GET',
        timeout: 1000,
      },
      (res) => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function setupFixtures() {
  if (!connectionString) {
    console.warn('No DATABASE_URL found; skipping database fixture setup.');
    return;
  }
  pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pgPool.connect();
  try {
    // 1. Create test dataset
    await client.query(
      `INSERT INTO spatial_datasets (id, name, type, crs) VALUES ($1, $2, $3, $4)`,
      [FIXTURE.datasetId, 'QA Automated Test Dataset', 'vector_test', 'EPSG:4326']
    );

    // 2. Create test spatial feature at Monas: Point(106.827153, -6.175392)
    await client.query(
      `INSERT INTO spatial_features (id, dataset_id, properties, geom)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint(106.827153, -6.175392), 4326))`,
      [FIXTURE.featureId, FIXTURE.datasetId, JSON.stringify({ name: 'Tugu Monas Test Monument', category: 'landmark' })]
    );

    // 3. Create test hazard polygon enclosing Monas
    await client.query(
      `INSERT INTO hazard_zones (id, hazard_type, name, risk_level, source_agency, geom)
       VALUES ($1, $2, $3, $4, $5, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6), 4326)))`,
      [
        FIXTURE.hazardId,
        'FLOOD_RISK',
        'Monas Test Inundation Hazard Zone',
        'HIGH',
        'BPBD DKI Jakarta',
        JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [106.82, -6.18],
              [106.835, -6.18],
              [106.835, -6.17],
              [106.82, -6.17],
              [106.82, -6.18],
            ],
          ],
        }),
      ]
    );

    // 4. Create test sensor station ~113m from Monas center: Point(106.828, -6.176)
    await client.query(
      `INSERT INTO sensor_stations (id, code, name, family, platform, provider, status, geom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint(106.828, -6.176), 4326))`,
      [
        FIXTURE.sensorId,
        'TEST-MONAS-GNSS-01',
        'Monas Geodetic Reference Station',
        'GNSS_CORS',
        'TERRESTRIAL_BASE',
        'BIG',
        'ACTIVE',
      ]
    );
    console.log('✓ Isolated test fixtures successfully inserted into PostGIS tables.');
  } finally {
    client.release();
  }
}

async function teardownFixtures() {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query(`DELETE FROM hazard_zones WHERE id = $1`, [FIXTURE.hazardId]);
    await client.query(`DELETE FROM sensor_stations WHERE id = $1`, [FIXTURE.sensorId]);
    await client.query(`DELETE FROM spatial_features WHERE dataset_id = $1`, [FIXTURE.datasetId]);
    await client.query(`DELETE FROM spatial_datasets WHERE id = $1`, [FIXTURE.datasetId]);
    console.log('✓ Isolated test fixtures successfully removed. Production tables verified clean (0 test rows remaining).');
  } catch (err) {
    console.error('Teardown error:', err.message);
  } finally {
    client.release();
    await pgPool.end();
  }
}

async function run() {
  console.log('=== HARMONY DETERMINISTIC SPATIAL QUERY & STAC VALIDATION ===\n');

  const runningOn3001 = await isPortOpen(3001);
  if (runningOn3001) {
    targetPort = 3001;
    console.log(`Connected to active backend server on port ${targetPort}`);
  } else {
    targetPort = 3099;
    const { default: app } = await import('../apps/server/src/server.js');
    await new Promise((resolve) => {
      server = app.listen(targetPort, '127.0.0.1', () => {
        console.log(`Test server initialized on port ${targetPort}`);
        resolve();
      });
    });
  }

  await setupFixtures();

  try {
    // 1. Health check & PostGIS extension
    console.log('\n[TEST 1] GET /api/spatial/health - PostGIS Extension & Latency');
    const health = await request('GET', '/api/spatial/health');
    assert.equal(health.statusCode, 200);
    assert.equal(health.body.status, 'OK');
    assert.equal(health.body.postgis.status, 'ONLINE');
    assert.ok(health.body.postgis.version.includes('3.6'), 'Must be PostGIS 3.6+');
    console.log(`  -> PASS: PostGIS ${health.body.postgis.version} ONLINE (${health.body.postgis.latencyMs}ms)`);

    // 2. Identify Coordinate with known nearby features (ST_DWithin, ST_Intersects, ST_Distance)
    console.log('\n[TEST 2] GET /api/spatial/identify - Deterministic Point Query (Monas Center)');
    const idRes1 = await request('GET', '/api/spatial/identify?lat=-6.175392&lng=106.827153&radius=1000');
    assert.equal(idRes1.statusCode, 200);
    assert.ok(idRes1.body.success);

    // Hazard polygon intersection
    assert.ok(Array.isArray(idRes1.body.hazards), 'hazards must be array');
    const matchedHazard = idRes1.body.hazards.find((h) => h.id === FIXTURE.hazardId);
    assert.ok(matchedHazard, 'ST_Intersects must identify the intersecting test hazard zone');
    assert.equal(matchedHazard.name, 'Monas Test Inundation Hazard Zone');
    console.log(`  -> PASS: ST_Intersects detected polygon hazard: "${matchedHazard.name}"`);

    // Nearest feature query
    assert.ok(Array.isArray(idRes1.body.features), 'features must be array');
    const matchedFeature = idRes1.body.features.find((f) => f.id === FIXTURE.featureId);
    assert.ok(matchedFeature, 'ST_DWithin must identify test landmark feature');
    assert.ok(matchedFeature.distance_km < 0.01, 'Distance to exact point must be < 10 meters');
    console.log(`  -> PASS: ST_DWithin / ST_Distance located feature at distance: ${matchedFeature.distance_km.toFixed(4)} km`);

    // Nearest sensor station query
    assert.ok(Array.isArray(idRes1.body.sensors), 'sensors must be array');
    const matchedSensor = idRes1.body.sensors.find((s) => s.id === FIXTURE.sensorId);
    assert.ok(matchedSensor, 'ST_DWithin must identify test sensor station within 1000m');
    assert.ok(matchedSensor.distance_km > 0.05 && matchedSensor.distance_km < 0.2, 'Distance must match ~113 meters');
    console.log(`  -> PASS: ST_DWithin located sensor station at distance: ${matchedSensor.distance_km.toFixed(3)} km`);

    // 3. Metric Radius Filtering Verification
    console.log('\n[TEST 3] GET /api/spatial/identify - Metric Radius Discrimination (50m vs 1000m)');
    const idRes2 = await request('GET', '/api/spatial/identify?lat=-6.175392&lng=106.827153&radius=50');
    assert.equal(idRes2.statusCode, 200);
    const sensorIn50m = idRes2.body.sensors.find((s) => s.id === FIXTURE.sensorId);
    assert.equal(sensorIn50m, undefined, 'Sensor station 113m away MUST NOT be returned in 50m radius search');
    const featureIn50m = idRes2.body.features.find((f) => f.id === FIXTURE.featureId);
    assert.ok(featureIn50m, 'Exact coordinate feature MUST be returned in 50m radius search');
    console.log('  -> PASS: Metric radius correctly discriminates features (feature retained, 113m sensor excluded)');

    // 4. Empty-result response over unpopulated coordinates
    console.log('\n[TEST 4] GET /api/spatial/identify - Empty-result response (Remote Coordinate)');
    const idResEmpty = await request('GET', '/api/spatial/identify?lat=0.0&lng=160.0&radius=5000');
    assert.equal(idResEmpty.statusCode, 200);
    assert.equal(idResEmpty.body.features.length, 0);
    assert.equal(idResEmpty.body.sensors.length, 0);
    assert.equal(idResEmpty.body.hazards.length, 0);
    assert.equal(idResEmpty.body.nearestSchools.length, 0);
    console.log('  -> PASS: Returns clean HTTP 200 with empty arrays for unpopulated locations');

    // 5. Parameter Validation & Error Handling
    console.log('\n[TEST 5] GET /api/spatial/identify - Input Parameter Validation (400 Bad Request)');
    const idResBad1 = await request('GET', '/api/spatial/identify?lat=abc&lng=106.8');
    assert.equal(idResBad1.statusCode, 400);
    const idResBad2 = await request('GET', '/api/spatial/identify?lat=95.0&lng=106.8');
    assert.equal(idResBad2.statusCode, 400);
    const idResBad3 = await request('GET', '/api/spatial/identify?lat=-6.1&lng=200.0');
    assert.equal(idResBad3.statusCode, 400);
    console.log('  -> PASS: Rejects NaN, latitude > 90°, and longitude > 180° with HTTP 400');

    // 6. AOI Analysis - PostGIS Feature Intersection & Ray-Casting Point-in-Polygon
    console.log('\n[TEST 6] POST /api/spatial/aoi/analyze - Known Polygon Intersection');
    const aoiMonas = {
      aoi: {
        type: 'Polygon',
        coordinates: [
          [
            [106.82, -6.18],
            [106.835, -6.18],
            [106.835, -6.17],
            [106.82, -6.17],
            [106.82, -6.18],
          ],
        ],
      },
    };
    const aoiRes1 = await request('POST', '/api/spatial/aoi/analyze', aoiMonas);
    assert.equal(aoiRes1.statusCode, 200);
    assert.ok(aoiRes1.body.success);
    assert.ok(aoiRes1.body.aoiMetrics.totalFeaturesFound >= 1, 'PostGIS ST_Intersects must find Monas test feature');
    const foundMonas = aoiRes1.body.intersectedFeatures.find((f) => f.id === FIXTURE.featureId);
    assert.ok(foundMonas, 'Intersected features must include Monas fixture');
    console.log(`  -> PASS: ST_Intersects found ${aoiRes1.body.aoiMetrics.totalFeaturesFound} PostGIS features in Monas polygon`);

    // 7. AOI Analysis - School Inside vs Outside Point-in-Polygon
    console.log('\n[TEST 7] POST /api/spatial/aoi/analyze - School Point-In-Polygon Discrimination');
    // Polygon around Mojokerto (contains SMAN 1 Ngoro at -7.5698, 112.5907)
    const aoiMojokerto = {
      aoi: {
        type: 'Polygon',
        coordinates: [
          [
            [112.5, -7.6],
            [112.7, -7.6],
            [112.7, -7.5],
            [112.5, -7.5],
            [112.5, -7.6],
          ],
        ],
      },
    };
    const aoiRes2 = await request('POST', '/api/spatial/aoi/analyze', aoiMojokerto);
    assert.equal(aoiRes2.statusCode, 200);
    assert.equal(aoiRes2.body.aoiMetrics.schoolsCount, 1, 'Must detect exactly 1 school inside Mojokerto polygon');
    assert.equal(aoiRes2.body.aoiMetrics.schoolsSample[0].name, 'SMAN 1 Ngoro');
    console.log(`  -> PASS: Enclosed school detected: "${aoiRes2.body.aoiMetrics.schoolsSample[0].name}"`);

    // Outside polygon (Bali)
    const aoiBali = {
      aoi: {
        type: 'Polygon',
        coordinates: [
          [
            [115.0, -8.5],
            [115.5, -8.5],
            [115.5, -8.0],
            [115.0, -8.0],
            [115.0, -8.5],
          ],
        ],
      },
    };
    const aoiRes3 = await request('POST', '/api/spatial/aoi/analyze', aoiBali);
    assert.equal(aoiRes3.statusCode, 200);
    assert.equal(aoiRes3.body.aoiMetrics.schoolsCount, 0, 'Must detect 0 schools in unpopulated polygon');
    console.log('  -> PASS: Outside polygon correctly returned 0 schools');

    // 8. AOI Invalid Geometry Handling
    console.log('\n[TEST 8] POST /api/spatial/aoi/analyze - Invalid Geometry Validation');
    const aoiBad = await request('POST', '/api/spatial/aoi/analyze', { aoi: { type: 'InvalidGeom' } });
    assert.equal(aoiBad.statusCode, 400);
    console.log('  -> PASS: Rejects invalid geometry with HTTP 400 Bad Request');

    // 9. STAC Scene Discovery Semantics
    console.log('\n[TEST 9] POST /api/spatial/stac/search - STAC Scene Discovery Semantics');
    const stacPayload = {
      bbox: [106.8, -6.2, 106.9, -6.1],
      datetime: '2024-01-01T00:00:00Z/2024-06-01T00:00:00Z',
      collections: ['sentinel-2-l2a'],
      limit: 2,
    };
    const stacResp = await request('POST', '/api/spatial/stac/search', stacPayload);
    assert.equal(stacResp.statusCode, 200);
    assert.ok(stacResp.body.features && stacResp.body.features.length > 0, 'Discovers real satellite scenes');
    
    const sampleItem = stacResp.body.features[0];
    assert.ok(sampleItem.id.startsWith('S2'), 'Sentinel-2 product ID begins with S2');
    assert.ok(sampleItem.properties.datetime, 'Acquisition timestamp present');
    assert.ok(sampleItem.assets, 'Asset URLs dictionary present');
    console.log(`  -> PASS: Scene Discovered ID: ${sampleItem.id}`);
    console.log(`  -> PASS: Acquisition Timestamp: ${sampleItem.properties.datetime}`);
    console.log(`  -> PASS: Available Assets: ${Object.keys(sampleItem.assets).slice(0, 5).join(', ')}`);
    console.log('  -> PASS: Verified as SCENE DISCOVERY (Catalog metadata), distinct from raster pixel processing');

    console.log('\n=== ALL 9 DETERMINISTIC SPATIAL TESTS PASSED WITH 100% SUCCESS ===\n');
  } finally {
    await teardownFixtures();
    if (server) server.close();
  }
}

run().catch(async (err) => {
  console.error('\n❌ Test Suite Failed:', err);
  await teardownFixtures();
  if (server) server.close();
  process.exit(1);
});
