import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function debugJupiterMaterial() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

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

    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });

    const debugInfo = await page.evaluate(async () => {
      const viewer = window.__cesiumViewer;
      const jupiter = viewer.entities.getById('celestial-jupiter');
      const sun = viewer.entities.getById('celestial-sun');

      const jupiterMat = jupiter?.ellipsoid?.material;
      const sunMat = sun?.ellipsoid?.material;

      // Check Cesium's internal texture cache or image loading state
      const jImg = jupiterMat?.image;
      const sImg = sunMat?.image;

      return {
        jupiter: {
          hasEllipsoid: !!jupiter?.ellipsoid,
          material: jupiterMat ? jupiterMat.constructor.name : null,
          imageType: typeof jImg,
          imageValue: jImg?.getValue ? String(jImg.getValue())?.slice(0, 100) : null,
          isLoaded: jupiterMat?._loaded,
        },
        sun: {
          hasEllipsoid: !!sun?.ellipsoid,
          material: sunMat ? sunMat.constructor.name : null,
          imageType: typeof sImg,
          imageValue: sImg?.getValue ? (sImg.getValue() instanceof HTMLCanvasElement ? 'Canvas ' + sImg.getValue().width : String(sImg.getValue())) : null,
          isLoaded: sunMat?._loaded,
        }
      };
    });

    console.log('Debug Info:', debugInfo);

    // Let's test changing Jupiter's material LIVE in the viewer to see what makes it render!
    // Test 1: Change to HTMLCanvasElement directly!
    // Test 2: Change to Cesium.ColorMaterialProperty(Cesium.Color.RED)!
    const testChange = await page.evaluate(async () => {
      const viewer = window.__cesiumViewer;
      const engine = window.__cosmicEngine;
      const C = engine.C;
      const jupiter = viewer.entities.getById('celestial-jupiter');

      // What happens if we assign canvas directly instead of data URL?
      // First, get the canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0, 100, 512, 56);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(256, 128, 40, 0, Math.PI * 2);
      ctx.fill();

      // Assign to jupiter.ellipsoid.material
      jupiter.ellipsoid.material = new C.ImageMaterialProperty({
        image: canvas,
        transparent: false,
      });

      return { assignedCanvas: true };
    });

    console.log('Test change result:', testChange);

    // Focus on Jupiter
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('jupiter');
    });
    await new Promise(r => setTimeout(r, 6000));

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_test_canvas.png' });
    console.log('Saved jupiter_test_canvas.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

debugJupiterMaterial();
