import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function testPrimitive() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Force localStorage to enable 3D and reload
    await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hm_is3d_')) localStorage.setItem(k, 'true');
        if (k && k.startsWith('hm_globetype_')) localStorage.setItem(k, 'cesium');
      }
      localStorage.setItem('hm_is3d_default', 'true');
      localStorage.setItem('hm_globetype_default', 'cesium');
    });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const btnCesium = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cesium 3D'));
      if (btnCesium) btnCesium.click();
    });

    console.log('Waiting for Cesium viewer...');
    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });
    console.log('Cesium viewer ready!');

    // Add a Primitive with canvas texture to Jupiter!
    const addResult = await page.evaluate(async () => {
      const viewer = window.__cesiumViewer;
      const engine = window.__cosmicEngine;
      const C = engine.C;
      const jupiterItem = engine.celestialItems.get('jupiter');
      const jupiterEntity = viewer.entities.getById('celestial-jupiter');

      // Hide the entity's ellipsoid so only our primitive shows!
      if (jupiterEntity && jupiterEntity.ellipsoid) {
        jupiterEntity.ellipsoid.show = false;
      }

      // Create a canvas with Jupiter texture or colorful bands
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      // Jupiter bands
      const bands = ['#475569', '#7c2d12', '#fed7aa', '#c2410c', '#fff7ed', '#b45309', '#fed7aa', '#7c2d12', '#475569'];
      const bh = 512 / bands.length;
      for (let i = 0; i < bands.length; i++) {
        ctx.fillStyle = bands[i];
        ctx.fillRect(0, i * bh, 1024, bh);
      }
      // Great Red Spot
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(600, 320, 80, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Create Cesium Primitive
      const r = jupiterItem.radiusMeters;
      const prim = new C.Primitive({
        geometryInstances: new C.GeometryInstance({
          geometry: new C.EllipsoidGeometry({
            radii: new C.Cartesian3(r, r, r),
            vertexFormat: C.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
          }),
        }),
        appearance: new C.MaterialAppearance({
          material: new C.Material({
            fabric: {
              type: 'Image',
              uniforms: {
                image: canvas,
              },
            },
          }),
          faceForward: true,
          flat: true,
        }),
        asynchronous: false,
      });

      // Position primitive at Jupiter's current position
      prim.modelMatrix = C.Matrix4.fromTranslation(jupiterItem.currentPosition, new C.Matrix4());
      viewer.scene.primitives.add(prim);

      // Keep it positioned in preRender
      viewer.scene.preRender.addEventListener(() => {
        prim.modelMatrix = C.Matrix4.fromTranslation(jupiterItem.currentPosition, new C.Matrix4());
      });

      // Fly to Jupiter!
      engine.focusCelestialBody('jupiter');

      return { added: true };
    });

    console.log('Primitive add result:', addResult);
    await new Promise(r => setTimeout(r, 6000));

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_primitive_test.png' });
    console.log('Saved jupiter_primitive_test.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testPrimitive();
