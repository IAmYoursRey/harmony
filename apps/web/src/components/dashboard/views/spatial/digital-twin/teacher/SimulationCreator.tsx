import { useState } from "react";
import {
  Plus,
  Swords,
  Trash2,
  Flame,
  Waves,
  Activity,
  Wind,
  Mountain,
  AlertTriangle,
  Edit,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { GridMap, DisasterSimulation, DisasterType } from "../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  createSimulation,
  deleteSimulation,
} from "@/services/digitalTwinService";
import { ScenarioEditor } from "./ScenarioEditor";

interface Props {
  maps: GridMap[];
  simulations: DisasterSimulation[];
  schoolId: string;
  onRefresh: () => void;
}

const DISASTER_OPTIONS: {
  type: DisasterType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    type: "fire",
    label: "Kebakaran",
    icon: Flame,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40",
  },
  {
    type: "earthquake",
    label: "Gempa",
    icon: Activity,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  },
  {
    type: "flood",
    label: "Banjir",
    icon: Waves,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
  },
  {
    type: "storm",
    label: "Badai",
    icon: Wind,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40",
  },
  {
    type: "landslide",
    label: "Longsor",
    icon: Mountain,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40",
  },
];

export function SimulationCreator({
  maps,
  simulations,
  schoolId,
  onRefresh,
}: Props) {
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [editingSim, setEditingSim] = useState<DisasterSimulation | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    sim: DisasterSimulation | null;
  }>({ isOpen: false, sim: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [mapId, setMapId] = useState("");
  const [disaster, setDisaster] = useState<DisasterType>("fire");
  const [duration, setDuration] = useState(120);
  const [spawnPointId, setSpawnPointId] = useState("");
  const [safePointIds, setSafePointIds] = useState<string[]>([]);

  const selectedMap = maps.find((m) => m.id === mapId);

  const handleCreate = async () => {
    if (!name.trim() || !mapId || !disaster) {
      return show("Nama, peta, dan jenis bencana wajib diisi", "error");
    }
    try {
      await createSimulation({
        schoolId,
        mapId,
        disasterType: disaster,
        name: name.trim(),
        description: desc.trim(),
        durationSeconds: duration,
        spawnPointId: spawnPointId || selectedMap?.spawnPoints?.[0]?.id || "",
        safePointIds:
          safePointIds.length > 0
            ? safePointIds
            : selectedMap?.safePoints?.map((s) => s.id) || [],
        hazards: [],
        events: [],
        loseConditions: ["HP_ZERO", "TIMER_ZERO"],
      });
      show("Simulasi berhasil dibuat", "success");
      setCreating(false);
      setName("");
      setDesc("");
      setMapId("");
      setDuration(120);
      setSafePointIds([]);
      setSpawnPointId("");
      onRefresh();
    } catch (_e) {
      show("Gagal membuat simulasi", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.sim) return;
    setIsDeleting(true);
    try {
      await deleteSimulation(deleteConfirm.sim.id);
      show("Simulasi dihapus", "success");
      setDeleteConfirm({ isOpen: false, sim: null });
      onRefresh();
    } catch (_e) {
      show("Gagal menghapus simulasi", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (editingSim) {
    const map = maps.find((m) => m.id === editingSim.mapId);
    if (map) {
      return (
        <ScenarioEditor
          map={map}
          simulation={editingSim}
          onBack={() => {
            setEditingSim(null);
            onRefresh();
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
          Simulasi Bencana ({simulations.length})
        </h3>
        <button
          onClick={() => setCreating(true)}
          disabled={maps.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow"
        >
          <Plus className="h-4 w-4" /> Buat Simulasi
        </button>
      </div>

      {maps.length === 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Buat peta grid terlebih dahulu sebelum membuat simulasi.
        </div>
      )}

      {creating && (
        <div className="rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50 dark:bg-slate-900 p-5 space-y-4">
          <h4 className="font-bold text-sm text-ink-900 dark:text-white">
            Konfigurasi Simulasi Baru
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Nama Simulasi *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
                placeholder="cth: Kebakaran Laboratorium"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Pilih Peta *
              </label>
              <select
                value={mapId}
                onChange={(e) => {
                  setMapId(e.target.value);
                  setSafePointIds([]);
                  setSpawnPointId("");
                }}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">-- Pilih Peta --</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.gridWidth}×{m.gridHeight})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-2">
                Jenis Bencana *
              </label>
              <div className="flex flex-wrap gap-2">
                {DISASTER_OPTIONS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.type}
                      onClick={() => setDisaster(d.type)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                        disaster === d.type
                          ? `${d.color} border-current`
                          : "bg-slate-50 dark:bg-slate-700 text-ink-500 border-transparent hover:border-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Durasi (detik)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              >
                <option value={60}>60 detik (1 menit)</option>
                <option value={90}>90 detik</option>
                <option value={120}>120 detik (2 menit)</option>
                <option value={180}>180 detik (3 menit)</option>
                <option value={300}>300 detik (5 menit)</option>
              </select>
            </div>

            {selectedMap && (
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">
                  Titik Spawn
                </label>
                <select
                  value={spawnPointId}
                  onChange={(e) => setSpawnPointId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
                >
                  <option value="">-- Otomatis (spawn pertama) --</option>
                  {selectedMap.spawnPoints?.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.x},{sp.y})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700"
            >
              Simpan Simulasi
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-sm text-ink-600 hover:underline"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {simulations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-brand-200 dark:border-slate-700 text-ink-500">
          <Swords className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold">Belum ada simulasi.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((sim) => {
            const disasterOpt = DISASTER_OPTIONS.find(
              (d) => d.type === sim.disasterType,
            );
            const Icon = disasterOpt?.icon || Swords;
            const mapName =
              maps.find((m) => m.id === sim.mapId)?.name ||
              "Peta tidak ditemukan";
            return (
              <div
                key={sim.id}
                className="glass rounded-xl p-4 dark:bg-slate-900/60 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${disasterOpt?.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-ink-900 dark:text-white truncate">
                      {sim.name}
                    </h4>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Peta: {mapName}
                    </p>
                    <p className="text-xs text-ink-500">
                      Durasi: {sim.durationSeconds}s &bull;{" "}
                      {sim.hazards?.length || 0} bahaya
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setEditingSim(sim)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 dark:bg-brand-900/20 flex-1 justify-center"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Skenario
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, sim })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Scenario"
        message={`Delete this disaster scenario "${deleteConfirm.sim?.name}"?`}
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, sim: null })}
      />
    </div>
  );
}
