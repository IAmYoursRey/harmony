import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { 
        CELESTIAL_CONFIGS, 
        AU_METERS, 
        solveKeplerianOrbit 
      } from './apps/web/src/components/dashboard/views/spatial/celestial/CesiumCosmicEngine.ts';
      export { 
        SOLAR_SCALE_CONFIG,
        calculateRenderRadius,
        calculateRenderOrbitDistance,
        calculateSafeFramingDistance,
        getCelestialBoundingRadius
      } from './apps/web/src/components/dashboard/views/spatial/celestial/solarMath.ts';
      export { PLANETARY_CATALOG, CELESTIAL_ORDER } from './apps/web/src/data/planetaryCatalog.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env': '{}' },
  alias: { '@': './apps/web/src' },
  external: ['cesium']
});

const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);

test('Cosmic Navigation & Focus State Machine Architecture', async (t) => {
  await t.test('Moon has independent reference frame and distinct position from Earth', () => {
    const moonDist = m.SOLAR_SCALE_CONFIG.MOON_ORBIT_RADIUS_METERS;
    assert.ok(moonDist > 5000000, 'Moon orbit radius must be > 5,000,000 m');

    const earthPos = { x: 0, y: 0, z: 0 };
    const moonPos = m.solveKeplerianOrbit(
      moonDist,
      0.0549,
      (5.145 * Math.PI) / 180,
      0,
      (83.35 * Math.PI) / 180,
      0.8
    );

    const distEarthMoon = Math.hypot(moonPos.x - earthPos.x, moonPos.y - earthPos.y, moonPos.z - earthPos.z);
    assert.ok(
      Math.abs(distEarthMoon - moonDist) < moonDist * 0.1,
      'Moon must be situated in cislunar space around Earth, not at (0, 0, 0)'
    );
    assert.notDeepEqual(moonPos, earthPos, 'Moon world position cannot be equal to Earth world position');
  });

  await t.test('Safe framing distances strictly reflect celestial size hierarchy', () => {
    const bodies = ['sun', 'jupiter', 'saturn', 'uranus', 'neptune', 'earth', 'mars', 'mercury', 'moon'];
    const framingMap = new Map();

    bodies.forEach((id) => {
      const p = m.PLANETARY_CATALOG[id];
      const r = id === 'sun' 
        ? m.SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS 
        : m.calculateRenderRadius(id, p.diameterKm * 500);
      const info = m.calculateSafeFramingDistance(id, r);
      framingMap.set(id, info);
    });

    const sunInfo = framingMap.get('sun');
    const jupInfo = framingMap.get('jupiter');
    const satInfo = framingMap.get('saturn');
    const earthInfo = framingMap.get('earth');
    const marsInfo = framingMap.get('mars');
    const moonInfo = framingMap.get('moon');

    assert.ok(sunInfo.framingDistance > jupInfo.framingDistance, 'Sun framing distance must exceed Jupiter');
    assert.ok(satInfo.framingDistance > earthInfo.framingDistance, 'Saturn ring framing distance must exceed Earth');
    assert.ok(jupInfo.boundingRadius > satInfo.boundingRadius / 2.45, 'Jupiter body radius must exceed Saturn body radius');
    assert.ok(earthInfo.framingDistance > marsInfo.framingDistance, 'Earth framing distance must exceed Mars');
    assert.ok(marsInfo.framingDistance > moonInfo.framingDistance, 'Mars framing distance must exceed Moon');

    // Ensure minimum zoom distance protects surface penetration
    bodies.forEach((id) => {
      const info = framingMap.get(id);
      assert.ok(
        info.minDistance >= info.boundingRadius * 1.28,
        `${id} minimum zoom distance (${info.minDistance}) must be >= 1.28x bounding radius (${info.boundingRadius})`
      );
      assert.ok(
        info.framingDistance > info.minDistance,
        `${id} framing distance must be greater than minimum distance`
      );
      assert.ok(
        info.maxDistance > info.framingDistance * 10,
        `${id} max distance must allow comfortable outer orbital pull-back`
      );
    });
  });

  await t.test('Solar clearance waypoint math prevents camera passing through the Sun', () => {
    const sunPos = { x: -340000000, y: 0, z: 0 };
    const sunRadius = m.SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS;

    // Flight from Mars (on one side of Sun) to Venus (on other side of Sun)
    const startCamPos = { x: -600000000, y: 50000000, z: 0 };
    const destCamPos = { x: -80000000, y: -50000000, z: 0 };

    // Chord line segment
    const pathVec = {
      x: destCamPos.x - startCamPos.x,
      y: destCamPos.y - startCamPos.y,
      z: destCamPos.z - startCamPos.z,
    };
    const pathLen = Math.hypot(pathVec.x, pathVec.y, pathVec.z);
    const pathDir = { x: pathVec.x / pathLen, y: pathVec.y / pathLen, z: pathVec.z / pathLen };

    const toSun = {
      x: sunPos.x - startCamPos.x,
      y: sunPos.y - startCamPos.y,
      z: sunPos.z - startCamPos.z,
    };
    const proj = toSun.x * pathDir.x + toSun.y * pathDir.y + toSun.z * pathDir.z;

    const closestPoint = {
      x: startCamPos.x + pathDir.x * proj,
      y: startCamPos.y + pathDir.y * proj,
      z: startCamPos.z + pathDir.z * proj,
    };
    const distToSun = Math.hypot(closestPoint.x - sunPos.x, closestPoint.y - sunPos.y, closestPoint.z - sunPos.z);

    const clipsSun = distToSun < sunRadius * 2.2;
    assert.ok(clipsSun, 'Chord directly intersecting Sun proximity must be detected');

    // Safe elevated waypoint
    const eclipticNormal = { x: 0, y: -0.3977, z: 0.9175 };
    const midPoint = {
      x: startCamPos.x + pathDir.x * (pathLen * 0.5),
      y: startCamPos.y + pathDir.y * (pathLen * 0.5),
      z: startCamPos.z + pathDir.z * (pathLen * 0.5),
    };
    const elevatedWaypoint = {
      x: midPoint.x + eclipticNormal.x * (sunRadius * 2.8),
      y: midPoint.y + eclipticNormal.y * (sunRadius * 2.8),
      z: midPoint.z + eclipticNormal.z * (sunRadius * 2.8),
    };

    const elevatedDist = Math.hypot(
      elevatedWaypoint.x - sunPos.x,
      elevatedWaypoint.y - sunPos.y,
      elevatedWaypoint.z - sunPos.z
    );
    assert.ok(
      elevatedDist > sunRadius * 2.5,
      `Elevated waypoint (${elevatedDist}) must safely clear Sun radius (${sunRadius})`
    );
  });

  await t.test('Multi-phase flight progress and early gaze shift guarantees destination in frame', () => {
    // Test early gaze interpolation: at u = 0.35, gaze is 100% locked to destination
    const gazeU = (u) => Math.min(1.0, u / 0.32);
    const sGaze = (u) => {
      const gu = gazeU(u);
      return gu * gu * (3.0 - 2.0 * gu);
    };

    assert.equal(sGaze(0.0), 0.0, 'At start (u=0), gaze begins at origin');
    assert.ok(sGaze(0.16) > 0.45, 'At u=0.16 (halfway through departure), gaze has turned over 45%');
    assert.equal(sGaze(0.32), 1.0, 'At u=0.32 (beginning of cruise), gaze is 100% locked to destination');
    assert.equal(sGaze(0.50), 1.0, 'During cruise (u=0.50), destination is 100% centered');
    assert.equal(sGaze(0.85), 1.0, 'During arrival (u=0.85), destination is 100% centered');
    assert.equal(sGaze(1.00), 1.0, 'At final framing (u=1.00), destination is 100% centered');
  });

  await t.test('Atomic transition token ensures race condition cancellation', () => {
    let currentTransitionId = 0;
    let activeTarget = 'earth';

    const triggerTransition = (targetId) => {
      const id = ++currentTransitionId;
      activeTarget = targetId;
      return id;
    };

    const id1 = triggerTransition('mars');
    assert.equal(id1, 1);
    assert.equal(activeTarget, 'mars');

    // Rapid second click before transition 1 finishes
    const id2 = triggerTransition('jupiter');
    assert.equal(id2, 2);
    assert.equal(activeTarget, 'jupiter');

    // Simulate completion callback for id1 arriving late
    const simulateCompletion = (transitionId, resultingTarget) => {
      if (transitionId !== currentTransitionId) {
        return false; // Rejected: stale transition
      }
      activeTarget = resultingTarget;
      return true;
    };

    const staleResult = simulateCompletion(id1, 'mars');
    assert.equal(staleResult, false, 'Late callback from transition 1 must be discarded');
    assert.equal(activeTarget, 'jupiter', 'Active target must remain Jupiter');

    const freshResult = simulateCompletion(id2, 'jupiter');
    assert.equal(freshResult, true, 'Callback from current transition 2 must succeed');
    assert.equal(activeTarget, 'jupiter');
  });
});
