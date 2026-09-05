import { useEffect, useRef, useState } from 'react';
import type { GridMap, DisasterSimulation } from '../types';
import { CELL_COLORS, CELL_BORDER_COLORS } from '../teacher/cellConstants';

const CELL_PX = 32; // Larger cells for gameplay

interface Props {
  map: GridMap;
  playerPos: { x: number; y: number };
  hazardCells: Set<string>;
  simulation: DisasterSimulation;
}

export function GameCanvas({ map, playerPos, hazardCells, simulation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

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

  const activeSafePoints = simulation.scenarioExits && simulation.scenarioExits.length > 0 
    ? [] // We render scenario exits explicitly later
    : map.safePoints.filter(sp => simulation.safePointIds.includes(sp.id));

  // Calculate Camera Pan to center player
  const playerScreenX = playerPos.x * CELL_PX + CELL_PX / 2;
  const playerScreenY = playerPos.y * CELL_PX + CELL_PX / 2;
  const panX = dimensions.w / 2 - playerScreenX;
  const panY = dimensions.h / 2 - playerScreenY;

  const totalW = map.gridWidth * CELL_PX;
  const totalH = map.gridHeight * CELL_PX;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[60vh] rounded-2xl overflow-hidden bg-slate-900 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] border border-slate-800"
    >
      <div style={{
        position: 'absolute',
        top: panY,
        left: panX,
        width: totalW,
        height: totalH,
        transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)', // Smooth camera tracking
      }}>
        <svg
          width={totalW}
          height={totalH}
          style={{ position: 'absolute', top: 0, left: 0 }}
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
            <pattern id="diagonalHatchRed" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Base Map - Darkened */}
          <rect width={totalW} height={totalH} fill="#0f172a" />

          {/* Cells */}
          {Object.values(map.cells).map(cell => {
            if (cell.type === 'EMPTY') return null;
            
            // Darker colors for gameplay
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
                x={cell.x * CELL_PX}
                y={cell.y * CELL_PX}
                width={CELL_PX}
                height={CELL_PX}
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
              />
            );
          })}

          {/* Walkable Safe Routes */}
          {simulation.walkableCells && simulation.walkableCells.map(key => {
            const [wx, wy] = key.split(',').map(Number);
            return (
              <g key={`walk_${key}`}>
                <rect x={wx * CELL_PX + CELL_PX/2 - 2} y={wy * CELL_PX + CELL_PX/2 - 2} width="4" height="4" fill="#4ade80" rx="2" className="animate-pulse" />
                <circle cx={wx * CELL_PX + CELL_PX/2} cy={wy * CELL_PX + CELL_PX/2} r={CELL_PX/2} fill="url(#guide-glow)" />
              </g>
            );
          })}

          {/* Blocked Routes */}
          {simulation.blockedCells && simulation.blockedCells.map(key => {
            const [bx, by] = key.split(',').map(Number);
            return (
              <rect key={`block_${key}`} x={bx * CELL_PX} y={by * CELL_PX} width={CELL_PX} height={CELL_PX}
                fill="url(#diagonalHatchRed)" stroke="rgba(239, 68, 68, 0.6)" strokeWidth="1" />
            );
          })}

          {/* Safe Points - Glow */}
          {activeSafePoints.map(sp => (
            <g key={`sp_${sp.x}_${sp.y}`}>
              <circle
                cx={sp.x * CELL_PX + CELL_PX / 2}
                cy={sp.y * CELL_PX + CELL_PX / 2}
                r={CELL_PX * 1.5}
                fill="url(#safe-glow)"
                className="animate-pulse"
              />
              <rect
                x={sp.x * CELL_PX}
                y={sp.y * CELL_PX}
                width={CELL_PX}
                height={CELL_PX}
                fill="rgba(34, 197, 94, 0.3)"
                stroke="#4ade80"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Hazard Zones - Fire/Smoke Simulation */}
          {Array.from(hazardCells).map(key => {
            const [hx, hy] = key.split(',').map(Number);
            return (
              <g key={`haz_${key}`}>
                <circle
                  cx={hx * CELL_PX + CELL_PX / 2}
                  cy={hy * CELL_PX + CELL_PX / 2}
                  r={CELL_PX * 1.8}
                  fill="url(#fire-glow)"
                  className="animate-pulse"
                />
                <rect
                  x={hx * CELL_PX + 4}
                  y={hy * CELL_PX + 4}
                  width={CELL_PX - 8}
                  height={CELL_PX - 8}
                  fill="#ef4444"
                  rx="4"
                  className="opacity-80"
                />
              </g>
            );
          })}

          {/* Scenario Exits */}
          {simulation.scenarioExits?.map((sp, i) => (
            <g key={`scen_exit_${i}`}>
              <circle
                cx={sp.x * CELL_PX + CELL_PX / 2}
                cy={sp.y * CELL_PX + CELL_PX / 2}
                r={CELL_PX * 1.5}
                fill="url(#safe-glow)"
                className="animate-pulse"
              />
              <rect
                x={sp.x * CELL_PX}
                y={sp.y * CELL_PX}
                width={CELL_PX}
                height={CELL_PX}
                fill="rgba(34, 197, 94, 0.3)"
                stroke="#4ade80"
                strokeWidth="2"
              />
              <text x={sp.x * CELL_PX + CELL_PX / 2} y={sp.y * CELL_PX + CELL_PX / 2 + 1}
                textAnchor="middle" dominantBaseline="middle" fontSize={CELL_PX * 0.5} fill="#fff" fontWeight="bold">E</text>
            </g>
          ))}

          {/* Obstacles */}
          {simulation.obstacles?.map(o => (
            <g key={o.id}>
              <rect x={o.x * CELL_PX + 2} y={o.y * CELL_PX + 2} width={CELL_PX - 4} height={CELL_PX - 4}
                fill="rgba(245, 158, 11, 0.8)" stroke="rgba(180, 83, 9, 1)" strokeWidth="2" rx="4" />
              <text x={o.x * CELL_PX + CELL_PX/2} y={o.y * CELL_PX + CELL_PX/2 + 2}
                textAnchor="middle" dominantBaseline="middle" fontSize={CELL_PX * 0.6} fill="#fff" fontWeight="bold">
                !
              </text>
            </g>
          ))}

          {/* Player Light Overlay */}
          <circle
            cx={playerPos.x * CELL_PX + CELL_PX / 2}
            cy={playerPos.y * CELL_PX + CELL_PX / 2}
            r={CELL_PX * 5}
            fill="url(#player-light)"
            style={{ transition: 'cx 0.3s, cy 0.3s' }}
          />

          {/* Player Character */}
          <g style={{ transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)' }}>
            <circle
              cx={playerPos.x * CELL_PX + CELL_PX / 2}
              cy={playerPos.y * CELL_PX + CELL_PX / 2}
              r={CELL_PX * 0.35}
              fill="#60a5fa"
              stroke="#fff"
              strokeWidth="2"
              className="shadow-glow-blue"
              style={{ transition: 'cx 0.3s, cy 0.3s' }}
            />
            <circle
              cx={playerPos.x * CELL_PX + CELL_PX / 2}
              cy={playerPos.y * CELL_PX + CELL_PX / 2}
              r={CELL_PX * 0.45}
              fill="none"
              stroke="rgba(96,165,250,0.6)"
              strokeWidth="2"
              className="animate-ping"
              style={{ transition: 'cx 0.3s, cy 0.3s' }}
            />
          </g>

          {/* Global Darkness Overlay (Vignette) */}
          <rect
            width={totalW}
            height={totalH}
            fill="rgba(0,0,0,0.4)"
            pointerEvents="none"
          />
        </svg>
      </div>

      {/* Static Vignette over container */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
