import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phase1Map, Phase1Scenario, Phase1ScenarioObject } from "./Phase1Types";
import { phase1Api } from "./Phase1API";
import { Eye, Save, Trash2, ArrowLeft } from "lucide-react";
import { AssetRenderer } from "./Phase1AssetRenderer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Phase1Canvas } from "./Phase1Canvas";
import { useToast } from "@/hooks/useToast";

type Tool =
  | "select"
  | "FIRE"
  | "SMOKE"
  | "DANGER_ZONE"
  | "DAMAGE_ZONE"
  | "BLOCKED_AREA"
  | "SAFE_ZONE"
  | "EXIT"
  | "OBJECTIVE"
  | "SPAWN"
  | "eraser";

export function Phase2ScenarioEditor({
  mapId,
  scenarioId,
  onClose,
}: {
  mapId: string;
  scenarioId: string;
  onClose: () => void;
}) {
  const { show } = useToast();

  const [map, setMap] = useState<Phase1Map | null>(null);
  const [scenario, setScenario] = useState<Phase1Scenario | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [history, setHistory] = useState<Phase1ScenarioObject[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const pendingHistoryObjects = useRef<Phase1ScenarioObject[] | null>(null);

  const loadData = async () => {
    try {
      const mapData = await phase1Api.getMapDetails(mapId);
      const scenData = await phase1Api.getScenarioDetails(scenarioId);

      if (!mapData.floors || mapData.floors.length === 0) {
        mapData.floors = [
          {
            id: `floor_${Date.now()}`,
            map_id: mapData.id,
            floor_number: 1,
            name: "Lantai 1",
            tiles: [],
            objects: [],
          },
        ];
      }

      let fIndex = 0;
      if (mapData.active_floor_id) {
        fIndex = Math.max(
          0,
          mapData.floors.findIndex((f) => f.id === mapData.active_floor_id),
        );
      }
      setActiveFloorIndex(fIndex);
      setMap(mapData);

      if (!scenData.objects) scenData.objects = [];
      setScenario(scenData);

      setHistory([scenData.objects]);
      setHistoryIndex(0);
    } catch (err: any) {
      show(`Gagal memuat data: ${err.message}`, "error");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mapId, scenarioId]);

  const handleSave = async () => {
    if (!scenario) return;
    setSaving(true);
    try {
      await phase1Api.updateScenario(scenario.id, scenario);
      show("Scenario berhasil disimpan", "success");
      setUnsaved(false);
    } catch (err: any) {
      show(`Gagal menyimpan: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const pushHistory = (newObjects: Phase1ScenarioObject[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newObjects);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    if (scenario) setScenario({ ...scenario, objects: newObjects });
    setUnsaved(true);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (scenario) setScenario({ ...scenario, objects: history[newIndex] });
      setUnsaved(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (scenario) setScenario({ ...scenario, objects: history[newIndex] });
      setUnsaved(true);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex items-center justify-center text-white">
        Loading Scenario Editor...
      </div>
    );
  }
  if (!map || !scenario) return null;

  return (
    <div className="h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
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
              {scenario.name}{" "}
              <span className="text-sm font-normal text-slate-500 ml-2">
                (Base: {map.name})
              </span>
            </h1>
            <div className="text-xs text-slate-500 font-medium">
              {unsaved ? "Unsaved changes" : "Saved"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
          >
            ↩ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
          >
            ↪ Redo
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors ${isPreviewMode ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <Eye className="h-4 w-4" />{" "}
            {isPreviewMode ? "Exit Preview" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />{" "}
            {saving ? "Saving..." : "Save Scenario"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* TOOLBOX LEFT */}
        {!isPreviewMode && (
          <div className="w-full sm:w-16 h-auto sm:h-auto bg-white dark:bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 flex flex-row sm:flex-col items-center py-2 sm:py-4 px-4 sm:px-0 gap-2 z-10 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:shadow-[2px_0_10px_rgba(0,0,0,0.05)] overflow-x-auto sm:overflow-y-auto overflow-y-hidden sm:overflow-x-visible">
            <ToolBtn
              type="select"
              label="Select"
              icon="👆"
              tool="select"
              active={activeTool}
              set={setActiveTool}
            />
            <div className="w-px h-8 sm:w-8 sm:h-px bg-slate-200 dark:bg-slate-800 my-0 mx-2 sm:my-2 sm:mx-0 shrink-0" />

            <div className="text-[10px] font-bold text-slate-400 mb-1">
              HAZARDS
            </div>
            <ToolBtn
              type="FIRE"
              label="Fire"
              tool="FIRE"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="SMOKE"
              label="Smoke"
              tool="SMOKE"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="DANGER_ZONE"
              label="Danger"
              tool="DANGER_ZONE"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="DAMAGE_ZONE"
              label="Damage"
              tool="DAMAGE_ZONE"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="BLOCKED_AREA"
              label="Block"
              tool="BLOCKED_AREA"
              active={activeTool}
              set={setActiveTool}
            />
            <div className="w-px h-8 sm:w-8 sm:h-px bg-slate-200 dark:bg-slate-800 my-0 mx-2 sm:my-2 sm:mx-0 shrink-0" />

            <div className="text-[10px] font-bold text-slate-400 mb-1">
              SAFETY & SPAWN
            </div>
            <ToolBtn
              type="SPAWN"
              label="Spawn"
              tool="SPAWN"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="SAFE_ZONE"
              label="Safe"
              tool="SAFE_ZONE"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="EXIT"
              label="Exit"
              tool="EXIT"
              active={activeTool}
              set={setActiveTool}
            />
            <ToolBtn
              type="OBJECTIVE"
              label="Objective"
              tool="OBJECTIVE"
              active={activeTool}
              set={setActiveTool}
            />
            <div className="w-px h-8 sm:w-8 sm:h-px bg-slate-200 dark:bg-slate-800 my-0 mx-2 sm:my-2 sm:mx-0 shrink-0" />

            <ToolBtn
              type="eraser"
              label="Eraser"
              icon="🧽"
              tool="eraser"
              active={activeTool}
              set={setActiveTool}
            />
          </div>
        )}

        {/* CANVAS CENTER */}
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-950 overflow-hidden min-h-[40vh]">
          {isPreviewMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-20 pointer-events-none">
              PREVIEW MODE
            </div>
          )}
          <Phase1Canvas
            map={map}
            activeFloorIndex={activeFloorIndex}
            activeTool={isPreviewMode ? "select" : activeTool}
            onMapChange={() => {
              /* Map is IMMUTABLE here */
            }}
            onSelect={setSelectedItem}
            scenario={scenario}
            isScenarioMode={true}
            onScenarioChange={(newScen) => {
              if (isPreviewMode) return;
              setScenario(newScen);
              setUnsaved(true);
              if (newScen.objects) {
                if (activeTool === "select") {
                  pendingHistoryObjects.current = newScen.objects;
                } else {
                  pushHistory(newScen.objects);
                }
              }
            }}
            onScenarioChangeEnd={() => {
              if (pendingHistoryObjects.current) {
                pushHistory(pendingHistoryObjects.current);
                pendingHistoryObjects.current = null;
              }
            }}
          />
        </div>

        {/* PROPERTY PANEL RIGHT */}
        {!isPreviewMode && selectedItem && (
          <div className="w-full sm:w-64 h-48 sm:h-auto bg-white dark:bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] sm:shadow-[-2px_0_10px_rgba(0,0,0,0.05)] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white">
                Scenario Object
              </h3>
              <p className="text-xs text-slate-500">ID: {selectedItem.id}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Type
                </label>
                <div className="text-sm font-medium px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {selectedItem.object_type}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Position (Grid)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
                    X: {selectedItem.x}
                  </div>
                  <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
                    Y: {selectedItem.y}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Size (Width x Height)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={selectedItem.width || 1}
                    onChange={(e) => {
                      const newW = parseInt(e.target.value) || 1;
                      const newObjs =
                        scenario.objects?.map((o) =>
                          o.id === selectedItem.id ? { ...o, width: newW } : o,
                        ) || [];
                      pushHistory(newObjs);
                      setSelectedItem({ ...selectedItem, width: newW });
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={selectedItem.height || 1}
                    onChange={(e) => {
                      const newH = parseInt(e.target.value) || 1;
                      const newObjs =
                        scenario.objects?.map((o) =>
                          o.id === selectedItem.id ? { ...o, height: newH } : o,
                        ) || [];
                      pushHistory(newObjs);
                      setSelectedItem({ ...selectedItem, height: newH });
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Specific Properties based on Type */}
              {(() => {
                const props = selectedItem.properties || {};
                const updateProp = (key: string, val: any) => {
                  const newProps = { ...props, [key]: val };
                  const newObjs =
                    scenario.objects?.map((o) =>
                      o.id === selectedItem.id
                        ? { ...o, properties: newProps }
                        : o,
                    ) || [];
                  pushHistory(newObjs);
                  setSelectedItem({ ...selectedItem, properties: newProps });
                };

                const InputField = ({
                  label,
                  type,
                  propKey,
                  defaultVal,
                  min,
                  max,
                }: any) => (
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      min={min}
                      max={max}
                      value={props[propKey] ?? defaultVal}
                      onChange={(e) =>
                        updateProp(
                          propKey,
                          type === "number"
                            ? parseFloat(e.target.value) || defaultVal
                            : e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                    />
                  </div>
                );

                const CheckboxField = ({ label, propKey, defaultVal }: any) => (
                  <div className="mb-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={props[propKey] ?? defaultVal}
                        onChange={(e) => updateProp(propKey, e.target.checked)}
                      />
                      {label}
                    </label>
                  </div>
                );

                switch (selectedItem.object_type) {
                  case "FIRE":
                    return (
                      <>
                        <CheckboxField
                          label="Enable Damage"
                          propKey="damageEnabled"
                          defaultVal={true}
                        />
                        <InputField
                          label="Damage Amount"
                          type="number"
                          propKey="damageAmount"
                          defaultVal={10}
                          min={0}
                        />
                        <CheckboxField
                          label="Periodic Damage"
                          propKey="periodic"
                          defaultVal={true}
                        />
                        {props.periodic !== false && (
                          <InputField
                            label="Interval (seconds)"
                            type="number"
                            propKey="interval"
                            defaultVal={1}
                            min={0.1}
                          />
                        )}
                        <InputField
                          label="Intensity/Severity (1-10)"
                          type="number"
                          propKey="intensity"
                          defaultVal={5}
                          min={1}
                          max={10}
                        />
                      </>
                    );
                  case "DAMAGE_ZONE":
                  case "DANGER_ZONE":
                    return (
                      <>
                        <CheckboxField
                          label="Enable Damage"
                          propKey="damageEnabled"
                          defaultVal={true}
                        />
                        <InputField
                          label="Damage Amount"
                          type="number"
                          propKey="damageAmount"
                          defaultVal={10}
                          min={0}
                        />
                        <InputField
                          label="Periodic Interval (s)"
                          type="number"
                          propKey="interval"
                          defaultVal={1}
                          min={0.1}
                        />
                        {selectedItem.object_type === "DANGER_ZONE" && (
                          <CheckboxField
                            label="Movement Restriction (Slow)"
                            propKey="restrictMovement"
                            defaultVal={true}
                          />
                        )}
                      </>
                    );
                  case "SMOKE":
                    return (
                      <>
                        <InputField
                          label="Visibility Reduction (%)"
                          type="number"
                          propKey="visibilityReduction"
                          defaultVal={50}
                          min={0}
                          max={100}
                        />
                        <InputField
                          label="Intensity"
                          type="number"
                          propKey="intensity"
                          defaultVal={5}
                          min={1}
                          max={10}
                        />
                        <InputField
                          label="Duration (s, 0 = infinite)"
                          type="number"
                          propKey="duration"
                          defaultVal={0}
                          min={0}
                        />
                      </>
                    );
                  case "BLOCKED_AREA":
                    return (
                      <CheckboxField
                        label="Collision / Blocking Enabled"
                        propKey="blockingEnabled"
                        defaultVal={true}
                      />
                    );
                  case "SAFE_ZONE":
                    return (
                      <CheckboxField
                        label="Protection Enabled"
                        propKey="protectionEnabled"
                        defaultVal={true}
                      />
                    );
                  case "EXIT":
                    return (
                      <>
                        <CheckboxField
                          label="Enabled"
                          propKey="enabled"
                          defaultVal={true}
                        />
                        <InputField
                          label="Completion Condition"
                          type="text"
                          propKey="completionCondition"
                          defaultVal="reach_exit"
                        />
                      </>
                    );
                  case "OBJECTIVE":
                    return (
                      <>
                        <InputField
                          label="Name"
                          type="text"
                          propKey="name"
                          defaultVal="Objective 1"
                        />
                        <InputField
                          label="Description"
                          type="text"
                          propKey="description"
                          defaultVal="Reach this area."
                        />
                        <InputField
                          label="Completion Condition"
                          type="text"
                          propKey="completionCondition"
                          defaultVal="interact"
                        />
                      </>
                    );
                  case "SPAWN":
                    return (
                      <div className="text-xs text-slate-500 italic mb-2">
                        Player will spawn exactly here.
                      </div>
                    );
                  default:
                    return null;
                }
              })()}

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full py-2 bg-rose-50 text-rose-600 rounded-lg font-bold text-sm hover:bg-rose-100 transition-colors"
              >
                Delete Object
              </button>
            </div>
          </div>
        )}
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
        title="Delete Scenario Object"
        message="Delete this object?"
        confirmLabel="Delete"
        onConfirm={() => {
          const newObjs =
            scenario?.objects?.filter((o) => o.id !== selectedItem?.id) || [];
          pushHistory(newObjs);
          setSelectedItem(null);
          setDeleteConfirmOpen(false);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

function ToolBtn({
  type,
  icon,
  label,
  tool,
  active,
  set,
}: {
  type: string;
  icon?: string;
  label: string;
  tool: Tool;
  active: Tool;
  set: (t: Tool) => void;
}) {
  const isActive = active === tool;
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!icon) {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        AssetRenderer.drawScenarioObject(ctx, type, 40, 40, 0);
        setDataUrl(canvas.toDataURL());
      }
    }
  }, [type, icon]);

  return (
    <div className="relative group">
      <button
        onClick={() => set(tool)}
        className={`w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all relative ${isActive ? "bg-brand-100 text-brand-700 shadow-sm border-2 border-brand-200 dark:bg-brand-900/30 dark:border-brand-700/50 dark:text-brand-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-transparent"}`}
      >
        {icon ? (
          <span className="text-xl leading-none mb-1">{icon}</span>
        ) : (
          <img
            src={dataUrl}
            alt={label}
            className="w-6 h-6 object-contain mb-1"
          />
        )}
        <span className="text-[9px] font-bold uppercase">{label}</span>
      </button>

      {/* Hover Tooltip */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex flex-col bg-slate-800 text-white text-xs rounded shadow-lg p-2 z-50 w-32 pointer-events-none">
        <span className="font-bold text-brand-300">{label}</span>
        <span className="text-[10px] text-slate-300">Footprint: 1x1</span>
        <span className="text-[10px] text-slate-400 mt-1">Scenario Object</span>
      </div>
    </div>
  );
}

export function Phase2ScenarioEditorRoute() {
  const { mapId, scenarioId } = useParams<{
    mapId: string;
    scenarioId: string;
  }>();
  const navigate = useNavigate();
  if (!mapId || !scenarioId) return null;
  return (
    <Phase2ScenarioEditor
      mapId={mapId}
      scenarioId={scenarioId}
      onClose={() => navigate("/app/digital-twin")}
    />
  );
}
