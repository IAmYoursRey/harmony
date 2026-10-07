import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MAPS_URL = 'http://localhost:5173/app/maps';

async function diagnose() {
  console.log('=== DIAGNOSTIK ERROR THREE.JS DI GLOBEVIEW3D ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  const logs = [];

  page.on('console', (msg) => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (err) => {
    logs.push({
      type: 'pageerror',
      text: err.stack || err.message,
    });
  });

  page.on('requestfailed', (req) => {
    logs.push({
      type: 'requestfailed',
      url: req.url(),
      errorText: req.failure()?.errorText,
    });
  });

  try {
    await page.setViewport({ width: 1605, height: 957 });
    console.log(`Navigasi ke ${MAPS_URL}...`);
    await page.goto(MAPS_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Force 3D mode in localStorage and reload or trigger toggle
    console.log('Mengaktifkan mode 3D Globe...');
    const switched = await page.evaluate(() => {
      // Find button specifically containing Globe 3D
      const buttons = Array.from(document.querySelectorAll('button'));
      const btnGlobe = buttons.find(b => b.textContent?.includes('Globe 3D'));
      if (btnGlobe) {
        btnGlobe.click();
        return { method: 'btnGlobe', text: btnGlobe.textContent };
      }
      
      // Look for any 3D button
      const btn3D = buttons.find(b => 
        b.textContent?.includes('3D') || 
        b.title?.includes('3D') || 
        b.getAttribute('aria-label')?.includes('3D')
      );
      if (btn3D) {
        btn3D.click();
        // Also look for Globe in drawer if opened
        setTimeout(() => {
          const subBtns = Array.from(document.querySelectorAll('button'));
          const subGlobe = subBtns.find(b => b.textContent?.includes('Globe 3D'));
          if (subGlobe) subGlobe.click();
        }, 500);
        return { method: 'btn3D', text: btn3D.textContent };
      }

      // Fallback: set in all localstorage keys and reload
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('hm_is3d_')) localStorage.setItem(k, 'true');
        if (k.startsWith('hm_globetype_')) localStorage.setItem(k, 'globe');
      });
      localStorage.setItem('hm_is3d_guest', 'true');
      localStorage.setItem('hm_globetype_guest', 'globe');
      return { method: 'localStorage' };
    });
    console.log('Hasil switch 3D:', switched);

    if (switched.method === 'localStorage') {
      await page.reload({ waitUntil: 'networkidle2' });
    }

    // Wait for drawer to open if needed and click Globe 3D
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btnGlobe = buttons.find(b => b.textContent?.includes('Globe 3D'));
      if (btnGlobe) btnGlobe.click();
    });

    console.log('Menunggu render 3D Three.js selama 6 detik...');
    await new Promise(r => setTimeout(r, 6000));

    // Inspect Three.js canvas in DOM
    const canvasDetails = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-engine*="three.js"]');
      if (!canvas) {
        return { foundThreeCanvas: false };
      }
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const glError = gl ? gl.getError() : 'no-gl-context';
      return {
        foundThreeCanvas: true,
        width: canvas.width,
        height: canvas.height,
        style: canvas.getAttribute('style'),
        dataEngine: canvas.getAttribute('data-engine'),
        glError: glError === 0 ? 'NO_ERROR (0)' : glError,
      };
    });

    console.log('Detail Canvas Three.js:', canvasDetails);

    // Interactive Test 1: Drag globe
    console.log('Menguji interaksi: Drag globe (pointerdown/move/up)...');
    await page.mouse.move(800, 480);
    await page.mouse.down();
    await page.mouse.move(600, 480, { steps: 10 });
    await page.mouse.move(600, 300, { steps: 10 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 1000));

    // Interactive Test 2: Wheel zoom
    console.log('Menguji interaksi: Zoom in & Zoom out...');
    await page.mouse.wheel({ deltaY: -400 });
    await new Promise(r => setTimeout(r, 1000));
    await page.mouse.wheel({ deltaY: 300 });
    await new Promise(r => setTimeout(r, 1000));

    // Interactive Test 3: Click markers / canvas raycast
    console.log('Menguji interaksi: Raycasting klik canvas...');
    await page.mouse.click(800, 480);
    await page.mouse.click(820, 500);
    await page.mouse.click(750, 450);
    await new Promise(r => setTimeout(r, 1000));

    // Interactive Test 4: Test Bottom Dock Buttons (Orbit, Nusantara, Putar, Zoom, Lapisan)
    console.log('Menguji tombol-tombol dock bawah...');
    const dockTestResult = await page.evaluate(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const orbitBtn = buttons.find(b => b.title?.includes('Orbit') || b.textContent?.includes('Orbit'));
      const nusantaraBtn = buttons.find(b => b.title?.includes('Indonesia') || b.textContent?.includes('Nusantara'));
      const rotateCcwBtn = buttons.find(b => b.title?.includes('Putar Kiri'));
      const rotateCwBtn = buttons.find(b => b.title?.includes('Putar Kanan'));
      const zoomInBtn = buttons.find(b => b.title?.includes('Perbesar'));
      const zoomOutBtn = buttons.find(b => b.title?.includes('Perkecil'));
      const layerBtn = buttons.find(b => b.title?.includes('Lapisan') || b.textContent?.includes('Lapisan'));

      const results = {
        hasOrbit: !!orbitBtn,
        hasNusantara: !!nusantaraBtn,
        hasRotateCcw: !!rotateCcwBtn,
        hasRotateCw: !!rotateCwBtn,
        hasZoomIn: !!zoomInBtn,
        hasZoomOut: !!zoomOutBtn,
        hasLayerBtn: !!layerBtn,
      };

      // Test Orbit click
      if (orbitBtn) {
        orbitBtn.click();
        results.orbitClicked = true;
      }
      // Test Nusantara click
      if (nusantaraBtn) {
        nusantaraBtn.click();
        results.nusantaraClicked = true;
      }
      // Test Rotate
      if (rotateCwBtn) {
        rotateCwBtn.click();
        results.rotateCwClicked = true;
      }
      // Test Layer
      if (layerBtn) {
        layerBtn.click();
        results.layerClicked = true;
      }

      return results;
    });
    console.log('Hasil pengujian tombol dock bawah:', dockTestResult);
    await new Promise(r => setTimeout(r, 1500));

    // Collision Check: Bounding box verification for all 4 user concerns
    const layoutPositions = await page.evaluate(() => {
      const searchInput = document.querySelector('input[placeholder*="sekolah"]');
      const searchBox = searchInput?.closest('div.absolute') || searchInput?.parentElement;
      const topHudBadge = document.querySelector('span.text-xs.font-black.tracking-wider'); // HARMONY 3D // NORMAL
      const topHudBox = topHudBadge?.closest('div.pointer-events-auto');
      
      const opticsTitle = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('Optik Sensor 3D'));
      const opticsCard = opticsTitle?.closest('div.absolute');
      
      const dbFab = document.querySelector('button[title*="Transparansi Lengkap"]') || document.querySelector('button[aria-label*="Sumber Data Resmi"]');
      
      const gpsWidget = Array.from(document.querySelectorAll('div')).find(d => d.textContent?.includes('GPS') && d.textContent?.includes('Presisi'));

      const searchRect = searchBox ? searchBox.getBoundingClientRect() : null;
      const topHudRect = topHudBox ? topHudBox.getBoundingClientRect() : null;
      const opticsRect = opticsCard ? opticsCard.getBoundingClientRect() : null;
      const dbRect = dbFab ? dbFab.getBoundingClientRect() : null;
      const gpsRect = gpsWidget ? gpsWidget.getBoundingClientRect() : null;

      // Overlap calculation: Top HUD vs Search Bar
      const topHudOverlapsSearch = searchRect && topHudRect && !(
        topHudRect.right < searchRect.left ||
        topHudRect.left > searchRect.right ||
        topHudRect.bottom < searchRect.top ||
        topHudRect.top > searchRect.bottom
      );

      // Overlap calculation: Optics Card vs DB FAB
      const opticsOverlapsDb = opticsRect && dbRect && !(
        opticsRect.right < dbRect.left ||
        opticsRect.left > dbRect.right ||
        opticsRect.bottom < dbRect.top ||
        opticsRect.top > dbRect.bottom
      );

      return {
        searchRect: searchRect ? { top: searchRect.top, bottom: searchRect.bottom, left: searchRect.left, right: searchRect.right } : null,
        topHudRect: topHudRect ? { top: topHudRect.top, bottom: topHudRect.bottom, left: topHudRect.left, right: topHudRect.right } : null,
        opticsRect: opticsRect ? { top: opticsRect.top, bottom: opticsRect.bottom, left: opticsRect.left, right: opticsRect.right } : null,
        dbRect: dbRect ? { top: dbRect.top, bottom: dbRect.bottom, left: dbRect.left, right: dbRect.right } : null,
        gpsRect: gpsRect ? { top: gpsRect.top, bottom: gpsRect.bottom, left: gpsRect.left, right: gpsRect.right } : null,
        topHudOverlapsSearch,
        opticsOverlapsDb,
      };
    });
    console.log('Hasil Verifikasi Layout & Tumpang Tindih (Collision Check):', layoutPositions);

    // Save screenshot
    const screenshotPath = 'C:\\Users\\raiha\\.gemini\\antigravity-ide\\brain\\ebb91780-c654-47ed-ac72-c185a713e74f\\smoke_globe3d_canvas.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot 3D Globe disimpan ke: ${screenshotPath}`);

    console.log('\n--- DAFTAR LOG/ERROR YANG TERCATAT ---');
    const errorsAndFails = logs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'requestfailed');
    console.log(`Total log: ${logs.length} (Error/Gagal: ${errorsAndFails.length})`);
    
    errorsAndFails.forEach((item, index) => {
      console.log(`[${index + 1}] [${item.type.toUpperCase()}] ${item.text || item.url} ${item.errorText || ''}`);
    });

    if (errorsAndFails.length === 0) {
      console.log('Semua log biasa:');
      logs.slice(0, 10).forEach(l => console.log(`[${l.type}] ${l.text}`));
    }

  } finally {
    await browser.close();
  }
}

diagnose().catch(err => {
  console.error('Diagnostic run failed:', err);
  process.exit(1);
});
