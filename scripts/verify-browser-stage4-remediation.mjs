import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire('D:/vscode/Harmony/package.json');
const puppeteer = require('puppeteer-core');
const out = 'D:/vscode/Harmony/tests';

const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Post-remediation browser validation in Microsoft Edge. Verified that optical presets reject thermal execution, unavailable assets return UNAVAILABLE, and drawer parameter switches to Windy.',
  checks: [],
};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--no-sandbox'],
});

let lastPage;
const scene = {
  type: 'Feature',
  id: 'LC09_L2SP_REVIEW_FIXTURE',
  collection: 'landsat-c2-l2',
  bbox: [90, -15, 140, 10],
  geometry: {
    type: 'Polygon',
    coordinates: [[[90, -15], [140, -15], [140, 10], [90, 10], [90, -15]]],
  },
  properties: {
    datetime: '2026-10-01T01:00:00Z',
    platform: 'landsat-9',
    'eo:cloud_cover': 5,
    gsd: 30,
    'landsat:processing_level': 'L2SP',
  },
  assets: {
    lwir11: {
      href: 'https://example.invalid/review-thermal.tif',
      type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      roles: ['data'],
    },
    qa_pixel: {
      href: 'https://example.invalid/review-qa.tif',
      type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      roles: ['data'],
    },
  },
};

async function start() {
  const p = await browser.newPage();
  lastPage = p;
  await p.setViewport({ width: 1440, height: 960 });
  const errors = [];
  const assetRequests = [];

  p.on('pageerror', e => errors.push(e.message.slice(0, 400)));
  await p.setRequestInterception(true);

  p.on('request', req => {
    const u = new URL(req.url());
    if (/example.invalid/.test(u.hostname)) {
      assetRequests.push(u.pathname);
      req.respond({ status: 503, contentType: 'text/plain', body: 'Review fixture: thermal/QA assets unavailable' });
    } else if (
      (u.pathname.includes('/stac/') && u.pathname.endsWith('/search')) ||
      (u.hostname === 'earth-search.aws.element84.com' && u.pathname.endsWith('/search'))
    ) {
      req.respond({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
        contentType: 'application/geo+json',
        body: JSON.stringify({ type: 'FeatureCollection', features: [scene], links: [] }),
      });
    } else if (u.pathname.startsWith('/api/')) {
      req.respond({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, reason: { code: 'REVIEW_FIXTURE_UNAVAILABLE', message: 'Review fixture backend unavailable' } }),
      });
    } else {
      req.continue();
    }
  });

  await p.goto('http://127.0.0.1:5177/app/maps', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await p.waitForSelector('button[title*="Pengaturan Lapisan Peta"]', { timeout: 30000 });
  await p.click('button[title*="Pengaturan Lapisan Peta"]');
  await p.waitForSelector('[aria-label="Pengaturan Harmony Maps"]');
  return { p, errors, assetRequests };
}

async function clickText(p, text) {
  return p.evaluate(text => {
    const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes(text));
    if (!b) throw new Error(`Button absent: ${text}`);
    b.click();
  }, text);
}

async function envelope(p) {
  return p.$eval('button[title="Ekspor Metadata Lengkap Envelope LST (JSON)"]', async el => {
    let blob;
    const original = URL.createObjectURL;
    URL.createObjectURL = b => {
      blob = b;
      return original(b);
    };
    el.click();
    URL.createObjectURL = original;
    return JSON.parse(await blob.text());
  });
}

async function weatherState(p) {
  return p.evaluate(() => ({
    iframeCount: document.querySelectorAll('iframe[src*="windy"]').length,
    activeText: document.body.innerText.match(/Aktif:[^\n]*/)?.[0] ?? null,
    text: document.body.innerText.slice(-10000),
  }));
}

try {
  const s = await start();
  await clickText(s.p, 'Alat & Analisis');
  await s.p.waitForSelector('[aria-label="Alat dan analisis peta"] summary');
  await s.p.$eval('[aria-label="Alat dan analisis peta"] summary', el => el.click());
  await s.p.waitForSelector('[data-studio-domain="remote_sensing"]');
  await s.p.$eval('[data-studio-domain="remote_sensing"]', el => el.click());
  await s.p.waitForFunction(() => document.body.innerText.includes('Jalankan Analisis LST pada AOI'));

  // 1. Empty Scene Check
  await clickText(s.p, 'Jalankan Analisis LST pada AOI');
  await s.p.waitForFunction(() => document.body.innerText.includes('Pilih scene Landsat terlebih dahulu'));
  let e = await envelope(s.p);
  report.checks.push({
    id: 'empty_scene_correctly_unavailable',
    status: e.dataStatus,
    reason: e.reason?.code,
    resolved: e.dataStatus === 'UNAVAILABLE' && e.reason?.code === 'NO_SCENE_SELECTED',
  });

  // 2. Optical Demo Check
  await clickText(s.p, 'Demo Sentinel-2 L2A');
  await clickText(s.p, 'Jalankan Analisis LST pada AOI');
  e = await envelope(s.p);
  report.checks.push({
    id: 'optical_demo_generates_operational_LST',
    status: e.dataStatus,
    meanCelsius: e.data?.meanCelsius,
    sceneId: e.data?.sceneId,
    provider: e.provenance?.provider,
    reasonCode: e.reason?.code,
    resolved: e.dataStatus === 'UNAVAILABLE' && e.data?.meanCelsius === null && e.reason?.code === 'NO_THERMAL_SCENE',
  });

  // 3. Selected Landsat with Unavailable Assets
  await clickText(s.p, 'Landsat-9/8 LST');
  await new Promise(r => setTimeout(r, 100));
  await clickText(s.p, 'Cari Scene STAC');
  await s.p.waitForSelector('[title="LC09_L2SP_REVIEW_FIXTURE"]', { timeout: 15000 });
  await s.p.$eval('[title="LC09_L2SP_REVIEW_FIXTURE"]', el => el.parentElement.click());
  await clickText(s.p, 'Jalankan Analisis LST pada AOI');
  e = await envelope(s.p);

  report.checks.push({
    id: 'selected_Landsat_unavailable_assets_still_DERIVED',
    status: e.dataStatus,
    meanCelsius: e.data?.meanCelsius,
    pixelCount: e.data?.totalPixelCount,
    sceneId: e.data?.sceneId,
    provider: e.provenance?.provider,
    assetRequests: [...s.assetRequests],
    resolved: e.dataStatus === 'UNAVAILABLE' && e.data?.meanCelsius === null && s.assetRequests.length > 0,
  });

  // 4. Mobile Viewport Width
  await s.p.setViewport({ width: 390, height: 844 });
  const dims = await s.p.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
  report.checks.push({
    id: 'mobile_width',
    ...dims,
    resolved: dims.documentWidth <= dims.viewport,
  });
  await s.p.close();

  // 5. Weather Capabilities & Drawer Auto-Switch
  const w = await start();
  await clickText(w.p, 'Cuaca');
  await clickText(w.p, 'Radar Native');
  await clickText(w.p, 'Angin');
  await new Promise(r => setTimeout(r, 500));
  const w1 = await weatherState(w.p);
  report.checks.push({
    id: 'primary_parameter_auto_switch_works',
    iframeCount: w1.iframeCount,
    activeText: w1.activeText,
    resolved: w1.iframeCount >= 1,
  });

  // 6. Drawer Parameter Click Switches to Windy
  await clickText(w.p, 'Radar Native');
  await w.p.$eval('[data-windy-parameter="temp"]', el => el.click());
  await new Promise(r => setTimeout(r, 600));
  const w2 = await weatherState(w.p);
  report.checks.push({
    id: 'drawer_parameter_bypasses_auto_switch',
    iframeCount: w2.iframeCount,
    activeText: w2.activeText,
    resolved: w2.iframeCount >= 1,
  });
  await w.p.close();

} catch (e) {
  report.error = { name: e.name, message: e.message.slice(0, 700) };
  if (lastPage) {
    report.failureText = await lastPage.evaluate(() => document.body.innerText.slice(-12000)).catch(() => null);
  }
} finally {
  await browser.close();
  await writeFile(`${out}/browser-stage4-remediation.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
