export class AssetRenderer {
  private static canvasCache: Record<string, HTMLCanvasElement> = {};

  static getTexture(
    type: string,
    w: number,
    h: number,
    seed: number = 0,
    variant: number = 0,
  ): HTMLCanvasElement {
    const key = `${type}_${w}_${h}_${variant}`;
    if (this.canvasCache[key]) {
      return this.canvasCache[key];
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      this.drawAsset(ctx, type, w, h, variant);
    }
    this.canvasCache[key] = canvas;
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
    variant: number,
  ) {
    ctx.clearRect(0, 0, w, h);

    switch (type) {
      case "WALL": {
        // 3D beveled architectural wall
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 0, w, h);
        // Highlight on top & left
        ctx.fillStyle = "#475569";
        ctx.fillRect(0, 0, w, Math.max(2, h * 0.15));
        ctx.fillRect(0, 0, Math.max(2, w * 0.15), h);
        // Shadow on bottom & right
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, h - Math.max(2, h * 0.15), w, Math.max(2, h * 0.15));
        ctx.fillRect(w - Math.max(2, w * 0.15), 0, Math.max(2, w * 0.15), h);
        break;
      }

      case "DOOR": {
        // Natural wood door with frame
        ctx.fillStyle = "#78350f";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#d97706";
        ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
        // Door handle
        ctx.fillStyle = "#fef3c7";
        ctx.beginPath();
        ctx.arc(w * 0.75, h * 0.5, Math.max(1.5, w * 0.08), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "DOOR_LOCKED": {
        ctx.fillStyle = "#451a03";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(w * 0.4, h * 0.35, w * 0.2, h * 0.3);
        break;
      }

      case "FLOOR": {
        // Clean interior ceramic/terrazzo classroom tiles
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        break;
      }

      case "PAVING": {
        // Interlocking stone pavers for courtyards / Lapangan Upacara
        ctx.fillStyle = "#475569";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        // Subtle paver pattern
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        ctx.lineTo(w * 0.5, h);
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w, h * 0.5);
        ctx.stroke();
        break;
      }

      case "ROAD": {
        // Dark asphalt with dashed white road marking
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(w * 0.45, h * 0.2, w * 0.1, h * 0.6);
        break;
      }

      case "GRASS": {
        // Lush natural green lawn
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#15803d";
        ctx.fillRect(w * 0.2, h * 0.3, w * 0.2, h * 0.4);
        ctx.fillRect(w * 0.6, h * 0.5, w * 0.2, h * 0.3);
        break;
      }

      case "COURT_VOLI": {
        // Volleyball court: Clay orange with white court boundaries
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        break;
      }

      case "COURT_BASKET": {
        // Basketball court: Slate blue surface with court lines
        ctx.fillStyle = "#475569";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "PARKING": {
        // Paved parking surface with stall lines
        ctx.fillStyle = "#374151";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, 0);
        ctx.lineTo(w * 0.2, h);
        ctx.stroke();
        break;
      }

      case "MOSQUE": {
        // Mosque prayer hall: Emerald green with decorative islamic arch motif
        ctx.fillStyle = "#047857";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
        break;
      }

      case "STAIR_UP": {
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.8);
        ctx.lineTo(w * 0.8, h * 0.2);
        ctx.lineTo(w * 0.4, h * 0.2);
        ctx.stroke();
        break;
      }

      case "STAIR_DOWN": {
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.2);
        ctx.lineTo(w * 0.8, h * 0.8);
        ctx.lineTo(w * 0.4, h * 0.8);
        ctx.stroke();
        break;
      }

      case "BORDER": {
        ctx.fillStyle = "#991b1b";
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
        // Holographic pulsing safe assembly zone (Lapangan Upacara / Lapangan Olahraga)
        ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
        ctx.fillRect(0, 0, w, h);

        // Glowing border
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.7 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, 0, w, h);

        // Tech corner brackets
        const bLen = Math.min(16, Math.min(w, h) * 0.25);
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 3;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(0, bLen);
        ctx.lineTo(0, 0);
        ctx.lineTo(bLen, 0);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(w - bLen, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, bLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(0, h - bLen);
        ctx.lineTo(0, h);
        ctx.lineTo(bLen, h);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - bLen, h);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h - bLen);
        ctx.stroke();

        // Central safety shield beacon symbol
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

        // Target crosshair
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.7, cy);
        ctx.lineTo(cx + radius * 0.7, cy);
        ctx.moveTo(cx, cy - radius * 0.7);
        ctx.lineTo(cx, cy + radius * 0.7);
        ctx.stroke();
        break;
      }

      case "EXIT": {
        // Emerald evacuation exit gate with animated chevron arrows pointing outward
        ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);

        // Directional evacuation arrows (West-facing exit toward Jl. Salak)
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
        // Pulsing golden student spawn point marker with concentric rings
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.38;

        // Radiating pulse
        ctx.fillStyle = `rgba(234, 179, 8, ${0.35 * pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r * pulse * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "FIRE": {
        // Multi-stage animated flame core
        const cx = w / 2;
        const cy = h / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
        grad.addColorStop(0, "rgba(254, 240, 138, 0.95)");
        grad.addColorStop(0.35, "rgba(249, 115, 22, 0.85)");
        grad.addColorStop(0.7, "rgba(239, 68, 68, 0.6)");
        grad.addColorStop(1, "rgba(220, 38, 38, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case "SMOKE": {
        ctx.fillStyle = "rgba(71, 85, 105, 0.65)";
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case "BLOCKED_AREA": {
        // High contrast yellow & black safety hazard stripes
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 6;
        for (let i = -w; i < w + h; i += 16) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i - h, h);
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
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
