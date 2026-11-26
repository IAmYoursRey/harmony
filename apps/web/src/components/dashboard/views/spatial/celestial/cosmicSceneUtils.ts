import * as THREE from 'three';
import { PLANETARY_CATALOG, CelestialBodyData } from '@/data/planetaryCatalog';

// Texture Cache
const textureCache: Record<string, THREE.Texture> = {};
const canvasCache: Record<string, HTMLCanvasElement> = {};
const dataUrlCache: Record<string, string> = {};
const realTextureLoadedState: Record<string, boolean> = {};
let milkyWayDomeTexCache: THREE.CanvasTexture | null = null;
let earthCloudsTexCache: THREE.CanvasTexture | null = null;
let solarFlareTexCache: THREE.CanvasTexture | null = null;
let cesiumSkyBoxCache: {
  positiveX: string;
  negativeX: string;
  positiveY: string;
  negativeY: string;
  positiveZ: string;
  negativeZ: string;
} | null = null;

/**
 * Authentic NASA & ESA spacecraft photographic cylindrical maps (2048x1024)
 * Ground-truth mission data from MESSENGER, Magellan, LRO, Viking, Cassini, SDO & Voyager.
 */
export const REAL_PLANET_TEXTURE_URLS: Record<string, string> = {
  sun: '/celestial/sun.jpg',
  mercury: '/celestial/mercury.jpg',
  venus: '/celestial/venus.jpg',
  earth: '/earth-blue-marble.jpg',
  moon: '/celestial/moon.jpg',
  mars: '/celestial/mars.jpg',
  jupiter: '/celestial/jupiter.jpg',
  saturn: '/celestial/saturn.jpg',
  uranus: '/celestial/uranus.jpg',
  neptune: '/celestial/neptune.jpg',
};

export const REAL_SATURN_RING_URL = '/celestial/saturn_ring.png';

export function getRealPlanetTextureUrl(bodyId: string): string | undefined {
  return REAL_PLANET_TEXTURE_URLS[bodyId];
}

/**
 * Ultra-HD (2048x1024) Equirectangular Texture Generator for Celestial Bodies
 * Produces crisp, photorealistic planetary textures with craters, canyons,
 * maria, cloud bands, and storm vortices without external network asset dependencies.
 */
export function generateHDCelestialCanvas(bodyId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  switch (bodyId) {
    case 'sun': {
      // 1. Incandescent Solar Photosphere Base (Convective Plasma 5,500°C)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#ea580c');
      grad.addColorStop(0.15, '#f59e0b');
      grad.addColorStop(0.35, '#fbbf24');
      grad.addColorStop(0.50, '#fef08a');
      grad.addColorStop(0.65, '#fbbf24');
      grad.addColorStop(0.85, '#f59e0b');
      grad.addColorStop(1.0, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // 2. High-Density Convection Granulation Cells (~1,200 convective plasma granules)
      for (let i = 0; i < 1400; i++) {
        const gx = Math.random() * 2048;
        const gy = Math.random() * 1024;
        const gr = 3.5 + Math.random() * 18;
        const hotCenter = Math.random() > 0.35;

        ctx.fillStyle = hotCenter ? 'rgba(255, 255, 255, 0.42)' : 'rgba(245, 158, 11, 0.35)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, gr * 1.3, gr * 0.85, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();

        // Darker intergranular lane boundaries
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.22)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // 3. Active Magnetic Sunspot Regions (Umbra, Penumbra & Faculae)
      const activeRegions = [
        { cx: 580, cy: 440, rx: 45, ry: 28, tilt: 0.1 },
        { cx: 650, cy: 460, rx: 32, ry: 20, tilt: -0.05 },
        { cx: 1280, cy: 380, rx: 55, ry: 35, tilt: -0.12 },
        { cx: 1360, cy: 410, rx: 38, ry: 24, tilt: 0.08 },
        { cx: 940, cy: 620, rx: 42, ry: 26, tilt: 0.15 },
        { cx: 1650, cy: 590, rx: 48, ry: 30, tilt: -0.1 },
      ];

      activeRegions.forEach((spot) => {
        // Bright Photospheric Faculae (Magnetic ribbons surrounding sunspots)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        for (let f = 0; f < 12; f++) {
          const fx = spot.cx + (Math.random() - 0.5) * spot.rx * 3.2;
          const fy = spot.cy + (Math.random() - 0.5) * spot.ry * 3.0;
          ctx.beginPath();
          ctx.arc(fx, fy, 4 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Sunspot Penumbra (Turbulent filamentary brown boundary)
        const penumbraGrad = ctx.createRadialGradient(spot.cx, spot.cy, 4, spot.cx, spot.cy, spot.rx);
        penumbraGrad.addColorStop(0.0, 'rgba(41, 37, 36, 0.95)');
        penumbraGrad.addColorStop(0.55, 'rgba(120, 53, 15, 0.85)');
        penumbraGrad.addColorStop(1.0, 'rgba(217, 119, 6, 0.0)');
        ctx.fillStyle = penumbraGrad;
        ctx.beginPath();
        ctx.ellipse(spot.cx, spot.cy, spot.rx, spot.ry, spot.tilt, 0, Math.PI * 2);
        ctx.fill();

        // Sunspot Umbra (Deep, cool magnetic vortex core)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(spot.cx, spot.cy, spot.rx * 0.42, spot.ry * 0.42, spot.tilt, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Photospheric Limb Darkening (Optical depth atmospheric attenuation at edges)
      const limbGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      limbGrad.addColorStop(0.0, 'rgba(154, 52, 18, 0.65)');
      limbGrad.addColorStop(0.08, 'rgba(234, 88, 12, 0.25)');
      limbGrad.addColorStop(0.20, 'rgba(251, 191, 36, 0.0)');
      limbGrad.addColorStop(0.80, 'rgba(251, 191, 36, 0.0)');
      limbGrad.addColorStop(0.92, 'rgba(234, 88, 12, 0.25)');
      limbGrad.addColorStop(1.0, 'rgba(154, 52, 18, 0.65)');
      ctx.fillStyle = limbGrad;
      ctx.fillRect(0, 0, 2048, 1024);
      break;
    }

    case 'moon': {
      // 1. Lunar Anorthosite Highland Base (NASA LRO Ground Truth)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 2048, 1024);

      // Multi-scale procedural crustal noise & albedo variation
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const r = 3 + Math.random() * 32;
        ctx.fillStyle = Math.random() > 0.45 ? 'rgba(241, 245, 249, 0.28)' : 'rgba(51, 65, 85, 0.32)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Major Basaltic Lunar Maria (Dark Volcanic Lava Plains)
      const maria = [
        { name: 'Oceanus Procellarum', x: 580, y: 480, rx: 340, ry: 260, rot: -0.15 },
        { name: 'Mare Imbrium', x: 740, y: 340, rx: 220, ry: 170, rot: 0.1 },
        { name: 'Mare Serenitatis', x: 970, y: 370, rx: 160, ry: 140, rot: 0.0 },
        { name: 'Mare Tranquillitatis', x: 1080, y: 480, rx: 170, ry: 130, rot: -0.2 },
        { name: 'Mare Crisium', x: 1320, y: 410, rx: 110, ry: 90, rot: 0.1 },
        { name: 'Mare Fecunditatis', x: 1260, y: 570, rx: 130, ry: 110, rot: 0.2 },
        { name: 'Mare Nectaris', x: 1130, y: 630, rx: 100, ry: 80, rot: -0.1 },
        { name: 'Mare Nubium', x: 740, y: 640, rx: 150, ry: 120, rot: 0.15 },
        { name: 'Mare Humorum', x: 560, y: 670, rx: 100, ry: 80, rot: -0.1 },
        { name: 'Mare Frigoris', x: 840, y: 220, rx: 420, ry: 45, rot: 0.05 },
      ];

      maria.forEach((m) => {
        // Multi-layered smooth basalt wash with titanium-rich basalt shades
        for (let pass = 0; pass < 3; pass++) {
          const scale = 1.0 - pass * 0.18;
          ctx.fillStyle = pass === 0 ? 'rgba(30, 41, 59, 0.75)' : pass === 1 ? 'rgba(47, 56, 69, 0.80)' : 'rgba(15, 23, 42, 0.88)';
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, m.rx * scale, m.ry * scale, m.rot, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 3. Tycho & Copernicus Bright Ray Systems (radiating ejecta blankets across lunar surface)
      const rayCenters = [
        { x: 820, y: 760, rays: 48, maxLen: 650, alpha: 0.35 }, // Tycho
        { x: 720, y: 440, rays: 28, maxLen: 320, alpha: 0.28 }, // Copernicus
        { x: 620, y: 460, rays: 20, maxLen: 220, alpha: 0.22 }, // Kepler
      ];

      rayCenters.forEach(rc => {
        for (let r = 0; r < rc.rays; r++) {
          const angle = (r / rc.rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
          const rayLen = rc.maxLen * 0.5 + Math.random() * (rc.maxLen * 0.5);
          ctx.strokeStyle = `rgba(248, 250, 252, ${rc.alpha})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rc.x, rc.y);
          ctx.lineTo(rc.x + Math.cos(angle) * rayLen, rc.y + Math.sin(angle) * rayLen);
          ctx.stroke();
        }
      });

      // 4. Over 600 Impact Craters with 3D Sunlit Rims & Cast Shadows
      for (let i = 0; i < 620; i++) {
        const cx = Math.random() * 2048;
        const cy = 30 + Math.random() * 964;
        const cr = 2.5 + Math.random() * 18;

        // Shadow bowl (cast eastwards)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.arc(cx + cr * 0.22, cy + cr * 0.18, cr * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Bright sunlit rim (north-west edge)
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.82)';
        ctx.lineWidth = Math.max(1.0, cr * 0.18);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, Math.PI * 0.75, Math.PI * 1.85);
        ctx.stroke();

        // Central peak for large impact basins
        if (cr > 8) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.arc(cx, cy, cr * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'mars': {
      // 1. Rust-Orange Iron Oxide Regolith Base (NASA HiRISE & Viking True Color)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#ffffff'); // Planum Boreum North Pole
      grad.addColorStop(0.06, '#ffffff');
      grad.addColorStop(0.12, '#c2410c');
      grad.addColorStop(0.35, '#ea580c');
      grad.addColorStop(0.55, '#c2410c');
      grad.addColorStop(0.82, '#9a3412');
      grad.addColorStop(0.92, '#c2410c');
      grad.addColorStop(0.96, '#ffffff'); // Planum Australe South Pole
      grad.addColorStop(1.0, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // Fine dust ripples & ferric oxide sand drifts
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * 2048;
        const y = 80 + Math.random() * 860;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 215, 170, 0.22)' : 'rgba(124, 45, 18, 0.26)';
        ctx.beginPath();
        ctx.arc(x, y, 4 + Math.random() * 32, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Dark Basalt Albedo Plateaus (Syrtis Major, Acidalia Planitia, Sinus Sabaeus)
      const darkRegions = [
        { name: 'Syrtis Major', x: 1380, y: 520, rx: 220, ry: 180, rot: -0.3 },
        { name: 'Sinus Sabaeus', x: 1020, y: 540, rx: 280, ry: 75, rot: 0.05 },
        { name: 'Acidalia Planitia', x: 920, y: 320, rx: 220, ry: 130, rot: -0.1 },
        { name: 'Mare Tyrrhenum', x: 1650, y: 620, rx: 320, ry: 85, rot: 0.15 },
        { name: 'Mare Cimmerium', x: 280, y: 640, rx: 260, ry: 80, rot: -0.1 },
        { name: 'Hellas Planitia (Dust Basin)', x: 1480, y: 720, rx: 190, ry: 110, rot: 0.0 },
      ];

      darkRegions.forEach((r, idx) => {
        ctx.fillStyle = idx === 5 ? 'rgba(254, 215, 170, 0.52)' : 'rgba(67, 20, 7, 0.68)';
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Valles Marineris (4,000 km Grand Rift Canyon System)
      ctx.strokeStyle = 'rgba(43, 14, 5, 0.92)';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(620, 560);
      ctx.bezierCurveTo(740, 545, 860, 580, 980, 565);
      ctx.stroke();

      // Canyon tributary gorges (Noctis Labyrinthus & Candor Chasma)
      ctx.strokeStyle = 'rgba(28, 9, 3, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(580, 550);
      ctx.lineTo(620, 560);
      ctx.moveTo(600, 535);
      ctx.lineTo(630, 565);
      ctx.moveTo(760, 548);
      ctx.lineTo(790, 520);
      ctx.moveTo(880, 575);
      ctx.lineTo(910, 605);
      ctx.stroke();

      // Sunlit canyon rim cliffs
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(620, 552);
      ctx.bezierCurveTo(740, 538, 860, 573, 980, 558);
      ctx.stroke();

      // 4. Olympus Mons (22 km Colossal Shield Volcano)
      // Basal escarpment cliff ring
      ctx.strokeStyle = 'rgba(67, 20, 7, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(380, 460, 54, 0, Math.PI * 2);
      ctx.stroke();
      // Volcanic flank
      ctx.fillStyle = 'rgba(154, 52, 18, 0.88)';
      ctx.beginPath();
      ctx.arc(380, 460, 50, 0, Math.PI * 2);
      ctx.fill();
      // Summit caldera complex
      ctx.fillStyle = 'rgba(38, 12, 4, 0.95)';
      ctx.beginPath();
      ctx.arc(380, 460, 16, 0, Math.PI * 2);
      ctx.fill();

      // Tharsis Montes (Ascraeus, Pavonis, Arsia Mons)
      [ {x: 520, y: 410}, {x: 490, y: 500}, {x: 460, y: 590} ].forEach(v => {
        ctx.fillStyle = 'rgba(124, 45, 18, 0.85)';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(23, 7, 2, 0.95)';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Gale Crater & Jezero Crater (Rover Exploration Sites)
      [ { x: 920, y: 680, r: 12 }, { x: 1240, y: 440, r: 10 } ].forEach(c => {
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(43, 14, 5, 0.6)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Spiral Polar Ice Caps (Planum Boreum & Planum Australe with Chasmata)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(1024, 45, 340, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Spiral chasma trough cuts
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.7)';
      ctx.lineWidth = 3;
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.arc(1024, 45, 20 + s * 18, s * 0.8, s * 0.8 + 1.2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(1024, 985, 280, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'jupiter': {
      // 1. Stratified Jovian Cloud Belts (NASA Juno & Cassini Ground Truth)
      const bands = [
        '#475569', '#334155', '#64748b', '#7c2d12', '#9a3412',
        '#fed7aa', '#c2410c', '#fff7ed', '#f59e0b', '#7c2d12',
        '#fed7aa', '#c2410c', '#fff7ed', '#b45309', '#fed7aa',
        '#9a3412', '#7c2d12', '#475569', '#334155'
      ];
      const bh = 1024 / bands.length;
      for (let i = 0; i < bands.length; i++) {
        ctx.fillStyle = bands[i];
        ctx.fillRect(0, i * bh, 2048, bh + 1);
      }

      // 2. Wave-Turbulent Shear Margins (Kelvin-Helmholtz waves along wind belts)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      for (let y = 100; y < 940; y += 32) {
        ctx.beginPath();
        for (let x = 0; x <= 2048; x += 14) {
          const dy = Math.sin(x * 0.035 + y * 0.12) * 8.5;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.lineTo(2048, y + 14);
        ctx.lineTo(0, y + 14);
        ctx.closePath();
        ctx.fill();
      }

      // 3. Brown Barges in North Tropical Zone
      ctx.fillStyle = 'rgba(67, 20, 7, 0.75)';
      for (let b = 0; b < 6; b++) {
        ctx.beginPath();
        ctx.ellipse(250 + b * 320, 360, 65, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. The Great Red Spot (Authentic multi-layered anticyclonic vortex)
      const grsX = 1260;
      const grsY = 640;
      // Outer collar
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(grsX, grsY, 150, 85, 0.03, 0, Math.PI * 2);
      ctx.fill();
      // Middle ring
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(grsX, grsY, 110, 60, 0.03, 0, Math.PI * 2);
      ctx.fill();
      // Deep crimson eye
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(grsX, grsY, 68, 36, 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Trailing wake turbulence eddies
      ctx.fillStyle = 'rgba(254, 202, 202, 0.5)';
      for (let ed = 1; ed <= 6; ed++) {
        ctx.beginPath();
        ctx.ellipse(grsX + ed * 85, grsY + Math.sin(ed * 1.2) * 22, 38, 19, -0.12, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. White Oval storms ("String of Pearls")
      ctx.fillStyle = '#ffffff';
      for (let p = 0; p < 8; p++) {
        ctx.beginPath();
        ctx.ellipse(220 + p * 230, 730, 26, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'saturn': {
      // 1. Butterscotch & Golden-Caramel Atmospheric Latitude Striations (Cassini True Color)
      const bands = [
        '#78716c', '#a16207', '#ca8a04', '#d97706', '#eab308',
        '#fde047', '#fef08a', '#fef9c3', '#fde047', '#eab308',
        '#ca8a04', '#a16207', '#ca8a04', '#eab308', '#fef08a',
        '#fde047', '#a16207', '#78716c', '#57534e'
      ];
      const bh = 1024 / bands.length;
      for (let i = 0; i < bands.length; i++) {
        ctx.fillStyle = bands[i];
        ctx.fillRect(0, i * bh, 2048, bh + 1);
      }

      // Subtle atmospheric fine striations
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let y = 120; y < 900; y += 24) {
        ctx.fillRect(0, y, 2048, 8);
      }

      // 2. North Polar Hexagonal Jet-Stream Storm Vortex (30,000 km wide)
      ctx.strokeStyle = 'rgba(113, 63, 18, 0.85)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      const hexR = 95;
      for (let h = 0; h < 6; h++) {
        const a = (h / 6) * Math.PI * 2;
        const px = 1024 + Math.cos(a) * hexR;
        const py = 75 + Math.sin(a) * (hexR * 0.45);
        if (h === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Central hexagonal eye hurricane
      ctx.fillStyle = 'rgba(69, 26, 3, 0.9)';
      ctx.beginPath();
      ctx.ellipse(1024, 75, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Great White Spot Storm Plume
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(1350, 480, 180, 24, 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'venus': {
      // 1. Warm Pale-Cream & Sulfuric Cloud Deck (Pioneer Venus & Magellan)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#ca8a04');
      grad.addColorStop(0.15, '#eab308');
      grad.addColorStop(0.35, '#fde68a');
      grad.addColorStop(0.50, '#fef9c3');
      grad.addColorStop(0.65, '#fde68a');
      grad.addColorStop(0.85, '#eab308');
      grad.addColorStop(1.0, '#ca8a04');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // 2. Radar-Penetrating Topography (Aphrodite Terra, Ishtar Terra & Maxwell Montes)
      const continents = [
        { name: 'Aphrodite Terra', x: 1200, y: 540, rx: 320, ry: 140, rot: -0.05 },
        { name: 'Ishtar Terra', x: 800, y: 260, rx: 240, ry: 110, rot: 0.08 },
        { name: 'Lada Terra', x: 1024, y: 820, rx: 260, ry: 90, rot: 0.0 },
      ];
      continents.forEach(c => {
        ctx.fillStyle = 'rgba(180, 83, 9, 0.28)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, c.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // Maxwell Montes (Highest mountain, radar-bright reflective snow)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(820, 250, 45, 22, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Maat Mons volcano & lava channels
      ctx.fillStyle = 'rgba(154, 52, 18, 0.45)';
      ctx.beginPath();
      ctx.arc(1280, 520, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.lineWidth = 2;
      for (let l = 0; l < 8; l++) {
        const la = (l / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(1280, 520);
        ctx.lineTo(1280 + Math.cos(la) * 65, 520 + Math.sin(la) * 55);
        ctx.stroke();
      }

      // 3. Sweeping Y-shaped super-rotating chevron wave currents (360 km/h wind shear)
      ctx.fillStyle = 'rgba(202, 138, 4, 0.32)';
      for (let y = 80; y < 940; y += 40) {
        ctx.beginPath();
        ctx.ellipse(1024 + Math.sin(y * 0.02) * 180, y, 820, 24, 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'mercury': {
      // 1. MESSENGER Volcanic Silicate Gray Palette
      ctx.fillStyle = '#525a65';
      ctx.fillRect(0, 0, 2048, 1024);

      // Crustal regolith noise
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const r = 3 + Math.random() * 26;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(203, 213, 225, 0.22)' : 'rgba(30, 41, 59, 0.28)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Caloris Basin (1,550 km multi-ring impact basin)
      const cbX = 640;
      const cbY = 512;
      // Dark volcanic flooded interior
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.beginPath();
      ctx.arc(cbX, cbY, 180, 0, Math.PI * 2);
      ctx.fill();
      // Concentric mountain ring ridges
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cbX, cbY, 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cbX, cbY, 230, 0, Math.PI * 2);
      ctx.stroke();

      // Pantheon Fossae ("Spider" radiating graben trenches)
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.lineWidth = 1.4;
      for (let f = 0; f < 42; f++) {
        const fa = (f / 42) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
        const flen = 90 + Math.random() * 85;
        ctx.beginPath();
        ctx.moveTo(cbX, cbY);
        ctx.lineTo(cbX + Math.cos(fa) * flen, cbY + Math.sin(fa) * flen);
        ctx.stroke();
      }

      // 3. Discovery Rupes & Beagle Rupes (Global contraction lobate scarps)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(1250, 680);
      ctx.bezierCurveTo(1320, 640, 1380, 720, 1450, 690);
      ctx.stroke();

      // 4. Kuiper & Degas Bright Ray Systems
      const brightCraters = [ { x: 1350, y: 460, rays: 36, len: 450 }, { x: 920, y: 380, rays: 24, len: 260 } ];
      brightCraters.forEach(bc => {
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.42)';
        ctx.lineWidth = 1.5;
        for (let r = 0; r < bc.rays; r++) {
          const a = (r / bc.rays) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(bc.x, bc.y);
          ctx.lineTo(bc.x + Math.cos(a) * bc.len, bc.y + Math.sin(a) * bc.len);
          ctx.stroke();
        }
      });

      // 5. 550 Layered Hermian Craters with Cast Shadows & Illuminated Rims
      for (let i = 0; i < 550; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const r = 2 + Math.random() * 16;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.beginPath();
        ctx.arc(x + r * 0.22, y + r * 0.18, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 1.85);
        ctx.stroke();
      }
      break;
    }

    case 'uranus': {
      // 1. Serene Cyan-Aquamarine Methane Atmosphere (Voyager 2 & Keck True Color)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#0891b2');
      grad.addColorStop(0.18, '#06b6d4');
      grad.addColorStop(0.38, '#22d3ee');
      grad.addColorStop(0.50, '#67e8f9');
      grad.addColorStop(0.62, '#22d3ee');
      grad.addColorStop(0.82, '#06b6d4');
      grad.addColorStop(1.0, '#0891b2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // 2. Faint Zonal Wind Bands
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let y = 140; y < 880; y += 45) {
        ctx.fillRect(0, y, 2048, 16);
      }

      // 3. Polar Hood Seasonal Brightening
      ctx.fillStyle = 'rgba(207, 250, 254, 0.35)';
      ctx.beginPath();
      ctx.ellipse(1024, 80, 850, 75, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Convective Methane Ice Crystal Storm Streaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(680, 520, 140, 9, 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1420, 460, 190, 11, -0.03, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'neptune': {
      // 1. Royal Azure-Cobalt Blue Atmosphere (Voyager 2 & Hubble)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#172554');
      grad.addColorStop(0.18, '#1e40af');
      grad.addColorStop(0.38, '#1d4ed8');
      grad.addColorStop(0.50, '#2563eb');
      grad.addColorStop(0.62, '#1d4ed8');
      grad.addColorStop(0.82, '#1e40af');
      grad.addColorStop(1.0, '#172554');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // Faint supersonic wind jet stream banding
      ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
      for (let y = 120; y < 900; y += 38) {
        ctx.fillRect(0, y, 2048, 14);
      }

      // 2. The Great Dark Spot (GDS-89 Anticyclonic Storm)
      const gdsX = 1120;
      const gdsY = 580;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.ellipse(gdsX, gdsY, 115, 62, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(gdsX, gdsY, 115, 62, 0.08, 0, Math.PI * 2);
      ctx.stroke();

      // 3. "Scooter" Companion Cirrus Methane Cloud Cluster
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(gdsX - 10, gdsY - 65, 85, 12, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // High-altitude cirrus cloud streaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(620, 430, 160, 10, -0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1560, 490, 130, 8, 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Small Dark Spot (Dark Spot 2 / Wizard's Eye)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.ellipse(750, 720, 55, 32, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(750, 720, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'earth': {
      // 1. Deep Ocean Base (Pacific, Atlantic, Indian Deeps)
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.0, '#ffffff'); // Arctic Ice Sheet
      grad.addColorStop(0.07, '#0284c7');
      grad.addColorStop(0.18, '#1e40af');
      grad.addColorStop(0.50, '#1e3a8a');
      grad.addColorStop(0.82, '#1e40af');
      grad.addColorStop(0.93, '#0284c7');
      grad.addColorStop(1.0, '#ffffff'); // Antarctic Ice Sheet
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2048, 1024);

      // 2. Continental Landmasses with Topographic Zonation
      const continents = [
        // Africa
        { x: 1080, y: 550, rx: 170, ry: 210, rot: 0.1, color: '#166534', shelf: '#0284c7' },
        // Sahara Desert
        { x: 1070, y: 440, rx: 140, ry: 75, rot: 0.05, color: '#d97706', shelf: '#0284c7' },
        // Eurasia
        { x: 1280, y: 340, rx: 320, ry: 150, rot: -0.1, color: '#15803d', shelf: '#0369a1' },
        // Himalayas snowcapped peaks
        { x: 1320, y: 410, rx: 90, ry: 20, rot: -0.15, color: '#ffffff', shelf: '#15803d' },
        // North America
        { x: 480, y: 350, rx: 230, ry: 140, rot: 0.25, color: '#15803d', shelf: '#0284c7' },
        // South America
        { x: 680, y: 640, rx: 130, ry: 190, rot: 0.15, color: '#166534', shelf: '#0369a1' },
        // Australia
        { x: 1580, y: 680, rx: 120, ry: 90, rot: -0.05, color: '#d97706', shelf: '#0284c7' },
      ];

      // Draw continental shelves (shallow turquoise coastal waters)
      continents.forEach((c) => {
        ctx.fillStyle = c.shelf;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx * 1.14, c.ry * 1.14, c.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw landmasses
      continents.forEach((c) => {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, c.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // Indonesian Archipelago (Nusantara) in High Definition
      const archipelago = [
        { name: 'Sumatra', x: 1365, y: 520, rx: 42, ry: 16, rot: -0.65 },
        { name: 'Java', x: 1410, y: 545, rx: 38, ry: 10, rot: 0.05 },
        { name: 'Kalimantan', x: 1420, y: 505, rx: 32, ry: 26, rot: 0.1 },
        { name: 'Sulawesi', x: 1465, y: 512, rx: 24, ry: 22, rot: 0.35 },
        { name: 'Papua', x: 1520, y: 525, rx: 48, ry: 24, rot: 0.15 },
        { name: 'Bali & Nusa Tenggara', x: 1455, y: 548, rx: 28, ry: 8, rot: 0.0 },
      ];

      archipelago.forEach(isle => {
        // Shallow reef shelf
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(isle.x, isle.y, isle.rx * 1.35, isle.ry * 1.35, isle.rot, 0, Math.PI * 2);
        ctx.fill();
        // Emerald tropical land
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(isle.x, isle.y, isle.rx, isle.ry, isle.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Polar Ice Sheets (Greenland & Antarctica)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(620, 160, 80, 110, -0.2, 0, Math.PI * 2); // Greenland
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1024, 25, 750, 40, 0, 0, Math.PI * 2); // Arctic
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1024, 990, 850, 55, 0, 0, Math.PI * 2); // Antarctica
      ctx.fill();

      // 4. Intertropical Convergence Zone (ITCZ) & Atmospheric Cyclones
      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.beginPath();
      ctx.ellipse(1024, 512, 1024, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyclonic spiral cloud storms
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let c = 0; c < 45; c++) {
        const cx = Math.random() * 2048;
        const cy = 100 + Math.random() * 820;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 110 + Math.random() * 220, 18 + Math.random() * 32, (Math.random() - 0.5) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    default: {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 2048, 1024);
    }
  }

  return canvas;
}

export function getCelestialTexture(bodyId: string): THREE.Texture {
  if (textureCache[bodyId]) return textureCache[bodyId];
  const canvas = getCelestialCanvas(bodyId);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textureCache[bodyId] = texture;
  return texture;
}

/**
 * Generates Saturn's ring texture with fine Cassini, Encke, Maxwell, and Keeler gaps plus ringlet ripples
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (textureCache['saturn_ring']) return textureCache['saturn_ring'] as THREE.CanvasTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(2048, 1);
  const d = imgData.data;

  for (let x = 0; x < 2048; x++) {
    const u = x / 2047;
    let alpha = 0;
    let r = 225;
    let g = 202;
    let b = 158;

    if (u >= 0.015 && u < 0.21) {
      // C Ring (translucent smoky crepe ring)
      const local = (u - 0.015) / 0.195;
      const ringlet = 0.72 + 0.28 * Math.sin(u * 290.0) * Math.cos(u * 115.0);
      alpha = (0.16 + local * 0.24) * ringlet;
      r = 175;
      g = 155;
      b = 128;
    } else if (u >= 0.21 && u < 0.635) {
      // B Ring (bright dense icy ringlets)
      const local = (u - 0.21) / 0.425;
      const fineRipple = 0.8 + 0.12 * Math.sin(u * 520.0) + 0.08 * Math.cos(u * 190.0);
      alpha = (0.74 + Math.sin(local * Math.PI) * 0.22) * fineRipple;
      const tone = 0.88 + 0.12 * Math.sin(u * 340.0);
      r = Math.round(244 * tone);
      g = Math.round(220 * tone);
      b = Math.round(170 * tone);
    } else if (u >= 0.635 && u < 0.715) {
      // Cassini Division (4,800 km dark gap with faint inner ringlets)
      const inGap = Math.abs(u - 0.675) / 0.04;
      alpha = inGap < 0.15 ? 0.09 : 0.025;
      r = 150;
      g = 138;
      b = 120;
    } else if (u >= 0.715 && u < 0.945) {
      // A Ring with Encke Gap (~0.885) & Keeler Gap (~0.935)
      const isEncke = Math.abs(u - 0.885) < 0.008;
      const isKeeler = Math.abs(u - 0.938) < 0.004;
      const fineRipple = 0.82 + 0.18 * Math.sin(u * 420.0);
      alpha = isEncke ? 0.05 : isKeeler ? 0.08 : 0.68 * fineRipple;
      r = 228;
      g = 205;
      b = 166;
    } else if (u >= 0.962 && u <= 0.978) {
      // Narrow bright F Ring strand
      const peak = 1.0 - Math.abs(u - 0.97) / 0.008;
      alpha = 0.58 * peak;
      r = 248;
      g = 232;
      b = 188;
    }

    const idx = x * 4;
    d[idx] = Math.min(255, Math.max(0, r));
    d[idx + 1] = Math.min(255, Math.max(0, g));
    d[idx + 2] = Math.min(255, Math.max(0, b));
    d[idx + 3] = Math.min(255, Math.max(0, Math.round(alpha * 255)));
  }

  for (let row = 0; row < 64; row++) {
    ctx.putImageData(imgData, 0, row);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  textureCache['saturn_ring'] = texture;
  return texture;
}

export function getCelestialCanvas(bodyId: string): HTMLCanvasElement {
  if (canvasCache[bodyId]) return canvasCache[bodyId];
  const canvas = generateHDCelestialCanvas(bodyId);
  canvasCache[bodyId] = canvas;

  // Asynchronously paint authentic NASA spacecraft photographic map if available
  const realUrl = REAL_PLANET_TEXTURE_URLS[bodyId];
  if (realUrl && typeof window !== 'undefined' && typeof Image !== 'undefined' && !realTextureLoadedState[bodyId]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        realTextureLoadedState[bodyId] = true;
        if (textureCache[bodyId]) {
          textureCache[bodyId].needsUpdate = true;
        }
        delete dataUrlCache[bodyId];
        canvas.dispatchEvent(new CustomEvent('celestial_texture_loaded', { detail: { bodyId } }));
      }
    };
    img.src = realUrl;
  }

  return canvas;
}

export function getCelestialDataUrl(bodyId: string): string {
  if (dataUrlCache[bodyId]) return dataUrlCache[bodyId];
  const canvas = getCelestialCanvas(bodyId);
  dataUrlCache[bodyId] = canvas.toDataURL('image/png');
  return dataUrlCache[bodyId];
}

export function getSaturnRingDataUrl(): string {
  if (dataUrlCache['saturn_ring']) return dataUrlCache['saturn_ring'];
  getSaturnRingTexture();
  const canvas = (textureCache['saturn_ring']?.image as HTMLCanvasElement) || null;
  if (canvas && typeof canvas.toDataURL === 'function') {
    dataUrlCache['saturn_ring'] = canvas.toDataURL('image/png');
    return dataUrlCache['saturn_ring'];
  }
  return '';
}

/**
 * 2D Circular Radial Saturn Ring Texture for Cesium 3D Planar Discs
 * Transparent inner void inside 1.25x R_saturn, C ring, B ring, Cassini Division, A ring, F ring
 */
export function getSaturnRingRadialDataUrl(): string {
  if (dataUrlCache['saturn_ring_radial']) return dataUrlCache['saturn_ring_radial'];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const cx = 512;
  const cy = 512;

  // Concentric radial gradient matching true Saturn ring system
  // Radius 512px corresponds to 2.45x R_saturn.
  // Saturn's surface (1.0x R_saturn) is at 0.408 (209px).
  // Inner ring (1.25x R_saturn) starts at 0.510 (261px), leaving a distinct 25% clear gap.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 512);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.505, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.515, 'rgba(175, 155, 128, 0.34)');
  grad.addColorStop(0.615, 'rgba(205, 185, 145, 0.52)');
  grad.addColorStop(0.625, 'rgba(246, 226, 178, 0.94)');
  grad.addColorStop(0.710, 'rgba(232, 206, 158, 0.96)');
  grad.addColorStop(0.795, 'rgba(218, 190, 142, 0.90)');
  grad.addColorStop(0.805, 'rgba(18, 16, 14, 0.04)');
  grad.addColorStop(0.835, 'rgba(18, 16, 14, 0.04)');
  grad.addColorStop(0.845, 'rgba(232, 210, 168, 0.84)');
  grad.addColorStop(0.935, 'rgba(212, 190, 152, 0.72)');
  grad.addColorStop(0.940, 'rgba(18, 16, 14, 0.14)');
  grad.addColorStop(0.950, 'rgba(212, 190, 152, 0.64)');
  grad.addColorStop(0.960, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.970, 'rgba(248, 232, 188, 0.58)');
  grad.addColorStop(0.985, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  dataUrlCache['saturn_ring_radial'] = canvas.toDataURL('image/png');
  return dataUrlCache['saturn_ring_radial'];
}


export function getSolarCoronaDataUrl(): string {
  if (dataUrlCache['solar_corona']) return dataUrlCache['solar_corona'];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const cx = 512;
  const cy = 512;

  // Multi-tier radial solar corona glow with radiant thermonuclear luminosity
  const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 512);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.12, 'rgba(255, 251, 235, 0.95)');
  grad.addColorStop(0.24, 'rgba(254, 240, 138, 0.85)');
  grad.addColorStop(0.42, 'rgba(245, 158, 11, 0.55)');
  grad.addColorStop(0.68, 'rgba(234, 88, 12, 0.22)');
  grad.addColorStop(0.88, 'rgba(194, 65, 12, 0.06)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Radiant Solar Flare Spikes & Magnetic Coronal Streamers
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const len = 340 + (i % 4 === 0 ? 140 : i % 2 === 0 ? 80 : 35);
    ctx.lineWidth = i % 4 === 0 ? 3.5 : 2.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 140, cy + Math.sin(angle) * 140);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Cross flare bloom rays (anamorphic cinematic starburst)
  const rayGradH = ctx.createLinearGradient(0, cy, 1024, cy);
  rayGradH.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  rayGradH.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  rayGradH.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rayGradH;
  ctx.fillRect(0, cy - 2, 1024, 4);

  const rayGradV = ctx.createLinearGradient(cx, 0, cx, 1024);
  rayGradV.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  rayGradV.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  rayGradV.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rayGradV;
  ctx.fillRect(cx - 2, 0, 4, 1024);

  dataUrlCache['solar_corona'] = canvas.toDataURL('image/png');
  return dataUrlCache['solar_corona'];
}

/**
 * Luminous Atmospheric Airglow Halo Sprite for Planets with Atmospheres
 * Creates a soft limb glow that reacts to space lighting and HDR bloom
 */
export function getAtmosphereHaloDataUrl(bodyId: string): string {
  const cacheKey = `halo_${bodyId}`;
  if (dataUrlCache[cacheKey]) return dataUrlCache[cacheKey];

  let colorInner = 'rgba(56, 189, 248, 0.45)';
  let colorOuter = 'rgba(14, 165, 233, 0)';

  switch (bodyId) {
    case 'sun':
      colorInner = 'rgba(254, 240, 138, 0.85)';
      colorOuter = 'rgba(245, 158, 11, 0)';
      break;
    case 'venus':
      colorInner = 'rgba(253, 224, 71, 0.45)';
      colorOuter = 'rgba(202, 138, 4, 0)';
      break;
    case 'earth':
      colorInner = 'rgba(56, 189, 248, 0.50)';
      colorOuter = 'rgba(3, 105, 161, 0)';
      break;
    case 'mars':
      colorInner = 'rgba(251, 146, 60, 0.38)';
      colorOuter = 'rgba(194, 65, 12, 0)';
      break;
    case 'jupiter':
      colorInner = 'rgba(254, 215, 170, 0.40)';
      colorOuter = 'rgba(180, 83, 9, 0)';
      break;
    case 'saturn':
      colorInner = 'rgba(253, 230, 138, 0.38)';
      colorOuter = 'rgba(161, 98, 7, 0)';
      break;
    case 'uranus':
      colorInner = 'rgba(103, 232, 249, 0.45)';
      colorOuter = 'rgba(8, 145, 178, 0)';
      break;
    case 'neptune':
      colorInner = 'rgba(96, 165, 250, 0.48)';
      colorOuter = 'rgba(29, 78, 216, 0)';
      break;
    case 'moon':
    case 'mercury':
      return '';
    default:
      colorInner = 'rgba(226, 232, 240, 0.25)';
      colorOuter = 'rgba(148, 163, 184, 0)';
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0)');
  grad.addColorStop(0.70, colorInner);
  grad.addColorStop(1.0, colorOuter);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  dataUrlCache[cacheKey] = canvas.toDataURL('image/png');
  return dataUrlCache[cacheKey];
}


/**
 * Creates crisp soft circular asteroid texture so Points never render as square blocks
 */
function createCircularParticleTexture(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.32, 'rgba(255, 255, 255, 0.88)');
  g.addColorStop(0.7, 'rgba(255, 255, 255, 0.22)');
  g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Deterministic seeded PRNG and smooth spherical FBM noise for skybox and cloud textures
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3(x: number, y: number, z: number, octaves: number = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise3(x * freq, y * freq, z * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
}

function sampleMilkyWayPixel(dx: number, dy: number, dz: number): [number, number, number] {
  // Tilted galactic basis vectors (galactic plane ~60 deg to ecliptic)
  const gx = dx * 0.72 + dy * 0.61 + dz * 0.33;
  const gy = -dx * 0.55 + dy * 0.76 - dz * 0.34;
  const gz = -dx * 0.42 + dy * 0.06 + dz * 0.90;

  const planeDist = Math.abs(gy);
  const bandMask = Math.exp(-planeDist * planeDist * 18.0);
  const coreMask = Math.exp(-planeDist * planeDist * 30.0) * Math.max(0, 0.55 + 0.45 * gx);

  const n1 = fbm3(dx * 3.1 + 1.4, dy * 3.1 - 0.7, dz * 3.1 + 2.2, 4);
  const n2 = fbm3(dx * 7.8 - 2.3, dy * 7.8 + 1.1, dz * 7.8 - 1.6, 3);
  const dustRift = Math.max(0, 1.0 - Math.exp(-Math.pow((planeDist - (n2 - 0.5) * 0.08) * 14.0, 2.0))) * 0.65 + 0.35;

  const cosmicHaze = Math.max(0, n1 - 0.38) * 0.42;
  const mwDensity = bandMask * (0.42 + 0.88 * n1) * dustRift;

  // Ordered micro-dither prevents 8-bit contour banding across dark deep-space gradients
  const dither = (hash3(dx * 517.3, dy * 613.7, dz * 491.9) - 0.5) * 1.9;

  let r = 1 + cosmicHaze * 14 + mwDensity * 36 + coreMask * 72 * (0.6 + 0.4 * n2) + dither;
  let g = 3 + cosmicHaze * 22 + mwDensity * 42 + coreMask * 52 * (0.6 + 0.4 * n1) + dither;
  let b = 8 + cosmicHaze * 44 + mwDensity * 74 + coreMask * 38 + Math.max(0, n2 - 0.48) * bandMask * 48 + dither;

  const nebulaMask = Math.max(0, fbm3(dx * 5.2, dy * 5.2, dz * 5.2, 3) - 0.56) * bandMask * 1.9;
  r += nebulaMask * (0.5 + 0.5 * Math.sin(gz * 3.5)) * 58;
  g += nebulaMask * 26;
  b += nebulaMask * (0.5 + 0.5 * Math.cos(gx * 3.5)) * 68;

  return [
    Math.min(255, Math.max(0, Math.round(r))),
    Math.min(255, Math.max(0, Math.round(g))),
    Math.min(255, Math.max(0, Math.round(b))),
  ];
}

function paintStarsIntoCubeFace(
  ctx: CanvasRenderingContext2D,
  size: number,
  faceFn: (u: number, v: number) => [number, number, number]
): void {
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    const v = (y / (size - 1)) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1;
      const [vx, vy, vz] = faceFn(u, v);
      const invLen = 1 / Math.hypot(vx, vy, vz);
      const [r, g, b] = sampleMilkyWayPixel(vx * invLen, vy * invLen, vz * invLen);
      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Generates seamless 6-face deep-space Milky Way + Nebula + Harvard-spectral star CubeMap for Cesium SkyBox
 */
export function getCesiumSkyBoxDataUrls(): {
  positiveX: string;
  negativeX: string;
  positiveY: string;
  negativeY: string;
  positiveZ: string;
  negativeZ: string;
} {
  if (cesiumSkyBoxCache) return cesiumSkyBoxCache;

  const size = 1024;
  const faces: Array<{
    key: 'positiveX' | 'negativeX' | 'positiveY' | 'negativeY' | 'positiveZ' | 'negativeZ';
    dir: (u: number, v: number) => [number, number, number];
  }> = [
    { key: 'positiveX', dir: (u, v) => [1, -v, -u] },
    { key: 'negativeX', dir: (u, v) => [-1, -v, u] },
    { key: 'positiveY', dir: (u, v) => [u, 1, v] },
    { key: 'negativeY', dir: (u, v) => [u, -1, -v] },
    { key: 'positiveZ', dir: (u, v) => [u, -v, 1] },
    { key: 'negativeZ', dir: (u, v) => [-u, -v, -1] },
  ];

  const canvases: Record<string, HTMLCanvasElement> = {};
  const ctxs: Record<string, CanvasRenderingContext2D> = {};

  for (const f of faces) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    paintStarsIntoCubeFace(ctx, size, f.dir);
    canvases[f.key] = c;
    ctxs[f.key] = ctx;
  }

  // Project 6,500 pinpoint spectral stars seamlessly onto matching cube faces
  const rng = mulberry32(20261126);
  for (let i = 0; i < 6500; i++) {
    const theta = rng() * Math.PI * 2;
    const nearGalactic = rng() < 0.45;
    const zUniform = nearGalactic ? (rng() - 0.5) * 0.42 : rng() * 2 - 1;
    const rHoriz = Math.sqrt(Math.max(0, 1 - zUniform * zUniform));
    let dx = rHoriz * Math.cos(theta);
    let dy = zUniform;
    let dz = rHoriz * Math.sin(theta);

    if (nearGalactic) {
      const cosT = Math.cos(1.02);
      const sinT = Math.sin(1.02);
      const ny = dy * cosT - dz * sinT;
      const nz = dy * sinT + dz * cosT;
      dy = ny;
      dz = nz;
    }

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const az = Math.abs(dz);
    let faceKey: 'positiveX' | 'negativeX' | 'positiveY' | 'negativeY' | 'positiveZ' | 'negativeZ';
    let u = 0;
    let v = 0;
    if (ax >= ay && ax >= az) {
      faceKey = dx > 0 ? 'positiveX' : 'negativeX';
      u = dx > 0 ? -dz / ax : dz / ax;
      v = -dy / ax;
    } else if (ay >= ax && ay >= az) {
      faceKey = dy > 0 ? 'positiveY' : 'negativeY';
      u = dx / ay;
      v = dy > 0 ? dz / ay : -dz / ay;
    } else {
      faceKey = dz > 0 ? 'positiveZ' : 'negativeZ';
      u = dz > 0 ? dx / az : -dx / az;
      v = -dy / az;
    }

    const px = ((u + 1) * 0.5) * (size - 1);
    const py = ((v + 1) * 0.5) * (size - 1);
    const mag = Math.pow(rng(), 5.2);
    const radius = 0.5 + mag * 1.1;
    const huePick = rng();
    const starColor = huePick < 0.35
      ? '210, 232, 255'
      : huePick < 0.7
      ? '255, 252, 245'
      : huePick < 0.88
      ? '254, 236, 178'
      : '253, 186, 140';

    const ctx = ctxs[faceKey];
    if (mag > 0.74) {
      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.4);
      glow.addColorStop(0.0, 'rgba(255,255,255,0.98)');
      glow.addColorStop(0.32, `rgba(${starColor},0.55)`);
      glow.addColorStop(1.0, `rgba(${starColor},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(${starColor}, ${0.38 + mag * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  cesiumSkyBoxCache = {
    positiveX: canvases.positiveX.toDataURL('image/jpeg', 0.9),
    negativeX: canvases.negativeX.toDataURL('image/jpeg', 0.9),
    positiveY: canvases.positiveY.toDataURL('image/jpeg', 0.9),
    negativeY: canvases.negativeY.toDataURL('image/jpeg', 0.9),
    positiveZ: canvases.positiveZ.toDataURL('image/jpeg', 0.9),
    negativeZ: canvases.negativeZ.toDataURL('image/jpeg', 0.9),
  };
  return cesiumSkyBoxCache;
}

export function getCircularStarTexture(size: number = 64): THREE.CanvasTexture {
  if (textureCache['circular_star']) return textureCache['circular_star'] as THREE.CanvasTexture;
  const tex = createCircularParticleTexture(size);
  textureCache['circular_star'] = tex;
  return tex;
}

/**
 * Generates seamless 2K equirectangular Milky Way & Deep-Space Nebula texture for Three.js sky domes
 */
export function getMilkyWayDomeTexture(): THREE.CanvasTexture {
  if (milkyWayDomeTexCache) return milkyWayDomeTexCache;

  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    const phi = (y / (h - 1)) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let x = 0; x < w; x++) {
      const theta = (x / (w - 1)) * Math.PI * 2;
      const dx = sinPhi * Math.cos(theta);
      const dy = cosPhi;
      const dz = sinPhi * Math.sin(theta);
      const [r, g, b] = sampleMilkyWayPixel(dx, dy, dz);
      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Add pinpoint spectral starfield (crisp sub-pixel cores without bloated orbs)
  const rng = mulberry32(990812);
  for (let i = 0; i < 5200; i++) {
    const sx = rng() * w;
    const sy = rng() * h;
    const mag = Math.pow(rng(), 5.5);
    const r = 0.35 + mag * 0.85;
    const huePick = rng();
    const rgb = huePick < 0.36 ? '206,232,255' : huePick < 0.72 ? '255,253,248' : huePick < 0.9 ? '254,234,168' : '253,182,132';
    if (mag > 0.78) {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.1);
      glow.addColorStop(0.0, 'rgba(255,255,255,0.98)');
      glow.addColorStop(0.35, `rgba(${rgb},0.5)`);
      glow.addColorStop(1.0, `rgba(${rgb},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(${rgb},${0.35 + mag * 0.65})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  milkyWayDomeTexCache = tex;
  return tex;
}

/**
 * Creates a seamless 3D Deep-Space Sky Dome with Milky Way band and spectral stars
 */
export function createDeepSpaceSkyDome(radius: number = 4200): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const mat = new THREE.MeshBasicMaterial({
    map: getMilkyWayDomeTexture(),
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'DeepSpaceMilkyWayDome';
  mesh.renderOrder = -10;
  return mesh;
}

/**
 * Generates realistic swirling global atmospheric cloud deck texture for Earth
 */
export function getEarthCloudsTexture(): THREE.CanvasTexture {
  if (earthCloudsTexCache) return earthCloudsTexCache;
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    const phi = (y / (h - 1)) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const latWeight = 0.72 + 0.28 * Math.exp(-Math.pow((cosPhi) * 4.0, 2.0));
    for (let x = 0; x < w; x++) {
      const theta = (x / (w - 1)) * Math.PI * 2;
      const dx = sinPhi * Math.cos(theta);
      const dy = cosPhi;
      const dz = sinPhi * Math.sin(theta);

      // Domain-warped FBM for realistic cyclonic & jet-stream wispy cloud structure
      const warp = fbm3(dx * 2.6, dy * 3.8, dz * 2.6, 3) * 1.35;
      const cloudRaw = fbm3(dx * 5.2 + warp, dy * 6.5 - warp * 0.5, dz * 5.2 + warp, 4);
      const density = Math.max(0, (cloudRaw * latWeight - 0.44) * 2.35);
      const alpha = Math.min(245, Math.round(Math.pow(Math.min(1, density), 1.35) * 225));

      const idx = (y * w + x) * 4;
      d[idx] = 248;
      d[idx + 1] = 252;
      d[idx + 2] = 255;
      d[idx + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  earthCloudsTexCache = tex;
  return tex;
}

/**
 * Generates anamorphic lens flare + soft Gaussian coronal aura texture for the Sun
 */
export function getSolarFlareTexture(): THREE.CanvasTexture {
  if (solarFlareTexCache) return solarFlareTexCache;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size * 0.5;

  const radial = ctx.createRadialGradient(c, c, 0, c, c, c);
  radial.addColorStop(0.0, 'rgba(255, 255, 245, 0.95)');
  radial.addColorStop(0.14, 'rgba(254, 240, 138, 0.72)');
  radial.addColorStop(0.36, 'rgba(245, 158, 11, 0.28)');
  radial.addColorStop(0.7, 'rgba(234, 88, 12, 0.06)');
  radial.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  // Soft anamorphic horizontal & subtle vertical flare beams
  const horiz = ctx.createLinearGradient(0, c, size, c);
  horiz.addColorStop(0.0, 'rgba(255,255,255,0)');
  horiz.addColorStop(0.5, 'rgba(254, 249, 195, 0.42)');
  horiz.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = horiz;
  ctx.fillRect(0, c - 4, size, 8);

  const vert = ctx.createLinearGradient(c, 0, c, size);
  vert.addColorStop(0.0, 'rgba(255,255,255,0)');
  vert.addColorStop(0.5, 'rgba(254, 240, 138, 0.22)');
  vert.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = vert;
  ctx.fillRect(c - 2, 0, 4, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  solarFlareTexCache = tex;
  return tex;
}

/**
 * 3D Milky Way Galaxy Particle Spiral & Optical-Infinity Deep Starfield
 */
export function createMilkyWayGalaxy(): THREE.Group {
  const galaxyGroup = new THREE.Group();
  galaxyGroup.name = 'MilkyWayGalaxy';

  // Seamless Photographic Deep Space Sky Dome (Milky Way Plane + Nebulae + Stars)
  galaxyGroup.add(createDeepSpaceSkyDome(4600));

  // Parallax 3D Stellar Dust & Galactic Plane Clusters
  const starCount = 12000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const minRadius = 1550;
  const maxRadius = 4200;
  const arms = 2;

  const coreColor = new THREE.Color(0xfef3c7);
  const armColorInner = new THREE.Color(0x93c5fd);
  const armColorOuter = new THREE.Color(0xa5b4fc);

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;
    const r = minRadius + Math.pow(Math.random(), 1.45) * (maxRadius - minRadius);
    const spinAngle = r * 0.0022;
    const branchAngle = (i % arms) * ((2 * Math.PI) / arms);

    const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.24 * r;
    const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.10 * r;
    const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.24 * r;

    const angle = branchAngle + spinAngle;
    positions[idx] = Math.cos(angle) * r + randomX;
    positions[idx + 1] = randomY;
    positions[idx + 2] = Math.sin(angle) * r + randomZ;

    const armProgress = (r - minRadius) / (maxRadius - minRadius);
    const mixedColor = coreColor.clone();
    mixedColor.lerp(armColorInner, 0.45);
    mixedColor.lerp(armColorOuter, armProgress);

    colors[idx] = mixedColor.r;
    colors[idx + 1] = mixedColor.g;
    colors[idx + 2] = mixedColor.b;
  }

  const particleMap = createCircularParticleTexture(64);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.9,
    map: getCircularStarTexture(64),
    alphaTest: 0.01,
    vertexColors: true,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const galaxyPoints = new THREE.Points(geometry, material);
  galaxyPoints.rotation.x = Math.PI * 0.33;
  galaxyPoints.rotation.z = Math.PI * 0.15;
  galaxyGroup.add(galaxyPoints);

  return galaxyGroup;
}

/**
 * Creates thin, luminous orbital tracks for each celestial body
 */
export function createOrbitLine(radius: number, color: string = '#38bdf8'): THREE.LineLoop {
  const segments = 192;
  const points: THREE.Vector3[] = [];
  const colors: number[] = [];
  const baseColor = new THREE.Color(color);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = t * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    const fade = 0.28 + 0.72 * Math.pow(0.5 + 0.5 * Math.cos(theta), 1.6);
    colors.push(baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.LineLoop(geometry, material);
}

/**
 * Creates Main Asteroid Belt dust & micro-body field using soft circular shader sprites (zero square pixels)
 */
export function createAsteroidBelt(innerRadius: number = 240.0, outerRadius: number = 360.0, count: number = 2400): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const verticalSpread = (Math.random() - 0.5) * 4.8;

    positions[idx] = Math.cos(theta) * r;
    positions[idx + 1] = verticalSpread;
    positions[idx + 2] = Math.sin(theta) * r;

    const rand = Math.random();
    if (rand < 0.62) {
      colors[idx] = 0.52 + Math.random() * 0.14;
      colors[idx + 1] = 0.50 + Math.random() * 0.12;
      colors[idx + 2] = 0.48 + Math.random() * 0.12;
    } else if (rand < 0.88) {
      colors[idx] = 0.68 + Math.random() * 0.10;
      colors[idx + 1] = 0.58 + Math.random() * 0.10;
      colors[idx + 2] = 0.48 + Math.random() * 0.10;
    } else {
      colors[idx] = 0.78;
      colors[idx + 1] = 0.80;
      colors[idx + 2] = 0.86;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.95,
    map: createCircularParticleTexture(64),
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  const asteroidBelt = new THREE.Points(geometry, material);
  asteroidBelt.name = 'celestial_asteroid_belt';
  return asteroidBelt;
}

/**
 * Creates 3D faceted rocky boulders using InstancedMesh for realistic sunlit asteroid belt silhouettes
 */
export function createInstancedAsteroidBelt(
  innerRadius: number = 240.0,
  outerRadius: number = 360.0,
  count: number = 650
): THREE.InstancedMesh {
  const baseGeo = new THREE.IcosahedronGeometry(1.0, 0);
  const posAttr = baseGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const warp = 0.72 + 0.48 * hash3(Math.round(x * 10), Math.round(y * 10), Math.round(z * 10));
    posAttr.setXYZ(i, x * warp, y * warp * 0.78, z * warp);
  }
  baseGeo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xb8afa6,
    roughness: 0.92,
    metalness: 0.14,
    flatShading: true,
  });

  const instanced = new THREE.InstancedMesh(baseGeo, mat, count);
  instanced.name = 'celestial_asteroid_boulders';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 6.5;
    const s = 0.14 + Math.pow(Math.random(), 2.8) * 0.55;

    dummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(s * (0.8 + Math.random() * 0.5), s * (0.65 + Math.random() * 0.5), s * (0.8 + Math.random() * 0.5));
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    const tone = 0.48 + Math.random() * 0.45;
    color.setRGB(tone * 1.04, tone * 0.96, tone * 0.90);
    instanced.setColorAt(i, color);
  }

  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  return instanced;
}

/**
 * Sun-aware volumetric Rayleigh + Mie atmospheric halo rendered smoothly on BackSide
 * Eliminates hard geometric outer sphere borders and adds realistic day/night terminator wrap.
 */
export function createAtmosphericRimMaterial(
  hexColor: string = '#38bdf8',
  intensity: number = 1.15,
  power: number = 2.6,
  options?: {
    sunPosition?: THREE.Vector3;
    twilightColor?: string;
    limbRatio?: number;
  }
): THREE.ShaderMaterial {
  const limbRatio = options?.limbRatio ?? 1.12;
  const maxDot = Math.sqrt(Math.max(0.08, 1.0 - 1.0 / (limbRatio * limbRatio)));
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hexColor) },
      uTwilightColor: { value: new THREE.Color(options?.twilightColor || '#fb923c') },
      uIntensity: { value: intensity },
      uPower: { value: power },
      uMaxDot: { value: maxDot },
      uSunPos: { value: options?.sunPosition ? options.sunPosition.clone() : new THREE.Vector3(0, 0, 0) },
      uUseSunDir: { value: options?.sunPosition === undefined ? 1.0 : 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vPlanetCenter;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vPlanetCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uTwilightColor;
      uniform float uIntensity;
      uniform float uPower;
      uniform float uMaxDot;
      uniform vec3 uSunPos;
      uniform float uUseSunDir;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vPlanetCenter;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        // BackSide alignment peaks at planet horizon and drops cleanly to 0 at outer mesh boundary
        float backAlign = clamp(dot(normalize(-vNormal), normalize(vViewDir)), 0.0, 1.0);
        float shellDensity = smoothstep(0.02, max(0.28, uMaxDot), backAlign);
        float glow = pow(shellDensity, max(1.4, uPower * 0.72));

        vec3 sunDir = normalize(uSunPos - vPlanetCenter);
        float ndotl = dot(normalize(vWorldNormal), sunDir);
        float dayWrap = smoothstep(-0.38, 0.35, ndotl);
        float twilightBand = exp(-pow((ndotl - 0.02) * 3.8, 2.0));
        vec3 scatterCol = mix(uColor, uTwilightColor, twilightBand * 0.55);

        float sunWeight = mix(1.0, mix(0.08, 1.0, dayWrap), uUseSunDir);
        float alpha = clamp(glow * uIntensity * sunWeight * 0.82, 0.0, 0.92);
        gl_FragColor = vec4(scatterCol * (0.95 + 0.45 * glow), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

/**
 * AAA World-Space Lit Planet Surface Shader supporting:
 * - Crisp day/night terminator wrap scattering
 * - Earth ocean specular glint + glowing night-side city lights
 * - Rocky regolith micro-contrast & gas giant zonal wind band sheen
 */
export function createAAAPlanetMaterial(
  baseTexture: THREE.Texture | null,
  options: {
    bodyId: string;
    sunPosition?: THREE.Vector3;
    atmoColor?: string;
    isGasGiant?: boolean;
    nightLightsStrength?: number;
  }
): THREE.ShaderMaterial {
  const isEarth = options.bodyId === 'earth' ? 1.0 : 0.0;
  const isGas = options.isGasGiant ? 1.0 : 0.0;
  const hasAtmo = options.bodyId === 'mercury' || options.bodyId === 'moon' ? 0.0 : 1.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: baseTexture },
      uSunPos: { value: options.sunPosition ? options.sunPosition.clone() : new THREE.Vector3(0, 0, 0) },
      uAtmoColor: { value: new THREE.Color(options.atmoColor || '#38bdf8') },
      uTime: { value: 0 },
      uIsEarth: { value: isEarth },
      uIsGasGiant: { value: isGas },
      uHasAtmo: { value: hasAtmo },
      uNightLights: { value: options.nightLightsStrength ?? (isEarth > 0.5 ? 1.0 : 0.0) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirWorld;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirWorld = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunPos;
      uniform vec3 uAtmoColor;
      uniform float uTime;
      uniform float uIsEarth;
      uniform float uIsGasGiant;
      uniform float uHasAtmo;
      uniform float uNightLights;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirWorld;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 uvSample = vUv;
        if (uIsGasGiant > 0.5) {
          float shear = sin(vUv.y * 24.0) * 0.0025 * uTime;
          uvSample.x = fract(vUv.x + shear);
        }

        vec3 albedo = texture2D(uMap, uvSample).rgb;
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewDirWorld);
        vec3 L = normalize(uSunPos - vWorldPos);

        // Micro-relief normal perturbation from texture luminance gradients (no extra bump fetch needed)
        float eps = 0.0014;
        float hC = dot(albedo, vec3(0.299, 0.587, 0.114));
        float hX = dot(texture2D(uMap, uvSample + vec2(eps, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        float hY = dot(texture2D(uMap, uvSample + vec2(0.0, eps)).rgb, vec3(0.299, 0.587, 0.114));
        float bumpGain = mix(1.4, 0.25, uIsGasGiant);
        vec3 tangentPerturb = normalize(vec3((hC - hX) * bumpGain, (hC - hY) * bumpGain, 1.0));
        float ndotlRaw = dot(N, L);
        float reliefDetail = clamp(dot(tangentPerturb, vec3(0.45, 0.45, 0.8)), 0.72, 1.24);

        // Soft terminator diffuse with subtle night ambient so dark side retains silhouette readability
        float wrap = mix(0.04, 0.18, uHasAtmo);
        float diffuse = smoothstep(-0.12 - wrap, 0.85, ndotlRaw) * reliefDetail;
        float ambientFill = mix(0.055, 0.12, uHasAtmo);
        vec3 litColor = albedo * (ambientFill + diffuse * 1.18);

        // Earth Ocean Specular Glint + Illuminated Continents City Lights on Night Hemisphere
        if (uIsEarth > 0.5) {
          float oceanMask = smoothstep(0.02, 0.14, albedo.b - max(albedo.r * 1.05, albedo.g * 0.92));
          float iceMask = smoothstep(0.65, 0.82, min(min(albedo.r, albedo.g), albedo.b));
          float landMask = clamp((1.0 - oceanMask) * (1.0 - iceMask), 0.0, 1.0);

          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 42.0) * oceanMask * smoothstep(-0.05, 0.35, ndotlRaw);
          litColor += vec3(0.95, 0.97, 1.0) * spec * 0.65;

          if (uNightLights > 0.01) {
            float nightFactor = smoothstep(0.06, -0.22, ndotlRaw);
            float cityGrid = noise2(vUv * vec2(180.0, 90.0)) * noise2(vUv * vec2(65.0, 32.0));
            float cityCluster = smoothstep(0.36, 0.66, cityGrid) * landMask;
            float equatorPop = smoothstep(0.05, 0.22, abs(vUv.y - 0.5) < 0.38 ? 0.22 : 0.0);
            litColor += vec3(1.0, 0.76, 0.34) * cityCluster * equatorPop * nightFactor * 1.35 * uNightLights;
          }
        }

        // Front-facing Fresnel atmospheric haze blend on sunlit limb
        if (uHasAtmo > 0.5) {
          float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.6);
          float sunEdge = smoothstep(-0.25, 0.45, ndotlRaw);
          litColor += uAtmoColor * fresnel * sunEdge * 0.48;
        }

        gl_FragColor = vec4(litColor, 1.0);
      }
    `,
  });
}

/**
 * Ray-traced Saturn Ring Shader casting Saturn's real-time planetary umbra & penumbra across the rings
 */
export function createSaturnRingMaterial(
  ringTexture: THREE.Texture,
  planetRadius: number,
  sunPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: ringTexture },
      uSunPos: { value: sunPosition.clone() },
      uPlanetRadius: { value: planetRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vPlanetCenter;
      varying vec3 vRingNormal;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vPlanetCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vRingNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunPos;
      uniform float uPlanetRadius;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vPlanetCenter;
      varying vec3 vRingNormal;

      void main() {
        vec4 texel = texture2D(uMap, vUv);
        if (texel.a < 0.01) discard;

        vec3 toSun = normalize(uSunPos - vPlanetCenter);
        vec3 rel = vWorldPos - vPlanetCenter;

        // Ray-sphere umbra check: if fragment lies behind planet along -toSun
        float proj = dot(rel, toSun);
        float shadowFactor = 1.0;
        if (proj < 0.0) {
          vec3 perp = rel - toSun * proj;
          float perpDist = length(perp);
          shadowFactor = mix(0.07, 1.0, smoothstep(uPlanetRadius * 0.92, uPlanetRadius * 1.06, perpDist));
        }

        // Subtle phase brightening on ice crystals facing light or backlit scattering
        vec3 V = normalize(cameraPosition - vWorldPos);
        float phase = 0.85 + 0.25 * abs(dot(V, toSun));
        float shimmer = 0.95 + 0.05 * sin(vUv.x * 160.0);

        vec3 finalCol = texel.rgb * shadowFactor * phase * shimmer * 1.12;
        gl_FragColor = vec4(finalCol, texel.a);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Animated solar photosphere shader with HDR plasma convection, sunspot contrast, and fiery limb darkening
 */
export function createSolarSurfaceMaterial(baseTexture: THREE.Texture | null): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: baseTexture },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3d(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
              mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
              mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 p = normalize(vLocalPos) * 7.5;
        float boil = noise3d(p + vec3(uTime * 0.22, -uTime * 0.16, uTime * 0.19)) * 0.65
                   + noise3d(p * 2.3 - vec3(uTime * 0.35)) * 0.35;

        vec2 driftUv = vUv + vec2(uTime * 0.0025, (boil - 0.5) * 0.008);
        vec3 baseCol = texture2D(uMap, fract(driftUv)).rgb;

        float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
        // True astrophysical solar limb darkening toward chromospheric crimson-orange
        float limbFactor = pow(ndotv, 0.42);
        vec3 chromosphereRim = vec3(1.15, 0.32, 0.05) * pow(1.0 - ndotv, 2.4);

        // HDR core emission drives UnrealBloomPass naturally without washing out dark sunspots
        float lum = dot(baseCol, vec3(0.3, 0.59, 0.11));
        vec3 hdrBoost = baseCol * (0.82 + 0.36 * boil) * (0.48 + 0.68 * limbFactor);
        vec3 brightFaculae = vec3(1.18, 0.88, 0.38) * smoothstep(0.65, 0.96, lum) * 0.28;
        gl_FragColor = vec4(hdrBoost + brightFaculae + chromosphereRim * 0.52, 1.0);
      }
    `,
  });
}

/**
 * Soft BackSide volumetric solar corona & dynamic magnetic streamer glow (zero hard shell edge)
 */
export function createSolarCoronaMaterial(
  hexColor: string = '#f59e0b',
  intensity: number = 0.92
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hexColor) },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalDir;
      void main() {
        vLocalDir = normalize(position);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalDir;
      void main() {
        float alignment = clamp(dot(normalize(-vNormal), normalize(vViewDir)), 0.0, 1.0);
        // Smooth radial falloff that reaches exact zero at the outer corona mesh silhouette
        float radial = pow(smoothstep(0.03, 0.72, alignment), 2.35);
        float angle = atan(vLocalDir.y, vLocalDir.x);
        float streamer = 0.84 + 0.16 * sin(angle * 7.0 + uTime * 0.75) * cos(vLocalDir.z * 9.0 - uTime * 0.6);
        float pulse = 0.94 + 0.06 * sin(uTime * 1.4);
        float alpha = clamp(radial * uIntensity * streamer * pulse, 0.0, 0.95);
        gl_FragColor = vec4(uColor * (1.2 + radial * 0.65), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
}


