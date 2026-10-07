import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const btnCesium = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cesium 3D'));
      if (btnCesium) btnCesium.click();
    });

    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });

    // Inspect the underlying Cesium primitives generated for ellipsoid
    const primitiveInfo = await page.evaluate(async () => {
      const viewer = window.__cesiumViewer;
      const engine = window.__cosmicEngine;
      const C = engine.C;
      const jupiter = viewer.entities.getById('celestial-jupiter');

      // Check primitives in the scene
      const primitives = viewer.scene.primitives;
      const primList = [];
      for (let i = 0; i < primitives.length; i++) {
        const p = primitives.get(i);
        primList.push({
          type: p.constructor.name,
          isDestroyed: p.isDestroyed ? p.isDestroyed() : false,
        });
      }

      // Check entity visualizers
      const visualizers = viewer._entityViewers || viewer._dataSourceDisplay?._visualizers || [];
      const visNames = visualizers.map(v => v.constructor.name);

      // What is jupiter.ellipsoid.material evaluated value right now?
      const mat = jupiter.ellipsoid.material;
      const matVal = mat.getValue ? mat.getValue(C.JulianDate.now()) : null;

      // Let's test: What happens if we set a solid red color? Does it turn RED?!
      jupiter.ellipsoid.material = new C.ColorMaterialProperty(C.Color.RED);

      return {
        primList,
        visNames,
        matValType: matVal ? matVal.constructor.name : null,
      };
    });

    console.log('Primitive info:', primitiveInfo);

    // Now focus on Jupiter with Color.RED
    console.log('Focusing on Jupiter with Color.RED...');
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('jupiter');
    });
    await new Promise(r => setTimeout(r, 6000));

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_red_test.png' });
    console.log('Saved jupiter_red_test.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

inspect();
