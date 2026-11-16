import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../apps/web/public/celestial');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const BASE_URL = 'https://raw.githubusercontent.com/Moez-lab/theejs-project-solarsystem/main/solar-system/textures';

const TEXTURES_TO_DOWNLOAD = [
  { source: '2k_sun.jpg', target: 'sun.jpg' },
  { source: '2k_mercury.jpg', target: 'mercury.jpg' },
  { source: '2k_venus_surface.jpg', target: 'venus.jpg' },
  { source: '2k_venus_atmosphere.jpg', target: 'venus_atmosphere.jpg' },
  { source: '2k_moon.jpg', target: 'moon.jpg' },
  { source: '2k_mars.jpg', target: 'mars.jpg' },
  { source: '2k_jupiter.jpg', target: 'jupiter.jpg' },
  { source: '2k_saturn.jpg', target: 'saturn.jpg' },
  { source: '2k_saturn_ring_alpha.png', target: 'saturn_ring.png' },
  { source: '2k_uranus.jpg', target: 'uranus.jpg' },
  { source: '2k_neptune.jpg', target: 'neptune.jpg' },
];

async function downloadFile(source, target) {
  const url = `${BASE_URL}/${source}`;
  const outPath = path.join(targetDir, target);

  console.log(`Downloading ${source} -> ${target}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Saved ${target} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

async function run() {
  console.log(`Downloading real NASA/spacecraft planet textures to: ${targetDir}`);
  for (const item of TEXTURES_TO_DOWNLOAD) {
    try {
      await downloadFile(item.source, item.target);
    } catch (err) {
      console.error(`✗ Error downloading ${item.source}:`, err.message);
    }
  }
  console.log('Finished downloading planetary textures.');
}

run();
