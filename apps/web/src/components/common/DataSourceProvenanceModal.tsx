import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  ExternalLink,
  ShieldCheck,
  Landmark,
  Globe,
  Compass,
  Sparkles,
  Activity,
  Flame,
  CloudRain,
  Mountain,
  ShieldAlert,
  GraduationCap,
  Satellite,
  Map as MapIcon,
  Brain,
  Layers,
  Info,
  CheckCircle2,
  Database,
  BookOpen,
  FileCheck,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  DATA_SOURCES_REGISTRY,
  DATA_CATEGORIES,
  INSTITUTION_STATUS_CONFIG,
  LEGAL_TRANSPARENCY_NOTES,
  DataCategory,
  DataSourceItem,
} from "@/data/dataSourceRegistry";

interface DataSourceProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<DataCategory, any> = {
  ALL: Layers,
  SEISMIC_TSUNAMI: Activity,
  VOLCANO: Flame,
  WEATHER_ATMOSPHERE: CloudRain,
  GEOSPATIAL_TERRAIN: Mountain,
  DISASTER_RISK: ShieldAlert,
  EDUCATION_SPAB: GraduationCap,
  SATELLITE_REMOTE_SENSING: Satellite,
  BASEMAP_INFRASTRUCTURE: MapIcon,
  AI_INTELLIGENCE: Brain,
};

const INSTITUTION_ICONS: Record<string, any> = {
  Landmark,
  Globe,
  Compass,
  Sparkles,
};

export function DataSourceProvenanceModal({
  isOpen,
  onClose,
}: DataSourceProvenanceModalProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "legal">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<DataCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter items
  const filteredData = useMemo(() => {
    return DATA_SOURCES_REGISTRY.filter((item) => {
      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.agencyName.toLowerCase().includes(q) ||
        item.agencyShort.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.officialLegalityBasis.toLowerCase().includes(q) ||
        item.dataPoints.some((dp) => dp.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: DATA_SOURCES_REGISTRY.length };
    DATA_SOURCES_REGISTRY.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-brand-500/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Transparansi Sumber Data Resmi
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Lembaga Otoritatif Terverifikasi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Katalog lengkap asal-usul data kebencanaan, peta geospasial, cuaca, dan profil sekolah Harmony
                </p>
              </div>
            </div>

            {/* Navigation Tabs & Close */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeTab === "catalog"
                      ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Daftar Sumber ({DATA_SOURCES_REGISTRY.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("legal")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeTab === "legal"
                      ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Landasan Hukum</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-2.5 bg-brand-50/40 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                🏛️
              </span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-[11px]">
                  Pemerintah Resmi RI
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  BMKG, PVMBG, BIG, BNPB, Kemendikbud
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                🌐
              </span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-[11px]">
                  Organisasi Ilmiah Global
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  USGS, ESA Copernicus, ECMWF, NASA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                🏫
              </span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-[11px]">
                  215.000+ Satuan Pendidikan
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Data Pokok Pendidikan (Dapodik RI)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold text-[11px]">
                📡
              </span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-[11px]">
                  Sinkronisasi Real-Time
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sensor Seismik, Radar & Satelit
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {activeTab === "catalog" ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search & Filter Bar */}
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari data (contoh: gempa, BMKG, gunung api, DEMNAS, cuaca, radar, sekolah)..."
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {DATA_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.id] || Layers;
                    const isSelected = selectedCategory === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white dark:bg-brand-600 dark:text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cat.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source Cards List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => {
                    const statusConfig = INSTITUTION_STATUS_CONFIG[item.institutionType];
                    const StatusIcon = INSTITUTION_ICONS[statusConfig.icon] || ShieldCheck;
                    const CategoryIcon = CATEGORY_ICONS[item.category] || Layers;

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-500/50 dark:hover:border-brand-500/50 p-4 sm:p-5 transition-all shadow-sm hover:shadow-md"
                      >
                        {/* Top Meta row */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/50 pb-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                <CategoryIcon className="w-3 h-3" />
                                {item.categoryLabel}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>

                              {item.isLiveConnected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Live API Stream
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {item.name}
                            </h3>

                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              🏛️ {item.agencyName} ({item.agencyShort})
                            </p>
                          </div>

                          {/* Direct External Link */}
                          <a
                            href={item.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-bold transition-all shadow-sm shrink-0 self-start active:scale-95"
                          >
                            <span>Buka Portal Resmi</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Description */}
                        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.description}
                        </div>

                        {/* Legal Basis Box */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white mb-1">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Dasar Hukum & Mandat Otoritas Resmi:</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                            "{item.officialLegalityBasis}"
                          </p>
                        </div>

                        {/* Data Points Included */}
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Variabel & Parameter Data Yang Diambil:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                            {item.dataPoints.map((dp, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-[11px]">{dp}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Technical Metadata Footer */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                              Metode Integrasi:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.integrationMethod}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                              Pembaruan:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.updateFrequency}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                              Resolusi Spasial:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.spatialResolution}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                              Standar Data:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.dataStandard}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <Database className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-sm">Tidak ditemukan sumber data yang cocok.</p>
                    <p className="text-xs">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Legal & Integrity View */
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kepatuhan Regulasi & Integritas Publik</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {LEGAL_TRANSPARENCY_NOTES.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {LEGAL_TRANSPARENCY_NOTES.subtitle}
                </p>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                  {LEGAL_TRANSPARENCY_NOTES.paragraphs.map((p, i) => (
                    <p key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                      {p}
                    </p>
                  ))}
                </div>
              </div>

              {/* National Regulations Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Daftar Undang-Undang & Peraturan Presiden Otoritatif:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LEGAL_TRANSPARENCY_NOTES.regulations.map((reg, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
                          {reg.code}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {reg.agency}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        {reg.topic}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {reg.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ethics & Data Integrity Pledge */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Jaminan Integritas & Keaslian Data Harmony</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Harmony tidak memodifikasi atau merekayasa angka parameter bencana mentah (seperti Magnitudo Gempa BMKG, Status Level Kawah PVMBG, atau Resolusi DEMNAS BIG). Seluruh data disajikan sesuai dengan nilai asli yang dipublikasikan oleh otoritas resmi, dengan tujuan menjamin keselamatan dan kesiapsiagaan seluruh warga sekolah di Indonesia.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Platform Edukasi & Geospasial SPAB Harmony • Terbuka, Akuntabel, dan Berdasarkan Sains
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs transition-colors shadow-sm"
            >
              Tutup Transparansi Data
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
