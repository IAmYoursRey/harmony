import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import {
  terrainService,
  TerrainIntelligenceResult,
} from '../../../../../services/geospatial/terrainService';

interface GeospatialTerrainTabProps {
  lat: number;
  lng: number;
  regionName: string;
  refreshSignal?: number;
}

export const GeospatialTerrainTab: React.FC<GeospatialTerrainTabProps> = ({
  lat,
  lng,
  regionName,
  refreshSignal,
}) => {
  const [terrain, setTerrain] = useState<TerrainIntelligenceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerrain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await terrainService.getTerrainIntelligence(lat, lng);
      setTerrain(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data elevasi DEM');
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchTerrain();
    const intervalTimer = setInterval(() => {
      fetchTerrain();
    }, 5 * 60 * 1000); // 5-minute auto-refresh cycle
    return () => clearInterval(intervalTimer);
  }, [fetchTerrain, refreshSignal]);

  const getRiskColor = (level?: TerrainIntelligenceResult['landslideRiskLevel']) => {
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
                Terrain Intelligence & Model DEM Aktual (Copernicus GLO-90)
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Metode Horn 3x3
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Sync 5m
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Karakterisasi geomorfologi: elevasi aktual, kemiringan lereng (slope), orientasi aspek, hillshade 3D, dan estimasi risiko gerakan tanah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span>Wilayah: <strong>{regionName}</strong></span>
          </div>

          <button
            type="button"
            onClick={fetchTerrain}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Mengukur...' : 'Perbarui DEM'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
          <p className="font-bold">Gagal memuat DEM aktual</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Topographic 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Elevation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Elevasi DEM</span>
            <Mountain className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading && !terrain ? '...' : (terrain?.elevationM ?? '—')}
            </span>
            <span className="text-xs text-slate-500 font-bold">mdpl</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Copernicus DEM 90m</p>
        </div>

        {/* Slope Degree */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Kemiringan (Slope)</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading && !terrain ? '...' : `${terrain?.slopeDeg ?? 0}°`}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              ({terrain?.slopePercent ?? 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {terrain?.morphologyClass ?? 'Memproses...'}
          </p>
        </div>

        {/* Aspect */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Aspek Orientasi</span>
            <Compass className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading && !terrain ? '...' : `${terrain?.aspectDeg ?? 0}°`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold truncate">
            {terrain?.aspect ?? 'Memproses...'}
          </p>
        </div>

        {/* Landslide Exposure */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Paparan Longsor</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRiskColor(terrain?.landslideRiskLevel)}`}>
              {terrain?.landslideRiskLevel ?? 'Rendah'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {terrain?.landslideExposureScore ?? 0}/100
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
              Dihitung dari matriks 3x3 elevasi titik sekitar (metode Horn): lereng kritis, relief topografi aktual & intensitas hillshade ({terrain?.hillshade ?? 0}/255)
            </p>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
            Indeks Skor: {terrain?.landslideExposureScore ?? 0}%
          </span>
        </div>

        {/* Factor Bars */}
        <div className="space-y-3">
          {terrain?.contributingFactors.map((item, idx) => (
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
          <strong>Rekomendasi Spasial:</strong> {terrain?.landslideRiskLevel === 'Ekstrem' || terrain?.landslideRiskLevel === 'Tinggi'
            ? 'Area lereng terjal (>15°) dengan relief tinggi memerlukan vegetasi berakar tunjang (vetiver) dan pembatasan pembangunan perumahan di bibir gawir tebing.'
            : 'Morfologi landai-datar memiliki stabilitas lereng relatif aman, pertahankan drainase permukiman agar tidak terjadi penjenuhan tanah lokal.'}
        </div>
      </div>
    </div>
  );
};
