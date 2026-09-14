import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Phase1Map,
  Phase1Tile,
  Phase1Object,
  Phase1Boundary,
  Phase1Stairs,
  Phase1Scenario,
  Phase1ScenarioObject,
  Phase1Room,
} from "./Phase1Types";
import {
  TILE_DEFINITIONS,
  ROOM_TYPES,
  TileDefinition,
  TileCategory,
} from "./Phase1TileDefinitions";
import { AssetRenderer } from "./Phase1AssetRenderer";
import { getGSS } from "@/data/userProfiles";

const generateSafeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export interface Phase1CanvasProps {
  map: Phase1Map;
  activeFloorIndex: number;
  activeTool: string;
  activeDefinitionId?: string | null;
  onMapChange: (newMap: Phase1Map) => void;
  onSelect: (item: any) => void;
  scenario?: Phase1Scenario;
  isScenarioMode?: boolean;
  onScenarioChange?: (newScen: Phase1Scenario) => void;
  onScenarioChangeEnd?: () => void;
  onMapChangeEnd?: () => void;
  onHoverChange?: (x: number, y: number) => void;
  showRoomLabels?: boolean;
  visibleLayers?: Record<string, boolean>;
}

const TILE_SIZE = 40;
const DEBUG_MODE = true; // Temporary local development visualization

export function Phase1Canvas({
  map,
  activeFloorIndex,
  activeTool,
  activeDefinitionId,
  onMapChange,
  onMapChangeEnd,
  onSelect,
  scenario,
  isScenarioMode,
  onScenarioChange,
  onScenarioChangeEnd,
  onHoverChange,
  showRoomLabels,
  visibleLayers,
}: Phase1CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverGrid, setHoverGrid] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [roomDragStart, setRoomDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    type: "tile" | "object" | "room" | "stair" | "scenario";
  } | null>(null);
  const [dragEntity, setDragEntity] = useState<{
    id: string;
    type: "tile" | "object" | "room" | "stair" | "scenario";
    startX: number;
    startY: number;
    startGridX: number;
    startGridY: number;
  } | null>(null);

  const [borderStart, setBorderStart] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [currentRotation, setCurrentRotation] = useState(0);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setCanvasSize({ width, height });
      }
    });
    observer.observe(container);
    setCanvasSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select"
      )
        return;

      if (e.code === "Space") setIsSpaceDown(true);
      if (e.code === "KeyR" && activeDefinitionId && !isSpaceDown) {
        setCurrentRotation((prev) => (prev + 90) % 360);
      }
      if (
        e.code === "KeyR" &&
        (activeTool === "select" || activeTool === "move") &&
        selectedEntity
      ) {
        const newMap = { ...map };
        const floor = newMap.floors[activeFloorIndex];
        let found = false;

        if (selectedEntity.type === "object") {
          const obj = floor.objects.find(
            (o: any) => o.id === selectedEntity.id,
          );
          if (obj) {
            obj.rotation = ((obj.rotation || 0) + 90) % 360;

            if (obj.width !== obj.height) {
              const temp = obj.width;
              obj.width = obj.height;
              obj.height = temp;
            }
            found = true;
          }
        } else if (selectedEntity.type === "tile") {
          const t = floor.tiles.find((t: any) => t.id === selectedEntity.id);
          if (t) {
            t.rotation = ((t.rotation || 0) + 90) % 360;
            found = true;
          }
        }

        if (found) onMapChange(newMap);
      }
      if (
        (e.code === "Delete" || e.code === "Backspace") &&
        selectedEntity &&
        (activeTool === "select" || activeTool === "move")
      ) {
        const newMap = { ...map };
        const floor = newMap.floors[activeFloorIndex];
        if (selectedEntity.type === "object")
          floor.objects = floor.objects.filter(
            (o: any) => o.id !== selectedEntity.id,
          );
        if (selectedEntity.type === "tile")
          floor.tiles = floor.tiles.filter(
            (t: any) => t.id !== selectedEntity.id,
          );
        if (selectedEntity.type === "room")
          newMap.rooms = newMap.rooms.filter(
            (r: any) => r.id !== selectedEntity.id,
          );
        if (selectedEntity.type === "stair")
          newMap.stairs = newMap.stairs.filter(
            (s: any) => s.id !== selectedEntity.id,
          );
        onMapChange(newMap);
        setSelectedEntity(null);
      }
      if (
        e.code === "KeyD" &&
        (e.ctrlKey || e.metaKey) &&
        selectedEntity &&
        (activeTool === "select" || activeTool === "move")
      ) {
        e.preventDefault();

        const newMap = { ...map };
        const floor = newMap.floors[activeFloorIndex];
        let newEntityId = generateSafeId();
        let found = false;

        if (selectedEntity.type === "object") {
          const obj = floor.objects.find(
            (o: any) => o.id === selectedEntity.id,
          );
          if (obj) {
            floor.objects.push({
              ...obj,
              id: newEntityId,
              x: obj.x + 1,
              y: obj.y + 1,
            });
            found = true;
          }
        } else if (selectedEntity.type === "tile") {
          const t = floor.tiles.find((t: any) => t.id === selectedEntity.id);
          if (t) {
            floor.tiles.push({ ...t, id: newEntityId, x: t.x + 1, y: t.y + 1 });
            found = true;
          }
        } else if (selectedEntity.type === "room") {
          const r = newMap.rooms?.find((r: any) => r.id === selectedEntity.id);
          if (r) {
            newMap.rooms.push({
              ...r,
              id: newEntityId,
              x: r.x + 1,
              y: r.y + 1,
            });
            found = true;
          }
        }

        if (found) {
          onMapChange(newMap);
          setSelectedEntity({ ...selectedEntity, id: newEntityId });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpaceDown(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    activeDefinitionId,
    isSpaceDown,
    selectedEntity,
    activeTool,
    map,
    activeFloorIndex,
    onMapChange,
  ]);

  const getAutoTileMask = (
    floor: any,
    x: number,
    y: number,
    category: string,
  ) => {
    let mask = 0;
    const isSame = (tx: number, ty: number) => {
      return floor.tiles?.some(
        (t: any) =>
          t.x === tx &&
          t.y === ty &&
          TILE_DEFINITIONS[t.tile_type]?.category === category,
      );
    };
    if (isSame(x, y - 1)) mask |= 1; // N
    if (isSame(x + 1, y)) mask |= 2; // E
    if (isSame(x, y + 1)) mask |= 4; // S
    if (isSame(x - 1, y)) mask |= 8; // W
    return mask; // 0-15
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      canvas.width !== canvasSize.width ||
      canvas.height !== canvasSize.height
    ) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const floor = map.floors[activeFloorIndex];
    if (!floor) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const offsetX = canvas.width / 2 + camera.x;
    const offsetY = canvas.height / 2 + camera.y;
    ctx.translate(offsetX, offsetY);
    ctx.scale(camera.zoom, camera.zoom);

    const viewLeft = -offsetX / camera.zoom;
    const viewTop = -offsetY / camera.zoom;
    const viewRight = (canvas.width - offsetX) / camera.zoom;
    const viewBottom = (canvas.height - offsetY) / camera.zoom;

    const startGridX = Math.floor(viewLeft / TILE_SIZE) - 1;
    const endGridX = Math.ceil(viewRight / TILE_SIZE) + 1;
    const startGridY = Math.floor(viewTop / TILE_SIZE) - 1;
    const endGridY = Math.ceil(viewBottom / TILE_SIZE) + 1;

    if (visibleLayers?.grid !== false) {
      ctx.fillStyle = "#1e293b"; // slate-800 - dark navy/blue working surface
      ctx.fillRect(
        viewLeft,
        viewTop,
        viewRight - viewLeft,
        viewBottom - viewTop,
      );

      if (map.border) {
        ctx.fillStyle = "#334155"; // slate-700
        ctx.fillRect(
          map.border.minX * TILE_SIZE,
          map.border.minY * TILE_SIZE,
          map.border.width * TILE_SIZE,
          map.border.height * TILE_SIZE,
        );
      } else {
        ctx.fillStyle = "#334155"; // slate-700
        ctx.fillRect(0, 0, map.width * TILE_SIZE, map.height * TILE_SIZE);
      }

      const showMinor = camera.zoom > 0.4;
      ctx.strokeStyle = showMinor ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;

      for (let x = startGridX; x <= endGridX; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, viewTop);
        ctx.lineTo(x * TILE_SIZE, viewBottom);
        ctx.stroke();
      }
      for (let y = startGridY; y <= endGridY; y++) {
        ctx.beginPath();
        ctx.moveTo(viewLeft, y * TILE_SIZE);
        ctx.lineTo(viewRight, y * TILE_SIZE);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      for (let x = Math.floor(startGridX / 10) * 10; x <= endGridX; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, viewTop);
        ctx.lineTo(x * TILE_SIZE, viewBottom);
        ctx.stroke();
      }
      for (let y = Math.floor(startGridY / 10) * 10; y <= endGridY; y += 10) {
        ctx.beginPath();
        ctx.moveTo(viewLeft, y * TILE_SIZE);
        ctx.lineTo(viewRight, y * TILE_SIZE);
        ctx.stroke();
      }
    }

    const drawFloorContent = (floorToDraw: any, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;

      const sortedFloorTiles = [...(floorToDraw.tiles || [])].sort(
        (a: any, b: any) => {
          const catA = TILE_DEFINITIONS[a.tile_type]?.category;
          const catB = TILE_DEFINITIONS[b.tile_type]?.category;
          const rank = (cat: string) =>
            cat === "FLOOR"
              ? 0
              : cat === "WALL"
                ? 1
                : cat === "OPENING"
                  ? 2
                  : 3;
          return rank(catA) - rank(catB);
        },
      );

      sortedFloorTiles.forEach((tile: any) => {
        const def = TILE_DEFINITIONS[tile.tile_type];
        if (!def) return;
        const tpx = tile.x * TILE_SIZE;
        const tpy = tile.y * TILE_SIZE;
        ctx.save();
        ctx.translate(tpx + TILE_SIZE / 2, tpy + TILE_SIZE / 2);
        ctx.rotate(((tile.rotation || 0) * Math.PI) / 180);
        ctx.translate(-TILE_SIZE / 2, -TILE_SIZE / 2);
        const tex = AssetRenderer.getTexture(
          def.id,
          TILE_SIZE,
          TILE_SIZE,
          tile.variant || 0,
          0,
        );
        ctx.drawImage(tex, 0, 0);
        ctx.restore();
      });

      floorToDraw.objects?.forEach((obj: any) => {
        const def = TILE_DEFINITIONS[obj.object_type];
        if (!def) return;
        const opx = obj.x * TILE_SIZE;
        const opy = obj.y * TILE_SIZE;
        const ow = (obj.width || 1) * TILE_SIZE;
        const oh = (obj.height || 1) * TILE_SIZE;
        ctx.save();
        ctx.translate(opx + ow / 2, opy + oh / 2);
        ctx.rotate(((obj.rotation || 0) * Math.PI) / 180);
        ctx.translate(-ow / 2, -oh / 2);
        const tex = AssetRenderer.getTexture(
          def.id,
          ow,
          oh,
          obj.variant || 0,
          0,
        );
        ctx.drawImage(tex, 0, 0);
        ctx.restore();
      });

      ctx.restore();
    };

    if (activeFloorIndex > 0) {
      const belowFloor = map.floors[activeFloorIndex - 1];
      if (belowFloor) {
        drawFloorContent(belowFloor, 0.25);
      }
    }

    drawFloorContent(floor, 1.0);

    if (showRoomLabels) {
      map.rooms
        ?.filter((r: any) => r.floor_id === floor.id)
        .forEach((room) => {
          const px = room.x * TILE_SIZE;
          const py = room.y * TILE_SIZE;
          const w = room.width * TILE_SIZE;
          const h = room.height * TILE_SIZE;
          ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
          ctx.fillRect(px, py, w, h);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
          ctx.strokeRect(px, py, w, h);

          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(room.name || room.type, px + 8, py + 20);

          if (DEBUG_MODE) {
            ctx.font = "10px monospace";
            ctx.fillText(`[${room.width}x${room.height}]`, px + 8, py + 32);
          }
        });
    }

    if (map.border) {
      const bx = map.border.minX * TILE_SIZE;
      const by = map.border.minY * TILE_SIZE;
      const bw = map.border.width * TILE_SIZE;
      const bh = map.border.height * TILE_SIZE;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.rect(viewLeft, viewTop, viewRight - viewLeft, viewBottom - viewTop);
      ctx.rect(bx, by, bw, bh);
      ctx.fill("evenodd");

      ctx.strokeStyle = "#ef4444"; // red-500
      ctx.lineWidth = 4;
      ctx.strokeRect(bx, by, bw, bh);
    }

    if (isScenarioMode) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(-10000, -10000, 20000, 20000);

      if (scenario && scenario.objects) {
        const now = Date.now();
        scenario.objects
          .filter((o: any) => o.floor_id === floor.id)
          .forEach((obj) => {
            const px = obj.x * TILE_SIZE;
            const py = obj.y * TILE_SIZE;
            const w = (obj.width || 1) * TILE_SIZE;
            const h = (obj.height || 1) * TILE_SIZE;

            ctx.save();
            ctx.translate(px + w / 2, py + h / 2);
            ctx.rotate(((obj.rotation || 0) * Math.PI) / 180);
            ctx.translate(-w / 2, -h / 2);

            AssetRenderer.drawScenarioObject(ctx, obj.object_type, w, h, now);

            ctx.restore();
          });
      }
    }

    if (selectedEntity && (activeTool === "select" || activeTool === "move")) {
      let px, py, w, h;
      if (selectedEntity.type === "object") {
        const o = floor.objects?.find((x: any) => x.id === selectedEntity.id);
        if (o) {
          px = o.x;
          py = o.y;
          w = o.width;
          h = o.height;
        }
      } else if (selectedEntity.type === "tile") {
        const t = floor.tiles?.find((x: any) => x.id === selectedEntity.id);
        if (t) {
          px = t.x;
          py = t.y;
          w = 1;
          h = 1;
        }
      } else if (selectedEntity.type === "room") {
        const r = map.rooms?.find((x: any) => x.id === selectedEntity.id);
        if (r) {
          px = r.x;
          py = r.y;
          w = r.width;
          h = r.height;
        }
      } else if (selectedEntity.type === "stair") {
        const s = map.stairs?.find((x: any) => x.id === selectedEntity.id);
        if (s) {
          px = s.x;
          py = s.y;
          w = 2;
          h = 2;
        }
      }

      if (px !== undefined && py !== undefined) {
        ctx.strokeStyle = "#3b82f6"; // blue-500
        ctx.lineWidth = 3;

        let dx = 0,
          dy = 0;
        if (dragEntity && hoverGrid) {
          dx = hoverGrid.x - dragEntity.startGridX;
          dy = hoverGrid.y - dragEntity.startGridY;
        }

        const drawPx = (px + dx) * TILE_SIZE;
        const drawPy = (py + dy) * TILE_SIZE;
        ctx.strokeRect(drawPx, drawPy, w! * TILE_SIZE, h! * TILE_SIZE);

        if (DEBUG_MODE) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
          ctx.font = "bold 10px monospace";
          ctx.fillText(
            `SEL C(${px + dx},${py + dy}) ${w}x${h}`,
            drawPx + 2,
            drawPy - 4,
          );
        }
      }
    }

    if (hoverGrid && !isSpaceDown) {
      const px = hoverGrid.x * TILE_SIZE;
      const py = hoverGrid.y * TILE_SIZE;

      if (activeTool === "eraser") {
        let found: any = null;
        const obj = floor.objects?.find(
          (o: any) =>
            hoverGrid.x >= o.x &&
            hoverGrid.x < o.x + o.width &&
            hoverGrid.y >= o.y &&
            hoverGrid.y < o.y + o.height,
        );
        if (obj) found = obj;
        else {
          const sortedTiles = [...(floor.tiles || [])].sort((a, b) => {
            const catA = TILE_DEFINITIONS[a.tile_type]?.category;
            const catB = TILE_DEFINITIONS[b.tile_type]?.category;
            const rank = (c: string) => (c === "FLOOR" ? 0 : 1);
            return rank(catB) - rank(catA);
          });
          const t = sortedTiles.find(
            (t: any) => t.x === hoverGrid.x && t.y === hoverGrid.y,
          );
          if (t) found = { x: t.x, y: t.y, width: 1, height: 1 };
          else {
            const r = map.rooms?.find(
              (rm: any) =>
                rm.floor_id === floor.id &&
                hoverGrid.x >= rm.x &&
                hoverGrid.x < rm.x + rm.width &&
                hoverGrid.y >= rm.y &&
                hoverGrid.y < rm.y + rm.height,
            );
            if (r) found = r;
          }
        }

        if (found) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)"; // red-500
          ctx.fillRect(
            found.x * TILE_SIZE,
            found.y * TILE_SIZE,
            (found.width || 1) * TILE_SIZE,
            (found.height || 1) * TILE_SIZE,
          );
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            found.x * TILE_SIZE,
            found.y * TILE_SIZE,
            (found.width || 1) * TILE_SIZE,
            (found.height || 1) * TILE_SIZE,
          );
        }
      } else if (
        (activeTool === "select" || activeTool === "move") &&
        !dragEntity
      ) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

        if (DEBUG_MODE) {
          ctx.fillStyle = "#3b82f6";
          ctx.font = "10px monospace";
          ctx.fillText(`C(${hoverGrid.x},${hoverGrid.y})`, px + 2, py + 12);
        }
      } else if (
        activeDefinitionId &&
        activeTool !== "ROOM" &&
        activeTool !== "BOUNDARY"
      ) {
        const def = TILE_DEFINITIONS[activeDefinitionId];
        if (def) {
          const valid = isValidPlacement(
            activeDefinitionId,
            hoverGrid.x,
            hoverGrid.y,
            currentRotation,
            floor,
          );
          let wGrid = def.defaultWidth || 1;
          let hGrid = def.defaultHeight || 1;
          if (currentRotation === 90 || currentRotation === 270) {
            wGrid = def.defaultHeight || 1;
            hGrid = def.defaultWidth || 1;
          }

          if (valid) {
            ctx.fillStyle = "rgba(147, 197, 253, 0.45)"; // light blue, slightly transparent
            ctx.fillRect(px, py, wGrid * TILE_SIZE, hGrid * TILE_SIZE);
            ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, wGrid * TILE_SIZE, hGrid * TILE_SIZE);
          } else {
            ctx.fillStyle = "rgba(239, 68, 68, 0.45)"; // red, invalid
            ctx.fillRect(px, py, wGrid * TILE_SIZE, hGrid * TILE_SIZE);
            ctx.strokeStyle = "rgba(220, 38, 38, 0.7)";
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, wGrid * TILE_SIZE, hGrid * TILE_SIZE);
          }
        }
      } else if (activeTool === "move" || activeTool === "select") {
        ctx.fillStyle = "rgba(147, 197, 253, 0.2)";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }

      if (activeTool === "ROOM") {
        if (roomDragStart) {
          const minX = Math.min(roomDragStart.x, hoverGrid.x);
          const minY = Math.min(roomDragStart.y, hoverGrid.y);
          const maxX = Math.max(roomDragStart.x, hoverGrid.x);
          const maxY = Math.max(roomDragStart.y, hoverGrid.y);
          const wGrid = maxX - minX + 1;
          const hGrid = maxY - minY + 1;
          const w = wGrid * TILE_SIZE;
          const h = hGrid * TILE_SIZE;
          ctx.fillStyle = "rgba(56, 189, 248, 0.3)"; // sky
          ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w, h);
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 2;
          ctx.strokeRect(minX * TILE_SIZE, minY * TILE_SIZE, w, h);

          ctx.fillStyle = "white";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(
            `${wGrid} x ${hGrid} cells`,
            minX * TILE_SIZE + 4,
            minY * TILE_SIZE - 6,
          );
        } else {
          ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }

      if (activeTool === "BORDER" && borderStart && hoverGrid) {
        const minX = Math.min(borderStart.x, hoverGrid.x);
        const minY = Math.min(borderStart.y, hoverGrid.y);
        const maxX = Math.max(borderStart.x, hoverGrid.x);
        const maxY = Math.max(borderStart.y, hoverGrid.y);
        const w = (maxX - minX + 1) * TILE_SIZE;
        const h = (maxY - minY + 1) * TILE_SIZE;

        ctx.fillStyle = "rgba(239, 68, 68, 0.2)"; // red-500 alpha
        ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w, h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(minX * TILE_SIZE, minY * TILE_SIZE, w, h);
      }
    }

    ctx.restore();
  }, [
    map,
    activeFloorIndex,
    canvasSize,
    camera,
    activeTool,
    activeDefinitionId,
    hoverGrid,
    currentRotation,
    isSpaceDown,
    roomDragStart,
    scenario,
    isScenarioMode,
  ]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  const isValidPlacement = (
    defId: string,
    x: number,
    y: number,
    rotation: number,
    floor: any,
  ) => {
    const def = TILE_DEFINITIONS[defId];
    if (!def) return false;
    let wGrid = def.defaultWidth || 1;
    let hGrid = def.defaultHeight || 1;
    if (rotation === 90 || rotation === 270) {
      wGrid = def.defaultHeight || 1;
      hGrid = def.defaultWidth || 1;
    }
    if (map.border) {
      if (
        x < map.border.minX ||
        y < map.border.minY ||
        x + wGrid - 1 > map.border.maxX ||
        y + hGrid - 1 > map.border.maxY
      )
        return false;
    } else {
      if (x < 0 || y < 0 || x + wGrid > map.width || y + hGrid > map.height)
        return false;
    }

    if (def.category === "OBJECTS" || def.category === "DECORATION") {
      const overlapObject = floor.objects?.some(
        (o: any) =>
          x < o.x + o.width &&
          x + wGrid > o.x &&
          y < o.y + o.height &&
          y + hGrid > o.y,
      );
      if (overlapObject) return false;
      const overlapWall = floor.tiles?.some((t: any) => {
        const tDef = TILE_DEFINITIONS[t.tile_type];
        return (
          tDef &&
          (tDef.category === "WALL" || tDef.category === "OPENING") &&
          x <= t.x &&
          x + wGrid > t.x &&
          y <= t.y &&
          y + hGrid > t.y
        );
      });
      if (overlapWall) return false;
    }

    return true; // For tiles (Wall, Floor, Door, Stair), they replace each other, so placement is always valid on the grid
  };

  const getGridCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const yPx = clientY - rect.top;

    const offsetX = canvasSize.width / 2 + camera.x;
    const offsetY = canvasSize.height / 2 + camera.y;

    const worldX = (xPx - offsetX) / camera.zoom;
    const worldY = (yPx - offsetY) / camera.zoom;

    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);

    return { x: gridX, y: gridY };
  };

  const [lastDrawGrid, setLastDrawGrid] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getGridCoords(e.clientX, e.clientY);
    setLastMouse({ x: e.clientX, y: e.clientY });

    if (isSpaceDown || e.button === 1 || e.button === 2) {
      setIsDragging(true);
      return;
    }

    if (activeTool === "select" || activeTool === "move") {
      const floor = map.floors[activeFloorIndex];

      let found: {
        id: string;
        type: "tile" | "object" | "room" | "stair" | "scenario";
      } | null = null;

      if (isScenarioMode && scenario?.objects) {
        const sObj = scenario.objects.find(
          (o: any) =>
            o.floor_id === floor.id &&
            coords.x >= o.x &&
            coords.x < o.x + (o.width || 1) &&
            coords.y >= o.y &&
            coords.y < o.y + (o.height || 1),
        );
        if (sObj) found = { id: sObj.id, type: "scenario" };
      }

      if (!found && !isScenarioMode) {
        const obj = floor.objects?.find(
          (o: any) =>
            coords.x >= o.x &&
            coords.x < o.x + o.width &&
            coords.y >= o.y &&
            coords.y < o.y + o.height,
        );
        if (obj) found = { id: obj.id, type: "object" };
        else {
          const stair = map.stairs?.find(
            (s: any) =>
              s.x === coords.x &&
              s.y === coords.y &&
              (s.from_floor_id === floor.id || s.to_floor_id === floor.id),
          );
          if (stair) found = { id: stair.id, type: "stair" };
          else {
            const tile = [...(floor.tiles || [])]
              .reverse()
              .find((t: any) => t.x === coords.x && t.y === coords.y);
            if (tile) found = { id: tile.id, type: "tile" };
            else {
              const room = map.rooms?.find(
                (r: any) =>
                  r.floor_id === floor.id &&
                  coords.x >= r.x &&
                  coords.x < r.x + r.width &&
                  coords.y >= r.y &&
                  coords.y < r.y + r.height,
              );
              if (room) found = { id: room.id, type: "room" };
            }
          }
        }
      }

      setSelectedEntity(found);
      if (found) {
        setDragEntity({
          ...found,
          startX: coords.x,
          startY: coords.y,
          startGridX: coords.x,
          startGridY: coords.y,
        });
      }
      return;
    }

    setIsDrawing(true);

    if (activeTool === "BORDER") {
      if (!borderStart) {
        setBorderStart({ x: coords.x, y: coords.y });
      } else {
        const minX = Math.min(borderStart.x, coords.x);
        const minY = Math.min(borderStart.y, coords.y);
        const maxX = Math.max(borderStart.x, coords.x);
        const maxY = Math.max(borderStart.y, coords.y);

        const newMap = {
          ...map,
          border: {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
        };
        onMapChange(newMap);
        setBorderStart(null);
      }
      return;
    }

    if (activeTool === "ROOM") {
      setRoomDragStart(coords);
    } else if (isScenarioMode) {
      applyScenarioTool(coords.x, coords.y);
      setLastDrawGrid(coords);
    } else {
      applyTool(coords.x, coords.y);
      setLastDrawGrid(coords);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getGridCoords(e.clientX, e.clientY);
    if (coords.x !== hoverGrid?.x || coords.y !== hoverGrid?.y) {
      setHoverGrid(coords);
      if (onHoverChange) onHoverChange(coords.x, coords.y);
    }

    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (
      isDrawing &&
      activeTool !== "ROOM" &&
      activeTool !== "BORDER" &&
      activeTool !== "select" &&
      activeTool !== "move"
    ) {
      if (lastDrawGrid) {
        const dx = Math.abs(coords.x - lastDrawGrid.x);
        const dy = Math.abs(coords.y - lastDrawGrid.y);
        const sx = lastDrawGrid.x < coords.x ? 1 : -1;
        const sy = lastDrawGrid.y < coords.y ? 1 : -1;
        let err = dx - dy;

        let cx = lastDrawGrid.x;
        let cy = lastDrawGrid.y;

        while (cx !== coords.x || cy !== coords.y) {
          const e2 = 2 * err;
          if (e2 > -dy) {
            err -= dy;
            cx += sx;
          }
          if (e2 < dx) {
            err += dx;
            cy += sy;
          }
          if (isScenarioMode) applyScenarioTool(cx, cy);
          else applyTool(cx, cy);
        }
      } else {
        if (isScenarioMode) applyScenarioTool(coords.x, coords.y);
        else applyTool(coords.x, coords.y);
      }
      setLastDrawGrid(coords);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const coords = getGridCoords(e.clientX, e.clientY);

    if (dragEntity) {
      const dx = coords.x - dragEntity.startGridX;
      const dy = coords.y - dragEntity.startGridY;

      if (dx !== 0 || dy !== 0) {
        if (
          isScenarioMode &&
          dragEntity.type === "scenario" &&
          scenario &&
          onScenarioChange
        ) {
          const newScen = { ...scenario };
          newScen.objects = [...(newScen.objects || [])];
          const o = newScen.objects.find((o: any) => o.id === dragEntity.id);
          if (o) {
            o.x += dx;
            o.y += dy;
          }
          onScenarioChange(newScen);
          if (onScenarioChangeEnd) onScenarioChangeEnd();
        } else if (!isScenarioMode) {
          const newMap = { ...map };
          const floor = { ...newMap.floors[activeFloorIndex] };
          newMap.floors[activeFloorIndex] = floor;

          let validMove = true;

          if (dragEntity.type === "object") {
            const o = floor.objects?.find((o: any) => o.id === dragEntity.id);
            if (o) {
              const newX = o.x + dx;
              const newY = o.y + dy;

              if (
                newX < 0 ||
                newY < 0 ||
                newX + o.width > map.width ||
                newY + o.height > map.height
              )
                validMove = false;

              if (validMove) {
                const overlapObj = floor.objects.some(
                  (other: any) =>
                    other.id !== o.id &&
                    newX < other.x + other.width &&
                    newX + o.width > other.x &&
                    newY < other.y + other.height &&
                    newY + o.height > other.y,
                );
                if (overlapObj) validMove = false;
              }
              if (validMove) {
                const overlapWall = floor.tiles?.some((t: any) => {
                  const tDef = TILE_DEFINITIONS[t.tile_type];
                  return (
                    tDef &&
                    (tDef.category === "WALL" || tDef.category === "OPENING") &&
                    newX <= t.x &&
                    newX + o.width > t.x &&
                    newY <= t.y &&
                    newY + o.height > t.y
                  );
                });
                if (overlapWall) validMove = false;
              }
              if (validMove) {
                floor.objects = floor.objects.map((obj: any) =>
                  obj.id === o.id ? { ...obj, x: newX, y: newY } : obj,
                );
              }
            }
          } else if (dragEntity.type === "tile") {
            const t = floor.tiles?.find((t: any) => t.id === dragEntity.id);
            if (t) {
              const newX = t.x + dx;
              const newY = t.y + dy;
              if (
                newX < 0 ||
                newY < 0 ||
                newX + 1 > map.width ||
                newY + 1 > map.height
              )
                validMove = false;

              const tDef = TILE_DEFINITIONS[t.tile_type];
              if (validMove && tDef && tDef.category === "WALL") {
                const overlapWall = floor.tiles.some(
                  (other: any) =>
                    other.id !== t.id &&
                    other.x === newX &&
                    other.y === newY &&
                    (TILE_DEFINITIONS[other.tile_type]?.category === "WALL" ||
                      TILE_DEFINITIONS[other.tile_type]?.category ===
                        "OPENING"),
                );
                if (overlapWall) validMove = false;
              }
              if (validMove) {
                floor.tiles = floor.tiles.map((tile: any) =>
                  tile.id === t.id ? { ...tile, x: newX, y: newY } : tile,
                );
              }
            }
          } else if (dragEntity.type === "stair") {
            const s = newMap.stairs?.find((s: any) => s.id === dragEntity.id);
            if (s) {
              const newX = s.x + dx;
              const newY = s.y + dy;
              if (
                newX < 0 ||
                newY < 0 ||
                newX + 2 > map.width ||
                newY + 2 > map.height
              )
                validMove = false;
              if (validMove) {
                newMap.stairs = newMap.stairs.map((st: any) =>
                  st.id === s.id ? { ...st, x: newX, y: newY } : st,
                );
              }
            }
          } else if (dragEntity.type === "room") {
            const r = newMap.rooms?.find((r: any) => r.id === dragEntity.id);
            if (r) {
              const newX = r.x + dx;
              const newY = r.y + dy;
              if (
                newX < 0 ||
                newY < 0 ||
                newX + r.width > map.width ||
                newY + r.height > map.height
              )
                validMove = false;
              if (validMove) {
                newMap.rooms = newMap.rooms.map((rm: any) =>
                  rm.id === r.id ? { ...rm, x: newX, y: newY } : rm,
                );
              }
            }
          }
          if (validMove) onMapChange(newMap);
        }
      }
      setDragEntity(null);
    }

    setIsDragging(false);
    setIsDrawing(false);
    setLastDrawGrid(null);

    if (activeTool === "ROOM" && roomDragStart && hoverGrid) {
      applyRoom(roomDragStart, hoverGrid);
      setRoomDragStart(null);
    }

    if (onMapChangeEnd && !isScenarioMode) onMapChangeEnd();
  };

  const applyScenarioTool = (x: number, y: number) => {
    if (map.border) {
      if (
        x < map.border.minX ||
        y < map.border.minY ||
        x > map.border.maxX ||
        y > map.border.maxY
      )
        return;
    } else {
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    }
    if (!scenario || !onScenarioChange) return;

    const newScen = { ...scenario };
    newScen.objects = [...(newScen.objects || [])];
    const floor = map.floors[activeFloorIndex];

    if (activeTool === "eraser") {
      newScen.objects = newScen.objects.filter(
        (o: any) =>
          !(
            o.floor_id === floor.id &&
            x >= o.x &&
            x < o.x + (o.width || 1) &&
            y >= o.y &&
            y < o.y + (o.height || 1)
          ),
      );
      onScenarioChange(newScen);
      return;
    }

    if (
      activeTool !== "select" &&
      activeTool !== "move" &&
      activeTool !== "ROOM" &&
      activeTool !== "eraser"
    ) {
      if (
        !newScen.objects.find(
          (o: any) =>
            o.floor_id === floor.id &&
            o.x === x &&
            o.y === y &&
            o.object_type === activeTool,
        )
      ) {
        newScen.objects.push({
          id: generateSafeId(),
          scenario_id: scenario.id,
          floor_id: floor.id,
          object_type: activeTool as Phase1ScenarioObject["object_type"],
          x,
          y,
          width: 1,
          height: 1,
          rotation: 0,
          properties: {},
        });
        onScenarioChange(newScen);
      }
    }
  };

  const applyTool = (x: number, y: number) => {
    if (map.border) {
      if (
        x < map.border.minX ||
        y < map.border.minY ||
        x > map.border.maxX ||
        y > map.border.maxY
      )
        return;
    } else {
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    }

    const newMap = { ...map };
    newMap.floors = [...newMap.floors];
    const floor = { ...newMap.floors[activeFloorIndex] };
    newMap.floors[activeFloorIndex] = floor;
    floor.tiles = [...(floor.tiles || [])];
    floor.objects = [...(floor.objects || [])];

    if (activeTool === "eraser") {
      const objIndex = floor.objects.findIndex(
        (o: any) =>
          x >= o.x && x < o.x + o.width && y >= o.y && y < o.y + o.height,
      );
      if (objIndex !== -1) {
        floor.objects.splice(objIndex, 1);
      } else {
        const sortedTiles = [...(floor.tiles || [])].sort((a, b) => {
          const catA = TILE_DEFINITIONS[a.tile_type]?.category;
          const catB = TILE_DEFINITIONS[b.tile_type]?.category;
          const rank = (c: string) => (c === "FLOOR" ? 0 : 1);
          return rank(catB) - rank(catA);
        });

        const tIndex = sortedTiles.findIndex(
          (t: any) => t.x === x && t.y === y,
        );
        if (tIndex !== -1) {
          const tileToRemove = sortedTiles[tIndex];
          floor.tiles = floor.tiles.filter(
            (t: any) => t.id !== tileToRemove.id,
          );
        }
      }
      onMapChange(newMap);
      return;
    }

    if (!activeDefinitionId) return;
    const def = TILE_DEFINITIONS[activeDefinitionId];
    if (!def) return;

    if (!isValidPlacement(activeDefinitionId, x, y, currentRotation, floor)) {
      return;
    }

    if (
      def.category === "FLOOR" ||
      def.category === "WALL" ||
      def.category === "OPENING" ||
      def.category === "STAIRS"
    ) {
      const isStructure = def.category === "WALL" || def.category === "OPENING";

      floor.tiles = floor.tiles.filter((t: any) => {
        if (t.x !== x || t.y !== y) return true;
        const existDef = TILE_DEFINITIONS[t.tile_type];
        if (!existDef) return true;

        if (isStructure) {
          if (existDef.category === "WALL" || existDef.category === "OPENING")
            return false;
        } else {
          if (existDef.category === def.category) return false;
        }
        return true;
      });

      floor.tiles.push({
        id: generateSafeId(),
        floor_id: floor.id,
        x,
        y,
        tile_type: def.id,
        variant: 0,
        rotation: currentRotation,
      });
      onMapChange(newMap);
    } else if (def.category === "OBJECTS" || def.category === "DECORATION") {
      let wGrid = def.defaultWidth || 1;
      let hGrid = def.defaultHeight || 1;
      if (currentRotation === 90 || currentRotation === 270) {
        wGrid = def.defaultHeight || 1;
        hGrid = def.defaultWidth || 1;
      }

      floor.objects.push({
        id: generateSafeId(),
        floor_id: floor.id,
        object_type: def.id,
        x,
        y,
        width: wGrid,
        height: hGrid,
        rotation: currentRotation,
      });
      onMapChange(newMap);
    }
  };

  const applyRoom = (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    const minX = Math.max(0, Math.min(start.x, end.x));
    const minY = Math.max(0, Math.min(start.y, end.y));
    const maxX = Math.min(map.width - 1, Math.max(start.x, end.x));
    const maxY = Math.min(map.height - 1, Math.max(start.y, end.y));
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    if (w < 2 || h < 2) return;

    const newMap = { ...map };
    const floor = { ...newMap.floors[activeFloorIndex] };
    newMap.floors[activeFloorIndex] = floor;
    floor.tiles = [...(floor.tiles || [])];
    newMap.rooms = [...(newMap.rooms || [])];

    const type = activeDefinitionId || "Classroom";

    newMap.rooms.push({
      id: generateSafeId(),
      map_id: map.id,
      floor_id: floor.id,
      name: `${type} ${newMap.rooms.length + 1}`,
      type,
      x: minX,
      y: minY,
      width: w,
      height: h,
    });

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        floor.tiles = floor.tiles.filter(
          (t: any) =>
            !(
              t.x === x &&
              t.y === y &&
              TILE_DEFINITIONS[t.tile_type]?.category === "FLOOR"
            ),
        );
        floor.tiles.push({
          id: generateSafeId(),
          floor_id: floor.id,
          x,
          y,
          tile_type: "FLOOR",
          variant: 0,
          rotation: 0,
        });
      }
    }

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (x === minX || x === maxX || y === minY || y === maxY) {
          floor.tiles = floor.tiles.filter(
            (t: any) =>
              !(
                t.x === x &&
                t.y === y &&
                TILE_DEFINITIONS[t.tile_type]?.category === "WALL"
              ),
          );
          floor.tiles.push({
            id: generateSafeId(),
            floor_id: floor.id,
            x,
            y,
            tile_type: "WALL",
            variant: 0,
            rotation: 0,
          });
        }
      }
    }

    onMapChange(newMap);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0)
        setCamera((p) => ({ ...p, zoom: Math.min(5, p.zoom * 1.1) }));
      else setCamera((p) => ({ ...p, zoom: Math.max(0.1, p.zoom * 0.9) }));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block" />
      {/* Coordinate HUD */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none">
        {hoverGrid
          ? `X: ${hoverGrid.x} Y: ${hoverGrid.y} F: ${activeFloorIndex + 1} | R: ${currentRotation}°`
          : "Out of bounds"}
      </div>
    </div>
  );
}
