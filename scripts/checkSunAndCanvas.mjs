import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function checkSunAndCanvas() {
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

    // Focus on Sun
    console.log('Focusing on Sun...');
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('sun');
    });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\sun_view.png' });
    console.log('Saved sun_view.png');

    // Now test changing Mars material to getCelestialCanvas('mars')
    console.log('Switching Mars to getCelestialCanvas("mars") and focusing on Mars...');
    const result = await page.evaluate(async () => {
      const engine = window.__cosmicEngine;
      const viewer = window.__cesiumViewer;
      const C = engine.C;
      const mars = viewer.entities.getById('celestial-mars');

      // Test with canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      // Bright red and distinct stripes
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 150, 1024, 100);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(200, 300, 400, 150);

      mars.ellipsoid.material = new C.ImageMaterialProperty({
        image: canvas,
        transparent: false,
      });

      engine.focusCelestialBody('mars');
      return { success: true };
    });

    console.log('Result:', result);
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\mars_with_canvas.png' });
    console.log('Saved mars_with_canvas.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

checkSunAndCanvas();
