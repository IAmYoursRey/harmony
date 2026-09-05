import { useRef, useState, useCallback, useEffect } from 'react';
import { Maximize, Target, Grid3X3 } from 'lucide-react';
import type { GridMap, SafePoint, SpawnPoint, MapDoor } from '../types';
import { CELL_COLORS, CELL_LABELS, CELL_BORDER_COLORS } from './cellConstants';

const CELL_PX = 24; 
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4.0;

interface Props {
  gridWidth: number;
  gridHeight: number;
  cells: GridMap['cells'];
  safePoints: SafePoint[];
  spawnPoints: SpawnPoint[];
  doors: MapDoor[];
  onPaint: (x: number, y: number) => void;
  readOnly?: boolean;
  highlightCells?: Set<string>;   
  activePlayers?: { id: string; name: string; x: number; y: number; hp: number; status: string }[];
  scenarioOverlay?: React.ReactNode;
}

export function GridCanvas({
  gridWidth, gridHeight, cells,
  safePoints, spawnPoints, doors,
  onPaint, readOnly = false,
  highlightCells,
  playerPos,
  activePlayers,
  scenarioOverlay,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  
  const [painting, setPainting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  const cellSize = CELL_PX * zoom;
  const totalW = gridWidth * cellSize;
  const totalH = gridHeight * cellSize;

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

  // Center map function
  const centerMap = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    setPan({
      x: (clientWidth - totalW) / 2,
      y: (clientHeight - totalH) / 2
    });
  }, [totalW, totalH]);

  // Fit map function
  const fitMap = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 40;
    const scaleX = (clientWidth - padding * 2) / (gridWidth * CELL_PX);
    const scaleY = (clientHeight - padding * 2) / (gridHeight * CELL_PX);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM);
    setZoom(newZoom);
    
    // Defer centering to next render when totalW/totalH are updated based on newZoom
    setTimeout(() => {
      if (!containerRef.current) return;
      const nw = gridWidth * (CELL_PX * newZoom);
      const nh = gridHeight * (CELL_PX * newZoom);
      setPan({
        x: (clientWidth - nw) / 2,
        y: (clientHeight - nh) / 2
      });
    }, 0);
  }, [gridWidth, gridHeight]);

  // Initial fit
  useEffect(() => {
    fitMap();
  }, [fitMap]); // Only run once or when dimensions change significantly

  const getCellFromEvent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    const x = Math.floor((clientX - rect.left - pan.x) / cellSize);
    const y = Math.floor((clientY - rect.top - pan.y) / cellSize);
    
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null;
    return { x, y };
  }, [cellSize, gridWidth, gridHeight, pan]);

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
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (painting && !readOnly) {
      e.preventDefault();
      const pos = getCellFromEvent(e.clientX, e.clientY);
      if (pos) onPaint(pos.x, pos.y);
    }
  };

  const handlePointerUp = () => {
    setPainting(false);
    setIsPanning(false);
  };

  // Add native wheel listener to prevent page scrolling when zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      let newZoom = zoom + zoomFactor;
      newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
      
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const mapX = mouseX - pan.x;
      const mapY = mouseY - pan.y;
      const scaleRatio = newZoom / zoom;
      
      setZoom(newZoom);
      setPan({ x: mouseX - (mapX * scaleRatio), y: mouseY - (mapY * scaleRatio) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, pan]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <button onClick={() => setZoom(s => Math.max(MIN_ZOOM, s - 0.2))}
            className="w-7 h-7 rounded text-sm hover:bg-white dark:hover:bg-slate-600 font-bold transition-colors">−</button>
          <span className="text-xs font-semibold text-ink-600 dark:text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(s => Math.min(MAX_ZOOM, s + 0.2))}
            className="w-7 h-7 rounded text-sm hover:bg-white dark:hover:bg-slate-600 font-bold transition-colors">+</button>
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button onClick={fitMap} title="Fit to Screen"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Maximize className="h-4 w-4" /> <span className="hidden sm:inline">Fit</span>
        </button>
        <button onClick={centerMap} title="Center Map"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Target className="h-4 w-4" /> <span className="hidden sm:inline">Center</span>
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
        onPointerLeave={handlePointerUp}
        className={`relative w-full h-[60vh] overflow-hidden select-none touch-none ${
          isPanning || isSpaceDown ? 'cursor-grab active:cursor-grabbing' : (readOnly ? 'cursor-default' : 'cursor-crosshair')
        }`}
      >
        <div style={{
          position: 'absolute',
          top: pan.y,
          left: pan.x,
          width: totalW,
          height: totalH,
          transformOrigin: '0 0',
        }}>
          {/* Base Background for Map Area */}
          <div className="absolute inset-0 bg-white dark:bg-slate-800 shadow-sm rounded-sm" />

          {/* SVG Elements */}
          <svg
            width={totalW}
            height={totalH}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {/* Grid lines */}
            {showGrid && (
              <g stroke="#e2e8f0" className="dark:stroke-slate-700" strokeWidth="0.5">
                {Array.from({ length: gridWidth + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={totalH} 
                    strokeWidth={i % 5 === 0 ? "1" : "0.5"} 
                    className={i % 5 === 0 ? "stroke-slate-300 dark:stroke-slate-600" : ""} />
                ))}
                {Array.from({ length: gridHeight + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * cellSize} x2={totalW} y2={i * cellSize} 
                    strokeWidth={i % 5 === 0 ? "1" : "0.5"} 
                    className={i % 5 === 0 ? "stroke-slate-300 dark:stroke-slate-600" : ""} />
                ))}
              </g>
            )}

            {/* Cells */}
            {Object.values(cells).map(cell => {
              const fillColor = CELL_COLORS[cell.type] || 'transparent';
              const borderColor = CELL_BORDER_COLORS[cell.type] || 'transparent';
              const label = CELL_LABELS[cell.type] || '';
              return (
                <g key={`${cell.x},${cell.y}`}>
                  <rect
                    x={cell.x * cellSize + 0.5}
                    y={cell.y * cellSize + 0.5}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    fill={fillColor}
                    stroke={borderColor}
                    strokeWidth="1"
                  />
                  {label && cellSize >= 16 && (
                    <text
                      x={cell.x * cellSize + cellSize / 2}
                      y={cell.y * cellSize + cellSize / 2 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.min(12, cellSize * 0.4)}
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
                x={sp.x * cellSize} y={sp.y * cellSize}
                width={cellSize} height={cellSize}
                fill="rgba(34, 197, 94, 0.2)"
                stroke="rgba(34, 197, 94, 0.8)"
                strokeWidth="2"
                className="animate-pulse pointer-events-none"
              />
            ))}

            {/* Highlight cells (hazard zones during game) */}
            {highlightCells && Array.from(highlightCells).map(key => {
              const [hx, hy] = key.split(',').map(Number);
              return (
                <rect key={`hl_${key}`}
                  x={hx * cellSize} y={hy * cellSize}
                  width={cellSize} height={cellSize}
                  fill="rgba(239, 68, 68, 0.4)"
                  stroke="rgba(239, 68, 68, 0.8)"
                  strokeWidth="2"
                  className="animate-pulse pointer-events-none"
                />
              );
            })}

            {/* Player marker (single) */}
            {playerPos && (
              <g style={{ transition: 'all 0.3s ease-out' }}>
                <circle
                  cx={playerPos.x * cellSize + cellSize / 2}
                  cy={playerPos.y * cellSize + cellSize / 2}
                  r={cellSize * 0.35}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                  style={{ transition: 'cx 0.2s ease-out, cy 0.2s ease-out' }}
                />
                <circle
                  cx={playerPos.x * cellSize + cellSize / 2}
                  cy={playerPos.y * cellSize + cellSize / 2}
                  r={cellSize * 0.45}
                  fill="none"
                  stroke="rgba(59,130,246,0.6)"
                  strokeWidth="2"
                  className="animate-ping"
                  style={{ transition: 'cx 0.2s ease-out, cy 0.2s ease-out' }}
                />
              </g>
            )}

            {/* Active Players (multiplayer) */}
            {activePlayers?.map(p => (
              <g key={p.id} style={{ transition: 'all 0.3s ease-out' }}>
                <circle
                  cx={p.x * cellSize + cellSize / 2}
                  cy={p.y * cellSize + cellSize / 2}
                  r={cellSize * 0.35}
                  fill={p.hp === 0 ? "#64748b" : (p.status === 'evacuated' ? "#22c55e" : "#3b82f6")}
                  stroke="white"
                  strokeWidth="2"
                  style={{ transition: 'cx 0.3s ease-out, cy 0.3s ease-out, fill 0.3s ease-out' }}
                />
                {cellSize >= 20 && (
                  <text
                    x={p.x * cellSize + cellSize / 2}
                    y={p.y * cellSize - 4}
                    textAnchor="middle"
                    fontSize={Math.min(10, cellSize * 0.4)}
                    fill={p.hp === 0 ? "#94a3b8" : "#1e293b"}
                    className="font-bold drop-shadow-sm"
                    style={{ transition: 'x 0.3s ease-out, y 0.3s ease-out, fill 0.3s ease-out' }}
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
