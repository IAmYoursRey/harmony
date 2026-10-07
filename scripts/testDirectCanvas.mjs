import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function test() {
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
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const btnCesium = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cesium 3D'));
      if (btnCesium) btnCesium.click();
    });

    console.log('Waiting for Cesium...');
    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });
    console.log('Cesium ready!');

    // Check Sun image and material
    const sunTest = await page.evaluate(async () => {
      const engine = window.__cosmicEngine;
      const viewer = window.__cesiumViewer;
      const sun = viewer.entities.getById('celestial-sun');
      const jupiter = viewer.entities.getById('celestial-jupiter');

      // What is currently on Sun?
      const sunImg = sun.ellipsoid.material.image;
      const sunVal = sunImg.getValue ? sunImg.getValue() : sunImg;

      return {
        sunImgIsCanvas: sunVal instanceof HTMLCanvasElement,
        sunImgWidth: sunVal?.width,
        sunImgHeight: sunVal?.height,
      };
    });
    console.log('Sun Test:', sunTest);

    // Let's focus on Sun and screenshot it
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('sun');
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\sun_view.png' });
    console.log('Saved sun_view.png');

    // Now test what happens if we assign canvas to Jupiter
    console.log('Assigning canvas to Jupiter...');
    const jupiterResult = await page.evaluate(() => {
      const engine = window.__cosmicEngine;
      const viewer = window.__cesiumViewer;
      const C = engine.C;
      const jupiter = viewer.entities.getById('celestial-jupiter');

      // Draw a colorful test pattern on canvas
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 512;
      const ctx = cv.getContext('2d');
      // Red base with blue stripe and yellow circles
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 100, 1024, 80);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 250, 1024, 60);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(512, 280, 50, 0, Math.PI * 2);
      ctx.fill();

      // Assign to jupiter material
      jupiter.ellipsoid.material = new C.ImageMaterialProperty({
        image: cv,
        transparent: false,
      });

      engine.focusCelestialBody('jupiter');
      return { assigned: true };
    });
    console.log('Jupiter result:', jupiterResult);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_test_pattern.png' });
    console.log('Saved jupiter_test_pattern.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

test();
