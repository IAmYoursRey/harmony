import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  BookOpen,
  Activity,
  Compass,
  Flame,
  Waves,
  CloudRain,
  CloudLightning,
  Mountain,
  Satellite,
  Leaf,
  Building2,
  Sparkles,
  Layers,
  Cpu,
  Gauge,
  Radio,
  Droplets,
  Sun,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import {
  MASTER_SENSOR_TAXONOMY,
  SENSOR_FAMILY_META,
  SensorFamily,
  MasterTaxonomyCategory,
} from "@/services/earthSensorRegistry";

interface MasterSensorTaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAMILY_ICONS: Record<SensorFamily, any> = {
  SOLID_EARTH_SEISMIC: Activity,
  GEODESY_GNSS_GRAVITY: Compass,
  VOLCANO: Flame,
  OCEAN_HYDROLOGY: Waves,
  WEATHER: CloudRain,
  ATMOSPHERE: CloudLightning,
  LAND_TERRAIN: Mountain,
  REMOTE_SENSING: Satellite,
  BIOSPHERE_ENVIRONMENT: Leaf,
  HUMAN_INFRASTRUCTURE: Building2,
};

const DISASTER_CONFIG: Record<string, { label: string; icon: any; colorClass: string }> = {
  GEMPA: { label: "Gempa", icon: Activity, colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25" },
  TEKTONIK: { label: "Tektonik", icon: Compass, colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25" },
  TSUNAMI: { label: "Tsunami", icon: Waves, colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25" },
  GUNUNG_API: { label: "Gunung Api", icon: Flame, colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25" },
  BANJIR: { label: "Banjir", icon: Droplets, colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25" },
  LONGSOR: { label: "Longsor", icon: Mountain, colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/25" },
  CUACA_EKSTREM: { label: "Cuaca Ekstrem", icon: CloudLightning, colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
  KARHUTLA: { label: "Karhutla", icon: Flame, colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25" },
  KEKERINGAN: { label: "Kekeringan", icon: Sun, colorClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25" },
  SUBSIDENCE: { label: "Amblesan", icon: Building2, colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25" },
};

export function MasterSensorTaxonomyModal({
  isOpen,
  onClose,
}: MasterSensorTaxonomyModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<SensorFamily | "ALL">("ALL");

  const familiesList = Object.keys(SENSOR_FAMILY_META) as SensorFamily[];

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: MASTER_SENSOR_TAXONOMY.length };
    MASTER_SENSOR_TAXONOMY.forEach((item) => {
      counts[item.family] = (counts[item.family] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredTaxonomy = useMemo(() => {
    return MASTER_SENSOR_TAXONOMY.filter((item) => {
      const matchFamily = selectedFamily === "ALL" || item.family === selectedFamily;
      if (!matchFamily) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.primaryInstruments.some((inst) => inst.toLowerCase().includes(q)) ||
        item.measuredPhysicalVariables.some((v) => v.toLowerCase().includes(q)) ||
        item.representativePlatforms.some((p) => p.toLowerCase().includes(q)) ||
        item.disastersAddressed.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [selectedFamily, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md dark:bg-black/85"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative flex flex-col h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-100 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-3.5 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white">
                    Master Taksonomi Sensor Bumi
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> WMO &amp; ESA Standards
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Katalog Terpadu 10 Keluarga Inti &amp; 40 Kategori Observasi Global Bumi
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Tutup dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Architecture Banner */}
          <div className="border-b border-slate-800 bg-gradient-to-r from-purple-950/50 via-indigo-950/30 to-slate-900/60 px-5 sm:px-6 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
              <p className="leading-snug text-[11px]">
                <strong className="text-white">Prinsip Arsitektur Harmony:</strong> Platform pembawa (Satelit, Drone, Buoy, Stasiun Darat, Kabel Dasar Laut) didecoupling dari jenis sensor fisik untuk mendukung <em>Global Earth Observation &rarr; Indonesia Data Fusion Engine</em>.
              </p>
            </div>
          </div>

          {/* Search & Family Filter Bar */}
          <div className="border-b border-slate-800 bg-slate-950/90 px-5 sm:px-6 py-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari instrumen atau variabel (misal: Seismometer, InSAR, Tiltmeter, LiDAR, Radar, Tensiometer)..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-10 pr-9 text-xs text-white outline-none transition-all placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-900/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
                <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                  {filteredTaxonomy.length} / 40 Kategori
                </span>
              </div>
            </div>

            {/* Family Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedFamily("ALL")}
                className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all text-[11px] border ${
                  selectedFamily === "ALL"
                    ? "bg-white text-slate-950 border-white shadow-sm"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white"
                }`}
              >
                <span>Semua Kategori</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  selectedFamily === "ALL"
                    ? "bg-slate-950/20 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {familyCounts.ALL}
                </span>
              </button>

              {familiesList.map((fKey) => {
                const fMeta = SENSOR_FAMILY_META[fKey];
                const Icon = FAMILY_ICONS[fKey] || Activity;
                const isSelected = selectedFamily === fKey;
                const count = familyCounts[fKey] || 0;

                return (
                  <button
                    key={fKey}
                    onClick={() => setSelectedFamily(fKey)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all text-[11px] border ${
                      isSelected
                        ? "text-white shadow-sm"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white"
                    }`}
                    style={isSelected ? { backgroundColor: fMeta.colorHex, borderColor: fMeta.colorHex } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{fMeta.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {filteredTaxonomy.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <div className="h-16 w-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
                  <Layers className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-slate-200">Tidak ditemukan kategori sensor yang cocok.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Coba kata kunci pencarian lain atau pilih tab keluarga sensor &quot;Semua Kategori&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedFamily("ALL"); setSearchQuery(""); }}
                  className="mt-3 text-xs font-bold text-purple-400 hover:underline"
                >
                  Reset Filter &amp; Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
                {filteredTaxonomy.map((item) => {
                  const meta = SENSOR_FAMILY_META[item.family];
                  const Icon = FAMILY_ICONS[item.family] || Activity;

                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-slate-700 overflow-hidden"
                    >
                      {/* Left vertical color stripe accent */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                        style={{ backgroundColor: meta.colorHex }}
                      />

                      {/* Ambient background soft glow */}
                      <div
                        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.08] blur-2xl pointer-events-none transition-opacity group-hover:opacity-[0.20]"
                        style={{ backgroundColor: meta.colorHex }}
                      />

                      <div className="pl-1">
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs"
                            style={{ backgroundColor: meta.colorHex }}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.name}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-slate-400 border border-slate-700/60">
                            ID #{String(item.id).padStart(2, "0")}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-display text-base font-bold text-white leading-snug group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Physical Variables Section */}
                        <div className="mt-3.5 rounded-2xl bg-slate-950/70 p-3 border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            <Gauge className="w-3.5 h-3.5 text-purple-400" />
                            <span>Variabel Fisik yang Diukur:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.measuredPhysicalVariables.map((v, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 border border-slate-800 shadow-2xs"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: meta.colorHex }}
                                />
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Primary Instruments Section */}
                        <div className="mt-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Contoh Instrumen Sensor:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.primaryInstruments.map((inst, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-950/40 px-2 py-0.5 text-[10.5px] font-semibold text-purple-300 border border-purple-800/40"
                              >
                                <span className="text-[9px] opacity-70">⚡</span>
                                {inst}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Platforms & Disasters Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pl-1">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[260px] sm:max-w-xs">
                          <Radio className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <span className="text-slate-400">Platform: </span>
                            <strong className="font-semibold text-slate-200">
                              {item.representativePlatforms.slice(0, 2).join(", ")}
                            </strong>
                          </span>
                        </div>

                        {/* Hazard Mitigation Badges */}
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                          {item.disastersAddressed.map((d) => {
                            const conf = DISASTER_CONFIG[d] || {
                              label: d,
                              icon: Activity,
                              colorClass: "bg-slate-800 text-slate-300 border-slate-700",
                            };
                            const HazardIcon = conf.icon;
                            return (
                              <span
                                key={d}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${conf.colorClass}`}
                              >
                                <HazardIcon className="w-2.5 h-2.5" />
                                {conf.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
