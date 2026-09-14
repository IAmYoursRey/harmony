import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Map as MapIcon, ShieldAlert, X } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { phase1Api } from "../spatial/digital-twin/Phase1API";

export function TeacherSessionCreatorModal({
  classData,
  onClose,
}: {
  classData: any;
  onClose: () => void;
}) {
  const [maps, setMaps] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>("");
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadMaps() {
      try {
        const mapsData = await phase1Api.getMaps(classData.schoolId);
        setMaps(mapsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMaps();
  }, []);

  useEffect(() => {
    if (!selectedMap) {
      setScenarios([]);
      return;
    }
    async function loadScenarios() {
      try {
        const mapDetails = await phase1Api.getMapDetails(selectedMap);
        const scens = mapDetails.scenarios || [];

        setScenarios(
          scens.filter(
            (s) => s.status && s.status.toLowerCase() === "published",
          ),
        );
      } catch (err) {
        console.error(err);
      }
    }
    loadScenarios();
  }, [selectedMap]);

  const handleCreate = async () => {
    if (!selectedMap || !selectedScenario) return;
    setCreating(true);
    try {
      const res = await apiClient.post("/api/sessions", {
        schoolId: classData.schoolId,
        classId: classData.id,
        mapId: selectedMap,
        scenarioId: selectedScenario,
        settings: { capacity: 40 },
      });

      const sessionId = res.data?.id || res.id;
      if (sessionId) {
        show("Session created successfully", "success");
        navigate(`/app/teacher/session/${sessionId}`);
      } else {
        console.error("Invalid response format:", res);
        setErrorMsg("Invalid response format");
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("API Error in TeacherSessionCreatorModal:", err);
      setErrorMsg("API Error: " + (err.message || err));
      show(err.message || "Failed to create session", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <h3 className="font-display text-xl font-bold text-ink-900 dark:text-white">
            Create Simulation Session
          </h3>
          {errorMsg && (
            <p className="text-red-500 font-bold" id="qa-error-log">
              {errorMsg}
            </p>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-brand-50 rounded-xl text-sm font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
            Target Class: {classData.name} ({classData.grade})
          </div>

          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Loading maps...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Base Map
                </label>
                <div className="relative">
                  <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    id="map-select"
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Select Map --</option>
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMap && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Published Scenario
                  </label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      id="scenario-select"
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">-- Select Scenario --</option>
                      {scenarios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.disasterType})
                        </option>
                      ))}
                    </select>
                  </div>
                  {scenarios.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No published scenarios found for this map.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 flex justify-end gap-3 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            disabled={!selectedMap || !selectedScenario || creating}
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? (
              "Creating..."
            ) : (
              <>
                <Play className="h-4 w-4" /> Start Simulation
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
