import React from 'react';
import {
  Droplets,
  Waves,
  ShieldAlert,
  TreePine,
  Building2,
  CheckCircle2,
  MapPin,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  HydrologyLandCoverData,
} from '../../../../../services/geospatialAnalysisService';

import { aoiService, useActiveAOI } from '../../../../../services/geospatial/aoiService';

interface GeospatialHydrologyTabProps {
  lat: number;
  lng: number;
  elevationM: number;
  regionName: string;
}

export const GeospatialHydrologyTab: React.FC<GeospatialHydrologyTabProps> = ({
  lat,
  lng,
  elevationM,
  regionName,
}) => {
  const activeAOI = useActiveAOI();
  const hydro: HydrologyLandCoverData = geospatialAnalysisService.calculateHydrologyAndLandCover(
    lat,
    lng,
    elevationM,
    [],
    activeAOI
  );

  const totalAreaKm2 = parseFloat(
    hydro.landCoverClasses.reduce((acc, c) => acc + c.areaKm2, 0).toFixed(1)
  );

  const builtUpClass = hydro.landCoverClasses.find((c) => !c.permeable);
  const builtUpPct = builtUpClass ? builtUpClass.percentage : 0;

  const getRiskColor = (level: HydrologyLandCoverData['floodRiskLevel']) => {
    switch (level) {
      case 'Tidak Tersedia':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      case 'Ekstrem':
        return 'text-red-500 bg-red-500/15 border-red-500/30';
      case 'Tinggi':
        return 'text-orange-500 bg-orange-500/15 border-orange-500/30';
      case 'Sedang':
        return 'text-amber-500 bg-amber-500/15 border-amber-500/30';
      default:
        return 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-teal-500/10 border border-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Hidrologi, Daerah Aliran Sungai (DAS) & Tutupan Lahan
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                Kementerian PUPR & BIG
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Proksimitas sempadan sungai, analisis drainase DAS, koefisien limpasan (runoff) dan eksposur banjir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-sky-500" />
          <span>Wilayah: <strong>{regionName}</strong></span>
        </div>
      </div>

      {/* Hydrology 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* River Distance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Jarak Sungai Terdekat</span>
            <Waves className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{hydro.nearestRiverDistanceM ?? '—'}</span>
            <span className="text-xs text-slate-500 font-bold">meter</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{hydro.watershedName.split(' ')[1] || 'Sempadan Alami'}</p>
        </div>

        {/* Relative Elevation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Beda Tinggi ke Aliran</span>
            <TrendingDown className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {hydro.relativeRiverElevationM !== null ? `+${hydro.relativeRiverElevationM}` : '—'}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {hydro.relativeRiverElevationM !== null ? 'meter' : '(Perlu DEM Sungai)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Freeboard Sempadan</p>
        </div>

        {/* Watershed (DAS) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Kawasan DAS</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {hydro.watershedName}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Kewenangan Balai Besar WS</p>
        </div>

        {/* Flood Exposure Score */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Eksposur Banjir</span>
            <ShieldAlert className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRiskColor(hydro.floodRiskLevel)}`}>
              {hydro.floodRiskLevel}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {hydro.floodExposureScore !== null ? `${hydro.floodExposureScore}/100` : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Memerlukan data dan model risiko yang sesuai</p>
        </div>
      </div>

      {/* Land Cover Statistics Breakdown */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-500" /> Komposisi Tutupan Lahan (ESA WorldCover 2021 v200)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klasifikasi kawasan kedap air (impervious) vs lahan serapan air alami
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Total: {hydro.landCoverClasses.length ? `${totalAreaKm2} km²` : '—'}
          </span>
        </div>

        {/* Breakdown List */}
        <div className="space-y-3">
          {hydro.landCoverClasses.length === 0 && <p className="text-xs leading-relaxed text-slate-500">Raster tutupan lahan pada wilayah ini belum terhubung. Luas dan persentase kelas belum tersedia.</p>}
          {hydro.landCoverClasses.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      item.permeable
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {item.permeable ? 'Menyerap Air (Permeable)' : 'Kedap Air (Runoff Tinggi)'}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
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

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong>Analisis Limpasan Permukaan:</strong> {hydro.landCoverClasses.length ? `Proporsi kawasan terbangun pada data masukan: ${builtUpPct}%. Perhitungan limpasan juga membutuhkan data tanah, hujan, dan drainase.` : 'Belum dapat disimpulkan karena data tutupan lahan, tanah, hujan, dan drainase yang diperlukan belum lengkap.'}
        </div>
      </div>
    </div>
  );
};
