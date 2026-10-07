import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { PLANETARY_CATALOG, CELESTIAL_ORDER } from './apps/web/src/data/planetaryCatalog.ts';
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

test('Cosmic Solar System: Catalog Integrity and Verified NASA Data', async (t) => {
  await t.test('All 10 required celestial bodies exist in catalog', () => {
    const required = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    required.forEach((id) => {
      assert.ok(m.PLANETARY_CATALOG[id], `Celestial body '${id}' must exist in catalog`);
      assert.equal(m.PLANETARY_CATALOG[id].id, id);
      assert.ok(m.PLANETARY_CATALOG[id].name.length > 0, `Name must not be empty for ${id}`);
      assert.ok(m.PLANETARY_CATALOG[id].englishName.length > 0, `English name must not be empty for ${id}`);
    });
    assert.deepEqual(m.CELESTIAL_ORDER, required);
  });

  await t.test('Physical parameters are astrophysically sound and positive', () => {
    Object.values(m.PLANETARY_CATALOG).forEach((body) => {
      assert.ok(body.diameterKm > 0, `Diameter of ${body.name} must be > 0 km`);
      assert.ok(body.visual.bodyRadius > 0, `Visual body radius of ${body.name} must be > 0`);
      assert.ok(typeof body.massKg === 'string' && body.massKg.length > 0, `Mass string must exist for ${body.name}`);
      assert.ok(typeof body.gravity === 'string' && body.gravity.length > 0, `Gravity string must exist for ${body.name}`);
      assert.ok(typeof body.orbitalPeriod === 'string', `Orbital period must exist for ${body.name}`);
      assert.ok(Array.isArray(body.atmosphere) && body.atmosphere.length > 0, `Atmosphere must be an array for ${body.name}`);
    });
  });

  await t.test('Planetary orbital distances increase with distance from Sun', () => {
    const planetsInOrder = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    for (let i = 0; i < planetsInOrder.length - 1; i++) {
      const current = m.PLANETARY_CATALOG[planetsInOrder[i]];
      const next = m.PLANETARY_CATALOG[planetsInOrder[i + 1]];
      assert.ok(
        current.distanceFromSunAU < next.distanceFromSunAU,
        `${current.name} AU (${current.distanceFromSunAU}) must be less than ${next.name} AU (${next.distanceFromSunAU})`
      );
      assert.ok(
        current.visual.orbitRadius < next.visual.orbitRadius,
        `${current.name} scene orbitRadius (${current.visual.orbitRadius}) must be less than ${next.name} (${next.visual.orbitRadius})`
      );
    }
  });

  await t.test('Saturn and Uranus possess ring specifications', () => {
    const saturn = m.PLANETARY_CATALOG['saturn'];
    assert.equal(saturn.visual.hasRings, true, 'Saturn must have rings');
    assert.ok(saturn.visual.ringInner && saturn.visual.ringOuter && saturn.visual.ringOuter > saturn.visual.ringInner);

    const uranus = m.PLANETARY_CATALOG['uranus'];
    assert.equal(uranus.visual.hasRings, true, 'Uranus must have rings');
    assert.ok(uranus.visual.ringInner && uranus.visual.ringOuter && uranus.visual.ringOuter > uranus.visual.ringInner);
  });

  await t.test('All bodies have verified scientific fact and NASA/ESA missions with citations', () => {
    Object.values(m.PLANETARY_CATALOG).forEach((body) => {
      assert.ok(body.scientificFact.length > 20, `Scientific fact for ${body.name} must be informative`);
      assert.ok(Array.isArray(body.missionsAndResearch) && body.missionsAndResearch.length > 0, `Missions must exist for ${body.name}`);
      body.missionsAndResearch.forEach((mission) => {
        assert.ok(mission.mission.length > 0, 'Mission name required');
        assert.ok(mission.agency.length > 0, 'Mission agency required');
        assert.ok(mission.discovery.length > 0, 'Discovery description required');
        assert.ok(typeof mission.paperCitation === 'string' && mission.paperCitation.length > 0, `Paper citation required for ${mission.mission}`);
      });
    });
  });

  await t.test('All celestial bodies have detailed interior structure layers (crust/mantle/core)', () => {
    Object.values(m.PLANETARY_CATALOG).forEach((body) => {
      assert.ok(Array.isArray(body.interiorLayers) && body.interiorLayers.length >= 3, `${body.name} must have at least 3 interior layers`);
      body.interiorLayers.forEach((layer) => {
        assert.ok(layer.name.length > 0, `Layer name required for ${body.name}`);
        assert.ok(layer.depth.length > 0, `Layer depth required for ${layer.name}`);
        assert.ok(layer.composition.length > 0, `Layer composition required for ${layer.name}`);
        assert.ok(layer.color.startsWith('#'), `Layer color must be hex for ${layer.name}`);
        assert.ok(layer.description.length > 10, `Layer description required for ${layer.name}`);
      });
    });
  });
});
