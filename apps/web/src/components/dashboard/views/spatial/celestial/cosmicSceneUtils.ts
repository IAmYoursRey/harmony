import * as THREE from 'three';
import { PLANETARY_CATALOG, CelestialBodyData } from '@/data/planetaryCatalog';

// Texture Cache
const textureCache: Record<string, THREE.CanvasTexture> = {};
const canvasCache: Record<string, HTMLCanvasElement> = {};
const dataUrlCache: Record<string, string> = {};

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

export function getCelestialTexture(bodyId: string): THREE.CanvasTexture {
  if (textureCache[bodyId]) return textureCache[bodyId];
  const canvas = generateHDCelestialCanvas(bodyId);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache[bodyId] = texture;
  return texture;
}

/**
 * Generate Saturn's Iconic Concentric Rings Texture (1D linear for Three.js)
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (textureCache['saturn_ring']) return textureCache['saturn_ring'];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.12, 'rgba(217, 119, 6, 0.4)');   // C Ring (Crepe Ring)
  grad.addColorStop(0.28, 'rgba(253, 224, 71, 0.85)'); // B Ring (Brightest inner)
  grad.addColorStop(0.62, 'rgba(202, 138, 4, 0.9)');
  grad.addColorStop(0.68, 'rgba(0, 0, 0, 0.05)');      // Cassini Division (dark gap)
  grad.addColorStop(0.72, 'rgba(0, 0, 0, 0.05)');
  grad.addColorStop(0.75, 'rgba(234, 179, 8, 0.7)');   // A Ring
  grad.addColorStop(0.96, 'rgba(202, 138, 4, 0.55)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache['saturn_ring'] = texture;
  return texture;
}

export function getCelestialCanvas(bodyId: string): HTMLCanvasElement {
  if (canvasCache[bodyId]) return canvasCache[bodyId];
  const canvas = generateHDCelestialCanvas(bodyId);
  canvasCache[bodyId] = canvas;
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
 * Transparent center hole, C ring, B ring, Cassini Division, A ring, Encke gap, F ring
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
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 512);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.38, 'rgba(0, 0, 0, 0)');         // Inner void inside C ring
  grad.addColorStop(0.42, 'rgba(180, 83, 9, 0.35)');   // C Ring (Crepe Ring)
  grad.addColorStop(0.54, 'rgba(202, 138, 4, 0.55)');
  grad.addColorStop(0.56, 'rgba(254, 240, 138, 0.95)');// B Ring (Dense, brightest)
  grad.addColorStop(0.74, 'rgba(234, 179, 8, 0.90)');
  grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.05)');      // Cassini Division (Sharp gap)
  grad.addColorStop(0.78, 'rgba(0, 0, 0, 0.05)');
  grad.addColorStop(0.79, 'rgba(234, 179, 8, 0.78)');  // A Ring
  grad.addColorStop(0.88, 'rgba(202, 138, 4, 0.65)');  // Encke division zone
  grad.addColorStop(0.94, 'rgba(202, 138, 4, 0.45)');
  grad.addColorStop(0.96, 'rgba(253, 224, 71, 0.5)');  // F Ring
  grad.addColorStop(0.98, 'rgba(0, 0, 0, 0)');         // Outer void
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
 * 3D Milky Way Galaxy (Galaksi Bima Sakti) Particle Spiral & Deep Starfield
 * Creates 16,000+ stars arranged in two majestic logarithmic spiral arms with galactic core
 */
export function createMilkyWayGalaxy(): THREE.Group {
  const galaxyGroup = new THREE.Group();
  galaxyGroup.name = 'MilkyWayGalaxy';

  // Parameters
  const starCount = 18000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const minRadius = 1200;
  const maxRadius = 4500;
  const arms = 2;

  const coreColor = new THREE.Color(0xfef08a);    // Warm gold/amber core
  const armColorInner = new THREE.Color(0x38bdf8);// Cyan/sky blue
  const armColorOuter = new THREE.Color(0x818cf8);// Violet/indigo

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;
    // Radial distribution: placed far in the cosmic background (no particles inside the Solar System)
    const r = minRadius + Math.pow(Math.random(), 1.5) * (maxRadius - minRadius);
    const spinAngle = r * 0.0025;
    const branchAngle = ((i % arms) * ((2 * Math.PI) / arms));

    // Natural cosmic dispersal
    const randomX = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.25) * r;
    const randomY = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.12) * r;
    const randomZ = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.25) * r;

    const angle = branchAngle + spinAngle;
    const x = Math.cos(angle) * r + randomX;
    const y = randomY;
    const z = Math.sin(angle) * r + randomZ;

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    // Distant star colors
    const armProgress = (r - minRadius) / (maxRadius - minRadius);
    const mixedColor = coreColor.clone();
    mixedColor.lerp(armColorInner, 0.4);
    mixedColor.lerp(armColorOuter, armProgress);

    colors[idx] = mixedColor.r;
    colors[idx + 1] = mixedColor.g;
    colors[idx + 2] = mixedColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const galaxyPoints = new THREE.Points(geometry, material);
  // Realistically tilt galaxy by ~60° relative to solar system ecliptic plane
  galaxyPoints.rotation.x = Math.PI * 0.33;
  galaxyPoints.rotation.z = Math.PI * 0.15;
  galaxyGroup.add(galaxyPoints);

  // Distant Deep Space Cosmic Starfield at Optical Infinity
  const bgCount = 3000;
  const bgPositions = new Float32Array(bgCount * 3);
  const bgColors = new Float32Array(bgCount * 3);

  for (let i = 0; i < bgCount; i++) {
    const idx = i * 3;
    const dist = 3500 + Math.random() * 2500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    bgPositions[idx] = dist * Math.sin(phi) * Math.cos(theta);
    bgPositions[idx + 1] = dist * Math.sin(phi) * Math.sin(theta);
    bgPositions[idx + 2] = dist * Math.cos(phi);

    // Varied stellar spectral classes (O, B, A, F, G, K, M)
    const rand = Math.random();
    if (rand < 0.6) {
      // White/Bluish (A, B)
      bgColors[idx] = 0.9;
      bgColors[idx + 1] = 0.95;
      bgColors[idx + 2] = 1.0;
    } else if (rand < 0.85) {
      // Yellow (G like Sun)
      bgColors[idx] = 1.0;
      bgColors[idx + 1] = 0.9;
      bgColors[idx + 2] = 0.7;
    } else {
      // Reddish/Orange (K, M)
      bgColors[idx] = 1.0;
      bgColors[idx + 1] = 0.55;
      bgColors[idx + 2] = 0.45;
    }
  }

  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  const bgMat = new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
  });

  const bgStars = new THREE.Points(bgGeo, bgMat);
  galaxyGroup.add(bgStars);

  return galaxyGroup;
}

/**
 * Creates thin, luminous orbital tracks for each celestial body
 */
export function createOrbitLine(radius: number, color: string = '#38bdf8'): THREE.LineLoop {
  const segments = 128;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.28,
  });

  return new THREE.LineLoop(geometry, material);
}

/**
 * Creates the Main Asteroid Belt between Mars and Jupiter (~2.2 to ~3.2 AU)
 */
export function createAsteroidBelt(innerRadius: number = 65.0, outerRadius: number = 88.0, count: number = 2400): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const verticalSpread = (Math.random() - 0.5) * 1.4;

    positions[idx] = Math.cos(theta) * r;
    positions[idx + 1] = verticalSpread;
    positions[idx + 2] = Math.sin(theta) * r;

    // Silicate (S-type), Carbonaceous (C-type), and Metallic asteroid shades
    const rand = Math.random();
    if (rand < 0.6) {
      // Carbonaceous dark grey
      colors[idx] = 0.55 + Math.random() * 0.15;
      colors[idx + 1] = 0.52 + Math.random() * 0.15;
      colors[idx + 2] = 0.50 + Math.random() * 0.15;
    } else if (rand < 0.85) {
      // Silicate rocky ochre
      colors[idx] = 0.72 + Math.random() * 0.1;
      colors[idx + 1] = 0.60 + Math.random() * 0.1;
      colors[idx + 2] = 0.48 + Math.random() * 0.1;
    } else {
      // Metallic nickel-iron reflective flecks
      colors[idx] = 0.85;
      colors[idx + 1] = 0.85;
      colors[idx + 2] = 0.90;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.65,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    blending: THREE.NormalBlending,
  });

  const asteroidBelt = new THREE.Points(geometry, material);
  asteroidBelt.name = 'celestial_asteroid_belt';
  return asteroidBelt;
}

