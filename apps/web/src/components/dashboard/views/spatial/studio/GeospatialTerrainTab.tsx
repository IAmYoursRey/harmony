import React from 'react';
import {
  Mountain,
  TrendingUp,
  Compass,
  AlertTriangle,
  Layers,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  MapPin,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  TerrainIntelligence,
} from '../../../../../services/geospatialAnalysisService';

interface GeospatialTerrainTabProps {
  lat: number;
  lng: number;
  regionName: string;
}

export const GeospatialTerrainTab: React.FC<GeospatialTerrainTabProps> = ({
  lat,
  lng,
  regionName,
}) => {
  const terrain: TerrainIntelligence = geospatialAnalysisService.calculateTerrainIntelligence(lat, lng);

  const getRiskColor = (level: TerrainIntelligence['landslideRiskLevel']) => {
    switch (level) {
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Terrain Intelligence & Model DEMNAS (BIG)
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Resolusi 8.1m
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Karakterisasi geomorfologi: elevasi, kemiringan lereng (slope), aspek orientasi, dan risiko gerakan tanah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span>Wilayah: <strong>{regionName}</strong></span>
        </div>
      </div>

      {/* Topographic 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Elevation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Elevasi DEM</span>
            <Mountain className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{terrain.elevationM}</span>
            <span className="text-xs text-slate-500 font-bold">mdpl</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Datum Geoid EGM2008</p>
        </div>

        {/* Slope Degree */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Kemiringan (Slope)</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{terrain.slopeDeg}°</span>
            <span className="text-xs text-slate-500 font-bold">({terrain.slopePercent}%)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{terrain.morphologyClass}</p>
        </div>

        {/* Aspect */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Aspek Orientasi</span>
            <Compass className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{terrain.aspectDeg}°</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">{terrain.aspect}</p>
        </div>

        {/* Landslide Exposure */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Paparan Longsor</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRiskColor(terrain.landslideRiskLevel)}`}>
              {terrain.landslideRiskLevel}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {terrain.landslideExposureScore}/100
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-kriteria SNI 8460</p>
        </div>
      </div>

      {/* Multi-Criteria Landslide Decision Support Model */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Model Keputusan Kerentanan Gerakan Tanah
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bukan sekadar hujan tinggi: menggabungkan lereng kritis, relief topografi, saturasi tanah & struktur sesar
            </p>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
            Indeks Skor: {terrain.landslideExposureScore}%
          </span>
        </div>

        {/* Factor Bars */}
        <div className="space-y-3">
          {terrain.contributingFactors.map((item, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{item.factor}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                    Bobot {item.weight}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.impact}</p>
              </div>

              <div className="w-full sm:w-48 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                    style={{ width: `${item.weight * 2.2}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong>Rekomendasi Spasial:</strong> {terrain.landslideRiskLevel === 'Ekstrem' || terrain.landslideRiskLevel === 'Tinggi'
            ? 'Area lereng terjal (>15°) dengan relief tinggi memerlukan vegetasi berakar tunjang (vetiver) dan pembatasan pembangunan perumahan di bibir gawir tebing.'
            : 'Morfologi landai-datar memiliki stabilitas lereng relatif aman, pertahankan drainase permukiman agar tidak terjadi penjenuhan tanah lokal.'}
        </div>
      </div>
    </div>
  );
};
