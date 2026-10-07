import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function testMars() {
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
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Open layers menu or switch to 3D
    console.log('Switching to 3D mode via evaluate...');
    await page.evaluate(() => {
      // Find button to open map layers menu if needed
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Lapisan & Mode Peta'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click 'Kosmik 3D' or 'Cesium 3D'
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btnKosmik = buttons.find(b => b.textContent?.includes('Kosmik 3D'));
      const btnCesium = buttons.find(b => b.textContent?.includes('Cesium 3D'));
      if (btnKosmik) {
        btnKosmik.click();
        return { clicked: 'Kosmik 3D' };
      }
      if (btnCesium) {
        btnCesium.click();
        return { clicked: 'Cesium 3D' };
      }
      return { clicked: 'none', buttons: buttons.map(b => b.textContent) };
    });
    console.log('Click result:', clickResult);
    await new Promise(r => setTimeout(r, 4000));

    // Check what is rendered
    const sceneStatus = await page.evaluate(() => {
      const viewer = (window).cesiumViewer;
      const entities = viewer ? viewer.entities.values.map(e => ({
        id: e.id,
        name: e.name,
        hasEllipsoid: !!e.ellipsoid,
        materialType: e.ellipsoid?.material?.constructor?.name,
      })) : [];

      return {
        hasCesiumViewer: !!viewer,
        entitiesCount: entities.length,
        marsEntity: entities.find(e => e.id === 'celestial-mars'),
        canvasCount: document.querySelectorAll('canvas').length,
      };
    });
    console.log('Scene status:', sceneStatus);

    // Let's inspect Mars entity material directly
    const marsMaterialInfo = await page.evaluate(() => {
      const viewer = (window).cesiumViewer;
      if (!viewer) return null;
      const mars = viewer.entities.getById('celestial-mars');
      if (!mars) return { found: false };
      const mat = mars.ellipsoid?.material;
      let imageVal = null;
      if (mat && mat.image) {
        imageVal = typeof mat.image.getValue === 'function' ? String(mat.image.getValue()) : String(mat.image);
        if (imageVal && imageVal.length > 100) imageVal = imageVal.slice(0, 80) + '... (len: ' + imageVal.length + ')';
      }
      return {
        found: true,
        material: mat ? mat.constructor.name : null,
        image: imageVal,
        color: mat?.color ? String(mat.color.getValue ? mat.color.getValue() : mat.color) : null,
      };
    });
    console.log('Mars Material Info:', marsMaterialInfo);

    // Focus on Mars using navigation if possible
    await page.evaluate(() => {
      // Find Mars button in pill selector or panel
      const buttons = Array.from(document.querySelectorAll('button'));
      const marsBtn = buttons.find(b => b.textContent?.includes('Mars'));
      if (marsBtn) marsBtn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\mars_view.png' });
    console.log('Saved mars_view.png');
    console.log('Logs:', logs);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testMars();
