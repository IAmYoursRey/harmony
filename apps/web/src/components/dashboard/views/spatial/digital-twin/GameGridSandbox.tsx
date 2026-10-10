import React, { useEffect, useRef, useState, useCallback } from "react";
import { phase1Api } from "./Phase1API";
import { Phase1Map, Phase1Scenario, Phase1Tile } from "./Phase1Types";
import { AssetRenderer } from "./Phase1AssetRenderer";
import {
  Play,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  DoorOpen,
  MapPin,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameGridSandboxProps {
  mapId: string;
  scenarioId?: string;
  onPlay?: (mapId: string, scenarioId: string) => void;
}

const TILE_SIZE = 32;

export function GameGridSandbox({
  mapId,
  scenarioId,
  onPlay,
}: GameGridSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [map, setMap] = useState<Phase1Map | null>(null);
  const [scenario, setScenario] = useState<Phase1Scenario | null>(null);
  const [loading, setLoading] = useState(true);

  // Camera & View Controls
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.85 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showEffects, setShowEffects] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showSpawns, setShowSpawns] = useState(true);
  const [showExits, setShowExits] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Animation frame
  const animFrameRef = useRef<number | null>(null);

  // Load map and scenario details
  useEffect(() => {
    let mounted = true;
    async function fetchDetails() {
      setLoading(true);
      try {
        const mapData = await phase1Api.getMapDetails(mapId);
        if (!mounted) return;
        setMap(mapData);

        // Fetch primary scenario (prefer earthquake or first published scenario)
        let scenToLoad = scenarioId;
        if (!scenToLoad && mapData.scenarios && mapData.scenarios.length > 0) {
          const published =
            mapData.scenarios.find((s) => s.status === "published") ||
            mapData.scenarios[0];
          scenToLoad = published?.id;
        }

        if (scenToLoad) {
          try {
            const scenData = await phase1Api.getScenarioDetails(scenToLoad);
            if (mounted) setScenario(scenData);
          } catch (e) {
            console.warn("Failed to load scenario details:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load map details for sandbox:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [mapId, scenarioId]);

  // Center camera when map loads
  const centerCamera = useCallback(() => {
    if (!map || !containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const mapPxW = map.width * TILE_SIZE;
    const mapPxH = map.height * TILE_SIZE;

    const zoomW = (containerW * 0.95) / mapPxW;
    const zoomH = (containerH * 0.95) / mapPxH;
    const fitZoom = Math.min(1.4, Math.max(0.4, Math.min(zoomW, zoomH)));

    setCamera({
      x: containerW / 2 - (mapPxW * fitZoom) / 2,
      y: containerH / 2 - (mapPxH * fitZoom) / 2,
      zoom: fitZoom,
    });
  }, [map]);

  useEffect(() => {
    centerCamera();
  }, [map, centerCamera]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      // Deep space / digital twin background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply camera transform
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      const floor = map.floors?.[0];
      if (floor) {
        // Draw base ground rect under map
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, map.width * TILE_SIZE, map.height * TILE_SIZE);

        // Draw tiles
        floor.tiles?.forEach((tile: Phase1Tile) => {
          const tpx = tile.x * TILE_SIZE;
          const tpy = tile.y * TILE_SIZE;
          const tex = AssetRenderer.getTexture(
            tile.tile_type,
            TILE_SIZE,
            TILE_SIZE,
            tile.variant || 0,
            0
          );
          ctx.drawImage(tex, tpx, tpy, TILE_SIZE, TILE_SIZE);
        });

        // Draw grid overlay lines if enabled
        if (showGrid) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let x = 0; x <= map.width; x++) {
            ctx.moveTo(x * TILE_SIZE, 0);
            ctx.lineTo(x * TILE_SIZE, map.height * TILE_SIZE);
          }
          for (let y = 0; y <= map.height; y++) {
            ctx.moveTo(0, y * TILE_SIZE);
            ctx.lineTo(map.width * TILE_SIZE, y * TILE_SIZE);
          }
          ctx.stroke();
        }

        // Draw scenario objects (Safe Zones, Exits, Spawns, Hazards)
        if (scenario?.objects && showEffects) {
          const pulse = Math.sin(elapsed / 250) * 0.15 + 0.85;

          scenario.objects.forEach((obj) => {
            const ox = obj.x * TILE_SIZE;
            const oy = obj.y * TILE_SIZE;
            const ow = (obj.width || 1) * TILE_SIZE;
            const oh = (obj.height || 1) * TILE_SIZE;

            if (obj.object_type === "SAFE_ZONE" && showSafeZones) {
              // Glowing holographic safe zone
              ctx.save();
              ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
              ctx.fillRect(ox, oy, ow, oh);

              // Pulsing green aura
              ctx.strokeStyle = `rgba(34, 197, 94, ${0.75 * pulse})`;
              ctx.lineWidth = 2.5;
              ctx.strokeRect(ox, oy, ow, oh);

              // Corner brackets
              const bLen = Math.min(18, Math.min(ow, oh) * 0.25);
              ctx.strokeStyle = "#4ade80";
              ctx.lineWidth = 3;

              // 4 Corners
              ctx.beginPath();
              ctx.moveTo(ox, oy + bLen); ctx.lineTo(ox, oy); ctx.lineTo(ox + bLen, oy);
              ctx.moveTo(ox + ow - bLen, oy); ctx.lineTo(ox + ow, oy); ctx.lineTo(ox + ow, oy + bLen);
              ctx.moveTo(ox, oy + oh - bLen); ctx.lineTo(ox, oy + oh); ctx.lineTo(ox + bLen, oy + oh);
              ctx.moveTo(ox + ow - bLen, oy + oh); ctx.lineTo(ox + ow, oy + oh); ctx.lineTo(ox + ow, oy + oh - bLen);
              ctx.stroke();

              // Central beacon shield / target symbol (NO TEXT)
              const cx = ox + ow / 2;
              const cy = oy + oh / 2;
              const r = Math.min(ow, oh) * 0.25;

              ctx.fillStyle = `rgba(34, 197, 94, ${0.35 * pulse})`;
              ctx.beginPath();
              ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = "#22c55e";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();

              // Crosshair
              ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy);
              ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.7);
              ctx.stroke();

              ctx.restore();
            } else if (obj.object_type === "EXIT" && showExits) {
              // Gate Exit marker with animated chevrons
              ctx.save();
              ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
              ctx.fillRect(ox, oy, ow, oh);

              ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 * pulse})`;
              ctx.lineWidth = 2.5;
              ctx.strokeRect(ox, oy, ow, oh);

              // Directional arrows pointing West
              const cx = ox + ow / 2;
              const cy = oy + oh / 2;
              const arrowOffset = ((elapsed / 180) % 8) - 4;

              ctx.strokeStyle = "#34d1bd";
              ctx.lineWidth = 3;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(cx + 5 + arrowOffset, cy - 7);
              ctx.lineTo(cx - 5 + arrowOffset, cy);
              ctx.lineTo(cx + 5 + arrowOffset, cy + 7);
              ctx.stroke();
              ctx.restore();
            } else if (obj.object_type === "SPAWN" && showSpawns) {
              // Glowing student spawn beacon
              ctx.save();
              const cx = ox + ow / 2;
              const cy = oy + oh / 2;
              const r = Math.min(ow, oh) * 0.38;

              // Outer pulse ring
              ctx.fillStyle = `rgba(234, 179, 8, ${0.35 * pulse})`;
              ctx.beginPath();
              ctx.arc(cx, cy, r * pulse * 1.3, 0, Math.PI * 2);
              ctx.fill();

              // Inner core
              ctx.fillStyle = "#fbbf24";
              ctx.beginPath();
              ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
              ctx.fill();

              // Outline
              ctx.strokeStyle = "#fef08a";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            } else if (obj.object_type === "BLOCKED_AREA") {
              // Hazard warning stripes
              ctx.save();
              ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
              ctx.fillRect(ox, oy, ow, oh);
              ctx.beginPath();
              ctx.rect(ox, oy, ow, oh);
              ctx.clip();
              ctx.strokeStyle = "#eab308";
              ctx.lineWidth = 6;
              for (let i = -ow; i < ow + oh; i += 16) {
                ctx.beginPath();
                ctx.moveTo(ox + i, oy);
                ctx.lineTo(ox + i - oh, oy + oh);
                ctx.stroke();
              }
              ctx.restore();
            } else if (obj.object_type === "DAMAGE_ZONE") {
              ctx.save();
              ctx.fillStyle = "rgba(220, 38, 38, 0.25)";
              ctx.fillRect(ox, oy, ow, oh);
              ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]);
              ctx.strokeRect(ox, oy, ow, oh);
              ctx.restore();
            } else if (obj.object_type === "FIRE") {
              const cx = ox + ow / 2;
              const cy = oy + oh / 2;
              const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(ow, oh) * 0.8);
              grad.addColorStop(0, "rgba(254, 240, 138, 0.95)");
              grad.addColorStop(0.4, "rgba(249, 115, 22, 0.8)");
              grad.addColorStop(1, "rgba(220, 38, 38, 0)");
              ctx.fillStyle = grad;
              ctx.fillRect(ox, oy, ow, oh);
            }
          });
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    map,
    scenario,
    camera,
    showGrid,
    showEffects,
    showSafeZones,
    showSpawns,
    showExits,
  ]);

  // Mouse interaction for Panning & Zooming
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCamera((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(3.0, Math.max(0.3, camera.zoom * zoomFactor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setCamera((prev) => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom),
        zoom: newZoom,
      }));
    }
  };

  const handleZoom = (inOut: "in" | "out") => {
    const factor = inOut === "in" ? 1.25 : 0.8;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(3.0, Math.max(0.3, prev.zoom * factor)),
    }));
  };

  // Launch Play
  const handleStartPlay = () => {
    if (onPlay && scenario) {
      onPlay(mapId, scenario.id);
    } else if (scenario) {
      navigate(`/app/digital-twin/play/${mapId}/${scenario.id}`);
    } else if (map?.scenarios?.[0]) {
      navigate(`/app/digital-twin/play/${mapId}/${map.scenarios[0].id}`);
    }
  };

  // Object Counts
  const safeCount = scenario?.objects?.filter((o) => o.object_type === "SAFE_ZONE").length || 3;
  const exitCount = scenario?.objects?.filter((o) => o.object_type === "EXIT").length || 2;
  const spawnCount = scenario?.objects?.filter((o) => o.object_type === "SPAWN").length || 30;

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[420px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Memuat Game Grid & Efek Digital Twin...</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-4 z-50 rounded-2xl" : "h-[620px]"
      }`}
    >
      {/* HUD Header Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-brand-400 font-extrabold">HARMONY TWIN</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-200">{map?.name || "Game Sandbox"}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 font-medium">
            <span>Dimensi: {map?.width} × {map?.height} Grid</span>
          </div>
        </div>

        {/* Action Controls & Play Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleStartPlay}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 hover:shadow-emerald-600/30 transition-all hover:scale-[1.03] active:scale-95 animate-pulse"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Mulai Simulasi (Play)</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Floating Tactical Layer Toggles & Zoom Toolbar (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs">
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-[11px] ${
              showSafeZones
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Toggle Safe Zones"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Titik Aman ({safeCount})</span>
          </button>

          <button
            onClick={() => setShowExits(!showExits)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-[11px] ${
              showExits
                ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Toggle Exits / Gates"
          >
            <DoorOpen className="h-3.5 w-3.5" />
            <span>Gerbang ({exitCount})</span>
          </button>

          <button
            onClick={() => setShowSpawns(!showSpawns)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-[11px] ${
              showSpawns
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Toggle Student Spawns"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Spawn ({spawnCount})</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-[11px] ${
              showGrid
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Toggle Grid Lines"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>

          <button
            onClick={() => setShowEffects(!showEffects)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-[11px] ${
              showEffects
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title="Toggle Hologram VFX"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>VFX</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl">
          <button
            onClick={() => handleZoom("in")}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleZoom("out")}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={centerCamera}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Compass Indicator (Top-Right) */}
      <div className="absolute top-16 right-4 z-20 pointer-events-none hidden sm:flex flex-col items-center p-2 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md shadow-lg text-[10px] font-black text-slate-400">
        <span className="text-rose-500 font-extrabold">U</span>
        <div className="w-5 h-5 my-0.5 border-2 border-slate-600 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        </div>
        <div className="flex gap-2">
          <span>B</span>
          <span>T</span>
        </div>
        <span>S</span>
      </div>

      {/* Denah Architectural Legend (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[11px] text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400 shadow-sm" />
          <span>Titik Aman</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-teal-500/50 border border-teal-400 shadow-sm" />
          <span>Akses Keluar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-300 shadow-sm" />
          <span>Spawn Siswa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700 border border-slate-500 shadow-sm" />
          <span>Tembok & Bangunan</span>
        </div>
      </div>
    </div>
  );
}
