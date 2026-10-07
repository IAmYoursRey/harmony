import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function run() {
  console.log('Launching browser to inspect 3D celestial bodies...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    await page.setViewport({ width: 1400, height: 900 });
    console.log('Navigating to ' + MAPS_URL);
    await page.goto(MAPS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Check if 3D button exists and click it if not active
    const state = await page.evaluate(() => {
      // Find 3D toggle button or active state
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn3D = buttons.find(b => b.textContent?.includes('3D') || b.textContent?.includes('Globe'));
      return {
        buttonFound: !!btn3D,
        buttonText: btn3D?.textContent,
        hasCesium: !!window.cesiumViewer || !!document.querySelector('.cesium-viewer'),
        hasCanvas: document.querySelectorAll('canvas').length,
      };
    });
    console.log('State:', state);

    // Take screenshot of initial view
    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\initial_view.png' });
    console.log('Saved initial_view.png');

    // Click 3D if found
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn3D = buttons.find(b => b.textContent?.includes('Globe 3D') || b.textContent?.includes('3D'));
      if (btn3D) btn3D.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    // Check if Cesium or Three is active
    const engineInfo = await page.evaluate(() => {
      const isCesium = !!document.querySelector('.cesium-viewer');
      return {
        isCesium,
        canvasCount: document.querySelectorAll('canvas').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
      };
    });
    console.log('Engine Info:', engineInfo);

    await page.screenshot({ path: 'd:\\vscode\\Harmony\\scripts\\globe_view.png' });
    console.log('Saved globe_view.png');
    console.log('Console logs (first 20):', consoleLogs.slice(0, 20));

  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await browser.close();
  }
}

run();
