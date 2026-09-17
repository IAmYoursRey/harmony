import React from 'react';
import {
  Database,
  ExternalLink,
  ShieldCheck,
  Globe,
  Layers,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  SpatialMetadataItem,
} from '../../../../../services/geospatialAnalysisService';

export const GeospatialCatalogTab: React.FC = () => {
  const catalog: SpatialMetadataItem[] = geospatialAnalysisService.getSpatialDataCatalog();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Katalog Data Spasial & Provenansi Metadata
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SNI ISO 19115:2012
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Dokumentasi simpul data geospasial nasional (BIG, BMKG, PVMBG) dan konstelasi Earth Observation internasional (ESA)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-indigo-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Kebijakan Satu Peta (KSP) Terverifikasi</span>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-colors"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {item.datasetName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.agency} ({item.provider})
                  </p>
                </div>

                <a
                  href={item.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Buka Portal Sumber Resmi"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Metadata Attributes List */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] font-semibold">Sistem Koordinat (CRS)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {item.coordinateSystem}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] font-semibold">Resolusi Spasial</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {item.spatialResolution}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] font-semibold">Frekuensi Pembaruan</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {item.updateFrequency}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] font-semibold">Spesifikasi Akurasi</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {item.accuracySpecification}
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                  <Sparkles className="w-3 h-3" /> Standar Data
                </div>
                <span>{item.dataStandard} • Lisensi: {item.license}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Pembaruan Terakhir: {item.lastUpdated}</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> API Aktif
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
