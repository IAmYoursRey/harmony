import { useState } from "react";
import { Plus, Edit, Trash2, Copy, Map, Globe } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { GridMap } from "../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createMap, deleteMap, togglePublishMap } from "@/services/digitalTwinService";
import { MapEditor } from "./MapEditor";

interface Props {
  maps: GridMap[];
  schoolId: string;
  onRefresh: () => void;
}

export function MapList({ maps, schoolId, onRefresh }: Props) {
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [editingMap, setEditingMap] = useState<GridMap | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    map: GridMap | null;
  }>({ isOpen: false, map: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newW, setNewW] = useState(20);
  const [newH, setNewH] = useState(20);
  const [newScale, setNewScale] = useState(1);
  const [newScaleUnit, setNewScaleUnit] = useState<"meter" | "feet">("meter");

  const handleCreate = async () => {
    if (!newName.trim()) return show("Nama peta diperlukan", "error");
    try {
      await createMap({
        schoolId,
        name: newName,
        gridWidth: newW,
        gridHeight: newH,
        cellScale: newScale,
        cellScaleUnit: newScaleUnit,
        description: "",
      });
      show("Peta berhasil dibuat", "success");
      setCreating(false);
      setNewName("");
      onRefresh();
    } catch (_e) {
      show("Gagal membuat peta", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.map) return;
    setIsDeleting(true);
    try {
      await deleteMap(deleteConfirm.map.id);
      show("Peta dihapus", "success");
      setDeleteConfirm({ isOpen: false, map: null });
      onRefresh();
    } catch (_e) {
      show("Gagal menghapus peta", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (editingMap) {
    return (
      <MapEditor
        map={editingMap}
        onBack={() => {
          setEditingMap(null);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
          Peta Grid ({maps.length})
        </h3>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 shadow-glow"
        >
          <Plus className="h-4 w-4" /> Buat Peta Baru
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50 dark:bg-slate-900 p-5 space-y-4">
          <h4 className="font-bold text-sm text-ink-900 dark:text-white">
            Konfigurasi Peta Baru
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Nama Peta *
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
                placeholder="cth: Gedung A Lantai 1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Lebar (kolom)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={newW}
                onChange={(e) => setNewW(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Tinggi (baris)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={newH}
                onChange={(e) => setNewH(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Skala (1 sel = ?)
              </label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={newScale}
                onChange={(e) => setNewScale(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">
                Unit
              </label>
              <select
                value={newScaleUnit}
                onChange={(e) =>
                  setNewScaleUnit(e.target.value as "meter" | "feet")
                }
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="meter">Meter</option>
                <option value="feet">Feet</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-ink-500 bg-white dark:bg-slate-800 rounded-lg p-3">
            <strong>Preview:</strong> Grid {newW} × {newH} sel → Area{" "}
            {newW * newScale} × {newH * newScale} {newScaleUnit}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700"
            >
              Buat Peta
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

      {/* Map Cards */}
      {maps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-brand-200 dark:border-slate-700 text-ink-500">
          <Map className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold">Belum ada peta.</p>
          <p className="text-xs mt-1">Klik "Buat Peta Baru" untuk mulai.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <div
              key={map.id}
              className="glass rounded-xl p-4 dark:bg-slate-900/60 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-ink-900 dark:text-white">
                      {map.name}
                    </h4>
                    {map.isPublic && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Globe className="h-3 w-3" /> Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {map.gridWidth} × {map.gridHeight} sel &bull; 1 sel ={" "}
                    {map.cellScale} {map.cellScaleUnit}
                  </p>
                  <p className="text-xs text-brand-600 font-semibold mt-0.5">
                    Area: {map.gridWidth * map.cellScale} ×{" "}
                    {map.gridHeight * map.cellScale} {map.cellScaleUnit}
                  </p>
                </div>
              </div>
              <div className="text-xs text-ink-400">
                {Object.keys(map.cells || {}).length} sel diedit &bull;{" "}
                {map.rooms?.length || 0} ruangan &bull;{" "}
                {map.safePoints?.length || 0} titik aman
              </div>
              <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setEditingMap(map)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 flex-1 justify-center"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Peta
                </button>
                <button
                  onClick={async () => {
                    try {
                      await togglePublishMap(map.id, !map.isPublic);
                      show(
                        map.isPublic
                          ? "Map unpublished from community"
                          : "Map published! Other schools can now practice on this map.",
                        "success"
                      );
                      onRefresh();
                    } catch {
                      show("Failed to update map publication", "error");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    map.isPublic
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-slate-100 text-ink-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                  title={map.isPublic ? "Unpublish map" : "Publish to community across all schools"}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{map.isPublic ? "Published" : "Publish"}</span>
                </button>
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, map })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Map"
        message={`Hapus peta "${deleteConfirm.map?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, map: null })}
      />
    </div>
  );
}
