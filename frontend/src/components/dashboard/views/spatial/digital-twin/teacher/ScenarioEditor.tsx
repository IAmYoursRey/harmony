import { useState, useCallback } from 'react';
import { ArrowLeft, Save, Info } from 'lucide-react';
import {  useToast  } from '@/hooks/useToast';
import type { GridMap, DisasterSimulation, ScenarioObstacle, SimulationHazardConfig } from '../types';
import { updateSimulation } from '@/services/digitalTwinService';
import { GridCanvas } from './GridCanvas';
import { ScenarioToolbar, ScenarioTool } from './ScenarioToolbar';

interface Props {
  map: GridMap;
  simulation: DisasterSimulation;
  onBack: () => void;
}

export function ScenarioEditor({ map, simulation, onBack }: Props) {
  const { show } = useToast();
  const [activeTool, setActiveTool] = useState<ScenarioTool>('SAFE_ROUTE');
  const [saving, setSaving] = useState(false);

  // Local Scenario State
  const [walkableCells, setWalkableCells] = useState<Set<string>>(new Set(simulation.walkableCells || []));
  const [blockedCells, setBlockedCells] = useState<Set<string>>(new Set(simulation.blockedCells || []));
  const [obstacles, setObstacles] = useState<ScenarioObstacle[]>(simulation.obstacles || []);
  const [hazards, setHazards] = useState<SimulationHazardConfig[]>(simulation.hazards || []);
  const [scenarioSpawn, setScenarioSpawn] = useState<{ x: number, y: number } | undefined>(simulation.scenarioSpawn);
  const [scenarioExits, setScenarioExits] = useState<{ x: number, y: number }[]>(simulation.scenarioExits || []);

  const handlePaint = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;

    if (activeTool === 'ERASE') {
      setWalkableCells(prev => { const n = new Set(prev); n.delete(key); return n; });
      setBlockedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
      setObstacles(prev => prev.filter(o => o.x !== x || o.y !== y));
      setHazards(prev => prev.filter(h => h.x !== x || h.y !== y));
      if (scenarioSpawn?.x === x && scenarioSpawn?.y === y) setScenarioSpawn(undefined);
      setScenarioExits(prev => prev.filter(e => e.x !== x || e.y !== y));
      return;
    }

    if (activeTool === 'SAFE_ROUTE') {
      setBlockedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
      setWalkableCells(prev => { const n = new Set(prev); n.add(key); return n; });
    } else if (activeTool === 'BLOCKED_ROUTE') {
      setWalkableCells(prev => { const n = new Set(prev); n.delete(key); return n; });
      setBlockedCells(prev => { const n = new Set(prev); n.add(key); return n; });
    } else if (activeTool === 'OBSTACLE') {
      setObstacles(prev => {
        if (prev.find(o => o.x === x && o.y === y)) return prev;
        return [...prev, {
          id: `obs_${x}_${y}`,
          type: simulation.disasterType,
          x, y, width: 1, height: 1, blocking: true
        }];
      });
    } else if (activeTool === 'HAZARD') {
      setHazards(prev => {
        if (prev.find(h => h.x === x && h.y === y)) return prev;
        return [...prev, {
          id: `haz_${x}_${y}`,
          type: simulation.disasterType,
          label: 'Bahaya',
          x, y, radius: 2, damagePerSecond: 10, lethal: false, startTime: 0, duration: -1, movementEffect: 'slow'
        }];
      });
    } else if (activeTool === 'SPAWN') {
      setScenarioSpawn({ x, y });
    } else if (activeTool === 'EXIT') {
      setScenarioExits(prev => {
        if (prev.find(e => e.x === x && e.y === y)) return prev;
        return [...prev, { x, y }];
      });
    }
  }, [activeTool, scenarioSpawn, simulation.disasterType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSimulation(simulation.id, {
        walkableCells: Array.from(walkableCells),
        blockedCells: Array.from(blockedCells),
        obstacles,
        hazards,
        scenarioSpawn,
        scenarioExits,
      });
      show('Skenario berhasil disimpan', 'success');
    } catch (_e) {
      show('Gagal menyimpan skenario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderScenarioOverlay = () => {
    const cellSize = 24; // Base cell size used in GridCanvas logic (though scaled)
    return (
      <g className="scenario-overlay" pointerEvents="none">
        {/* Walkable Safe Routes */}
        {Array.from(walkableCells).map(key => {
          const [cx, cy] = key.split(',').map(Number);
          return (
            <rect key={`safe_${key}`} x={cx * cellSize} y={cy * cellSize} width={cellSize} height={cellSize}
              fill="rgba(34, 197, 94, 0.4)" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="2" strokeDasharray="4 2" />
          );
        })}
        {/* Blocked Routes */}
        {Array.from(blockedCells).map(key => {
          const [cx, cy] = key.split(',').map(Number);
          return (
            <rect key={`block_${key}`} x={cx * cellSize} y={cy * cellSize} width={cellSize} height={cellSize}
              fill="url(#diagonalHatchRed)" stroke="rgba(239, 68, 68, 0.9)" strokeWidth="2" />
          );
        })}
        {/* Pattern for Blocked */}
        <defs>
          <pattern id="diagonalHatchRed" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Hazards */}
        {hazards.map(h => (
          <circle key={h.id} cx={h.x * cellSize + cellSize/2} cy={h.y * cellSize + cellSize/2} r={cellSize * 0.8}
            fill="rgba(239, 68, 68, 0.3)" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="2" className="animate-pulse" />
        ))}

        {/* Obstacles */}
        {obstacles.map(o => (
          <g key={o.id}>
            <rect x={o.x * cellSize + 2} y={o.y * cellSize + 2} width={cellSize - 4} height={cellSize - 4}
              fill="rgba(245, 158, 11, 0.9)" stroke="rgba(180, 83, 9, 1)" strokeWidth="2" rx="4" />
            <text x={o.x * cellSize + cellSize/2} y={o.y * cellSize + cellSize/2 + 1}
              textAnchor="middle" dominantBaseline="middle" fontSize={cellSize * 0.5} fill="#fff" fontWeight="bold">
              !
            </text>
          </g>
        ))}

        {/* Scenario Spawn */}
        {scenarioSpawn && (
          <g>
            <circle cx={scenarioSpawn.x * cellSize + cellSize/2} cy={scenarioSpawn.y * cellSize + cellSize/2} r={cellSize * 0.4}
              fill="#4f46e5" stroke="#fff" strokeWidth="2" />
            <text x={scenarioSpawn.x * cellSize + cellSize/2} y={scenarioSpawn.y * cellSize + cellSize/2 + 1}
              textAnchor="middle" dominantBaseline="middle" fontSize={cellSize * 0.5} fill="#fff">S</text>
          </g>
        )}

        {/* Scenario Exits */}
        {scenarioExits.map((e, i) => (
          <g key={`exit_${i}`}>
            <rect x={e.x * cellSize + 2} y={e.y * cellSize + 2} width={cellSize - 4} height={cellSize - 4}
              fill="#2563eb" stroke="#fff" strokeWidth="2" />
            <text x={e.x * cellSize + cellSize/2} y={e.y * cellSize + cellSize/2 + 1}
              textAnchor="middle" dominantBaseline="middle" fontSize={cellSize * 0.5} fill="#fff">E</text>
          </g>
        ))}
      </g>
    );
  };

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-brand-600 font-semibold">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div>
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{simulation.name}</h3>
            <p className="text-xs text-ink-500">
              Skenario: {simulation.disasterType} &bull; Peta Dasar: {map.name}
            </p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow">
          <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Skenario'}
        </button>
      </div>

      <div className="text-xs text-ink-500 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        Tambahkan elemen skenario khusus di atas peta dasar. Elemen ini hanya berlaku untuk simulasi ini.
      </div>

      <ScenarioToolbar activeTool={activeTool} onSelect={setActiveTool} disasterType={simulation.disasterType} />

      <GridCanvas
        gridWidth={map.gridWidth}
        gridHeight={map.gridHeight}
        cells={map.cells}
        safePoints={map.safePoints}
        spawnPoints={map.spawnPoints}
        doors={map.doors}
        onPaint={handlePaint}
        readOnly={false}
        scenarioOverlay={renderScenarioOverlay()}
      />
    </div>
  );
}
