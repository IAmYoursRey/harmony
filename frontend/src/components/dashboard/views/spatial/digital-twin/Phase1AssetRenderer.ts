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
      case "WALL":
        ctx.fillStyle = "#f97316"; // solid orange
        ctx.fillRect(0, 0, w, h);
        break;

      case "DOOR":
        ctx.fillStyle = "#d97706"; // light brown base
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#b45309";
        ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        break;

      case "DOOR_LOCKED":
        ctx.fillStyle = "#5c3a21"; // dark brown
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#000000";
        ctx.fillRect(w * 0.4, h * 0.4, w * 0.2, h * 0.2); // keyhole hint
        break;

      case "FLOOR":
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        break;

      case "PAVING":
        ctx.fillStyle = "#4b5563"; // dark gray
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        break;

      case "STAIR_UP":
        ctx.fillStyle = "#3b82f6"; // blue
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("UP", w / 2, h / 2);
        break;

      case "STAIR_DOWN":
        ctx.fillStyle = "#3b82f6"; // blue
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DOWN", w / 2, h / 2);
        break;

      case "BORDER":
        ctx.fillStyle = "#ef4444"; // red
        ctx.fillRect(0, 0, w, h);
        break;

      default:
        ctx.fillStyle = "#cccccc";
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
    switch (type) {
      case "FIRE":
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)"; // red
        break;
      case "SMOKE":
        ctx.fillStyle = "rgba(100, 116, 139, 0.6)"; // slate
        break;
      case "DANGER_ZONE":
        ctx.fillStyle = "rgba(249, 115, 22, 0.6)"; // orange
        break;
      case "DAMAGE_ZONE":
        ctx.fillStyle = "rgba(168, 85, 247, 0.6)"; // purple
        break;
      case "BLOCKED_AREA":
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // black
        break;
      case "SAFE_ZONE":
        ctx.fillStyle = "rgba(34, 197, 94, 0.6)"; // green
        break;
      case "EXIT":
        ctx.fillStyle = "rgba(16, 185, 129, 0.8)"; // emerald
        break;
      case "OBJECTIVE":
        ctx.fillStyle = "rgba(59, 130, 246, 0.6)"; // blue
        break;
      case "SPAWN":
        ctx.fillStyle = "rgba(234, 179, 8, 0.8)"; // yellow
        break;
      default:
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    }
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.replace("_ZONE", "").replace("_AREA", ""), w / 2, h / 2);

    ctx.restore();
  }
}
