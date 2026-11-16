import type { DynamicRubbleCell } from "./buildingRubbleEngine";

export type RubbleMaterialKind =
  | "brick_plaster"
  | "timber_tree"
  | "steel_truss"
  | "lab_glass"
  | "mud_rock"
  | "fence_iron";

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
  // Indonesian school architecture: plastered cream/ivory wall over terracotta red bricks
  pxPlot(ctx, 0, 0, 16, 16, "#cbd5e1");

  // Concrete structural lintel & roof-eave cornice highlight at top
  pxPlot(ctx, 0, 0, 16, 2, "#94a3b8");
  pxPlot(ctx, 0, 0, 16, 1, "#f8fafc");

  // Plastered cream/ivory wall body (acian semen berplester cat gading)
  const plasterShades = ["#f3efe6", "#ece5d5", "#e6decb", "#f1ece1"];
  for (let y = 2; y < 11; y++) {
    for (let x = 0; x < 16; x += 2) {
      const h = hashPixel(x, y, variant + 11);
      pxPlot(ctx, x, y, 2, 1, plasterShades[h % plasterShades.length]);
    }
  }

  // Vertical concrete column pilaster edge on every 4th variant
  if (variant === 0) {
    pxPlot(ctx, 0, 1, 3, 14, "#cbd5e1");
    pxPlot(ctx, 0, 1, 1, 14, "#f1f5f9");
  }

  // Exposed Mojokerto terracotta red brick lower plinth courses (bata merah + mortar)
  pxPlot(ctx, 0, 11, 16, 5, "#78716c");
  const brickTones = ["#b94a2c", "#9a3412", "#c2410c", "#a13619"];
  for (let row = 0; row < 2; row++) {
    const py = 11 + row * 2;
    const stagger = (row + variant) % 2 === 1 ? 2 : 0;
    for (let bx = -stagger; bx < 16; bx += 4) {
      const sx = Math.max(0, bx);
      const ex = Math.min(16, bx + 3);
      if (ex <= sx) continue;
      const h = hashPixel(bx, row, variant + 19);
      pxPlot(ctx, sx, py, ex - sx, 2, brickTones[h % brickTones.length]);
      pxPlot(ctx, sx, py, ex - sx, 1, "#d96b43");
    }
  }
  // Occasional weathered plaster chip showing underlying red clay brick
  if (variant === 2) {
    pxPlot(ctx, 6, 6, 3, 2, "#b94a2c");
    pxPlot(ctx, 7, 6, 1, 1, "#d96b43");
  }
  pxPlot(ctx, 0, 15, 16, 1, "#44403c");
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
    cell.materialKind || "brick_plaster",
  );
}

const RUBBLE_PALETTES: Record<
  RubbleMaterialKind,
  { bed: string; darkBed: string; chunks: string[]; trim?: string; beam?: string }
> = {
  brick_plaster: {
    bed: "rgba(120, 113, 108, 0.34)",
    darkBed: "rgba(68, 64, 60, 0.56)",
    chunks: ["#b94a2c", "#9a3412", "#f3efe6", "#d6cfc2", "#67e8f9", "#78716c"],
    trim: "rgba(255, 255, 255, 0.55)",
    beam: "#92400e",
  },
  timber_tree: {
    bed: "rgba(21, 128, 61, 0.25)",
    darkBed: "rgba(69, 39, 18, 0.48)",
    chunks: ["#78350f", "#92400e", "#a16207", "#22c55e", "#15803d", "#eab308"],
    trim: "rgba(187, 247, 208, 0.45)",
    beam: "#78350f",
  },
  steel_truss: {
    bed: "rgba(51, 65, 85, 0.36)",
    darkBed: "rgba(15, 23, 42, 0.6)",
    chunks: ["#64748b", "#94a3b8", "#cbd5e1", "#334155", "#f97316"],
    trim: "rgba(226, 232, 240, 0.65)",
    beam: "#475569",
  },
  lab_glass: {
    bed: "rgba(14, 116, 144, 0.26)",
    darkBed: "rgba(30, 41, 59, 0.52)",
    chunks: ["#22d3ee", "#67e8f9", "#a3e635", "#f1f5f9", "#475569", "#94a3b8"],
    trim: "rgba(207, 250, 254, 0.78)",
    beam: "#334155",
  },
  mud_rock: {
    bed: "rgba(113, 63, 18, 0.45)",
    darkBed: "rgba(69, 26, 3, 0.65)",
    chunks: ["#78350f", "#713f12", "#57534e", "#78716c", "#a16207"],
    trim: "rgba(217, 119, 6, 0.4)",
    beam: "#57534e",
  },
  fence_iron: {
    bed: "rgba(51, 65, 85, 0.32)",
    darkBed: "rgba(15, 23, 42, 0.56)",
    chunks: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#b94a2c"],
    trim: "rgba(248, 250, 252, 0.45)",
    beam: "#0f172a",
  },
};

/**
 * Renders dense material-specific pixel debris chunks (terracotta bricks + plaster,
 * snapped tree branches + leaves, steel roof beams, lab glass, mud rocks, or iron fence)
 * inside one grid cell.
 */
export function drawScatteredRubblePieces(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  seed: number,
  growth = 1,
  heavy = true,
  material: RubbleMaterialKind = "brick_plaster",
) {
  const unit = Math.max(2, tileSize / 16);
  const scale = 0.4 + 0.6 * Math.min(1, growth);
  const pieceCount = heavy ? 15 : 9;
  const palette = RUBBLE_PALETTES[material] || RUBBLE_PALETTES.brick_plaster;

  ctx.save();
  ctx.fillStyle = heavy ? palette.darkBed : palette.bed;
  ctx.fillRect(
    px + unit * (heavy ? 1 : 2),
    py + unit * (heavy ? 1 : 2),
    tileSize - unit * (heavy ? 2 : 4),
    tileSize - unit * (heavy ? 2 : 4),
  );

  ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
  ctx.fillRect(px + unit * 2, py + unit * 7, unit * 5, unit);
  ctx.fillRect(px + unit * 8, py + unit * 3, unit, unit * 6);

  for (let i = 0; i < pieceCount; i++) {
    const h = hashPixel(i, pieceCount, seed);
    const gx = 1 + (h % 12);
    const gy = 1 + ((h >>> 4) % 12);
    const pw = Math.max(1, Math.round((1 + (h % 3)) * scale)) * unit;
    const ph = Math.max(1, Math.round((1 + ((h >>> 2) % 2)) * scale)) * unit;
    const sx = px + gx * unit;
    const sy = py + gy * unit;

    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.fillRect(sx + unit * 0.45, sy + unit * 0.45, pw, ph);

    ctx.fillStyle = palette.chunks[(h >>> 8) % palette.chunks.length];
    ctx.fillRect(sx, sy, pw, ph);

    ctx.fillStyle = palette.trim || "rgba(248, 250, 252, 0.45)";
    ctx.fillRect(sx, sy, pw, Math.max(1, unit * 0.55));
  }

  if (heavy && palette.beam) {
    ctx.fillStyle = palette.beam;
    ctx.fillRect(px + unit * 3, py + unit * 10, unit * 9, unit * 2);
    ctx.fillStyle = material === "timber_tree" ? "#4ade80" : "rgba(255,255,255,0.28)";
    ctx.fillRect(px + unit * 3, py + unit * 10, material === "timber_tree" ? unit * 3 : unit * 9, Math.max(1, unit * 0.6));
  }

  ctx.restore();
}

/**
 * Renders pixelated micro-furniture, campus shade trees, ornamental pots,
 * emergency signs, and parked vehicles instead of flat boxes.
 */
export function drawPixelCampusProp(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  rawType = "",
  simTimeMs = 0,
  propSeed = 0,
) {
  const kind = rawType.toLowerCase();
  const unit = Math.max(2, Math.min(pw, ph) / 10);

  ctx.save();

  if (kind === "emergency_sign" || kind.includes("sign") || kind.includes("jalur")) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    ctx.fillRect(px + unit * 1.5, py + unit * 1.5, pw - unit * 2, ph - unit * 2);
    ctx.fillStyle = "#059669";
    ctx.fillRect(px + unit, py + unit, pw - unit * 2, ph - unit * 2);
    ctx.strokeStyle = "#ecfdf5";
    ctx.lineWidth = Math.max(1.5, unit * 0.5);
    ctx.strokeRect(px + unit, py + unit, pw - unit * 2, ph - unit * 2);
    ctx.fillStyle = "#ffffff";
    const cx = px + pw * 0.5;
    const cy = py + ph * 0.5;
    ctx.fillRect(cx - unit * 1.6, cy - unit * 0.5, unit * 2.2, unit);
    ctx.fillRect(cx + unit * 0.4, cy - unit * 1.3, unit, unit * 2.6);
    ctx.restore();
    return;
  }

  if (kind.includes("ornamental") || kind.includes("hiasan") || kind.includes("flower")) {
    const cx = px + pw * 0.5;
    const cy = py + ph * 0.5;
    const r = Math.min(pw, ph) * 0.36;
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.fillRect(cx - r * 0.9, cy + r * 0.3, r * 1.8, r * 0.7);
    // Terracotta school planter pot
    ctx.fillStyle = "#9a3412";
    ctx.fillRect(cx - r * 0.68, cy + r * 0.1, r * 1.36, r * 0.68);
    ctx.fillStyle = "#c2410c";
    ctx.fillRect(cx - r * 0.78, cy - r * 0.02, r * 1.56, r * 0.25);
    // Trimmed ornamental foliage (Pucuk Merah / Bunga Taman)
    ctx.fillStyle = "#15803d";
    ctx.fillRect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 0.98);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(cx - r * 0.65, cy - r * 0.95, r * 1.3, r * 0.75);
    if (kind.includes("flower") || propSeed % 2 === 0) {
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(cx - r * 0.4, cy - r * 0.92, unit * 1.4, unit * 1.2);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(cx + r * 0.15, cy - r * 0.6, unit * 1.1, unit * 1.1);
    } else {
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(cx - r * 0.35, cy - r * 1.05, r * 0.7, r * 0.38);
    }
    ctx.restore();
    return;
  }

  if (kind.includes("tree") || kind.includes("pohon")) {
    const sway = Math.sin(simTimeMs * 0.002 + propSeed) * unit * 0.35;
    const cx = px + pw / 2 + sway;
    const cy = py + ph / 2;
    const s = Math.min(pw, ph) * 0.46;
    // Soft canopy ground shadow
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.fillRect(cx - s * 0.85 + unit, cy - s * 0.35 + unit * 1.2, s * 1.75, s * 1.45);
    // Brown wood trunk
    ctx.fillStyle = "#78350f";
    ctx.fillRect(cx - unit * 1.1, cy + s * 0.1, unit * 2.2, unit * 2.5);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(cx - unit * 0.6, cy + s * 0.15, unit * 0.8, unit * 2.2);
    // Layered pixel leaf crown
    ctx.fillStyle = "#14532d";
    ctx.fillRect(cx - s, cy - s * 0.82, s * 2, s * 1.45);
    ctx.fillStyle = "#15803d";
    ctx.fillRect(cx - s * 0.88, cy - s * 0.95, s * 1.76, s * 1.26);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(cx - s * 0.62, cy - s * 0.88, s * 1.24, s * 0.85);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(cx - s * 0.36, cy - s * 0.76, s * 0.65, s * 0.44);
    ctx.restore();
    return;
  }

  // Ground shadow for solid indoor/outdoor props
  ctx.fillStyle = "rgba(15, 23, 42, 0.24)";
  ctx.fillRect(px + unit * 0.8, py + unit * 0.8, pw - unit * 0.5, ph - unit * 0.5);

  if (kind.includes("lab")) {
    ctx.fillStyle = "#334155";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(px + 3, py + 3, pw - 6, ph * 0.35);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(px + unit * 2, py + ph * 0.5, unit, unit * 1.4);
    ctx.fillStyle = "#a3e635";
    ctx.fillRect(px + unit * 4, py + ph * 0.5, unit, unit * 1.4);
  } else if (kind.includes("book")) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    const spines = ["#ef4444", "#3b82f6", "#facc15", "#22c55e"];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = spines[i];
      ctx.fillRect(px + 4 + i * unit * 1.5, py + 4, unit, ph * 0.55);
    }
  } else if (kind.includes("uks") || kind.includes("bed")) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(px + pw * 0.42, py + ph * 0.28, pw * 0.16, ph * 0.44);
    ctx.fillRect(px + pw * 0.28, py + ph * 0.42, pw * 0.44, ph * 0.16);
  } else if (kind.includes("car") || kind.includes("mobil") || kind.includes("motor")) {
    ctx.fillStyle = kind.includes("motor") ? "#0ea5e9" : "#e11d48";
    ctx.fillRect(px + 3, py + 4, pw - 6, ph - 8);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(px + 5, py + 6, pw - 10, (ph - 12) * 0.4);
  } else {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(px + 3, py + 3, pw - 6, ph * 0.52);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(px + pw * 0.28, py + ph * 0.64, pw * 0.44, ph * 0.24);
  }

  ctx.restore();
}

