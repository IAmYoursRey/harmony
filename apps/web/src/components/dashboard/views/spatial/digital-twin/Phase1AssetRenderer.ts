import {
  getDigitalTwinAssetImage,
  onDigitalTwinAssetsLoaded,
} from "./digitalTwinTextures";
import {
  getMicroPixelTileCanvas,
  drawScatteredRubblePieces,
} from "./microPixelArtRenderer";

export class AssetRenderer {
  private static canvasCache: Record<string, HTMLCanvasElement> = {};
  private static assetHookRegistered = false;

  private static ensureAssetHook() {
    if (this.assetHookRegistered) return;
    this.assetHookRegistered = true;
    onDigitalTwinAssetsLoaded(() => {
      this.clearCache();
    });
  }

  static getTexture(
    type: string,
    w: number,
    h: number,
    seed: number = 0,
    variant: number = 0,
  ): HTMLCanvasElement {
    this.ensureAssetHook();
    const variantIdx = ((seed + variant) % 4 + 4) % 4;
    const loadedKey = `${type}_${w}_${h}_${variantIdx}`;
    if (this.canvasCache[loadedKey]) {
      return this.canvasCache[loadedKey];
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      this.drawAsset(ctx, type, w, h, seed, variant);
    }
    this.canvasCache[loadedKey] = canvas;
    return canvas;
  }

  static clearCache() {
    this.canvasCache = {};
  }

  private static drawAsset(
    ctx: CanvasRenderingContext2D,
    type: string,
    w: number,
    h: number,
    seed: number,
    variant: number,
  ) {
    ctx.clearRect(0, 0, w, h);
    const sprite = getMicroPixelTileCanvas(type, seed + variant);
    if (sprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 0, 0, w, h);
      return;
    }

    switch (type) {
      case "WALL": {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#334155";
        ctx.fillRect(1, 1, w - 2, h - 2);
        // Top-left bevel highlight & bottom-right architectural depth
        ctx.fillStyle = "rgba(148, 163, 184, 0.28)";
        ctx.fillRect(1, 1, w - 2, Math.max(2, h * 0.14));
        ctx.fillRect(1, 1, Math.max(2, w * 0.12), h - 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
        ctx.fillRect(1, h - Math.max(2, h * 0.16), w - 2, Math.max(2, h * 0.16));
        ctx.fillRect(w - Math.max(2, w * 0.14), 1, Math.max(2, w * 0.14), h - 2);
        // Subtle block seam
        ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w, h * 0.5);
        ctx.stroke();
        break;
      }

      case "DOOR": {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
        ctx.fillStyle = "#d97706";
        ctx.fillRect(w * 0.16, h * 0.16, w * 0.68, h * 0.68);
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
        ctx.fillStyle = "#fef3c7";
        ctx.beginPath();
        ctx.arc(w * 0.72, h * 0.5, Math.max(1.5, w * 0.075), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "DOOR_LOCKED": {
        ctx.fillStyle = "#451a03";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(w * 0.36, h * 0.32, w * 0.28, h * 0.36);
        break;
      }

      case "FLOOR": {
        const floorImg = getDigitalTwinAssetImage("floorCampus");
        if (floorImg) {
          ctx.drawImage(floorImg, 0, 0, w, h);
          ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
          ctx.lineWidth = 0.75;
          ctx.strokeRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "#f1f5f9";
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, w, h);
        }
        break;
      }

      case "PAVING": {
        const pavingImg = getDigitalTwinAssetImage("pavingCampus");
        if (pavingImg) {
          ctx.drawImage(pavingImg, 0, 0, w, h);
        } else {
          ctx.fillStyle = "#475569";
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, w, h);
        }
        break;
      }

      case "ROAD": {
        const roadImg = getDigitalTwinAssetImage("roadCampus");
        if (roadImg) {
          ctx.drawImage(roadImg, 0, 0, w, h);
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.fillStyle = "rgba(248, 250, 252, 0.38)";
        ctx.fillRect(w * 0.46, h * 0.18, Math.max(2, w * 0.08), h * 0.64);
        break;
      }

      case "GRASS": {
        const grassImg = getDigitalTwinAssetImage("grassCampus");
        if (grassImg) {
          ctx.drawImage(grassImg, 0, 0, w, h);
        } else {
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#15803d";
          ctx.fillRect(w * 0.2, h * 0.3, w * 0.18, h * 0.36);
          ctx.fillRect(w * 0.62, h * 0.45, w * 0.18, h * 0.28);
        }
        break;
      }

      case "COURT_VOLI": {
        ctx.fillStyle = "#c2410c";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        break;
      }

      case "COURT_BASKET": {
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#475569";
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "PARKING": {
        const roadImg = getDigitalTwinAssetImage("roadCampus");
        if (roadImg) {
          ctx.drawImage(roadImg, 0, 0, w, h);
        } else {
          ctx.fillStyle = "#334155";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.strokeStyle = "rgba(248, 250, 252, 0.42)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.18, 0);
        ctx.lineTo(w * 0.18, h);
        ctx.stroke();
        break;
      }

      case "MOSQUE": {
        ctx.fillStyle = "#065f46";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#047857";
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.14, h * 0.14, w * 0.72, h * 0.72);
        break;
      }

      case "STAIR_UP":
      case "STAIR_DOWN": {
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(191, 219, 254, 0.25)";
        for (let step = 0; step < 4; step++) {
          ctx.fillRect(w * 0.12, h * (0.14 + step * 0.2), w * 0.76, h * 0.1);
        }
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (type === "STAIR_UP") {
          ctx.moveTo(w * 0.3, h * 0.7);
          ctx.lineTo(w * 0.5, h * 0.3);
          ctx.lineTo(w * 0.7, h * 0.7);
        } else {
          ctx.moveTo(w * 0.3, h * 0.3);
          ctx.lineTo(w * 0.5, h * 0.7);
          ctx.lineTo(w * 0.7, h * 0.3);
        }
        ctx.stroke();
        break;
      }

      case "BORDER": {
        ctx.fillStyle = "#7f1d1d";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        break;
      }

      default:
        ctx.fillStyle = "#64748b";
        ctx.fillRect(0, 0, w, h);
        break;
    }
  }

  static drawScenarioObject(
    ctx: CanvasRenderingContext2D,
    type: string,
    w: number,
    h: number,
    time: number,
  ) {
    ctx.save();
    const pulse = Math.sin(time / 250) * 0.15 + 0.85;

    switch (type) {
      case "SAFE_ZONE": {
        ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.7 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, 0, w, h);

        const bLen = Math.min(16, Math.min(w, h) * 0.25);
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, bLen);
        ctx.lineTo(0, 0);
        ctx.lineTo(bLen, 0);
        ctx.moveTo(w - bLen, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, bLen);
        ctx.moveTo(0, h - bLen);
        ctx.lineTo(0, h);
        ctx.lineTo(bLen, h);
        ctx.moveTo(w - bLen, h);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h - bLen);
        ctx.stroke();

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.25;
        ctx.fillStyle = `rgba(34, 197, 94, ${0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "EXIT": {
        ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const arrowOffset = ((time / 200) % 8) - 4;
        ctx.strokeStyle = "#34d1bd";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + 4 + arrowOffset, cy - 6);
        ctx.lineTo(cx - 4 + arrowOffset, cy);
        ctx.lineTo(cx + 4 + arrowOffset, cy + 6);
        ctx.stroke();
        break;
      }

      case "SPAWN": {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.38;
        ctx.fillStyle = `rgba(234, 179, 8, ${0.35 * pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r * pulse * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "FIRE": {
        const cx = w / 2;
        const cy = h / 2;
        const fireImg = getDigitalTwinAssetImage("hazardFire");
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
        grad.addColorStop(0, "rgba(254, 240, 138, 0.92)");
        grad.addColorStop(0.45, "rgba(249, 115, 22, 0.72)");
        grad.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        if (fireImg) {
          ctx.translate(cx, cy);
          ctx.rotate(Math.sin(time / 420) * 0.14);
          const s = Math.min(w, h) * (0.9 + Math.sin(time / 150) * 0.08);
          ctx.drawImage(fireImg, -s / 2, -s / 2, s, s);
        }
        break;
      }

      case "SMOKE": {
        ctx.fillStyle = "rgba(71, 85, 105, 0.65)";
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case "BLOCKED_AREA": {
        const cell = Math.min(w, h);
        const cols = Math.max(1, Math.round(w / Math.max(16, cell)));
        const rows = Math.max(1, Math.round(h / Math.max(16, cell)));
        const cw = w / cols;
        const ch = h / rows;
        for (let ry = 0; ry < rows; ry++) {
          for (let rx = 0; rx < cols; rx++) {
            drawScatteredRubblePieces(
              ctx,
              rx * cw,
              ry * ch,
              Math.min(cw, ch),
              (rx * 17 + ry * 31 + 7) | 0,
              1,
              true,
            );
          }
        }
        ctx.strokeStyle = "rgba(245, 158, 11, 0.72)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        break;
      }

      case "DAMAGE_ZONE": {
        ctx.fillStyle = "rgba(220, 38, 38, 0.25)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(0, 0, w, h);
        break;
      }

      default:
        ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
        ctx.fillRect(0, 0, w, h);
        break;
    }

    ctx.restore();
  }
}
