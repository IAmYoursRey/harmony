import { useState, useCallback } from 'react';
import { ArrowLeft, Save, Info } from 'lucide-react';
import {  useToast  } from '@/hooks/useToast';
import type { GridMap, CellType } from '../types';
import { updateMap } from '@/services/digitalTwinService';
import { GridCanvas } from './GridCanvas';
import { GridToolbar } from './GridToolbar';

interface Props {
  map: GridMap;
  onBack: () => void;
}

export type EditorTool = 'EMPTY' | 'WALL' | 'ROOM' | 'CORRIDOR' | 'DOOR' | 'SAFE_POINT' | 'SPAWN' | 'HAZARD' | 'ERASE';

export function MapEditor({ map, onBack }: Props) {
  const { show } = useToast();
  const [activeTool, setActiveTool] = useState<EditorTool>('WALL');
  const [cells, setCells] = useState<GridMap['cells']>({ ...map.cells });
  const [saving, setSaving] = useState(false);
  const [safePoints, setSafePoints] = useState(map.safePoints || []);
  const [spawnPoints, setSpawnPoints] = useState(map.spawnPoints || []);
  const [doors, setDoors] = useState(map.doors || []);

  const handleCellPaint = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;
    setCells(prev => {
      const updated = { ...prev };

      if (activeTool === 'ERASE') {
        delete updated[key];
        return updated;
      }

      const cellType: CellType = activeTool as CellType;
      const walkable = cellType !== 'WALL';

      if (cellType === 'SAFE_POINT') {
        setSafePoints(pts => {
          if (pts.find(s => s.x === x && s.y === y)) return pts;
          return [...pts, {
            id: `sp_${x}_${y}`,
            name: `Titik Aman ${pts.length + 1}`,
            x, y,
            capacity: 50,
            enabled: true,
            priority: pts.length + 1,
          }];
        });
      } else if (cellType === 'SPAWN') {
        // Replace existing spawn with new one
        setSpawnPoints([{ id: `spawn_${x}_${y}`, name: 'Titik Mulai', x, y }]);
      } else if (cellType === 'DOOR') {
        setDoors(drs => {
          if (drs.find(d => d.x === x && d.y === y)) return drs;
          return [...drs, { id: `door_${x}_${y}`, x, y, state: 'open', breakable: false }];
        });
      }

      updated[key] = { x, y, type: cellType, walkable };
      return updated;
    });
  }, [activeTool, safePoints, spawnPoints, doors]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMap(map.id, { cells, safePoints, spawnPoints, doors });
      show('Peta disimpan', 'success');
    } catch (_e) {
      show('Gagal menyimpan peta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cellCount = Object.keys(cells).length;
  const realW = map.gridWidth * map.cellScale;
  const realH = map.gridHeight * map.cellScale;

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
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{map.name}</h3>
            <p className="text-xs text-ink-500">
              {map.gridWidth}×{map.gridHeight} sel &bull; 1 sel = {map.cellScale} {map.cellScaleUnit} &bull; Area: {realW}×{realH} {map.cellScaleUnit} &bull; {cellCount} sel diedit
            </p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow">
          <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Peta'}
        </button>
      </div>

      <div className="text-xs text-ink-500 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        Klik sel untuk mengecat. Klik dan tahan untuk mengecat banyak sel sekaligus. Pilih alat di toolbar.
      </div>

      {/* Toolbar */}
      <GridToolbar activeTool={activeTool} onSelect={setActiveTool} />

      {/* Grid Canvas */}
      <GridCanvas
        gridWidth={map.gridWidth}
        gridHeight={map.gridHeight}
        cells={cells}
        safePoints={safePoints}
        spawnPoints={spawnPoints}
        doors={doors}
        onPaint={handleCellPaint}
      />
    </div>
  );
}
