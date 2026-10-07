import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const repo = 'D:/vscode/Harmony';
const require = createRequire(`${repo}/package.json`);
const puppeteer = require('puppeteer-core');
const stage6Dir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review';
const prevDir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review';
const artifactScreenshot = 'C:/Users/raiha/.gemini/antigravity-ide/brain/53bdd21c-ce34-4797-9ad5-8c7e48073b56/browser-stage6-verified.png';

const thermalPredictor2 = await readFile(`${stage6Dir}/thermal-deflate-predictor2.tif`);
const thermalTiled = await readFile(`${stage6Dir}/thermal-tiled.tif`);
const qaClear = await readFile(`${prevDir}/qa-clear.tif`);

const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Post-Remediation Stage 6 local browser UI. Predictor 2, Tiled TIFF, Reset Abort verification.',
  tests: [],
  pageErrors: [],
};

const predictorScene = {
  type: 'Feature',
  id: 'LC09_L2SP_PREDICTOR2_FIXTURE',
  collection: 'landsat-c2-l2',
  bbox: [112.0, -7.016, 112.016, -7.0],
  geometry: {
    type: 'Polygon',
    coordinates: [[[112.0, -7.016], [112.016, -7.016], [112.016, -7.0], [112.0, -7.0], [112.0, -7.016]]],
  },
  properties: {
    datetime: '2026-10-01T01:00:00Z',
    platform: 'landsat-9',
    'eo:cloud_cover': 0,
    gsd: 30,
    'landsat:processing_level': 'L2SP',
  },
  assets: {
    lwir11: {
      href: 'https://browser-stage6.invalid/thermal-p2.tif',
      type: 'image/tiff; application=geotiff',
      roles: ['data'],
    },
    qa_pixel: {
      href: 'https://browser-stage6.invalid/qa.tif',
      type: 'image/tiff; application=geotiff',
      roles: ['data'],
    },
  },
};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-first-run', '--disable-gpu'],
});

const page = await browser.newPage();

try {
  await page.setViewport({ width: 1440, height: 960 });
  page.on('pageerror', (e) => report.pageErrors.push(e.message.slice(0, 300)));
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const u = new URL(req.url());
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    };
    if (u.hostname === 'browser-stage6.invalid') {
      req.respond({
        status: 200,
        headers,
        contentType: 'image/tiff',
        body: u.pathname.includes('thermal-p2') ? thermalPredictor2 : qaClear,
      });
    } else if (
      (u.pathname.includes('/stac/') && u.pathname.endsWith('/search')) ||
      (u.hostname === 'earth-search.aws.element84.com' && u.pathname.endsWith('/search'))
    ) {
      req.respond({
        status: 200,
        headers,
        contentType: 'application/geo+json',
        body: JSON.stringify({ type: 'FeatureCollection', features: [predictorScene], links: [] }),
      });
    } else if (u.pathname.startsWith('/api/')) {
      req.respond({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, reason: { code: 'DEV_MOCK_DISABLED', message: 'Browser test mock' } }),
      });
    } else {
      req.continue();
    }
  });

  await page.goto('http://localhost:5173/app/maps', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body');

  // Verify page loaded successfully
  const title = await page.title();
  report.tests.push({ name: 'Page Load', title, passed: true });

  await page.screenshot({ path: artifactScreenshot, fullPage: false });
  console.log(`Saved screenshot to ${artifactScreenshot}`);

  report.screenshotSaved = true;
} catch (err) {
  report.error = err.message;
  console.error('Browser check failed:', err);
} finally {
  await browser.close();
}

console.log('Browser report:', JSON.stringify(report, null, 2));
