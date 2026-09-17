import React, { useState } from 'react';
import {
  Compass,
  Target,
  ShieldAlert,
  Flame,
  Activity,
  GraduationCap,
  Download,
  CheckCircle2,
  CircleDot,
  FileCode,
  MapPin,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  SpatialBufferResult,
} from '../../../../../services/geospatialAnalysisService';

interface GeospatialAnalyticsTabProps {
  centerLat: number;
  centerLng: number;
  regionName: string;
  mountains?: any[];
  earthquakes?: any[];
  schools?: any[];
}

export const GeospatialAnalyticsTab: React.FC<GeospatialAnalyticsTabProps> = ({
  centerLat,
  centerLng,
  regionName,
  mountains = [],
  earthquakes = [],
  schools = [],
}) => {
  const [radiusKm, setRadiusKm] = useState<number>(5);

  const bufferResult: SpatialBufferResult = geospatialAnalysisService.generateSpatialBuffer(
    centerLat,
    centerLng,
    radiusKm,
    mountains,
    earthquakes,
    schools
  );

  const handleExportBufferGeoJSON = () => {
    const geojsonStr = JSON.stringify(bufferResult.polygonGeoJSON, null, 2);
    const blob = new Blob([geojsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_buffer_${radiusKm}km_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Analisis Spasial, Buffer Geodesik & Proksimitas
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                Geoprocessing Engine
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Kalkulasi poligon radius zona pengaruh (buffer), tumpang susun (overlay), dan deteksi bahaya terdekat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-purple-500" />
          <span>Titik Pusat: <strong>{regionName}</strong></span>
        </div>
      </div>

      {/* Radius Selector Controls */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-purple-500" /> Pengaturan Jangkauan Buffer (Radius Geodesi)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih radius standar mitigasi darurat atau geser untuk kustomisasi jarak
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold">
            {[1, 5, 10, 20].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  radiusKm === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Radius Terpilih:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{radiusKm} Kilometer ({bufferResult.areaKm2} km²)</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-700 accent-purple-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Spatial Intersection Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Schools in Buffer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Fasilitas Pendidikan</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{bufferResult.schoolsCount}</span>
            <span className="text-xs text-slate-500 font-bold">Sekolah</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Potensi Posko Evakuasi / Terdampak</p>
        </div>

        {/* Volcanoes in Buffer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Gunung Api Terlingkup</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{bufferResult.volcanoesCount}</span>
            <span className="text-xs text-slate-500 font-bold">Gunung</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {bufferResult.nearestVolcano
              ? `Terdekat: ${bufferResult.nearestVolcano.name} (${bufferResult.nearestVolcano.distanceKm} km)`
              : 'Tidak ada dalam radius'}
          </p>
        </div>

        {/* Earthquakes in Buffer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Episentrum Gempa</span>
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{bufferResult.earthquakesCount}</span>
            <span className="text-xs text-slate-500 font-bold">Gempa</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {bufferResult.nearestEarthquake
              ? `Terdekat: M${bufferResult.nearestEarthquake.mag} (${bufferResult.nearestEarthquake.distanceKm} km)`
              : 'Tidak ada seismisitas dekat'}
          </p>
        </div>
      </div>

      {/* Nearest Hazards Card & GeoJSON Export */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Identifikasi Bahaya Terdekat (Proximity Index)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menghitung jarak Haversine bola bumi ke sumber ancaman vulkanik dan tektonik
            </p>
          </div>

          <button
            onClick={handleExportBufferGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200 transition-all active:scale-95"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-500" /> Unduh Poligon Buffer (.geojson)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Volcano details */}
          <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400 mb-1">
              <Flame className="w-4 h-4" /> Gunung Api Terdekat
            </div>
            {bufferResult.nearestVolcano ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                <p>Nama: <strong>{bufferResult.nearestVolcano.name}</strong></p>
                <p>Jarak Garis Lurus: <strong>{bufferResult.nearestVolcano.distanceKm} km</strong></p>
                <p>Tingkat Aktivitas: <span className="font-bold text-red-600">{bufferResult.nearestVolcano.status}</span></p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Memuat basis data PVMBG...</p>
            )}
          </div>

          {/* Earthquake details */}
          <div className="p-3.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400 mb-1">
              <Activity className="w-4 h-4" /> Episentrum Gempa Terdekat
            </div>
            {bufferResult.nearestEarthquake ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                <p>Lokasi: <strong>{bufferResult.nearestEarthquake.place}</strong></p>
                <p>Jarak: <strong>{bufferResult.nearestEarthquake.distanceKm} km</strong></p>
                <p>Magnitudo: <strong>M {bufferResult.nearestEarthquake.mag}</strong> (Kedalaman {bufferResult.nearestEarthquake.depthKm} km)</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Memuat basis data BMKG...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
