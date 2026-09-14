import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phase1Map,
  Phase1Floor,
  Phase1Tile,
  Phase1Object,
  Phase1Boundary,
  Phase1Stairs,
} from "./Phase1Types";
import { phase1Api } from "./Phase1API";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  Save,
  Copy,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Plus,
  Trash2,
  MapIcon,
  Edit,
  Key,
} from "lucide-react";
import { AssetRenderer } from "./Phase1AssetRenderer";
import { Phase1Canvas } from "./Phase1Canvas";
import {
  TILE_DEFINITIONS,
  TileCategory,
  ROOM_TYPES,
  TileDefinition,
} from "./Phase1TileDefinitions";

export type Tool = string;

export function Phase1MapEditor({
  mapId,
  onClose,
}: {
  mapId: string;
  onClose: () => void;
}) {
  const { show } = useToast();

  const [map, setMap] = useState<Phase1Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeDefinitionId, setActiveDefinitionId] = useState<string | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showRoomLabels, setShowRoomLabels] = useState(true);

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });
  const [visibleLayers, setVisibleLayers] = useState({
    ground: true,
    structure: true,
    openings: true,
    objects: true,
    stairs: true,
    special: true,
    grid: true,
  });
  const [paletteSearch, setPaletteSearch] = useState("");

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const latestMapRef = useRef<Phase1Map | null>(null);

  const pushHistory = (newMap?: Phase1Map) => {
    const targetMap = newMap || latestMapRef.current;
    if (!targetMap) return;
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(JSON.stringify(targetMap));
    if (newHist.length > 50) newHist.shift();
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setMap(JSON.parse(history[idx]));
      setUnsaved(true);
      setSelectedItem(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setMap(JSON.parse(history[idx]));
      setUnsaved(true);
      setSelectedItem(null);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select"
      )
        return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        handleUndo();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && e.code === "KeyZ") ||
          (!e.shiftKey && e.code === "KeyY"))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [history, historyIndex]);

  const loadMap = async () => {
    try {
      const data = await phase1Api.getMapDetails(mapId);
      if (!data.floors || data.floors.length === 0) {
        data.floors = [
          {
            id: `floor_${Date.now()}`,
            map_id: data.id,
            floor_number: 1,
            name: "Lantai 1",
            tiles: [],
            objects: [],
          },
        ];
      }
      if (!data.stairs) data.stairs = [];
      if (!data.boundaries) data.boundaries = [];
      if (!data.scenarios) data.scenarios = [];

      data.floors.forEach((f) => {
        if (!f.tiles) f.tiles = [];
        if (!f.objects) f.objects = [];
      });

      let fIndex = 0;
      if (data.active_floor_id) {
        fIndex = Math.max(
          0,
          data.floors.findIndex((f) => f.id === data.active_floor_id),
        );
      }
      setActiveFloorIndex(fIndex);
      setMap(data);

      latestMapRef.current = data;
      setHistory([JSON.stringify(data)]);
      setHistoryIndex(0);
    } catch (err: any) {
      show(`Gagal memuat map: ${err.message}`, "error");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMap();
  }, [mapId]);

  const handleSave = async () => {
    if (!map) return;
    setSaving(true);
    try {
      map.active_floor_id = map.floors[activeFloorIndex].id;
      await phase1Api.saveMap(map.id, map);
      show("Map berhasil disimpan", "success");
      setUnsaved(false);
    } catch (err: any) {
      show(`Gagal menyimpan: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFloor = () => {
    if (!map) return;
    const newFloorNum = map.floors.length + 1;
    const newFloor: Phase1Floor = {
      id: `floor_${Date.now()}`,
      map_id: map.id,
      floor_number: newFloorNum,
      name: `Lantai ${newFloorNum}`,
      tiles: [],
      objects: [],
    };
    const newMapState = { ...map, floors: [...map.floors, newFloor] };
    setMap(newMapState);
    setActiveFloorIndex(map.floors.length);
    setUnsaved(true);
    pushHistory(newMapState);
  };

  const requestDeleteItem = () => {
    if (!selectedItem) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteItem = () => {
    if (!selectedItem || !map) return;
    const newMap = JSON.parse(JSON.stringify(map)) as Phase1Map;
    const floor = newMap.floors[activeFloorIndex];

    if (selectedItem.type === "OBJECT") {
      floor.objects = floor.objects.filter((o) => o.id !== selectedItem.id);
    } else if (selectedItem.type === "STAIR") {
      newMap.stairs = newMap.stairs.filter((s) => s.id !== selectedItem.id);
    } else if (selectedItem.type === "TILE") {
      floor.tiles = floor.tiles.filter((t) => t.id !== selectedItem.id);
    } else if (selectedItem.type === "BOUNDARY") {
      newMap.boundaries = newMap.boundaries.filter(
        (b) => b.id !== selectedItem.id,
      );
    }

    setMap(newMap);
    setUnsaved(true);
    pushHistory(newMap);
    setSelectedItem(null);
    setDeleteConfirmOpen(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center text-white">
        Loading Editor...
      </div>
    );
  }
  if (!map) return null;

  const activeFloor = map.floors[activeFloorIndex];

  console.log("--- DEVELOPMENT ONLY: MAP STATE ---");
  console.log(`Map ID: ${map.id}`);
  console.log(`Map Name: ${map.name}`);
  console.log(`Width: ${map.width}`);
  console.log(`Height: ${map.height}`);
  console.log(`Floors: ${map.floors.length}`);
  console.log(`Objects (Active Floor): ${activeFloor?.objects?.length || 0}`);
  console.log("-----------------------------------");

  if (!map.width) map.width = 64;
  if (!map.height) map.height = 64;
  if (!map.stairs) map.stairs = [];
  if (!map.boundaries) map.boundaries = [];

  return (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* TOP BAR */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 overflow-x-auto gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (unsaved ? setExitConfirmOpen(true) : onClose())}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-white leading-tight">
              {map.name}
            </h1>
            <div className="text-xs text-slate-500 font-medium">
              {unsaved ? "Unsaved changes" : "Saved"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-3 py-1 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
              title="Undo"
            >
              ↶
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-1 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
              title="Redo"
            >
              ↷
            </button>
          </div>

          {/* Floor Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {map.floors.map((floor, idx) => (
              <button
                key={floor.id}
                onClick={() => setActiveFloorIndex(idx)}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-colors ${idx === activeFloorIndex ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                {floor.name}
              </button>
            ))}
            <button
              onClick={handleAddFloor}
              className="px-2 py-1 text-slate-500 hover:text-brand-600"
              title="Add Floor"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors ml-2"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Map"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* TOOLBOX LEFT */}
        <div className="w-full sm:w-16 h-auto sm:h-auto bg-white dark:bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 flex flex-row sm:flex-col items-center py-2 sm:py-4 px-4 sm:px-0 gap-2 z-10 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:shadow-[2px_0_10px_rgba(0,0,0,0.05)] overflow-x-auto sm:overflow-y-auto">
          <ToolBtn
            icon="👆"
            label="Select"
            tool="select"
            def={null}
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="✋"
            label="Move"
            tool="move"
            def={null}
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="🧽"
            label="Eraser"
            tool="eraser"
            def={null}
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <div className="w-px h-8 sm:w-8 sm:h-px bg-slate-200 dark:bg-slate-800 mx-2 sm:mx-0 sm:my-1 shrink-0" />
          <ToolBtn
            icon="🧱"
            label="Wall"
            tool="WALL"
            def="WALL"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="🚪"
            label="Door"
            tool="OPENING"
            def="DOOR"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="⬜"
            label="Floor"
            tool="FLOOR"
            def="FLOOR"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="⬛"
            label="Paving"
            tool="FLOOR"
            def="PAVING"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="↗️"
            label="Stair Up"
            tool="STAIRS"
            def="STAIR_UP"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="↘️"
            label="Stair Down"
            tool="STAIRS"
            def="STAIR_DOWN"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="🚧"
            label="Border"
            tool="BORDER"
            def="BORDER"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
          <ToolBtn
            icon="🔒"
            label="Locked"
            tool="OPENING"
            def="DOOR_LOCKED"
            active={activeTool}
            defActive={activeDefinitionId}
            setTool={(t, d) => {
              setActiveTool(t as any);
              setActiveDefinitionId(d);
            }}
          />
        </div>

        {/* CANVAS CENTER */}
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-950 overflow-hidden min-h-[40vh]">
          <Phase1Canvas
            map={map}
            activeFloorIndex={activeFloorIndex}
            activeTool={activeTool}
            activeDefinitionId={activeDefinitionId}
            onMapChange={(newMap) => {
              setMap(newMap);
              setUnsaved(true);
              latestMapRef.current = newMap;
            }}
            onMapChangeEnd={() => pushHistory()}
            onSelect={setSelectedItem}
            showRoomLabels={showRoomLabels}
            onHoverChange={(x, y) => setHoverCoords({ x, y })}
            visibleLayers={visibleLayers}
          />
          <div className="absolute bottom-4 left-4 flex gap-2">
            {/* Map controls overlay */}
            <div className="glass rounded-xl p-1 flex shadow-lg items-center">
              <button
                onClick={() => setShowRoomLabels(!showRoomLabels)}
                className={`px-3 py-1 text-xs font-bold rounded-lg mr-2 transition-colors ${showRoomLabels ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                title="Toggle Room Labels"
              >
                {showRoomLabels ? "Labels On" : "Labels Off"}
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                title="Fit Map"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* PROPERTIES RIGHT */}
        <div className="w-full sm:w-64 h-48 sm:h-auto bg-white dark:bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] sm:shadow-[-2px_0_10px_rgba(0,0,0,0.05)] overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white">
              Properties
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Type
                  </label>
                  <div className="mt-1 font-medium text-slate-800 dark:text-white">
                    {selectedItem.type}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Position
                  </label>
                  <div className="mt-1 font-medium text-slate-800 dark:text-white">
                    X: {selectedItem.x}, Y: {selectedItem.y}
                  </div>
                </div>
                {selectedItem.type === "BOUNDARY" && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-1 font-medium text-emerald-600">
                      Active Area
                    </div>
                  </div>
                )}
                {/* Properties editor goes here */}
                <button
                  onClick={requestDeleteItem}
                  className="w-full mt-4 py-2 bg-rose-50 text-rose-600 rounded-lg font-bold text-sm hover:bg-rose-100 transition-colors"
                >
                  Delete Item
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-sm text-slate-500 text-center py-4">
                  Pilih objek di canvas untuk melihat propertinya.
                </div>

                {/* LAYERS */}
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                    Layers
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(visibleLayers).map(([key, val]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) =>
                            setVisibleLayers((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {key}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-20 text-[11px] font-mono text-slate-500 overflow-x-auto gap-4">
        <div className="flex items-center gap-4">
          <span>X: {hoverCoords.x.toString().padStart(3, "0")}</span>
          <span>Y: {hoverCoords.y.toString().padStart(3, "0")}</span>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
          <span>
            Floor: {map.floors[activeFloorIndex]?.name || activeFloorIndex + 1}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Snap: ON</span>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
          <span
            className={
              saving
                ? "text-amber-500 font-bold"
                : unsaved
                  ? "text-rose-500 font-bold"
                  : "text-emerald-500 font-bold"
            }
          >
            {saving ? "Saving..." : unsaved ? "Unsaved" : "Saved"}
          </span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={exitConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to exit?"
        confirmLabel="Exit"
        onConfirm={onClose}
        onCancel={() => setExitConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Object"
        message="Delete this object?"
        confirmLabel="Delete"
        onConfirm={confirmDeleteItem}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

function ToolBtn({
  icon,
  label,
  tool,
  def,
  active,
  defActive,
  setTool,
}: {
  icon: string;
  label: string;
  tool: Tool;
  def: string | null;
  active: Tool;
  defActive: string | null;
  setTool: (t: Tool, d: string | null) => void;
}) {
  const isActive = active === tool && def === defActive;
  return (
    <button
      onClick={() => setTool(tool, def)}
      className={`relative p-3 rounded-xl transition-all group flex flex-col items-center justify-center gap-1 w-12 h-12 ${isActive ? "bg-brand-100 dark:bg-brand-900/40 shadow-inner" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
      title={label}
    >
      <span className="text-xl leading-none block">{icon}</span>
    </button>
  );
}

function AssetPreviewIcon({ def }: { def: TileDefinition }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    const maxDim = 40;
    const cw = Math.max(def.defaultWidth * maxDim, maxDim);
    const ch = Math.max(def.defaultHeight * maxDim, maxDim);
    const tex = AssetRenderer.getTexture(def.id, cw, ch, 0, 0); // 0 mask for standard view
    setDataUrl(tex.toDataURL());
  }, [def]);

  return (
    <div className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-900 rounded shrink-0 overflow-hidden">
      <img
        src={dataUrl}
        alt={def.name}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

export function Phase1MapEditorRoute() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  if (!mapId) return null;
  return (
    <Phase1MapEditor
      mapId={mapId}
      onClose={() => navigate("/app/digital-twin")}
    />
  );
}
