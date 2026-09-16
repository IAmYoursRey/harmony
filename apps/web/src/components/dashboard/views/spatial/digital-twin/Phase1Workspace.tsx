import React, { useEffect, useState } from "react";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/hooks/useAuth";
import { phase1Api } from "./Phase1API";
import { Phase1Map } from "./Phase1Types";
import { useToast } from "@/hooks/useToast";
import {
  Plus,
  Map as MapIcon,
  Edit,
  Copy,
  Trash2,
  Globe,
  Play,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { Phase1MapEditor } from "./Phase1MapEditor";
import { Phase2ScenarioEditor } from "./Phase2ScenarioEditor";
import { Phase3Runtime } from "./Phase3Runtime";

export function Phase1Workspace() {
  const { selection } = useSchool();
  const { currentUser } = useAuth();
  const { show } = useToast();

  const activeSchool = selection?.school || null;
  const role = currentUser?.role;

  const [maps, setMaps] = useState<Phase1Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioType, setNewScenarioType] = useState("Kebakaran");
  const [activeScenarioEditorId, setActiveScenarioEditorId] = useState<
    string | null
  >(null);
  const [activeSimulationScenarioId, setActiveSimulationScenarioId] = useState<
    string | null
  >(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [newMapDesc, setNewMapDesc] = useState("");

  const loadMaps = async () => {
    if (!activeSchool) return;
    setLoading(true);
    try {
      const data = await phase1Api.getMaps(activeSchool.id);
      setMaps(data);
    } catch (err: any) {
      show(`Gagal memuat map: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, [activeSchool]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool || !newMapName.trim()) return;
    try {
      const res = await phase1Api.createMap(
        activeSchool.id,
        newMapName,
        newMapDesc,
        64,
        64,
      );
      show("Map berhasil dibuat.", "success");
      setShowCreate(false);
      setNewMapName("");
      setNewMapDesc("");
      await loadMaps();
      navigate(`/app/digital-twin/editor/${res.id}`); // Open immediately
    } catch (err: any) {
      show(`Gagal membuat map: ${err.message}`, "error");
    }
  };

  const requestDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);
    try {
      await phase1Api.deleteMap(deleteConfirm.id);
      setMaps(maps.filter((m) => m.id !== deleteConfirm.id));
      show("Map berhasil dihapus.", "success");
      setDeleteConfirm({ isOpen: false, id: null });
    } catch (error: any) {
      show(`Gagal menghapus map: ${error.message || "Unknown error"}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapId || !newScenarioName.trim()) return;
    try {
      const res = await phase1Api.createScenario(
        selectedMapId,
        newScenarioName,
        newScenarioType,
      );
      show("Scenario berhasil dibuat.", "success");
      setShowCreateScenario(false);
      setNewScenarioName("");
      await loadMaps();
    } catch (err: any) {
      show(`Gagal membuat scenario: ${err.message}`, "error");
    }
  };

  const handlePublishScenario = async (
    scenarioId: string,
    currentStatus: string,
  ) => {
    try {
      await phase1Api.updateScenario(scenarioId, {
        status: currentStatus === "draft" ? "published" : "draft",
      });
      show(
        `Scenario ${currentStatus === "draft" ? "dipublish" : "diubah ke draft"}.`,
        "success",
      );
      loadMaps();
    } catch (err: any) {
      show(`Gagal update scenario: ${err.message}`, "error");
    }
  };

  const handleDuplicateScenario = async (scenarioId: string) => {
    try {
      await phase1Api.duplicateScenario(scenarioId);
      show("Scenario diduplikasi.", "success");
      loadMaps();
    } catch (err: any) {
      show(`Gagal menduplikasi: ${err.message}`, "error");
    }
  };

  if (selectedMapId) {
    const map = maps.find((m) => m.id === selectedMapId);
    if (!map) {
      setSelectedMapId(null);
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedMapId(null)}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MapIcon className="h-6 w-6 text-brand-600" />
              {map.name}
            </h2>
            <p className="text-slate-500">{map.description}</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => navigate(`/app/digital-twin/editor/${map.id}`)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
            >
              <Edit className="h-4 w-4" /> Edit Base Map
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Disaster Scenarios</h3>
          <button
            onClick={() => setShowCreateScenario(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> Create Scenario
          </button>
        </div>

        {showCreateScenario && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
              Buat Scenario Baru
            </h3>
            <form
              onSubmit={handleCreateScenario}
              className="space-y-4 max-w-md"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Scenario
                </label>
                <input
                  type="text"
                  required
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2"
                  placeholder="Contoh: Kebakaran Lab IPA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Bencana
                </label>
                <select
                  value={newScenarioType}
                  onChange={(e) => setNewScenarioType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2"
                >
                  <option value="Kebakaran">Kebakaran</option>
                  <option value="Gempa">Gempa</option>
                  <option value="Banjir">Banjir</option>
                  <option value="Tsunami">Tsunami</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateScenario(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {!map.scenarios || map.scenarios.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-slate-500">
            Belum ada skenario bencana untuk map ini.
          </div>
        ) : (
          <div className="space-y-3">
            {map.scenarios.map((scen) => (
              <div
                key={scen.id}
                className="glass p-4 rounded-xl flex items-center justify-between border border-slate-200/50 dark:border-slate-700/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-white">
                      {scen.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${scen.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {scen.status}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      v{scen.version}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Jenis: {scen.disaster_type}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/app/digital-twin/scenario-editor/${map.id}/${scen.id}`,
                      )
                    }
                    className="px-3 py-1.5 text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-medium transition-colors"
                  >
                    Edit Scenario
                  </button>
                  {scen.status === "published" && (
                    <button
                      onClick={() =>
                        navigate(`/app/digital-twin/play/${map.id}/${scen.id}`)
                      }
                      className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold transition-colors flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" /> Play
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicateScenario(scen.id)}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handlePublishScenario(scen.id, scen.status)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${scen.status === "draft" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                  >
                    {scen.status === "draft" ? "Publish" : "Unpublish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-brand-600" />
            Harmony Twin (Phase 1 Sandbox)
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {activeSchool
              ? `School: ${activeSchool.name}`
              : "Pilih sekolah terlebih dahulu"}
          </p>
        </div>
        {(role === "teacher" || role === "developer") && activeSchool && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Map
          </button>
        )}
      </div>

      {showCreate && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
            Buat Map Baru
          </h3>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Map
              </label>
              <input
                type="text"
                required
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2"
                placeholder="Contoh: Gedung Utama SMAN 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi
              </label>
              <textarea
                value={newMapDesc}
                onChange={(e) => setNewMapDesc(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2"
                placeholder="Opsional..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
              >
                Buat & Buka Editor
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : maps.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-slate-500">
          <MapIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Belum ada Harmony Twin map untuk sekolah ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maps.map((map) => (
            <div
              key={map.id}
              className="glass rounded-2xl p-6 transition-all hover:shadow-lg flex flex-col group border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="flex-1 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1">
                    {map.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-md ${map.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                  >
                    {map.status.toUpperCase()}
                  </span>
                </div>
                {map.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                    {map.description}
                  </p>
                )}
                <div className="text-xs text-slate-400">
                  Updated: {new Date(map.updated_at).toLocaleDateString()}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                <button
                  onClick={() => setSelectedMapId(map.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-300 py-2 rounded-lg font-medium transition-colors"
                >
                  <Edit className="h-4 w-4" /> Buka Map
                </button>
                {(role === "teacher" || role === "developer") && (
                  <button
                    onClick={() => requestDelete(map.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    title="Delete Map"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Map"
        message="Delete this map? All map-specific data may be removed."
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </div>
  );
}
