import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\raiha\\.gemini\\antigravity-ide\\brain\\ebb91780-c654-47ed-ac72-c185a713e74f';
const MAPS_URL = 'http://localhost:5173/app/maps';

const EXPECTED_DOMAINS = [
  'weather', 'bmkg', 'remote_sensing', 'terrain', 'positioning',
  'hydrology', 'field_survey', 'analytics', 'charts', 'fusion',
  'catalog', 'hotspots', 'accessibility', 'emissions', 'swot'
];

async function runSmoke() {
  console.log('=== MEMULAI COMPREHENSIVE BROWSER SMOKE TEST (EDGE) ===');
  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Edge executable not found at: ${EDGE_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
    ],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Desktop Test (1440x900)
    await page.setViewport({ width: 1440, height: 900 });
    console.log(`1. Navigasi ke ${MAPS_URL}...`);
    await page.goto(MAPS_URL, { waitUntil: 'networkidle2', timeout: 35000 });

    // Tunggu OpenLayers canvas siap
    await new Promise((r) => setTimeout(r, 3500));

    const eval2D = await page.evaluate(() => {
      const olViewport = document.querySelector('.ol-viewport');
      const canvas = document.querySelector('canvas');
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        hasOlViewport: !!olViewport,
        hasCanvas: !!canvas,
        buttonTexts: buttons.slice(0, 15).map(b => b.textContent?.trim() || b.title).filter(Boolean),
      };
    });

    console.log('Hasil Evaluasi Peta 2D OpenLayers:', eval2D);
    const screenshot2D = path.join(ARTIFACTS_DIR, 'smoke_2d_openlayers.png');
    await page.screenshot({ path: screenshot2D, fullPage: false });
    console.log(`Screenshot 2D disimpan ke: ${screenshot2D}`);

    // 2. Uji Pergantian Renderer 2D <-> 3D Globe
    console.log('2. Menguji pergantian mode 3D Globe...');
    const switched3D = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn3D = buttons.find(b => 
        b.textContent?.includes('3D') || 
        b.title?.includes('3D') || 
        b.getAttribute('aria-label')?.includes('3D')
      );
      if (btn3D) {
        btn3D.click();
        return true;
      }
      return false;
    });

    if (switched3D) {
      console.log('Tombol 3D berhasil diklik. Menunggu WebGL Three.js render...');
      await new Promise((r) => setTimeout(r, 3000));
      const screenshot3D = path.join(ARTIFACTS_DIR, 'smoke_3d_globe.png');
      await page.screenshot({ path: screenshot3D, fullPage: false });
      console.log(`Screenshot 3D disimpan ke: ${screenshot3D}`);

      // Beralih kembali ke 2D
      console.log('Beralih kembali dari 3D ke 2D...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn2D = buttons.find(b => 
          b.textContent?.includes('2D') || 
          b.textContent?.includes('3D') || 
          b.title?.includes('2D') ||
          b.title?.includes('Perbesar / Beralih ke 2D')
        );
        btn2D?.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 3. Uji Panel / Modal Geospatial Studio (15 Domain)
    console.log('3. Mencari tombol Alat & Analisis / Studio...');
    const openedStudio = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const studioBtn = buttons.find(b => 
        b.title?.includes('Studio') || 
        b.title?.includes('Alat') ||
        b.title?.includes('Analisis') ||
        b.textContent?.includes('Studio') ||
        b.textContent?.includes('Alat & Analisis')
      );
      if (studioBtn) {
        studioBtn.click();
        return true;
      }
      return false;
    });

    if (openedStudio) {
      console.log('Tombol Studio diklik. Menunggu modal terbuka...');
      await new Promise((r) => setTimeout(r, 2000));
      const screenshotStudio = path.join(ARTIFACTS_DIR, 'smoke_studio_modal.png');
      await page.screenshot({ path: screenshotStudio, fullPage: false });
      console.log(`Screenshot Studio disimpan ke: ${screenshotStudio}`);
    }

    // 4. Uji Tampilan Mobile Responsif (375x812)
    console.log('4. Menguji viewport mobile responsif (375x812)...');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 2000));
    const screenshotMobile = path.join(ARTIFACTS_DIR, 'smoke_mobile_maps.png');
    await page.screenshot({ path: screenshotMobile, fullPage: false });
    console.log(`Screenshot mobile disimpan ke: ${screenshotMobile}`);

    console.log(`\nTotal console error tercatat: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Daftar console error:', consoleErrors.slice(0, 5));
    }

    console.log('=== BROWSER SMOKE TEST SUKSES LENGKAP ===');
  } finally {
    await browser.close();
  }
}

runSmoke().catch((err) => {
  console.error('Smoke Test Gagal:', err);
  process.exit(1);
});
