import React, { useState } from 'react';
import {
  Satellite,
  Layers,
  Sparkles,
  Info,
  Eye,
  Radio,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  SpectralIndexResult,
} from '../../../../../services/geospatialAnalysisService';

interface GeospatialRemoteSensingTabProps {
  lat: number;
  lng: number;
  regionName: string;
}

export const GeospatialRemoteSensingTab: React.FC<GeospatialRemoteSensingTabProps> = ({
  lat,
  lng,
  regionName,
}) => {
  const indices = geospatialAnalysisService.calculateRemoteSensingIndices(lat, lng);
  const [selectedIndex, setSelectedIndex] = useState<keyof typeof indices>('NDVI');

  const current = indices[selectedIndex] as SpectralIndexResult;

  return (
    <div className="space-y-6">
      {/* Top Banner: Remote Sensing Pipeline */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Observasi Bumi & Indeks Spektral Satelit
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                Copernicus ESA
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Analisis multispektral 13 band Sentinel-2 & Synthetic Aperture Radar (SAR) C-Band Sentinel-1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Cpu className="w-4 h-4 text-sky-500" />
          <span>Area Fokus: <strong>{regionName}</strong> ({lat.toFixed(3)}°, {lng.toFixed(3)}°)</span>
        </div>
      </div>

      {/* Index Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(indices).map(([key, item]) => {
          const isSelected = selectedIndex === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedIndex(key as keyof typeof indices)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-indigo-950/80 dark:border-indigo-500 shadow-lg ring-2 ring-indigo-500/40'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold tracking-wider">{item.index}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.badgeColor }}
                />
              </div>
              <p className="text-[11px] font-semibold truncate">{item.name.split(' ')[0]}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black">{item.meanValue > 0 ? `+${item.meanValue}` : item.meanValue}</span>
                <span className="text-[9px] opacity-75 font-mono">{item.satellite.split(' ')[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Card of Selected Spectral Index */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {current.fullName} ({current.index})
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-mono text-slate-700 dark:text-slate-300 font-bold">
                {current.satellite}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Status Lapangan: <span className="font-semibold text-slate-800 dark:text-slate-200">{current.healthClassification}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 font-mono">Rumus Algoritma:</span>
            <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{current.bandFormula}</code>
          </div>
        </div>

        {/* Bands Used & Scientific Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Band Sensor Spektral yang Diproses
            </h5>
            <div className="flex flex-wrap gap-2">
              {current.bandsUsed.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                >
                  {b}
                </span>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                <Info className="w-3.5 h-3.5" /> Interpretasi Bio-Fisik Permukaan
              </div>
              {current.interpretation}
            </div>
          </div>

          {/* Area Breakdown Bars */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-500" /> Distribusi & Komposisi Wilayah (km²)
            </h5>
            <div className="space-y-2.5">
              {current.areaBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      {item.category}
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {item.percentage}% ({item.areaKm2} km²)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Radar Note for Sentinel-1 */}
        {current.index === 'SAR_FLOOD' && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              <strong>Keunggulan Radar SAR C-Band:</strong> Berbeda dengan citra optik yang terhalang awan mendung dan malam hari, Sentinel-1 memancarkan gelombang radar aktif yang menembus tutupan awan hujan lebat Indonesia, sangat efektif untuk pemetaan darurat luapan banjir secara langsung (real-time flood mapping).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
