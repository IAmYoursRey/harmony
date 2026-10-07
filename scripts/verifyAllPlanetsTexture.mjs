import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function testAllPlanets() {
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

    await page.evaluate(() => {
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

    await page.waitForFunction(() => !!window.__cesiumViewer && !!window.__cosmicEngine, { timeout: 25000 });
    console.log('Cesium viewer and cosmic engine ready!');

    const targets = ['mars', 'jupiter', 'saturn', 'venus'];
    const outDir = 'd:\\vscode\\Harmony\\scripts\\verified_planets';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    for (const target of targets) {
      console.log(`Focusing on ${target}...`);
      await page.evaluate((id) => {
        window.__cosmicEngine.focusCelestialBody(id);
      }, target);

      // Wait for flight transition and texture rendering
      await new Promise(r => setTimeout(r, 5500));

      const screenshotPath = path.join(outDir, `${target}_verified.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot for ${target}: ${screenshotPath}`);
    }

    console.log('All planets successfully tested!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testAllPlanets();
