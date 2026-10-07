import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function inspectJupiterShader() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Open layers menu and click Cesium 3D
    await page.evaluate(() => {
      // Set localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hm_is3d_')) localStorage.setItem(k, 'true');
        if (k && k.startsWith('hm_globetype_')) localStorage.setItem(k, 'cesium');
      }
      localStorage.setItem('hm_is3d_default', 'true');
      localStorage.setItem('hm_globetype_default', 'cesium');

      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const btnCesium = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cesium 3D'));
      if (btnCesium) btnCesium.click();
    });

    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });

    // Focus on Jupiter
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('jupiter');
    });
    await new Promise(r => setTimeout(r, 5000));

    // Inspect the internal material of Jupiter primitive!
    const result = await page.evaluate(() => {
      const viewer = window.__cesiumViewer;
      const engine = window.__cosmicEngine;
      const C = engine.C;
      const jupiter = viewer.entities.getById('celestial-jupiter');

      // Find the primitive for Jupiter
      let jupiterPrim = null;
      for (let i = 0; i < viewer.scene.primitives.length; i++) {
        const p = viewer.scene.primitives.get(i);
        // Is it a geometry or primitive?
        if (p._sp || p._commandList || p.appearance) {
          jupiterPrim = p;
        }
      }

      // Check the entity's material property
      const matProp = jupiter.ellipsoid.material;
      const matVal = matProp.getValue(C.JulianDate.now());

      // Read pixels from the canvas image that was provided!
      const canvas = matVal.image;
      let canvasPixelCenter = null;
      let canvasIsBlank = false;
      if (canvas instanceof HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        canvasPixelCenter = [imgData[0], imgData[1], imgData[2], imgData[3]];
        // Also check if entire canvas is blank/white
        const sample1 = ctx.getImageData(100, 100, 1, 1).data;
        const sample2 = ctx.getImageData(500, 500, 1, 1).data;
        canvasIsBlank = (sample1[0] === 255 && sample1[1] === 255 && sample1[2] === 255 && sample2[0] === 255);
      }

      return {
        matValImageIsCanvas: matVal.image instanceof HTMLCanvasElement,
        canvasWidth: matVal.image?.width,
        canvasHeight: matVal.image?.height,
        canvasPixelCenter,
        canvasIsBlank,
        primitivesCount: viewer.scene.primitives.length,
      };
    });

    console.log('Result:', result);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

inspectJupiterShader();
