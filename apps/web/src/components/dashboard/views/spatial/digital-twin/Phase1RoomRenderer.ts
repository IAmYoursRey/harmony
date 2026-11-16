import type { Phase1Room } from "./Phase1Types";

export interface RoomOverlayOptions {
  showZoneTint?: boolean;
  showLabels?: boolean;
  currentFloorId?: string;
}

/**
 * Renders PDF-matched architectural room tints, landmark flagpole cues,
 * and scale-aware room labels on Digital Twin canvases without obscuring
 * walls, doors, hazard overlays, or player entities.
 */
export function renderRoomOverlays(
  ctx: CanvasRenderingContext2D,
  rooms: Phase1Room[] | undefined,
  tileSize: number,
  options: RoomOverlayOptions = {},
): void {
  if (!rooms || rooms.length === 0) return;

  const { showZoneTint = true, showLabels = true, currentFloorId } = options;

  ctx.save();
  for (const room of rooms) {
    if (currentFloorId && room.floor_id && room.floor_id !== currentFloorId) {
      continue;
    }

    const meta = room.metadata || {};
    const rx = room.x * tileSize;
    const ry = room.y * tileSize;
    const rw = room.width * tileSize;
    const rh = room.height * tileSize;

    if (showZoneTint && typeof meta.color === "string" && meta.color.length > 0) {
      const isOutdoorZone =
        room.type === "parking" ||
        room.type === "gate" ||
        room.type === "assembly" ||
        room.type === "garden";
      const inset = isOutdoorZone ? 0 : tileSize * 0.12;
      ctx.save();
      ctx.globalAlpha = isOutdoorZone ? 0.14 : 0.24;
      ctx.fillStyle = meta.color;
      ctx.fillRect(rx + inset, ry + inset, Math.max(0, rw - inset * 2), Math.max(0, rh - inset * 2));
      ctx.restore();
    }

    if (meta.flagpole && typeof meta.flagpole.x === "number" && typeof meta.flagpole.y === "number") {
      const fp = meta.flagpole;
      const fx = fp.x * tileSize;
      const fy = fp.y * tileSize;
      const fw = Math.max(1.5, fp.width || 2) * tileSize;
      const fh = Math.max(0.8, fp.height || 1) * tileSize;
      ctx.save();
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(fx + 2, fy + 2, fw - 4, (fh - 4) * 0.5);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(fx + 2, fy + 2 + (fh - 4) * 0.5, fw - 4, (fh - 4) * 0.5);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = Math.max(1, tileSize * 0.05);
      ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);
      ctx.restore();
    }

    if (!showLabels) continue;

    const label = String(meta.shortName || room.name || "").trim();
    if (!label) continue;

    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const isLargeZone = room.width >= 10 && room.height >= 6;
    const isNarrowVertical = room.height > room.width * 1.6 && label.length > 5 && room.width <= 6;

    const baseFontPx = isLargeZone
      ? Math.max(12, Math.min(20, tileSize * 0.45))
      : Math.max(9, Math.min(13, tileSize * 0.34));

    ctx.save();
    ctx.translate(cx, cy);
    if (isNarrowVertical) {
      ctx.rotate(-Math.PI / 2);
    }

    const availW = Math.max(12, (isNarrowVertical ? rh : rw) - tileSize * 0.5);
    let fontSize = baseFontPx;
    ctx.font = `700 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    let measured = ctx.measureText(label).width;
    while (measured > availW && fontSize > 7) {
      fontSize -= 0.75;
      ctx.font = `700 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
      measured = ctx.measureText(label).width;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Pill backing only for outdoor/assembly/long room names; crisp halo for compact classroom numbers
    if (isLargeZone || label.length > 4) {
      const padX = Math.max(3, fontSize * 0.32);
      const padY = Math.max(2, fontSize * 0.22);
      const boxW = Math.min(availW + padX, measured + padX * 2);
      const boxH = fontSize + padY * 2;
      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
        ctx.fill();
      } else {
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      }
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(label, 0, 0, availW);
    } else {
      ctx.lineWidth = Math.max(2.5, fontSize * 0.28);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeText(label, 0, 0, availW);
      ctx.fillStyle = "#fef08a";
      ctx.fillText(label, 0, 0, availW);
    }

    ctx.restore();
  }
  ctx.restore();
}
