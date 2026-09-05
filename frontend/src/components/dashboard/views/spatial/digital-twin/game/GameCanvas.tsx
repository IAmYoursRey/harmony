import { useEffect, useRef, useState } from 'react';
import type { GridMap, DisasterSimulation } from '../types';
import { CELL_COLORS, CELL_BORDER_COLORS } from '../teacher/cellConstants';

const BASE_CELL_PX = 40; // Rendering base size

interface Props {
  map: GridMap;
  playerPos: { x: number; y: number };
  hazardCells: Set<string>;
  simulation: DisasterSimulation;
}

export function GameCanvas({ map, playerPos, hazardCells, simulation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // Camera state for smooth tracking
  const [camera, setCamera] = useState({ x: 0, y: 0 });

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

  // Smooth camera tracking
  useEffect(() => {
    if (dimensions.w === 0 || dimensions.h === 0) return;
    
    // Default zoom for gameplay
    const zoom = 1.5; 
    const viewW = dimensions.w / (BASE_CELL_PX * zoom);
    const viewH = dimensions.h / (BASE_CELL_PX * zoom);
    
    const targetX = playerPos.x + 0.5 - viewW / 2;
    const targetY = playerPos.y + 0.5 - viewH / 2;
    
    setCamera({ x: targetX, y: targetY });
  }, [playerPos.x, playerPos.y, dimensions]);

  const activeSafePoints = simulation.scenarioExits && simulation.scenarioExits.length > 0 
    ? []
    : map.safePoints.filter(sp => simulation.safePointIds.includes(sp.id));

  // Determine viewBox.
  const zoom = 1.5;
  const viewW = dimensions.w > 0 ? dimensions.w / (BASE_CELL_PX * zoom) : map.gridWidth;
  const viewH = dimensions.h > 0 ? dimensions.h / (BASE_CELL_PX * zoom) : map.gridHeight;
  const viewBoxStr = `${camera.x} ${camera.y} ${viewW} ${viewH}`;

  const pixelStroke = 1 / (BASE_CELL_PX * zoom);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[60vh] rounded-2xl overflow-hidden bg-slate-900 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] border border-slate-800"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBoxStr}
        preserveAspectRatio="xMidYMid slice"
        style={{ 
          display: 'block',
          transition: 'viewBox 0.3s cubic-bezier(0.25, 1, 0.5, 1)' 
        }}
      >
        {/* Defs for dynamic lighting / glows */}
        <defs>
          <radialGradient id="player-light" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="fire-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
            <stop offset="50%" stopColor="rgba(239, 68, 68, 0.3)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
          </radialGradient>
          <radialGradient id="safe-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.6)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </radialGradient>
          <radialGradient id="guide-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </radialGradient>
          <pattern id="diagonalHatchRed" width="0.2" height="0.2" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="0.2" stroke="rgba(239, 68, 68, 0.4)" strokeWidth={pixelStroke * 2} />
          </pattern>
        </defs>

        {/* Base Map - Darkened */}
        <rect x={0} y={0} width={map.gridWidth} height={map.gridHeight} fill="#0f172a" />

        {/* Cells */}
        {Object.values(map.cells).map(cell => {
          if (cell.type === 'EMPTY') return null;
          
          let fill = CELL_COLORS[cell.type] || 'transparent';
          let stroke = CELL_BORDER_COLORS[cell.type] || 'transparent';
          
          if (cell.type === 'WALL') {
            fill = '#1e293b'; stroke = '#0f172a';
          } else if (cell.type === 'ROOM') {
            fill = '#334155'; stroke = '#1e293b';
          } else if (cell.type === 'CORRIDOR') {
            fill = '#1e293b'; stroke = 'transparent';
          } else if (cell.type === 'DOOR') {
            fill = '#475569'; stroke = '#334155';
          }

          return (
            <rect
              key={`${cell.x},${cell.y}`}
              x={cell.x}
              y={cell.y}
              width={1}
              height={1}
              fill={fill}
              stroke={stroke}
              strokeWidth={pixelStroke}
            />
          );
        })}

        {/* Walkable Safe Routes */}
        {simulation.walkableCells && simulation.walkableCells.map(key => {
          const [wx, wy] = key.split(',').map(Number);
          return (
            <g key={`walk_${key}`}>
              <rect x={wx + 0.5 - 0.05} y={wy + 0.5 - 0.05} width="0.1" height="0.1" fill="#4ade80" rx="0.05" className="animate-pulse" />
              <circle cx={wx + 0.5} cy={wy + 0.5} r={0.5} fill="url(#guide-glow)" />
            </g>
          );
        })}

        {/* Blocked Routes */}
        {simulation.blockedCells && simulation.blockedCells.map(key => {
          const [bx, by] = key.split(',').map(Number);
          return (
            <rect key={`block_${key}`} x={bx} y={by} width={1} height={1}
              fill="url(#diagonalHatchRed)" stroke="rgba(239, 68, 68, 0.6)" strokeWidth={pixelStroke} />
          );
        })}

        {/* Safe Points - Glow */}
        {activeSafePoints.map(sp => (
          <g key={`sp_${sp.x}_${sp.y}`}>
            <circle
              cx={sp.x + 0.5}
              cy={sp.y + 0.5}
              r={1.5}
              fill="url(#safe-glow)"
              className="animate-pulse"
            />
            <rect
              x={sp.x}
              y={sp.y}
              width={1}
              height={1}
              fill="rgba(34, 197, 94, 0.3)"
              stroke="#4ade80"
              strokeWidth={pixelStroke * 2}
            />
          </g>
        ))}

        {/* Hazard Zones - Fire/Smoke Simulation */}
        {Array.from(hazardCells).map(key => {
          const [hx, hy] = key.split(',').map(Number);
          return (
            <g key={`haz_${key}`}>
              <circle
                cx={hx + 0.5}
                cy={hy + 0.5}
                r={1.8}
                fill="url(#fire-glow)"
                className="animate-pulse"
              />
              <rect
                x={hx + 0.1}
                y={hy + 0.1}
                width={0.8}
                height={0.8}
                fill="#ef4444"
                rx="0.1"
                className="opacity-80"
              />
            </g>
          );
        })}

        {/* Scenario Exits */}
        {simulation.scenarioExits?.map((sp, i) => (
          <g key={`scen_exit_${i}`}>
            <circle
              cx={sp.x + 0.5}
              cy={sp.y + 0.5}
              r={1.5}
              fill="url(#safe-glow)"
              className="animate-pulse"
            />
            <rect
              x={sp.x}
              y={sp.y}
              width={1}
              height={1}
              fill="rgba(34, 197, 94, 0.3)"
              stroke="#4ade80"
              strokeWidth={pixelStroke * 2}
            />
            <text x={sp.x + 0.5} y={sp.y + 0.55}
              textAnchor="middle" dominantBaseline="middle" fontSize={0.5} fill="#fff" fontWeight="bold">E</text>
          </g>
        ))}

        {/* Obstacles */}
        {simulation.obstacles?.map(o => (
          <g key={o.id}>
            <rect x={o.x + 0.05} y={o.y + 0.05} width={0.9} height={0.9}
              fill="rgba(245, 158, 11, 0.8)" stroke="rgba(180, 83, 9, 1)" strokeWidth={pixelStroke * 2} rx="0.1" />
            <text x={o.x + 0.5} y={o.y + 0.55}
              textAnchor="middle" dominantBaseline="middle" fontSize={0.6} fill="#fff" fontWeight="bold">
              !
            </text>
          </g>
        ))}

        {/* Player Light Overlay */}
        <circle
          cx={playerPos.x + 0.5}
          cy={playerPos.y + 0.5}
          r={5}
          fill="url(#player-light)"
          style={{ transition: 'cx 0.3s, cy 0.3s' }}
        />

        {/* Player Character */}
        <g style={{ transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)' }}>
          <circle
            cx={playerPos.x + 0.5}
            cy={playerPos.y + 0.5}
            r={0.35}
            fill="#60a5fa"
            stroke="#fff"
            strokeWidth={pixelStroke * 2}
            className="shadow-glow-blue"
            style={{ transition: 'cx 0.3s, cy 0.3s' }}
          />
          <circle
            cx={playerPos.x + 0.5}
            cy={playerPos.y + 0.5}
            r={0.45}
            fill="none"
            stroke="rgba(96,165,250,0.6)"
            strokeWidth={pixelStroke * 2}
            className="animate-ping"
            style={{ transition: 'cx 0.3s, cy 0.3s' }}
          />
        </g>

        {/* Global Darkness Overlay (Vignette) */}
        <rect
          x={0}
          y={0}
          width={map.gridWidth}
          height={map.gridHeight}
          fill="rgba(0,0,0,0.4)"
          pointerEvents="none"
        />
      </svg>

      {/* Static Vignette over container */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
