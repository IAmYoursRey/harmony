/**
 * GeoSense Digital Twin API Security Tests
 * Run: node tests/test_digital_twin_api.js
 *
 * Requires backend running on port 3001 with seeded database.
 * Default credentials from database.json:
 *   dev:     raihanansari6678@gmail.com / admin123
 *   student: alvira.nizha@geosense.edu  / admin123  (schoolId: sch-20534748, class: IPA 1)
 */

const BASE = 'http://localhost:3001/api';
let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  if (ok) { console.log(`  ✅ PASS: ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
}

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await r.json(); } catch { data = {}; }
  return { status: r.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { email, password });
  return r.data.token;
}

async function runTests() {
  console.log('\n🧪 GeoSense Digital Twin API Tests\n');

  // ─── Auth ──────────────────────────────────────────────────
  console.log('▶ Authentication');
  const devToken = await login('raihanansari6678@gmail.com', 'admin123');
  log('Dev login', !!devToken);
  const studentToken = await login('alvira.nizha@geosense.edu', 'admin123');
  log('Student login', !!studentToken);

  // ─── Map CRUD ──────────────────────────────────────────────
  console.log('\n▶ Grid Map CRUD');

  // GET maps requires auth
  const r1 = await api('GET', '/digital-twin/maps?schoolId=sch-20534748', null, null);
  log('GET /maps without auth returns 401', r1.status === 401);

  // Student cannot create map
  const r2 = await api('POST', '/digital-twin/maps', {
    schoolId: 'sch-20534748', name: 'Test', gridWidth: 10, gridHeight: 10
  }, studentToken);
  log('Student cannot POST /maps (expects 403)', r2.status === 403);

  // Dev can create map
  const r3 = await api('POST', '/digital-twin/maps', {
    schoolId: 'sch-20534748', name: 'Test Map Automated', gridWidth: 10, gridHeight: 10,
    cellScale: 1, cellScaleUnit: 'meter', description: 'auto test'
  }, devToken);
  log('Dev can POST /maps', r3.status === 201, JSON.stringify(r3.data));
  const createdMapId = r3.data?.data?.id;

  if (createdMapId) {
    // GET map
    const r4 = await api('GET', `/digital-twin/maps/${createdMapId}`, null, devToken);
    log('GET /maps/:id returns created map', r4.status === 200 && r4.data?.data?.id === createdMapId);

    // PUT update map
    const r5 = await api('PUT', `/digital-twin/maps/${createdMapId}`, { name: 'Updated Map' }, devToken);
    log('PUT /maps/:id updates name', r5.status === 200 && r5.data?.data?.name === 'Updated Map');

    // Student cannot update map
    const r6 = await api('PUT', `/digital-twin/maps/${createdMapId}`, { name: 'Hacked' }, studentToken);
    log('Student cannot PUT /maps/:id (expects 403)', r6.status === 403);

    // ─── Simulation CRUD ──────────────────────────────────────
    console.log('\n▶ Simulation CRUD');

    const r7 = await api('POST', '/digital-twin/simulations', {
      schoolId: 'sch-20534748',
      mapId: createdMapId,
      disasterType: 'fire',
      name: 'Test Sim',
      description: 'auto test',
      durationSeconds: 60,
      spawnPointId: '', safePointIds: [], hazards: [], events: [],
    }, devToken);
    log('Dev can POST /simulations', r7.status === 201);
    const createdSimId = r7.data?.data?.id;

    const r8 = await api('POST', '/digital-twin/simulations', {
      schoolId: 'sch-20534748', mapId: createdMapId, disasterType: 'fire', name: 'Hack'
    }, studentToken);
    log('Student cannot POST /simulations (expects 403)', r8.status === 403);

    if (createdSimId) {
      // ─── Rooms ─────────────────────────────────────────────
      console.log('\n▶ Room Management');

      const r9 = await api('POST', '/digital-twin/rooms', {
        schoolId: 'sch-20534748',
        name: 'Test Room',
        mapId: createdMapId,
        simulationId: createdSimId,
        targetGrade: 'X',
        targetClass: 'IPA 1',
      }, devToken);
      log('Dev can POST /rooms', r9.status === 201);
      const createdRoomId = r9.data?.data?.id;

      if (createdRoomId) {
        // Student with correct class can join
        const r10 = await api('POST', `/digital-twin/rooms/${createdRoomId}/join`, {}, studentToken);
        log('Student (IPA 1) can join room for IPA 1', r10.status === 200);

        // Student from different school cannot join (we test via wrong school)
        const wrongStudent = await login('sinta.nadhifah@geosense.edu', 'admin123');
        // sinta is also IPA 1 in sch-20534748, so she can join too (same school + class)
        const r11 = await api('POST', `/digital-twin/rooms/${createdRoomId}/join`, {}, wrongStudent);
        log('Student from same school+class can join', r11.status === 200);

        // Room status = WAITING, cannot submit result
        const r12 = await api('POST', `/digital-twin/rooms/${createdRoomId}/result`, {
          outcome: 'success', damageTaken: 0, distanceTravelled: 10, hazardsEncountered: []
        }, studentToken);
        log('Cannot submit result when room is WAITING (expects 409)', r12.status === 409);

        // Start room
        const r13 = await api('POST', `/digital-twin/rooms/${createdRoomId}/start`, {}, devToken);
        log('Dev can start room', r13.status === 200 && r13.data?.data?.status === 'RUNNING');

        // Now submit result
        const r14 = await api('POST', `/digital-twin/rooms/${createdRoomId}/result`, {
          outcome: 'success', completionTimeSeconds: 45, hpRemaining: 80,
          damageTaken: 20, distanceTravelled: 25, hazardsEncountered: []
        }, studentToken);
        log('Student can submit result when room RUNNING', r14.status === 201);

        // End room
        const r15 = await api('POST', `/digital-twin/rooms/${createdRoomId}/end`, {}, devToken);
        log('Dev can end room', r15.status === 200 && r15.data?.data?.status === 'FINISHED');

        // Get results
        const r16 = await api('GET', `/digital-twin/rooms/${createdRoomId}/results`, null, devToken);
        log('Dev can get room results', r16.status === 200 && Array.isArray(r16.data?.data));
        log('Result count >= 1', (r16.data?.data?.length || 0) >= 1);

        // Student cannot get results
        const r17 = await api('GET', `/digital-twin/rooms/${createdRoomId}/results`, null, studentToken);
        log('Student cannot get room results (expects 403)', r17.status === 403);
      }

      // ─── Cleanup ───────────────────────────────────────────
      console.log('\n▶ Cleanup');
      const rDel1 = await api('DELETE', `/digital-twin/simulations/${createdSimId}`, null, devToken);
      log('Dev can DELETE simulation', rDel1.status === 200);
    }

    const rDel2 = await api('DELETE', `/digital-twin/maps/${createdMapId}`, null, devToken);
    log('Dev can DELETE map', rDel2.status === 200);
  }

  // ─── Legacy Routes ─────────────────────────────────────────
  console.log('\n▶ Legacy SVG Digital Twin Routes');
  const r18 = await api('GET', '/digital-twin/sch-20534748', null, null);
  log('Legacy GET /:schoolId still works', r18.status === 200);

  // Summary
  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Passed: ${passed} / ${passed + failed}`);
  if (failed > 0) console.error(`❌ Failed: ${failed}`);
  console.log('─────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(1);
});
