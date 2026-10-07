import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function testColors() {
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

    console.log('Waiting for Cesium...');
    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });
    console.log('Cesium ready!');

    // Change Mars to Color.RED and Jupiter to Color.ORANGE
    await page.evaluate(() => {
      const viewer = window.__cesiumViewer;
      const C = window.__cosmicEngine.C;
      const mars = viewer.entities.getById('celestial-mars');
      const jupiter = viewer.entities.getById('celestial-jupiter');

      if (mars) {
        mars.ellipsoid.material = new C.ColorMaterialProperty(C.Color.RED);
      }
      if (jupiter) {
        jupiter.ellipsoid.material = new C.ColorMaterialProperty(C.Color.fromCssColorString('#f59e0b'));
      }

      window.__cosmicEngine.focusCelestialBody('jupiter');
    });

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_color_test.png' });
    console.log('Saved jupiter_color_test.png');

    // Also focus on Mars
    await page.evaluate(() => {
      window.__cosmicEngine.focusCelestialBody('mars');
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\mars_color_test.png' });
    console.log('Saved mars_color_test.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testColors();
