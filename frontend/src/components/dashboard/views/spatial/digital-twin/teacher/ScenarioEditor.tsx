import { useState, useCallback } from "react";
import { ArrowLeft, Save, Info } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type {
  GridMap,
  DisasterSimulation,
  ScenarioObstacle,
  SimulationHazardConfig,
} from "../types";
import { updateSimulation } from "@/services/digitalTwinService";
import { GridCanvas } from "./GridCanvas";
import { ScenarioToolbar, ScenarioTool } from "./ScenarioToolbar";

interface Props {
  map: GridMap;
  simulation: DisasterSimulation;
  onBack: () => void;
}

export function ScenarioEditor({ map, simulation, onBack }: Props) {
  const { show } = useToast();
  const [activeTool, setActiveTool] = useState<ScenarioTool>("SAFE_ROUTE");
  const [saving, setSaving] = useState(false);

  const [walkableCells, setWalkableCells] = useState<Set<string>>(
    new Set(simulation.walkableCells || []),
  );
  const [blockedCells, setBlockedCells] = useState<Set<string>>(
    new Set(simulation.blockedCells || []),
  );
  const [obstacles, setObstacles] = useState<ScenarioObstacle[]>(
    simulation.obstacles || [],
  );
  const [hazards, setHazards] = useState<SimulationHazardConfig[]>(
    simulation.hazards || [],
  );
  const [scenarioSpawn, setScenarioSpawn] = useState<
    { x: number; y: number } | undefined
  >(simulation.scenarioSpawn);
  const [scenarioExits, setScenarioExits] = useState<
    { x: number; y: number }[]
  >(simulation.scenarioExits || []);

  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handlePaint = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;

      if (activeTool === "ERASE") {
        setWalkableCells((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
        setBlockedCells((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
        setObstacles((prev) => prev.filter((o) => o.x !== x || o.y !== y));
        setHazards((prev) => prev.filter((h) => h.x !== x || h.y !== y));
        if (scenarioSpawn?.x === x && scenarioSpawn?.y === y)
          setScenarioSpawn(undefined);
        setScenarioExits((prev) => prev.filter((e) => e.x !== x || e.y !== y));
        return;
      }

      if (activeTool === "SAFE_ROUTE") {
        setBlockedCells((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
        setWalkableCells((prev) => {
          const n = new Set(prev);
          n.add(key);
          return n;
        });
      } else if (activeTool === "BLOCKED_ROUTE") {
        setWalkableCells((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
        setBlockedCells((prev) => {
          const n = new Set(prev);
          n.add(key);
          return n;
        });
      } else if (activeTool === "OBSTACLE") {
        setObstacles((prev) => {
          if (prev.find((o) => o.x === x && o.y === y)) return prev;
          return [
            ...prev,
            {
              id: `obs_${x}_${y}`,
              type: simulation.disasterType,
              x,
              y,
              width: 1,
              height: 1,
              blocking: true,
            },
          ];
        });
      } else if (activeTool === "HAZARD") {
        setHazards((prev) => {
          if (prev.find((h) => h.x === x && h.y === y)) return prev;
          return [
            ...prev,
            {
              id: `haz_${x}_${y}`,
              type: simulation.disasterType,
              label: "Bahaya",
              x,
              y,
              radius: 2,
              damagePerSecond: 10,
              lethal: false,
              startTime: 0,
              duration: -1,
              movementEffect: "slow",
            },
          ];
        });
      } else if (activeTool === "SPAWN") {
        setScenarioSpawn({ x, y });
      } else if (activeTool === "EXIT") {
        setScenarioExits((prev) => {
          if (prev.find((e) => e.x === x && e.y === y)) return prev;
          return [...prev, { x, y }];
        });
      }
    },
    [activeTool, scenarioSpawn, simulation.disasterType],
  );

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
      show("Skenario berhasil disimpan", "success");
    } catch (_e) {
      show("Gagal menyimpan skenario", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleHover = useCallback((x: number | null, y: number | null) => {
    if (x === null || y === null) setHoveredCell(null);
    else setHoveredCell({ x, y });
  }, []);

  const renderScenarioOverlay = () => {
    return (
      <g className="scenario-overlay" pointerEvents="none">
        {/* Walkable Safe Routes */}
        {Array.from(walkableCells).map((key) => {
          const [cx, cy] = key.split(",").map(Number);
          return (
            <rect
              key={`safe_${key}`}
              x={cx}
              y={cy}
              width={1}
              height={1}
              fill="rgba(34, 197, 94, 0.4)"
              stroke="rgba(34, 197, 94, 0.8)"
              strokeWidth="0.05"
              strokeDasharray="0.1 0.1"
            />
          );
        })}

        {/* Blocked Routes */}
        {Array.from(blockedCells).map((key) => {
          const [cx, cy] = key.split(",").map(Number);
          return (
            <rect
              key={`block_${key}`}
              x={cx}
              y={cy}
              width={1}
              height={1}
              fill="url(#diagonalHatchRed)"
              stroke="rgba(239, 68, 68, 0.9)"
              strokeWidth="0.05"
            />
          );
        })}

        {/* Pattern for Blocked */}
        <defs>
          <pattern
            id="diagonalHatchRed"
            width="0.2"
            height="0.2"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="0.2"
              stroke="rgba(239, 68, 68, 0.5)"
              strokeWidth="0.05"
            />
          </pattern>
        </defs>

        {/* Hazards */}
        {hazards.map((h) => (
          <circle
            key={h.id}
            cx={h.x + 0.5}
            cy={h.y + 0.5}
            r={0.8}
            fill="rgba(239, 68, 68, 0.3)"
            stroke="rgba(239, 68, 68, 0.8)"
            strokeWidth="0.05"
            className="animate-pulse"
          />
        ))}

        {/* Obstacles */}
        {obstacles.map((o) => (
          <g key={o.id}>
            <rect
              x={o.x + 0.05}
              y={o.y + 0.05}
              width={0.9}
              height={0.9}
              fill="rgba(245, 158, 11, 0.9)"
              stroke="rgba(180, 83, 9, 1)"
              strokeWidth="0.05"
              rx="0.1"
            />
            <text
              x={o.x + 0.5}
              y={o.y + 0.55}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={0.5}
              fill="#fff"
              fontWeight="bold"
            >
              !
            </text>
          </g>
        ))}

        {/* Scenario Spawn */}
        {scenarioSpawn && (
          <g>
            <circle
              cx={scenarioSpawn.x + 0.5}
              cy={scenarioSpawn.y + 0.5}
              r={0.4}
              fill="#4f46e5"
              stroke="#fff"
              strokeWidth="0.05"
            />
            <text
              x={scenarioSpawn.x + 0.5}
              y={scenarioSpawn.y + 0.55}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={0.5}
              fill="#fff"
            >
              S
            </text>
          </g>
        )}

        {/* Scenario Exits */}
        {scenarioExits.map((e, i) => (
          <g key={`exit_${i}`}>
            <rect
              x={e.x + 0.05}
              y={e.y + 0.05}
              width={0.9}
              height={0.9}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth="0.05"
              rx="0.1"
            />
            <text
              x={e.x + 0.5}
              y={e.y + 0.55}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={0.5}
              fill="#fff"
            >
              E
            </text>
          </g>
        ))}

        {/* Ghost Preview */}
        {hoveredCell && activeTool !== "ERASE" && (
          <g className="opacity-50">
            {activeTool === "SAFE_ROUTE" && (
              <rect
                x={hoveredCell.x}
                y={hoveredCell.y}
                width={1}
                height={1}
                fill="rgba(34, 197, 94, 0.4)"
              />
            )}
            {activeTool === "BLOCKED_ROUTE" && (
              <rect
                x={hoveredCell.x}
                y={hoveredCell.y}
                width={1}
                height={1}
                fill="rgba(239, 68, 68, 0.4)"
              />
            )}
            {activeTool === "OBSTACLE" && (
              <rect
                x={hoveredCell.x + 0.05}
                y={hoveredCell.y + 0.05}
                width={0.9}
                height={0.9}
                fill="rgba(245, 158, 11, 0.6)"
                rx="0.1"
              />
            )}
            {activeTool === "HAZARD" && (
              <circle
                cx={hoveredCell.x + 0.5}
                cy={hoveredCell.y + 0.5}
                r={0.8}
                fill="rgba(239, 68, 68, 0.3)"
              />
            )}
            {activeTool === "SPAWN" && (
              <circle
                cx={hoveredCell.x + 0.5}
                cy={hoveredCell.y + 0.5}
                r={0.4}
                fill="rgba(79, 70, 229, 0.6)"
              />
            )}
            {activeTool === "EXIT" && (
              <rect
                x={hoveredCell.x + 0.05}
                y={hoveredCell.y + 0.05}
                width={0.9}
                height={0.9}
                fill="rgba(37, 99, 235, 0.6)"
                rx="0.1"
              />
            )}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-brand-600 font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div>
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              {simulation.name}
            </h3>
            <p className="text-xs text-ink-500">
              Skenario: {simulation.disasterType} &bull; Peta Dasar: {map.name}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow"
        >
          <Save className="h-4 w-4" />{" "}
          {saving ? "Menyimpan..." : "Simpan Skenario"}
        </button>
      </div>

      <div className="text-xs text-ink-500 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        Tambahkan elemen skenario khusus di atas peta dasar. Elemen ini hanya
        berlaku untuk simulasi ini.
      </div>

      <ScenarioToolbar
        activeTool={activeTool}
        onSelect={setActiveTool}
        disasterType={simulation.disasterType}
      />

      <GridCanvas
        gridWidth={map.gridWidth}
        gridHeight={map.gridHeight}
        cells={map.cells}
        safePoints={map.safePoints}
        spawnPoints={map.spawnPoints}
        doors={map.doors}
        onPaint={handlePaint}
        onHover={handleHover}
        readOnly={false}
        scenarioOverlay={renderScenarioOverlay()}
      />
    </div>
  );
}
