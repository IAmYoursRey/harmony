import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function testCesiumPlanets() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    await page.setViewport({ width: 1400, height: 900 });
    console.log('Navigating to maps...');
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Force localStorage to enable 3D and reload
    await page.evaluate(() => {
      // Find active user or default
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hm_is3d_')) {
          localStorage.setItem(k, 'true');
        }
        if (k && k.startsWith('hm_globetype_')) {
          localStorage.setItem(k, 'cesium');
        }
      }
      localStorage.setItem('hm_is3d_default', 'true');
      localStorage.setItem('hm_globetype_default', 'cesium');
    });

    // Also click the menu button to toggle 3D Cesium
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const btnCesium = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cesium 3D'));
      if (btnCesium) btnCesium.click();
    });

    console.log('Waiting for Cesium viewer to initialize (up to 20s)...');
    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });
    console.log('Cesium viewer and Cosmic Engine are READY!');

    // Let's inspect Mars, Jupiter, Venus, etc.
    const planetInspection = await page.evaluate(async () => {
      const viewer = window.__cesiumViewer;
      const engine = window.__cosmicEngine;
      const C = engine.C;

      const results = {};
      const planetIds = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

      for (const id of planetIds) {
        const entity = viewer.entities.getById(`celestial-${id}`);
        const item = engine.celestialItems.get(id);

        if (!entity) {
          results[id] = { exists: false };
          continue;
        }

        const ellipsoid = entity.ellipsoid;
        const mat = ellipsoid?.material;
        let imageType = null;
        let imageVal = null;

        if (mat) {
          const imgProp = mat.image;
          if (imgProp) {
            const rawVal = imgProp.getValue ? imgProp.getValue(C.JulianDate.now()) : imgProp;
            imageType = typeof rawVal;
            if (rawVal instanceof HTMLCanvasElement) {
              imageType = 'HTMLCanvasElement (' + rawVal.width + 'x' + rawVal.height + ')';
            } else if (typeof rawVal === 'string') {
              imageType = 'string (len: ' + rawVal.length + ', prefix: ' + rawVal.slice(0, 30) + ')';
            } else if (rawVal && typeof rawVal === 'object') {
              imageType = 'object: ' + rawVal.constructor.name;
            }
          }
        }

        results[id] = {
          exists: true,
          hasEllipsoid: !!ellipsoid,
          radii: ellipsoid?.radii?.getValue ? ellipsoid.radii.getValue(C.JulianDate.now()) : null,
          materialClass: mat?.constructor?.name,
          imageType,
          color: mat?.color?.getValue ? mat.color.getValue(C.JulianDate.now()) : null,
        };
      }

      return results;
    });

    console.log('Planet Inspection:', JSON.stringify(planetInspection, null, 2));

    // Now fly to Mars to see what it looks like up close!
    console.log('Flying camera to Mars...');
    await page.evaluate(() => {
      const engine = window.__cosmicEngine;
      if (engine) {
        engine.focusCelestialBody('mars');
      }
    });

    // Wait 5 seconds for camera transition
    await new Promise(r => setTimeout(r, 6000));

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\mars_close_up.png' });
    console.log('Saved mars_close_up.png');

    // Also fly to Jupiter
    console.log('Flying camera to Jupiter...');
    await page.evaluate(() => {
      const engine = window.__cosmicEngine;
      if (engine) {
        engine.focusCelestialBody('jupiter');
      }
    });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\jupiter_close_up.png' });
    console.log('Saved jupiter_close_up.png');

    console.log('Any page errors or console logs:');
    console.log(logs.filter(l => l.includes('ERROR') || l.includes('warn') || l.includes('error')));

  } catch (err) {
    console.error('Error in testCesiumPlanets:', err);
  } finally {
    await browser.close();
  }
}

testCesiumPlanets();
