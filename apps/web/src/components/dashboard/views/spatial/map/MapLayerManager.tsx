import React, { useState, useMemo } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  Sliders,
  Maximize2,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Radio,
  Flame,
  CloudRain,
  School,
  Trees,
  Waves,
  Route,
  Compass,
  FileSpreadsheet,
  X,
  RotateCcw,
  Info,
} from "lucide-react";

export type LayerCategoryId =
  | "administrative"
  | "infrastructure"
  | "hydrology"
  | "environment"
  | "earth_observation"
  | "disaster"
  | "sensors"
  | "education_infrastructure"
  | "user_layers"
  | "analysis_results";

export interface ManagedLayer {
  id: string;
  name: string;
  category: LayerCategoryId;
  visible: boolean;
  opacity: number;
  sourceStatus: "LIVE" | "STATIC" | "CACHED" | "DERIVED" | "UNAVAILABLE" | "CATALOG" | "EXTERNAL" | "EMPTY" | "PARTIAL" | "STALE" | "SIMULATION" | "USER_DIGITIZED";
  color: string;
  badge?: string;
  description?: string;
  featureCount?: number;
  onToggle: (visible: boolean) => void;
  onOpacityChange?: (opacity: number) => void;
  onZoomToExtent?: () => void;
  onShowMetadata?: () => void;
}

interface MapLayerManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layers: ManagedLayer[];
}

type FilterTab = "all" | "active" | "user" | "disaster" | "admin" | "school_resilience";

const CATEGORIES: Array<{
  id: LayerCategoryId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "user_layers",
    label: "Lapisan Pengguna & Digitasi",
    icon: FileSpreadsheet,
    description: "Objek vektor hasil digitasi gambar pengguna",
  },
  {
    id: "analysis_results",
    label: "Hasil Analisis & Buffer AOI",
    icon: Compass,
    description: "Hasil geoprosesing spasial & zona penyangga",
  },
  {
    id: "disaster",
    label: "Kebencanaan & Geologi",
    icon: Flame,
    description: "Gempa BMKG InaTEWS, Gunung Api PVMBG & Sesar",
  },
  {
    id: "sensors",
    label: "Sensor Geospasial",
    icon: Radio,
    description: "Jaringan sensor bahaya gempa, tsunami & laut",
  },
  {
    id: "earth_observation",
    label: "Observasi Bumi & Radar",
    icon: CloudRain,
    description: "Radar Doppler BMKG curah hujan real-time",
  },
  {
    id: "administrative",
    label: "Batas Administrasi",
    icon: Shield,
    description: "Kabupaten, Kota, Desa & Garis Khatulistiwa 0°",
  },
  {
    id: "infrastructure",
    label: "Infrastruktur & Lalu Lintas",
    icon: Route,
    description: "Koridor jalan raya & lalu lintas hybrid",
  },
  {
    id: "education_infrastructure",
    label: "Infrastruktur Pendidikan",
    icon: School,
    description: "Titik sebaran sekolah SD, SMP, SMA Dapodik",
  },
  {
    id: "environment",
    label: "Lingkungan & Kehutanan",
    icon: Trees,
    description: "Kawasan hutan lindung KLHK & konservasi",
  },
  {
    id: "hydrology",
    label: "Hidrologi & Sungai",
    icon: Waves,
    description: "Jaringan aliran air permukaan dan sungai",
  },
];

export const MapLayerManager: React.FC<MapLayerManagerProps> = ({
  isOpen,
  onClose,
  layers,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("all");
  const [selectedLayerForOpacity, setSelectedLayerForOpacity] = useState<string | null>(null);

  // Explicit boolean mapping for open/close state of each category
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    user_layers: true,
    analysis_results: false,
    disaster: false,
    sensors: false,
    earth_observation: false,
    administrative: false,
    infrastructure: false,
    education_infrastructure: false,
    environment: false,
    hydrology: false,
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const activeLayersCount = useMemo(() => {
    return layers.filter((l) => l.visible).length;
  }, [layers]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredLayers = useMemo(() => {
    let list = layers;

    // Filter by Tab
    if (activeFilterTab === "active") {
      list = list.filter((l) => l.visible);
    } else if (activeFilterTab === "user") {
      list = list.filter((l) => l.category === "user_layers" || l.category === "analysis_results");
    } else if (activeFilterTab === "disaster") {
      list = list.filter(
        (l) =>
          l.category === "disaster" ||
          l.category === "sensors" ||
          l.category === "earth_observation"
      );
    } else if (activeFilterTab === "admin") {
      list = list.filter(
        (l) =>
          l.category === "administrative" ||
          l.category === "infrastructure" ||
          l.category === "education_infrastructure" ||
          l.category === "environment"
      );
    } else if (activeFilterTab === "school_resilience") {
      const allowedIds = new Set([
        'schools_sd', 'schools_smp', 'schools_sma',
        'earthquakes', 'tectonic', 'volcanoes',
        'landslide_zones', 'tsunami_zones', 'traffic'
      ]);
      list = list.filter((l) => allowedIds.has(l.id));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const catObj = CATEGORIES.find((c) => c.id === l.category);
        const catLabel = catObj?.label.toLowerCase() || "";
        return (
          l.name.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          l.sourceStatus.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [layers, activeFilterTab, searchQuery]);

  const layersByCategory = useMemo(() => {
    const map: Partial<Record<LayerCategoryId, ManagedLayer[]>> = {};
    CATEGORIES.forEach((cat) => {
      map[cat.id] = [];
    });
    filteredLayers.forEach((l) => {
      if (!map[l.category]) map[l.category] = [];
      map[l.category]!.push(l);
    });
    return map;
  }, [filteredLayers]);

  // Categories that have matching layers to display
  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((c) => (layersByCategory[c.id] || []).length > 0);
  }, [layersByCategory]);

  const areAllExpanded = useMemo(() => {
    if (visibleCategories.length === 0) return false;
    return visibleCategories.every((c) => expandedCategories[c.id]);
  }, [visibleCategories, expandedCategories]);

  const handleToggleAll = () => {
    const nextState = !areAllExpanded;
    const update: Record<string, boolean> = {};
    visibleCategories.forEach((c) => {
      update[c.id] = nextState;
    });
    setExpandedCategories((prev) => ({ ...prev, ...update }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed sm:absolute top-16 sm:top-20 right-2 sm:right-4 z-50 w-[calc(100vw-1rem)] sm:w-[26rem] max-w-full rounded-3xl bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 animate-in fade-in slide-in-from-right-4 duration-200 text-slate-800 dark:text-slate-100 max-h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Manajer Lapisan Peta</span>
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {activeLayersCount} aktif
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Hierarki tematik &amp; kontrol lapisan SIG</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleAll}
            className="rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title={areAllExpanded ? "Tutup Semua Kategori" : "Buka Semua Kategori"}
          >
            {areAllExpanded ? "Tutup Semua" : "Buka Semua"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Tutup Manajer Lapisan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mt-3 relative shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          id="map-layer-search-input"
          name="layerSearch"
          type="text"
          placeholder="Cari lapisan (gempa, jalan, sekolah, buffer)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            title="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Live Search Results Status Banner */}
      {isSearching && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-900/50 px-3 py-1.5 rounded-xl shrink-0">
          <span>
            Ditemukan <strong>{filteredLayers.length}</strong> lapisan untuk &quot;{searchQuery}&quot;
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-brand-600 dark:text-brand-400 font-bold hover:underline ml-2 text-[10px]"
          >
            Reset
          </button>
        </div>
      )}

      {/* Preset Cepat: Sekolah Tangguh Bencana (Sederhana untuk Awam) */}
      <div className="mt-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveFilterTab(activeFilterTab === "school_resilience" ? "all" : "school_resilience")}
          className={`w-full flex items-center justify-between p-2 rounded-2xl text-xs font-bold transition-all border ${
            activeFilterTab === "school_resilience"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-xs"
              : "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50"
          }`}
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-base">🏫</span>
            <div>
              <span className="block leading-tight font-extrabold">Mode Sekolah Tangguh Bencana</span>
              <span className="text-[10px] opacity-75 font-normal block">Tampilkan hanya 6 lapisan esensial (hindari visual berlebih)</span>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
            activeFilterTab === "school_resilience"
              ? "bg-rose-600 text-white border-rose-700"
              : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
          }`}>
            {activeFilterTab === "school_resilience" ? "Aktif" : "Ringkas"}
          </span>
        </button>
      </div>

      {/* Quick Filter Tabs */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {[
          { id: "all", label: "Semua" },
          { id: "school_resilience", label: "🏫 Sekolah Tangguh" },
          { id: "active", label: `Aktif (${activeLayersCount})` },
          { id: "user", label: "Alat GIS" },
          { id: "disaster", label: "Bencana" },
          { id: "admin", label: "Wilayah" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilterTab(tab.id as FilterTab)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              activeFilterTab === tab.id
                ? "bg-brand-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layer Categories List with Strict min-h-0 and shrink-0 on Items */}
      <div className="mt-2.5 flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2.5">
        {filteredLayers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Search className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p>
              {searchQuery
                ? `Tidak ada lapisan yang cocok dengan "${searchQuery}".`
                : "Tidak ada lapisan pada kategori ini."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-1 rounded-xl bg-brand-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-600 transition-colors shadow-xs"
              >
                Tampilkan Semua Lapisan
              </button>
            )}
          </div>
        ) : (
          visibleCategories.map((cat) => {
            const categoryLayers = layersByCategory[cat.id] || [];
            if (categoryLayers.length === 0) return null;

            const activeInCat = categoryLayers.filter((l) => l.visible).length;
            // When actively searching, auto-expand categories that have results
            const isCatOpen = isSearching ? true : (expandedCategories[cat.id] ?? false);
            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                className="shrink-0 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden transition-all"
              >
                {/* Category Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-xl shrink-0 ${
                        activeInCat > 0
                          ? "bg-brand-500 text-white shadow-xs"
                          : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cat.label}
                        </span>
                        {activeInCat > 0 && (
                          <span className="rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 px-2 py-0.5 text-[10px] font-black shrink-0">
                            {activeInCat} aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-slate-400">
                    {isCatOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Layer Cards inside Category */}
                {isCatOpen && (
                  <div className="px-2 pb-2.5 pt-1 flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                    {categoryLayers.map((layer) => {
                      const isOpacityOpen = selectedLayerForOpacity === layer.id;
                      const isEmpty = layer.featureCount !== undefined && layer.featureCount === 0;

                      return (
                        <div
                          key={layer.id}
                          className={`shrink-0 rounded-xl px-3 py-2.5 transition-all border ${
                            layer.visible
                              ? "bg-white border-slate-200 dark:bg-slate-800/90 dark:border-slate-700/80 shadow-xs"
                              : "bg-slate-50/60 border-transparent opacity-65 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {/* Row 1: Status Dot, Title, Badges, and Main Toggle */}
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: layer.color }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                                  <span
                                    className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate"
                                    title={layer.name}
                                  >
                                    {layer.name}
                                  </span>

                                  {/* Source Status Badge */}
                                  {layer.sourceStatus && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black shrink-0 ${
                                        layer.sourceStatus === "LIVE"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                          : layer.sourceStatus === "EMPTY"
                                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                                          : layer.sourceStatus === "PARTIAL"
                                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                          : layer.sourceStatus === "STALE"
                                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                          : layer.sourceStatus === "DERIVED"
                                          ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                                          : layer.sourceStatus === "CATALOG"
                                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                          : layer.sourceStatus === "EXTERNAL"
                                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                          : layer.sourceStatus === "USER_DIGITIZED"
                                          ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                                          : layer.sourceStatus === "SIMULATION"
                                          ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                                          : "bg-slate-200/70 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300"
                                      }`}
                                    >
                                      {layer.sourceStatus}
                                    </span>
                                  )}

                                  {/* Feature Count or Empty Status Badge */}
                                  {layer.featureCount !== undefined && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                                        layer.featureCount === 0
                                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                          : "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                                      }`}
                                      title={
                                        layer.featureCount === 0
                                          ? "Belum ada objek geometri pada peta"
                                          : `${layer.featureCount} objek aktif`
                                      }
                                    >
                                      {layer.featureCount === 0 ? "0 Objek (Kosong)" : `${layer.featureCount} Objek`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Primary Visibility Eye Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVisible = !layer.visible;
                                layer.onToggle(nextVisible);
                                // If layer is turned off, automatically close opacity drawer
                                if (!nextVisible && selectedLayerForOpacity === layer.id) {
                                  setSelectedLayerForOpacity(null);
                                }
                              }}
                              className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-all active:scale-95 ${
                                layer.visible
                                  ? "bg-brand-500 text-white shadow-xs hover:bg-brand-600"
                                  : "bg-slate-200/70 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                              }`}
                              title={layer.visible ? "Sembunyikan Lapisan" : "Tampilkan Lapisan"}
                            >
                              {layer.visible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {/* Row 2: Subtitle Description & Action Controls */}
                          <div className="mt-1.5 flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80 dark:border-slate-800/50 text-[10px]">
                            <p
                              className={`text-[11px] truncate flex-1 min-w-0 ${
                                isEmpty
                                  ? "text-amber-600/90 dark:text-amber-400/90 italic"
                                  : "text-slate-400 dark:text-slate-400"
                              }`}
                              title={layer.description}
                            >
                              {layer.description || "Lapisan geospasial tematik"}
                            </p>

                            {/* Secondary Actions (Disabled if layer is inactive or has 0 objects) */}
                            <div className="flex items-center gap-1 shrink-0">
                              {layer.onZoomToExtent && (
                                <button
                                  type="button"
                                  disabled={!layer.visible || isEmpty}
                                  onClick={layer.onZoomToExtent}
                                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                    !layer.visible || isEmpty
                                      ? "opacity-35 cursor-not-allowed text-slate-400"
                                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title={
                                    !layer.visible
                                      ? "Aktifkan lapisan untuk memusatkan kamera"
                                      : isEmpty
                                      ? "Tidak ada objek untuk dipusatkan (lapisan kosong)"
                                      : "Pusatkan Kamera ke Lapisan (Zoom to Extent)"
                                  }
                                >
                                  <Maximize2 className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {layer.onOpacityChange && (
                                <button
                                  type="button"
                                  disabled={!layer.visible || isEmpty}
                                  onClick={() => {
                                    if (!layer.visible || isEmpty) return;
                                    setSelectedLayerForOpacity(
                                      isOpacityOpen ? null : layer.id
                                    );
                                  }}
                                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                    !layer.visible || isEmpty
                                      ? "opacity-35 cursor-not-allowed text-slate-400"
                                      : isOpacityOpen
                                      ? "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"
                                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title={
                                    !layer.visible
                                      ? "Aktifkan lapisan untuk mengatur transparansi"
                                      : isEmpty
                                      ? "Lapisan belum memiliki objek untuk diatur transparansinya"
                                      : "Atur Transparansi (Opacity)"
                                  }
                                >
                                  <Sliders className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row 3: Opacity Slider Drawer (Only displayed if layer is visible & active) */}
                          {isOpacityOpen && layer.visible && !isEmpty && layer.onOpacityChange && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 animate-in fade-in duration-150">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-20 shrink-0">
                                Transparansi:
                              </span>
                              <input
                                id={`layer-opacity-slider-${layer.id}`}
                                name={`layerOpacity_${layer.id}`}
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={layer.opacity}
                                onChange={(e) =>
                                  layer.onOpacityChange!(parseFloat(e.target.value))
                                }
                                className="h-1.5 flex-1 rounded-lg bg-slate-200 dark:bg-slate-700 appearance-none cursor-pointer accent-brand-500"
                              />
                              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 w-10 text-right">
                                {Math.round(layer.opacity * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold">
          <span>{filteredLayers.length} Lapisan</span>
          <span>•</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold">
            {activeLayersCount} Aktif
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            layers.forEach((l) => {
              if (l.id === "user_drawings" || l.id === "analysis_layer") {
                l.onToggle(true);
              } else {
                l.onToggle(false);
              }
            });
          }}
          className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
          title="Kembalikan ke status default SIG"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Default</span>
        </button>
      </div>
    </div>
  );
};
