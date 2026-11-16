import type { DynamicRubbleCell } from "./buildingRubbleEngine";

const VOXEL_RES = 16;
const TILE_SPRITE_CACHE = new Map<string, HTMLCanvasElement>();

function hashPixel(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function pxPlot(
  ctx: CanvasRenderingContext2D,
  vx: number,
  vy: number,
  vw: number,
  vh: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(vx, vy, vw, vh);
}

function paintBrickWallVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  // Deep mortar background
  pxPlot(ctx, 0, 0, 16, 16, "#1e293b");

  const palette = ["#334155", "#3f4f66", "#475569", "#2b3748"];
  const warmAccent = "#526075";

  // 4 staggered brick courses per single block so every wall reads as miniature masonry
  for (let row = 0; row < 4; row++) {
    const py = row * 4;
    const stagger = (row + variant) % 2 === 1 ? 2 : 0;
    for (let bx = -stagger; bx < 16; bx += 4) {
      const startX = Math.max(0, bx);
      const endX = Math.min(16, bx + 3);
      if (endX <= startX) continue;
      const bw = endX - startX;
      const toneIdx = hashPixel(bx, row, variant + 11) % palette.length;
      const baseCol = toneIdx === 2 && hashPixel(row, bx, 3) % 4 === 0 ? warmAccent : palette[toneIdx];

      pxPlot(ctx, startX, py, bw, 3, baseCol);
      // Top brick highlight for miniature 2.5D bevel
      pxPlot(ctx, startX, py, bw, 1, row === 0 ? "#94a3b8" : "#64748b");
      // Subtle lower brick shadow seam
      if (row === 3) {
        pxPlot(ctx, startX, py + 2, bw, 1, "#0f172a");
      }
    }
  }
}

function paintFenceBorderVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  // Subtle paving bed beneath wrought-iron campus perimeter fence
  pxPlot(ctx, 0, 0, 16, 16, "#475569");
  pxPlot(ctx, 0, 1, 16, 14, "#334155");
  // Masonry plinth base
  pxPlot(ctx, 0, 12, 16, 4, "#64748b");
  pxPlot(ctx, 0, 12, 16, 1, "#94a3b8");
  pxPlot(ctx, 0, 15, 16, 1, "#1e293b");

  // Fine iron bars & miniature stone pier
  for (let x = 1; x < 16; x += 3) {
    pxPlot(ctx, x, 2, 1, 11, "#0f172a");
    pxPlot(ctx, x, 1, 1, 1, "#ef4444");
  }
  pxPlot(ctx, 0, 4, 16, 1, "#1e293b");
  pxPlot(ctx, 0, 9, 16, 1, "#1e293b");
  if (variant % 2 === 0) {
    pxPlot(ctx, 6, 2, 4, 12, "#64748b");
    pxPlot(ctx, 6, 2, 4, 1, "#cbd5e1");
    pxPlot(ctx, 7, 1, 2, 1, "#dc2626");
  }
}

function paintCeramicFloorVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  // 4x4 grid of tiny 4x4px glazed ceramic tiles inside one grid block
  pxPlot(ctx, 0, 0, 16, 16, "#cbd5e1");
  const tones = ["#f8fafc", "#f1f5f9", "#e2e8f0", "#f8fafc"];

  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const h = hashPixel(tx, ty, variant + 5);
      const col = tones[h % tones.length];
      const ox = tx * 4;
      const oy = ty * 4;
      pxPlot(ctx, ox, oy, 3, 3, col);
      pxPlot(ctx, ox, oy, 1, 1, "#ffffff");
      if (h % 9 === 0) {
        pxPlot(ctx, ox + 1, oy + 2, 1, 1, "#cbd5e1");
      }
    }
  }
}

function paintConblockPavingVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  pxPlot(ctx, 0, 0, 16, 16, "#3b4658");
  const paverShades = ["#64748b", "#5b687c", "#718096", "#526075"];

  for (let row = 0; row < 4; row++) {
    const py = row * 4;
    const offset = row % 2 === 1 ? 2 : 0;
    for (let bx = -offset; bx < 16; bx += 4) {
      const sx = Math.max(0, bx);
      const ex = Math.min(16, bx + 3);
      if (ex <= sx) continue;
      const h = hashPixel(bx, row, variant + 23);
      pxPlot(ctx, sx, py, ex - sx, 3, paverShades[h % paverShades.length]);
      pxPlot(ctx, sx, py, ex - sx, 1, "#94a3b8");
      if (h % 13 === 0) {
        pxPlot(ctx, sx, py + 2, 1, 1, "#4d7c0f");
      }
    }
  }
}

function paintLushGrassVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  pxPlot(ctx, 0, 0, 16, 16, "#16a34a");
  const greens = ["#15803d", "#22c55e", "#166534", "#4ade80"];

  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 2) {
      const h = hashPixel(x, y, variant + 41);
      if (h % 3 === 0) {
        pxPlot(ctx, x, y, 2, 2, greens[h % greens.length]);
      } else if (h % 7 === 0) {
        pxPlot(ctx, x, y, 1, 2, "#4ade80");
        pxPlot(ctx, x + 1, y + 1, 1, 1, "#14532d");
      }
    }
  }
  if (variant % 2 === 1) {
    const fx = 3 + (variant * 5) % 9;
    const fy = 4 + (variant * 3) % 8;
    pxPlot(ctx, fx, fy, 1, 1, "#fef08a");
    pxPlot(ctx, fx + 1, fy - 1, 1, 1, "#ffffff");
  }
}

function paintAsphaltRoadVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  pxPlot(ctx, 0, 0, 16, 16, "#1e293b");
  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 2) {
      const h = hashPixel(x, y, variant + 61);
      if (h % 4 === 0) pxPlot(ctx, x, y, 1, 1, "#334155");
      else if (h % 9 === 0) pxPlot(ctx, x, y, 1, 1, "#0f172a");
    }
  }
  // Subtle miniature lane dash
  pxPlot(ctx, 7, 3, 2, 4, "#cbd5e1");
  pxPlot(ctx, 7, 10, 2, 4, "#cbd5e1");
}

function paintParkingVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  paintAsphaltRoadVoxels(ctx, variant);
  pxPlot(ctx, 7, 3, 2, 11, "#334155");
  pxPlot(ctx, 2, 0, 1, 16, "rgba(248, 250, 252, 0.45)");
  pxPlot(ctx, 2, 0, 3, 1, "rgba(248, 250, 252, 0.45)");
}

function paintMosqueCarpetVoxels(ctx: CanvasRenderingContext2D, variant: number) {
  pxPlot(ctx, 0, 0, 16, 16, "#065f46");
  pxPlot(ctx, 1, 1, 14, 14, "#047857");
  // Intricate Islamic geometric micro-diamond pattern
  for (let y = 0; y < 16; y += 8) {
    for (let x = 0; x < 16; x += 8) {
      pxPlot(ctx, x + 3, y + 1, 2, 6, "#10b981");
      pxPlot(ctx, x + 1, y + 3, 6, 2, "#10b981");
      pxPlot(ctx, x + 3, y + 3, 2, 2, variant % 2 === 0 ? "#fbbf24" : "#34d399");
    }
  }
}

function paintCourtVoxels(ctx: CanvasRenderingContext2D, kind: "COURT_VOLI" | "COURT_BASKET") {
  const darkPlank = kind === "COURT_VOLI" ? "#c2410c" : "#334155";
  const lightPlank = kind === "COURT_VOLI" ? "#ea580c" : "#475569";
  pxPlot(ctx, 0, 0, 16, 16, darkPlank);
  for (let y = 0; y < 16; y += 2) {
    pxPlot(ctx, 0, y, 16, 1, lightPlank);
  }
  pxPlot(ctx, 1, 1, 14, 1, "rgba(255,255,255,0.68)");
  pxPlot(ctx, 1, 14, 14, 1, "rgba(255,255,255,0.68)");
  if (kind === "COURT_BASKET") {
    pxPlot(ctx, 6, 6, 4, 4, "rgba(255,255,255,0.45)");
  }
}

function paintDoorVoxels(ctx: CanvasRenderingContext2D, locked: boolean) {
  paintCeramicFloorVoxels(ctx, 0);
  const frame = locked ? "#451a03" : "#78350f";
  const wood = locked ? "#7f1d1d" : "#b45309";
  const slat = locked ? "#991b1b" : "#d97706";
  pxPlot(ctx, 1, 1, 14, 14, frame);
  pxPlot(ctx, 2, 2, 12, 12, wood);
  for (let y = 3; y <= 11; y += 3) {
    pxPlot(ctx, 3, y, 10, 2, slat);
  }
  pxPlot(ctx, 11, 7, 2, 2, locked ? "#ef4444" : "#fef08a");
}

function paintStairVoxels(ctx: CanvasRenderingContext2D, up: boolean) {
  pxPlot(ctx, 0, 0, 16, 16, "#1e3a8a");
  for (let step = 0; step < 5; step++) {
    const sy = 1 + step * 3;
    const shade = up ? 185 - step * 18 : 110 + step * 18;
    pxPlot(ctx, 2, sy, 12, 2, `rgb(96, 165, ${shade})`);
    pxPlot(ctx, 2, sy + 2, 12, 1, "#1e293b");
  }
  // Handrails
  pxPlot(ctx, 1, 1, 1, 14, "#93c5fd");
  pxPlot(ctx, 14, 1, 1, 14, "#93c5fd");
}

/**
 * Returns a cached 16x16 crisp micro-pixel sprite canvas for the given tile type and variant.
 * Rendered with nearest-neighbor scaling cleanly at any tile resolution.
 */
export function getMicroPixelTileCanvas(
  tileType: string,
  variant = 0,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const v = ((variant % 4) + 4) % 4;
  const key = `${tileType}_${v}`;
  const cached = TILE_SPRITE_CACHE.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = VOXEL_RES;
  canvas.height = VOXEL_RES;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  switch (tileType) {
    case "WALL":
      paintBrickWallVoxels(ctx, v);
      break;
    case "BORDER":
      paintFenceBorderVoxels(ctx, v);
      break;
    case "FLOOR":
      paintCeramicFloorVoxels(ctx, v);
      break;
    case "PAVING":
      paintConblockPavingVoxels(ctx, v);
      break;
    case "GRASS":
      paintLushGrassVoxels(ctx, v);
      break;
    case "ROAD":
      paintAsphaltRoadVoxels(ctx, v);
      break;
    case "PARKING":
      paintParkingVoxels(ctx, v);
      break;
    case "MOSQUE":
      paintMosqueCarpetVoxels(ctx, v);
      break;
    case "COURT_VOLI":
    case "COURT_BASKET":
      paintCourtVoxels(ctx, tileType);
      break;
    case "DOOR":
      paintDoorVoxels(ctx, false);
      break;
    case "DOOR_LOCKED":
      paintDoorVoxels(ctx, true);
      break;
    case "STAIR_UP":
      paintStairVoxels(ctx, true);
      break;
    case "STAIR_DOWN":
      paintStairVoxels(ctx, false);
      break;
    default:
      pxPlot(ctx, 0, 0, 16, 16, "#475569");
      break;
  }

  TILE_SPRITE_CACHE.set(key, canvas);
  return canvas;
}

/**
 * Casts crisp 2.5D top-down pixel drop shadows from North/West walls onto walkable ground tiles.
 */
export function drawWallNeighborAO(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  wallNorth: boolean,
  wallWest: boolean,
) {
  if (!wallNorth && !wallWest) return;
  const step = Math.max(2, Math.round(tileSize / 8));
  ctx.fillStyle = "rgba(15, 23, 42, 0.24)";
  if (wallNorth) {
    ctx.fillRect(px, py, tileSize, step);
    ctx.fillStyle = "rgba(15, 23, 42, 0.11)";
    ctx.fillRect(px, py + step, tileSize, Math.max(1, Math.round(step * 0.7)));
  }
  if (wallWest) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.20)";
    ctx.fillRect(px, py, Math.max(2, Math.round(step * 0.85)), tileSize);
  }
}

/**
 * Renders animated cracking telegraph or multi-piece scattered micro-rubble chunks
 * over a dynamic collapse cell without big boxy rectangles.
 */
export function drawDynamicPixelRubbleCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  cell: DynamicRubbleCell,
  simTimeMs: number,
) {
  const unit = Math.max(2, tileSize / 16);

  if (cell.phase === "cracking") {
    const progress =
      1 - Math.max(0, cell.crackTimerSec) / Math.max(0.1, cell.crackDurationSec);
    const flicker = Math.sin(simTimeMs * 0.025 + cell.seed) * 0.2 + 0.8;

    ctx.save();
    ctx.fillStyle = `rgba(245, 158, 11, ${(0.14 + progress * 0.24) * flicker})`;
    ctx.fillRect(px + unit, py + unit, tileSize - unit * 2, tileSize - unit * 2);

    // Jagged dark pixel fissures crossing the slab
    ctx.fillStyle = "#1e293b";
    for (let i = 0; i < 6; i++) {
      const fx = 2 + ((cell.seed + i * 3) % 10);
      const fy = 2 + ((cell.seed + i * 5) % 10);
      ctx.fillRect(px + fx * unit, py + fy * unit, unit * 2, unit);
      ctx.fillRect(px + (fx + 1) * unit, py + (fy + 1) * unit, unit, unit * 2);
    }

    // Rising tiny tremor dust specks
    for (let i = 0; i < 3; i++) {
      const jitterY = Math.sin(simTimeMs * 0.02 + i * 2.1) * unit * 1.4;
      ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
      ctx.fillRect(
        px + (4 + i * 4) * unit,
        py + (7 + i) * unit - Math.abs(jitterY),
        unit,
        unit,
      );
    }
    ctx.restore();
    return;
  }

  drawScatteredRubblePieces(
    ctx,
    px,
    py,
    tileSize,
    cell.seed,
    cell.growth,
    cell.severity === "heavy",
  );
}

/**
 * Renders dense fine pixelated stone, terracotta brick chips, timber splinters,
 * and dust clusters inside one grid cell (shared by static & dynamic rubble).
 */
export function drawScatteredRubblePieces(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  seed: number,
  growth = 1,
  heavy = true,
) {
  const unit = Math.max(2, tileSize / 16);
  const scale = 0.4 + 0.6 * Math.min(1, growth);
  const pieceCount = heavy ? 14 : 9;

  ctx.save();
  // Dust & scorch crater bed
  ctx.fillStyle = heavy ? "rgba(30, 41, 59, 0.56)" : "rgba(51, 65, 85, 0.32)";
  ctx.fillRect(
    px + unit * (heavy ? 1 : 2),
    py + unit * (heavy ? 1 : 2),
    tileSize - unit * (heavy ? 2 : 4),
    tileSize - unit * (heavy ? 2 : 4),
  );

  // Fine crack spokes at edges
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(px + unit * 2, py + unit * 7, unit * 5, unit);
  ctx.fillRect(px + unit * 8, py + unit * 3, unit, unit * 6);

  const stoneColors = [
    "#94a3b8",
    "#64748b",
    "#475569",
    "#b45309",
    "#c2410c",
    "#cbd5e1",
  ];

  for (let i = 0; i < pieceCount; i++) {
    const h = hashPixel(i, pieceCount, seed);
    const gx = 1 + (h % 12);
    const gy = 1 + ((h >>> 4) % 12);
    const pw = Math.max(1, Math.round((1 + (h % 3)) * scale)) * unit;
    const ph = Math.max(1, Math.round((1 + ((h >>> 2) % 2)) * scale)) * unit;
    const sx = px + gx * unit;
    const sy = py + gy * unit;

    // Ground drop shadow under each tiny stone chunk
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(sx + unit * 0.5, sy + unit * 0.5, pw, ph);

    const col = stoneColors[(h >>> 8) % stoneColors.length];
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, pw, ph);

    // Highlight edge on top of stone pixel chunk
    ctx.fillStyle = "rgba(248, 250, 252, 0.45)";
    ctx.fillRect(sx, sy, pw, Math.max(1, unit * 0.6));
  }

  // Timber beam splinter accent on heavy structural collapses
  if (heavy) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(px + unit * 3, py + unit * 10, unit * 9, unit * 2);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(px + unit * 3, py + unit * 10, unit * 9, Math.max(1, unit * 0.6));
  }

  ctx.restore();
}

/**
 * Renders pixelated micro-furniture and outdoor campus props instead of flat boxes.
 */
export function drawPixelCampusProp(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  rawType = "",
) {
  const kind = rawType.toLowerCase();
  const unit = Math.max(2, Math.min(pw, ph) / 10);

  ctx.save();
  // Ground shadow
  ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
  ctx.fillRect(px + unit * 0.8, py + unit * 0.8, pw - unit * 0.5, ph - unit * 0.5);

  if (kind.includes("tree") || kind.includes("pohon")) {
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    const s = Math.min(pw, ph) * 0.44;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(cx - unit, cy + s * 0.2, unit * 2, unit * 2);
    ctx.fillStyle = "#15803d";
    ctx.fillRect(cx - s, cy - s * 0.8, s * 2, s * 1.5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(cx - s * 0.72, cy - s * 0.95, s * 1.44, s * 1.1);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(cx - s * 0.4, cy - s * 0.75, s * 0.7, s * 0.5);
  } else if (kind.includes("lab")) {
    ctx.fillStyle = "#334155";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(px + 3, py + 3, pw - 6, ph * 0.35);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(px + unit * 2, py + ph * 0.5, unit, unit * 1.4);
    ctx.fillStyle = "#a3e635";
    ctx.fillRect(px + unit * 4, py + ph * 0.5, unit, unit * 1.4);
  } else if (kind.includes("uks") || kind.includes("bed")) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(px + pw * 0.42, py + ph * 0.28, pw * 0.16, ph * 0.44);
    ctx.fillRect(px + pw * 0.28, py + ph * 0.42, pw * 0.44, ph * 0.16);
  } else if (kind.includes("car") || kind.includes("mobil") || kind.includes("motor")) {
    ctx.fillStyle = kind.includes("motor") ? "#38bdf8" : "#e11d48";
    ctx.fillRect(px + 3, py + 4, pw - 6, ph - 8);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(px + 5, py + 6, pw - 10, (ph - 12) * 0.4);
  } else {
    // Classic school oak desk & chair pixel sprite
    ctx.fillStyle = "#78350f";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(px + 3, py + 3, pw - 6, ph * 0.52);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(px + pw * 0.28, py + ph * 0.64, pw * 0.44, ph * 0.24);
  }

  ctx.restore();
}

