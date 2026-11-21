import React, { useState } from "react";
import { Cpu, Layers, SlidersHorizontal, Check, Sparkles } from "lucide-react";
import type { AmbangConfig, ModuleCatalogItem } from "@/services/fieldTelemetryService";

interface ExpansionArchitecturePanelProps {
  katalogModul: ModuleCatalogItem[];
  activeModules: string[];
  ambang: AmbangConfig;
  selectedNode: number;
  saving?: boolean;
  onSaveModules: (node: number, modul: string[]) => Promise<void>;
  onSaveThresholds: (node: number, cfg: AmbangConfig) => Promise<void>;
}

const EXPANSION_ROADMAP = [
  { group: "Tanah & Agronomi", items: [
    "M1 · Sensor Suhu Tanah DS18B20 (1-Wire GPIO4)",
    "M3 · Sawah AWD (-15 cm / +3 cm pelampung)",
    "M4 · Kalibrasi Daya Dukung Penetrometer Traktor",
    "M6 · Titik Kelembapan Profil Akar Kedua",
    "M7 · Probe NPK, pH, dan EC RS485 Modbus",
    "R1 · Penakar Hujan Tipping Bucket Otomatis",
    "R2 · Pipa Lisimeter Evapotranspirasi Mikro",
  ]},
  { group: "Proteksi & Kebakaran Lahan", items: [
    "M2 · Detektor Nyala Api IR Multi-Sudut (GPIO33)",
    "P1 · Sensor Asap MQ-2 & Partikulat PM2.5",
    "P2 · Sirine Buzzer Dual-Tone Stasiun Rumah",
    "P3 · Relai Aktivasi Sprinkler Pembatas Lahan",
  ]},
  { group: "Aktuator & Otonomi Energi", items: [
    "M5 · Relai Pompa Irigasi Terjadwal & Failsafe",
    "D1 · Panel Surya 10W MPPT LiFePO4 3.2V",
    "D2 · Deep-Sleep RTC Sinkron Jadwal Malam",
  ]},
  { group: "Integrasi Ekosistem & Peta Spasial", items: [
    "S1 · Sinkronisasi Poligon Lahan ke WebGIS Harmony",
    "S2 · Korelasi NASA FIRMS Hotspot vs FFMC Lokal",
    "S3 · Ekspor Riwayat Musim Tanam CSV/GeoJSON",
  ]},
];

export const ExpansionArchitecturePanel: React.FC<ExpansionArchitecturePanelProps> = ({
  katalogModul,
  activeModules,
  ambang,
  selectedNode,
  saving = false,
  onSaveModules,
  onSaveThresholds,
}) => {
  const [archMode, setArchMode] = useState<"prototipe" | "full">("prototipe");
  const [draftModules, setDraftModules] = useState<string[]>(activeModules);
  const [draftAmbang, setDraftAmbang] = useState<AmbangConfig>(ambang);

  React.useEffect(() => {
    setDraftModules(activeModules);
  }, [activeModules]);

  React.useEffect(() => {
    setDraftAmbang(ambang);
  }, [ambang]);

  const toggleMod = (id: string, wajib: boolean) => {
    if (wajib) return;
    setDraftModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-5 shadow-sm dark:border-emerald-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Arsitektur Modular · Beta
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Node {selectedNode}
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-extrabold text-slate-900 dark:text-white">
              Katalog Modul Perangkat Keras & Ekspansi Lahan
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Pilih modul sensor terpasang pada node ESP32 + LoRa 922 MHz atau lihat arsitektur lengkap 17 modul pengembangan.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setArchMode("prototipe")}
              className={`min-h-[36px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                archMode === "prototipe"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              Prototipe Aktif ({katalogModul.length})
            </button>
            <button
              type="button"
              onClick={() => setArchMode("full")}
              className={`min-h-[36px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                archMode === "full"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              Arsitektur Penuh (17)
            </button>
          </div>
        </div>
      </div>

      {archMode === "prototipe" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Konfigurasi Modul Node {selectedNode}
                </h4>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void onSaveModules(selectedNode, draftModules)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" /> Simpan Modul
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {katalogModul.map((mod) => {
                const enabled = mod.wajib || draftModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    disabled={mod.wajib}
                    onClick={() => toggleMod(mod.id, mod.wajib)}
                    className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                      enabled
                        ? "border-emerald-400/80 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/35"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-slate-900/5 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          {mod.kode}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            enabled
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {mod.wajib ? "Wajib" : enabled ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <h5 className="mt-2 text-xs font-extrabold text-slate-900 dark:text-white">{mod.nama}</h5>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{mod.fungsi}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                      <span>{mod.pin}</span>
                      <span className="font-semibold">{mod.biaya}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Kalibrasi Ambang Batas Node {selectedNode}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Batas Tanah Kering (%)
                </span>
                <input
                  type="number"
                  min={5}
                  max={85}
                  value={draftAmbang.kering}
                  onChange={(e) => setDraftAmbang({ ...draftAmbang, kering: Number(e.target.value) })}
                  className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Batas Tanah Cukup (%)
                </span>
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={draftAmbang.cukup}
                  onChange={(e) => setDraftAmbang({ ...draftAmbang, cukup: Number(e.target.value) })}
                  className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Suhu Minimum (°C)
                </span>
                <input
                  type="number"
                  min={-10}
                  max={35}
                  value={draftAmbang.suhuMin}
                  onChange={(e) => setDraftAmbang({ ...draftAmbang, suhuMin: Number(e.target.value) })}
                  className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Suhu Maksimum (°C)
                </span>
                <input
                  type="number"
                  min={20}
                  max={70}
                  value={draftAmbang.suhuMax}
                  onChange={(e) => setDraftAmbang({ ...draftAmbang, suhuMax: Number(e.target.value) })}
                  className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void onSaveThresholds(selectedNode, draftAmbang)}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <Layers className="h-4 w-4" /> Simpan Ambang Node {selectedNode}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {EXPANSION_ROADMAP.map((group) => (
            <div
              key={group.group}
              className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{group.group}</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

