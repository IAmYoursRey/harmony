import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { CELESTIAL_CONFIGS, AU_METERS, solveKeplerianOrbit } from './apps/web/src/components/dashboard/views/spatial/celestial/CesiumCosmicEngine.ts';
      export { generateHDCelestialCanvas, getCelestialCanvas } from './apps/web/src/components/dashboard/views/spatial/celestial/cosmicSceneUtils.ts';
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

test('Cosmic Mechanics & Scale Verification', async (t) => {
  await t.test('All major planets exist in CELESTIAL_CONFIGS with valid Keplerian parameters', () => {
    const ids = m.CELESTIAL_CONFIGS.map((c) => c.id);
    const expected = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    assert.deepEqual(ids, expected);

    m.CELESTIAL_CONFIGS.forEach((cfg) => {
      assert.ok(cfg.realRadiusMeters > 0, `${cfg.id} must have positive realRadiusMeters`);
      assert.ok(cfg.calibratedRadiusMeters > 0, `${cfg.id} must have positive calibratedRadiusMeters`);
      assert.ok(cfg.calibratedDistMeters > 0, `${cfg.id} must have positive calibratedDistMeters`);
      assert.ok(cfg.eccentricity >= 0 && cfg.eccentricity < 1, `${cfg.id} eccentricity must be elliptic (0 <= e < 1)`);
      assert.ok(cfg.orbitPeriodDays > 0, `${cfg.id} must have positive orbitPeriodDays`);
      assert.ok(cfg.rotationPeriodHours !== 0, `${cfg.id} must have non-zero rotationPeriodHours`);
    });
  });

  await t.test('Earth orbital and physical parameters are properly calibrated', () => {
    const earth = m.CELESTIAL_CONFIGS.find((c) => c.id === 'earth');
    assert.ok(earth, 'Earth must exist in CELESTIAL_CONFIGS');
    assert.equal(earth.realRadiusMeters, 6371000, 'Earth real radius must be 6,371 km');
    assert.ok(earth.calibratedRadiusMeters >= 3000000, 'Earth calibrated radius must be >= 3,000 km for visibility');
    assert.ok(earth.calibratedDistMeters > 40000000, 'Earth calibrated distance must clear the Sun radius with margin');
    assert.ok(Math.abs(earth.orbitPeriodDays - 365.256) < 1.0, 'Earth orbit period must be ~365.25 days');
    assert.ok(Math.abs(earth.rotationPeriodHours - 23.934) < 0.5, 'Earth rotation period must be ~24 hours');
  });

  await t.test('Calibrated distances preserve progressive order from Sun', () => {
    for (let i = 0; i < m.CELESTIAL_CONFIGS.length - 1; i++) {
      const cur = m.CELESTIAL_CONFIGS[i];
      const nxt = m.CELESTIAL_CONFIGS[i + 1];
      assert.ok(
        cur.calibratedDistMeters < nxt.calibratedDistMeters,
        `${cur.id} calibrated distance (${cur.calibratedDistMeters}) must be less than ${nxt.id} (${nxt.calibratedDistMeters})`
      );
      assert.ok(
        cur.semiMajorAxisAU < nxt.semiMajorAxisAU,
        `${cur.id} semi-major axis AU must be less than ${nxt.id}`
      );
    }
  });

  await t.test('solveKeplerianOrbit produces finite 3D coordinates', () => {
    const pos = m.solveKeplerianOrbit(1.496e11, 0.0167, 0, 0, (102.9 * Math.PI) / 180, (50 * Math.PI) / 180);
    assert.ok(Number.isFinite(pos.x));
    assert.ok(Number.isFinite(pos.y));
    assert.ok(Number.isFinite(pos.z));
    const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    assert.ok(dist > 1.4e11 && dist < 1.6e11, 'Computed orbit distance should be near 1 AU');
  });

  await t.test('getCelestialCanvas and generateHDCelestialCanvas are exported functions', () => {
    assert.equal(typeof m.getCelestialCanvas, 'function');
    assert.equal(typeof m.generateHDCelestialCanvas, 'function');
  });
});
