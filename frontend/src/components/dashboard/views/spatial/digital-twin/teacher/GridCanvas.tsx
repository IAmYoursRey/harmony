import { useRef, useState, useCallback, useEffect } from 'react';
import { Maximize, Target, Grid3X3 } from 'lucide-react';
import type { GridMap, SafePoint, SpawnPoint, MapDoor } from '../types';
import { CELL_COLORS, CELL_LABELS, CELL_BORDER_COLORS } from './cellConstants';
import { Camera, MIN_ZOOM, MAX_ZOOM, calculateZoom } from '../utils/coordinates';

const BASE_CELL_PX = 40;

interface Props {
  gridWidth: number;
  gridHeight: number;
  cells: GridMap['cells'];
  safePoints: SafePoint[];
  spawnPoints: SpawnPoint[];
  doors: MapDoor[];
  onPaint: (x: number, y: number) => void;
  onHover?: (x: number | null, y: number | null) => void;
  readOnly?: boolean;
  highlightCells?: Set<string>;   
  playerPos?: { x: number; y: number } | null;
  activePlayers?: { id: string; name: string; x: number; y: number; hp: number; status: string }[];
  scenarioOverlay?: React.ReactNode;
}

export function GridCanvas({
  gridWidth, gridHeight, cells,
  safePoints, spawnPoints, doors,
  onPaint, onHover, readOnly = false,
  highlightCells,
  playerPos,
  activePlayers,
  scenarioOverlay,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  
  const [painting, setPainting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  
  const lastMouse = useRef({ x: 0, y: 0 });

  const clampCamera = useCallback((cam: Camera, viewW: number, viewH: number) => {
    const PADDING = 4;
    let nx = cam.x;
    let ny = cam.y;

    const paddedW = gridWidth + PADDING * 2;
    const paddedH = gridHeight + PADDING * 2;
    const minX = -PADDING;
    const minY = -PADDING;
    const maxX = gridWidth + PADDING;
    const maxY = gridHeight + PADDING;

    if (viewW >= paddedW) {
      nx = (gridWidth - viewW) / 2;
    } else {
      nx = Math.max(minX, Math.min(nx, maxX - viewW));
    }

    if (viewH >= paddedH) {
      ny = (gridHeight - viewH) / 2;
    } else {
      ny = Math.max(minY, Math.min(ny, maxY - viewH));
    }
    return { ...cam, x: nx, y: ny };
  }, [gridWidth, gridHeight]);

  // Handle Container Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fit to screen
  const fitMap = useCallback(() => {
    if (dimensions.w === 0 || dimensions.h === 0) return;
    const paddingCells = 2;
    const fitW = gridWidth + paddingCells * 2;
    const fitH = gridHeight + paddingCells * 2;
    
    const scaleX = (dimensions.w / BASE_CELL_PX) / fitW;
    const scaleY = (dimensions.h / BASE_CELL_PX) / fitH;
    
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM);
    
    // Center map
    const viewW = dimensions.w / (BASE_CELL_PX * newZoom);
    const viewH = dimensions.h / (BASE_CELL_PX * newZoom);
    
    setCamera(clampCamera({
      zoom: newZoom,
      x: (gridWidth - viewW) / 2,
      y: (gridHeight - viewH) / 2,
    }, viewW, viewH));
  }, [dimensions, gridWidth, gridHeight, clampCamera]);

  // Initial fit
  useEffect(() => {
    fitMap();
  }, [fitMap]);

  // Spacebar detection for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpaceDown]);

  // Wheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!svgRef.current || dimensions.w === 0) return;
      
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9; // 10% steps
      const rect = el.getBoundingClientRect();
      const centerScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      
      // Calculate fraction of screen
      const fracX = centerScreen.x / dimensions.w;
      const fracY = centerScreen.y / dimensions.h;
      
      // Get exact world coordinate under cursor using CTM (foolproof)
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const worldPt = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());

      let newZoom = camera.zoom * zoomFactor;
      newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
      
      const viewW = dimensions.w / (BASE_CELL_PX * newZoom);
      const viewH = dimensions.h / (BASE_CELL_PX * newZoom);
      
      setCamera(clampCamera({
        zoom: newZoom,
        x: worldPt.x - fracX * viewW,
        y: worldPt.y - fracY * viewH,
      }, viewW, viewH));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [camera, dimensions]);

  const getCellFromEvent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const worldPt = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    
    const x = Math.floor(worldPt.x);
    const y = Math.floor(worldPt.y);
    
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null;
    return { x, y };
  }, [gridWidth, gridHeight]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || isSpaceDown) { // Middle click or Space
      e.preventDefault();
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (readOnly) return;
    
    if (e.button === 0) {
      e.preventDefault();
      setPainting(true);
      const pos = getCellFromEvent(e.clientX, e.clientY);
      if (pos) onPaint(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      e.preventDefault();
      const dxScreen = e.clientX - lastMouse.current.x;
      const dyScreen = e.clientY - lastMouse.current.y;
      
      const dxWorld = dxScreen / (BASE_CELL_PX * camera.zoom);
      const dyWorld = dyScreen / (BASE_CELL_PX * camera.zoom);
      
      setCamera(prev => {
        const viewW = dimensions.w / (BASE_CELL_PX * prev.zoom);
        const viewH = dimensions.h / (BASE_CELL_PX * prev.zoom);
        return clampCamera({ ...prev, x: prev.x - dxWorld, y: prev.y - dyWorld }, viewW, viewH);
      });
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const pos = getCellFromEvent(e.clientX, e.clientY);
    if (onHover) {
      if (pos) onHover(pos.x, pos.y);
      else onHover(null, null);
    }

    if (painting && !readOnly && pos) {
      e.preventDefault();
      onPaint(pos.x, pos.y);
    }
  };

  const handlePointerUp = () => {
    setPainting(false);
    setIsPanning(false);
  };

  const handlePointerLeave = () => {
    setPainting(false);
    setIsPanning(false);
    if (onHover) onHover(null, null);
  };
  
  // Calculate viewBox
  const viewW = dimensions.w > 0 ? dimensions.w / (BASE_CELL_PX * camera.zoom) : gridWidth;
  const viewH = dimensions.h > 0 ? dimensions.h / (BASE_CELL_PX * camera.zoom) : gridHeight;
  const viewBoxStr = `${camera.x} ${camera.y} ${viewW} ${viewH}`;

  // Stroke width that looks 1px independent of zoom
  const pixelStroke = 1 / (BASE_CELL_PX * camera.zoom);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <button onClick={() => setCamera(s => {
            const z = Math.max(MIN_ZOOM, s.zoom - 0.2);
            return clampCamera({ ...s, zoom: z }, dimensions.w / (BASE_CELL_PX * z), dimensions.h / (BASE_CELL_PX * z));
          })}
            className="w-7 h-7 rounded text-sm hover:bg-white dark:hover:bg-slate-600 font-bold transition-colors">−</button>
          <span className="text-xs font-semibold text-ink-600 dark:text-slate-300 w-12 text-center">{Math.round(camera.zoom * 100)}%</span>
          <button onClick={() => setCamera(s => {
            const z = Math.min(MAX_ZOOM, s.zoom + 0.2);
            return clampCamera({ ...s, zoom: z }, dimensions.w / (BASE_CELL_PX * z), dimensions.h / (BASE_CELL_PX * z));
          })}
            className="w-7 h-7 rounded text-sm hover:bg-white dark:hover:bg-slate-600 font-bold transition-colors">+</button>
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button onClick={fitMap} title="Fit to Screen"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Maximize className="h-4 w-4" /> <span className="hidden sm:inline">Fit</span>
        </button>
        
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button onClick={() => setShowGrid(!showGrid)} title="Toggle Grid"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            showGrid ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}>
          <Grid3X3 className="h-4 w-4" /> <span className="hidden sm:inline">Grid</span>
        </button>

        <span className="ml-auto text-xs font-medium text-ink-400 dark:text-slate-500 mr-2">
          {gridWidth}×{gridHeight}
        </span>
      </div>

      {/* Grid Viewport */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={`relative w-full h-[60vh] overflow-hidden select-none touch-none ${
          isPanning || isSpaceDown ? 'cursor-grab active:cursor-grabbing' : (readOnly ? 'cursor-default' : 'cursor-crosshair')
        }`}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBoxStr}
          preserveAspectRatio="xMidYMid slice"
          style={{ display: 'block' }}
        >
          <defs>
            {/* Minor grid 1x1 */}
            <pattern id="gridMinor" width="1" height="1" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="none" stroke="rgba(148, 163, 184, 0.3)" strokeWidth={pixelStroke} />
            </pattern>
            {/* Major grid 5x5 */}
            <pattern id="gridMajor" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="url(#gridMinor)" stroke="rgba(148, 163, 184, 0.6)" strokeWidth={pixelStroke * 2} />
            </pattern>
            {/* Fallback major grid without minor when zoomed out */}
            <pattern id="gridMajorOnly" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="none" stroke="rgba(148, 163, 184, 0.6)" strokeWidth={pixelStroke * 2} />
            </pattern>
          </defs>

          {/* Map Base Canvas */}
          <rect x={0} y={0} width={gridWidth} height={gridHeight} fill="white" className="dark:fill-slate-800" />
          
          {/* Adaptive Grid Rendering */}
          {showGrid && (
            <rect 
              x={0} y={0} width={gridWidth} height={gridHeight} 
              fill={camera.zoom < 0.5 ? "url(#gridMajorOnly)" : "url(#gridMajor)"} 
              pointerEvents="none" 
            />
          )}

          {/* Cells */}
          {Object.values(cells).map(cell => {
            const fillColor = CELL_COLORS[cell.type] || 'transparent';
            const borderColor = CELL_BORDER_COLORS[cell.type] || 'transparent';
            const label = CELL_LABELS[cell.type] || '';
            // If cell matches background and no label, skip rendering rect unless needed
            return (
              <g key={`${cell.x},${cell.y}`}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={1}
                  height={1}
                  fill={fillColor}
                  stroke={borderColor}
                  strokeWidth={pixelStroke * 1.5}
                />
                {label && camera.zoom >= 0.5 && (
                  <text
                    x={cell.x + 0.5}
                    y={cell.y + 0.55}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(0.4, 0.4 / camera.zoom * 1.5)} // Keep text readable but bound
                    fill={cell.type === 'WALL' ? '#9ca3af' : '#374151'}
                    className="font-medium pointer-events-none"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Safe Point Glow */}
          {Array.from(new Map(safePoints.map(sp => [`${sp.x},${sp.y}`, sp])).values()).map(sp => (
            <rect
              key={`sp_glow_${sp.x}_${sp.y}`}
              x={sp.x} y={sp.y}
              width={1} height={1}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="rgba(34, 197, 94, 0.8)"
              strokeWidth={pixelStroke * 2}
              className="animate-pulse pointer-events-none"
            />
          ))}

          {/* Highlight cells (hazard zones during game) */}
          {highlightCells && Array.from(highlightCells).map(key => {
            const [hx, hy] = key.split(',').map(Number);
            return (
              <rect key={`hl_${key}`}
                x={hx} y={hy}
                width={1} height={1}
                fill="rgba(239, 68, 68, 0.4)"
                stroke="rgba(239, 68, 68, 0.8)"
                strokeWidth={pixelStroke * 2}
                className="animate-pulse pointer-events-none"
              />
            );
          })}

          {/* Player marker (single) */}
          {playerPos && (
            <g style={{ transition: 'all 0.2s ease-out' }}>
              <circle
                cx={playerPos.x + 0.5}
                cy={playerPos.y + 0.5}
                r={0.35}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={pixelStroke * 2}
              />
              <circle
                cx={playerPos.x + 0.5}
                cy={playerPos.y + 0.5}
                r={0.45}
                fill="none"
                stroke="rgba(59,130,246,0.6)"
                strokeWidth={pixelStroke * 2}
                className="animate-ping"
              />
            </g>
          )}

          {/* Active Players (multiplayer) */}
          {activePlayers?.map(p => (
            <g key={p.id} style={{ transition: 'all 0.3s ease-out' }}>
              <circle
                cx={p.x + 0.5}
                cy={p.y + 0.5}
                r={0.35}
                fill={p.hp === 0 ? "#64748b" : (p.status === 'evacuated' ? "#22c55e" : "#3b82f6")}
                stroke="white"
                strokeWidth={pixelStroke * 2}
              />
              {camera.zoom >= 0.8 && (
                <text
                  x={p.x + 0.5}
                  y={p.y - 0.2}
                  textAnchor="middle"
                  fontSize={0.25}
                  fill={p.hp === 0 ? "#94a3b8" : "#1e293b"}
                  className="font-bold drop-shadow-sm pointer-events-none"
                >
                  {p.name.split(' ')[0]}
                </text>
              )}
            </g>
          ))}

          {/* Scenario Authoring Overlay */}
          {scenarioOverlay}
        </svg>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-x-6 gap-y-2 bg-slate-50 dark:bg-slate-900 shrink-0">
        {[
          { type: 'WALL', label: 'Dinding' },
          { type: 'ROOM', label: 'Ruangan' },
          { type: 'CORRIDOR', label: 'Koridor' },
          { type: 'DOOR', label: 'Pintu' },
          { type: 'SAFE_POINT', label: 'Titik Aman' },
          { type: 'SPAWN', label: 'Titik Mulai' },
          { type: 'HAZARD', label: 'Bahaya' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-2">
            <span style={{
              display: 'inline-block', width: 14, height: 14, borderRadius: 3,
              background: CELL_COLORS[type],
              border: `1px solid ${CELL_BORDER_COLORS[type] || '#ccc'}`,
            }} className="shadow-sm" />
            <span className="text-xs font-medium text-ink-600 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
