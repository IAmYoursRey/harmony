import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { 
        PLANETARY_CATALOG, 
        CELESTIAL_ORDER,
        getPlanetaryMapMetadata,
        PLANETARY_MAP_METADATA
      } from './apps/web/src/data/planetaryCatalog.ts';
      export { 
        PLANETARY_LANDMARKS, 
        PLANETARY_SURFACE_ENVIRONMENTS, 
        getLandmarksForBody 
      } from './apps/web/src/data/planetaryLandmarks.ts';
      export {
        REAL_PLANET_TEXTURE_URLS,
        REAL_SATURN_RING_URL
      } from './apps/web/src/components/dashboard/views/spatial/celestial/cosmicSceneUtils.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env': '{}' }
});

const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);

test('Planetary Landmarks and Surface Environments Integrity Test', async (t) => {
  const bodies = [
    'sun',
    'mercury',
    'venus',
    'earth',
    'moon',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune'
  ];

  await t.test('All 10 celestial bodies must exist in catalog and have surface environments', () => {
    bodies.forEach((bodyId) => {
      assert.ok(m.PLANETARY_CATALOG[bodyId], `Body ${bodyId} must exist in PLANETARY_CATALOG`);
      const env = m.PLANETARY_SURFACE_ENVIRONMENTS[bodyId];
      assert.ok(env, `Body ${bodyId} must have an entry in PLANETARY_SURFACE_ENVIRONMENTS`);
      assert.ok(env.skyTopColor, `Body ${bodyId} must define skyTopColor`);
      assert.ok(env.skyHorizonColor, `Body ${bodyId} must define skyHorizonColor`);
      assert.ok(env.groundBaseColor, `Body ${bodyId} must define groundBaseColor`);
      assert.ok(env.surfacePressure, `Body ${bodyId} must define surfacePressure`);
      assert.ok(env.surfaceGravity, `Body ${bodyId} must define surfaceGravity`);
      assert.ok(env.horizonDescription, `Body ${bodyId} must have horizonDescription`);
    });
  });

  await t.test('All celestial bodies must have at least 3 verified geological landmarks with valid coordinates', () => {
    bodies.forEach((bodyId) => {
      const landmarks = m.getLandmarksForBody(bodyId);
      assert.ok(landmarks.length >= 3, `Body ${bodyId} must have at least 3 landmarks (got ${landmarks.length})`);

      landmarks.forEach((lm) => {
        assert.ok(lm.id, `Landmark must have id`);
        assert.ok(lm.name, `Landmark ${lm.id} must have Indonesian name`);
        assert.ok(lm.englishName, `Landmark ${lm.id} must have English name`);
        assert.strictEqual(lm.bodyId, bodyId, `Landmark ${lm.id} bodyId must match ${bodyId}`);
        assert.ok(lm.elevation, `Landmark ${lm.id} must have elevation/depth metric`);
        assert.ok(lm.dimension, `Landmark ${lm.id} must have dimension metric`);
        assert.ok(lm.significance, `Landmark ${lm.id} must have scientific significance explanation`);

        // Validate geographic coordinate boundaries
        assert.ok(
          lm.lat >= -90 && lm.lat <= 90,
          `Landmark ${lm.id} lat (${lm.lat}) must be within [-90, 90]`
        );
        assert.ok(
          lm.lng >= -180 && lm.lng <= 180,
          `Landmark ${lm.id} lng (${lm.lng}) must be within [-180, 180]`
        );

        // Test equirectangular projection math
        const xPct = ((lm.lng + 180) / 360) * 100;
        const yPct = ((90 - lm.lat) / 180) * 100;
        assert.ok(xPct >= 0 && xPct <= 100, `xPct (${xPct}) must be within [0, 100]`);
        assert.ok(yPct >= 0 && yPct <= 100, `yPct (${yPct}) must be within [0, 100]`);
      });
    });
  });

  await t.test('CELESTIAL_ORDER consistency', () => {
    assert.strictEqual(m.CELESTIAL_ORDER.length, 10);
    assert.deepStrictEqual(m.CELESTIAL_ORDER, bodies);
  });

  await t.test('All 10 celestial bodies have authentic NASA/ESA mission map metadata', () => {
    bodies.forEach((bodyId) => {
      const meta = m.getPlanetaryMapMetadata(bodyId);
      assert.ok(meta, `Body ${bodyId} must have map metadata`);
      assert.ok(meta.mission, `Body ${bodyId} must specify space exploration mission`);
      assert.ok(meta.agency, `Body ${bodyId} must specify space agency`);
      assert.ok(meta.instrument, `Body ${bodyId} must specify scientific imaging instrument`);
      assert.ok(meta.resolution, `Body ${bodyId} must specify texture resolution`);
      assert.ok(meta.authenticity, `Body ${bodyId} must specify authenticity`);
      assert.ok(meta.historicalContext, `Body ${bodyId} must provide historical context`);
    });
  });

  await t.test('Authentic spacecraft 2K texture files physically exist in apps/web/public/celestial', async () => {
    const fs = await import('fs');
    const path = await import('path');

    bodies.forEach((bodyId) => {
      const url = m.REAL_PLANET_TEXTURE_URLS[bodyId];
      assert.ok(url, `Body ${bodyId} must have an entry in REAL_PLANET_TEXTURE_URLS`);
      
      const filePath = path.resolve(process.cwd(), 'apps/web/public', url.replace(/^\//, ''));
      assert.ok(fs.existsSync(filePath), `Texture file for ${bodyId} must exist at ${filePath}`);
      const stats = fs.statSync(filePath);
      assert.ok(stats.size > 50000, `Texture file for ${bodyId} must be substantial 2K resolution (>50KB, got ${stats.size} bytes)`);
    });
  });
});
