import React, { useState, useMemo } from 'react';
import {
  Globe,
  Radio,
  Satellite,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Cpu,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingDown,
  Info,
  MapPin,
  Flame,
  Waves,
  Mountain,
  FileText,
  Activity,
  ArrowRight,
  Database,
  Search,
} from 'lucide-react';
import {
  dataFusionAndUncertaintyEngine,
  HarmonizedFusedState,
} from '../../../../../services/dataFusionAndUncertaintyEngine';
import {
  spatialDataEngine,
  INDONESIA_CRS_REGISTRY,
  CORE_SENSOR_NETWORK,
  MASTER_METADATA_CATALOG,
} from '../../../../../services/spatialDataEngine';
import { WeatherConsensusData } from '../../../../../services/weatherAggregatorService';
import { PreciseLocationInfo } from '../../../../../services/preciseGeocodingService';

interface GeospatialFusionIntelligenceTabProps {
  weatherData?: WeatherConsensusData | null;
  lat: number;
  lng: number;
  locationName?: string;
  userPreciseLocation?: PreciseLocationInfo | null;
}

const PRESET_TEST_LOCATIONS = [
  {
    id: 'sby',
    name: 'Surabaya, Jawa Timur',
    lat: -7.258,
    lng: 112.752,
    elevationM: 8,
    type: 'HIGH_COVERAGE',
    tag: '🟢 Densitas Radar & AWS Sangat Tinggi',
  },
  {
    id: 'jkt',
    name: 'DKI Jakarta (Pusat Pemerintahan)',
    lat: -6.208,
    lng: 106.845,
    elevationM: 12,
    type: 'HIGH_COVERAGE',
    tag: '🟢 Jaringan Sensor Lengkap & Doppler CGK',
  },
  {
    id: 'mataram',
    name: 'Mataram, Lombok (NTB)',
    lat: -8.583,
    lng: 116.116,
    elevationM: 35,
    type: 'MODERATE_COVERAGE',
    tag: '🟡 Liputan Menengah (AWS & Radar Bali)',
  },
  {
    id: 'mentawai',
    name: 'Kepulauan Mentawai (Siberut)',
    lat: -1.332,
    lng: 98.924,
    elevationM: 25,
    type: 'LOW_DATA_GAP',
    tag: '🔴 Blank Spot Observasi Permukaan (>140 km)',
  },
  {
    id: 'pegunungan_bintang',
    name: 'Pegunungan Bintang (Papua)',
    lat: -4.850,
    lng: 140.550,
    elevationM: 1850,
    type: 'LOW_DATA_GAP',
    tag: '🔴 Morfologi Terjal Ekstrem (>1800 mdpl)',
  },
  {
    id: 'natuna',
    name: 'Kepulauan Natuna (Ranai)',
    lat: 3.950,
    lng: 108.380,
    elevationM: 15,
    type: 'LOW_DATA_GAP',
    tag: '🔴 Koridor Laut Terpencil (Laut Natuna Utara)',
  },
];

export const GeospatialFusionIntelligenceTab: React.FC<GeospatialFusionIntelligenceTabProps> = ({
  weatherData,
  lat,
  lng,
  locationName,
  userPreciseLocation,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('current');
  const [activeSubView, setActiveSubView] = useState<'fusion' | 'quality' | 'impact' | 'sensor_priority' | 'metadata'>('fusion');

  const activeTarget = useMemo(() => {
    if (selectedLocationId === 'current') {
      return {
        id: 'current',
        name: userPreciseLocation?.shortDisplay || locationName || 'Lokasi Terpilih Saat Ini',
        lat,
        lng,
        elevationM: 16,
      };
    }
    const found = PRESET_TEST_LOCATIONS.find((p) => p.id === selectedLocationId);
    return found || {
      id: 'current',
      name: locationName || 'Lokasi Peta',
      lat,
      lng,
      elevationM: 16,
    };
  }, [selectedLocationId, lat, lng, locationName, userPreciseLocation]);

  const fusedState: HarmonizedFusedState = useMemo(() => {
    return dataFusionAndUncertaintyEngine.computeHarmonizedFusedState(
      weatherData || null,
      activeTarget.lat,
      activeTarget.lng,
      activeTarget.name,
      activeTarget.elevationM
    );
  }, [weatherData, activeTarget]);

  const candidatePriorities = useMemo(() => {
    return dataFusionAndUncertaintyEngine.getCandidateSensorPriorityAreas();
  }, []);

  const inspectedFeature = useMemo(() => {
    return spatialDataEngine.inspectFeatureAt(
      activeTarget.lat,
      activeTarget.lng,
      activeTarget.name,
      activeTarget.elevationM
    );
  }, [activeTarget]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Studio Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              Data Fusion &amp; Observation Gap Intelligence
            </span>
            <span className="text-[11px] text-slate-400">
              Lapisan Analitik Komplementer BMKG &amp; Observasi Global
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Asimilasi Multi-Sumber, Kendali Mutu &amp; Analisis Ketidakpastian</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Menghubungkan data resmi BMKG dengan model asimilasi global (ECMWF, GFS, ICON), citra satelit Himawari-9, elevasi medan DEMNAS, dan laporan lapangan tanpa mengarang data fiktif saat sensor tidak ada.
          </p>
        </div>

        {/* Location Switcher */}
        <div className="flex flex-col gap-1.5 self-start md:self-center shrink-0 w-full md:w-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400">Uji Titik Lokasi &amp; Kerapatan Data:</span>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800 border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="current" className="bg-slate-900 text-white">
              📍 {activeTarget.name} (Koordinat Peta)
            </option>
            {PRESET_TEST_LOCATIONS.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                {preset.name} — {preset.type === 'HIGH_COVERAGE' ? '🟢 Padat' : preset.type === 'MODERATE_COVERAGE' ? '🟡 Sedang' : '🔴 Blank Spot'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar touch-pan-x text-xs font-bold">
        {[
          { id: 'fusion', label: '🌐 Fusi & Ketidakpastian (Uncertainty)', icon: Globe },
          { id: 'quality', label: '🛡️ Kendali Mutu & Anomali (QC/QA)', icon: ShieldCheck },
          { id: 'impact', label: '🌊 Dampak Wilayah (Impact-Based)', icon: Mountain },
          { id: 'sensor_priority', label: '🎯 Prioritas Penambahan Sensor', icon: Radio },
          { id: 'metadata', label: '📋 Registri Metadata & CRS', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubView(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. SUBVIEW: FUSI DATA & UNCERTAINTY */}
      {activeSubView === 'fusion' && (
        <div className="space-y-5">
          {/* Key Metric Scorecard with Transparent Uncertainty Bounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Temperature */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">Estimasi Suhu Permukaan</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  Asimilasi DEM
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {fusedState.bestEstimate.temperatureC}°C
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ± {fusedState.bestEstimate.uncertaintyTempC}°C
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Environmental Lapse Rate terkoreksi ketinggian {fusedState.elevationM} mdpl
              </p>
            </div>

            {/* Precipitation */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">Estimasi Presipitasi</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                  24 Jam
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {fusedState.bestEstimate.precipitationMm} mm
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ± {fusedState.bestEstimate.uncertaintyPrecipMm} mm
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Bobot satelit Himawari-9 + radar Doppler lokal
              </p>
            </div>

            {/* Wind Speed */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">Kecepatan Angin</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                  10m Lapisan Batas
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {fusedState.bestEstimate.windSpeedKmh} km/h
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ± {fusedState.bestEstimate.uncertaintyWindKmh} km/h
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Gradien barometrik {fusedState.bestEstimate.surfacePressureHpa} hPa
              </p>
            </div>

            {/* Overall Confidence Score */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">Tingkat Keyakinan (Confidence)</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  fusedState.confidenceLevel === 'HIGH'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : fusedState.confidenceLevel === 'MODERATE'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {fusedState.confidenceLevel}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {fusedState.overallConfidenceScore}%
                </span>
                <span className="text-xs text-slate-400">Skor Asimilasi</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {fusedState.coverage.summaryNote}
              </p>
            </div>
          </div>

          {/* Composition Breakdown: Observed vs Model vs Satellite vs Estimated */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  <span>Komposisi Asal Data &amp; Kerapatan Observasi (Provenance Breakdown)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transparansi persentase kontribusi sumber data pada {fusedState.locationName}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl self-start sm:self-center">
                Pembaruan: {fusedState.coverage.dataFreshnessMinutes} menit lalu
              </span>
            </div>

            {/* Stacked Composition Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 flex overflow-hidden">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${fusedState.composition.observedPercentage}%` }}
                  title={`Observasi Langsung: ${fusedState.composition.observedPercentage}%`}
                />
                <div
                  className="bg-indigo-600 transition-all duration-500"
                  style={{ width: `${fusedState.composition.modelSupportedPercentage}%` }}
                  title={`Model Global: ${fusedState.composition.modelSupportedPercentage}%`}
                />
                <div
                  className="bg-sky-400 transition-all duration-500"
                  style={{ width: `${fusedState.composition.satellitePercentage}%` }}
                  title={`Satelit: ${fusedState.composition.satellitePercentage}%`}
                />
                <div
                  className="bg-amber-400 transition-all duration-500"
                  style={{ width: `${fusedState.composition.estimatedPercentage}%` }}
                  title={`Estimasi Fusi: ${fusedState.composition.estimatedPercentage}%`}
                />
              </div>

              {/* Legend & Breakdown values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Observasi Langsung</span>
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {fusedState.composition.observedPercentage}%
                  </div>
                  <span className="text-[10px] text-slate-400">AWS BMKG &amp; Radar Lokal</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Model Global Terpadu</span>
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {fusedState.composition.modelSupportedPercentage}%
                  </div>
                  <span className="text-[10px] text-slate-400">ECMWF IFS, GFS, ICON, JMA</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span>Citra Penginderaan Jauh</span>
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {fusedState.composition.satellitePercentage}%
                  </div>
                  <span className="text-[10px] text-slate-400">Himawari-9 &amp; Sentinel-2</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Estimasi Asimilasi Topografi</span>
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {fusedState.composition.estimatedPercentage}%
                  </div>
                  <span className="text-[10px] text-slate-400">Koreksi DEM &amp; Tutupan Lahan</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Stage Global-to-Local Fusion Pipeline Visualizer */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Arsitektur Pipeline Asimilasi Global-ke-Lokal Harmony</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              {fusedState.pipelineSteps.map((step) => (
                <div
                  key={step.stepIndex}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                      <span>Tahap {step.stepIndex}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-snug">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {step.inputDescription}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    ⚙️ {step.methodology}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. SUBVIEW: KENDALI MUTU (QC/QA) & ANOMALI */}
      {activeSubView === 'quality' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Matriks Pengujian Kendali Mutu Data Otomatis (Real-time QC/QA Engine)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Memvalidasi batas fisis, laju perubahan waktu, dan konsistensi lintas sensor sebelum data disajikan
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Status: {fusedState.qualityControlStatus}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Uji Validasi</th>
                    <th className="py-2.5 px-3">Parameter Terpantau</th>
                    <th className="py-2.5 px-3">Benchmark Aturan Fisis</th>
                    <th className="py-2.5 px-3">Hasil QC</th>
                    <th className="py-2.5 px-3">Catatan Ilmiah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fusedState.qcChecks.map((check) => (
                    <tr key={check.checkId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {check.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {check.observedValue}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {check.benchmark}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          check.status === 'VALID'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : check.status === 'INFILLED_ESTIMATE'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {check.status === 'VALID' ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                          <span>{check.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs">
                        {check.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBVIEW: IMPACT-BASED ADVISORY (TERRAIN-AWARE) */}
      {activeSubView === 'impact' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
              <Mountain className="w-4 h-4 text-indigo-500" />
              <span>Prakiraan Berbasis Dampak Geografis (Impact-Based Forecasting)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bukan sekadar menyatakan curah hujan, melainkan menganalisis implikasi hidrologi, morfologi lereng, dan keterpaparan risiko
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Flood Exposure */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
                    <Waves className="w-4 h-4" />
                    <span>Paparan Risiko Banjir</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    {fusedState.impacts.floodRiskLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {fusedState.impacts.floodExposureScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100 Indeks Paparan</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Faktor Pembentuk Utama:</span>
                  {fusedState.impacts.floodKeyDrivers.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Landslide Exposure */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Mountain className="w-4 h-4" />
                    <span>Paparan Risiko Longsor</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {fusedState.impacts.landslideRiskLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {fusedState.impacts.landslideExposureScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100 Indeks Paparan</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Faktor Pembentuk Utama:</span>
                  {fusedState.impacts.landslideKeyDrivers.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wildfire Exposure */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <Flame className="w-4 h-4" />
                    <span>Potensi Karhutla &amp; Panas</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    {fusedState.impacts.wildfireRiskLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {fusedState.impacts.wildfireExposureScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100 Indeks Paparan</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Faktor Pembentuk Utama:</span>
                  {fusedState.impacts.wildfireKeyDrivers.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUBVIEW: SENSOR PLACEMENT PRIORITY (DECISION SUPPORT) */}
      {activeSubView === 'sensor_priority' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-purple-500" />
              <span>Prioritas Penguatan Observasi Wilayah Kesenjangan Data (Sensor Placement Decision Support)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Menganalisis kombinasi kerentanan bahaya alam, kesenjangan kerapatan sensor (*data gap*), dan populasi untuk merekomendasikan kandidat penambahan instrumen
            </p>

            <div className="space-y-3">
              {candidatePriorities.map((item, idx) => (
                <div
                  key={item.regionId}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                          {item.regionName} • <span className="text-slate-400 font-normal">{item.province}</span>
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                        Skor Prioritas: {item.compositePriorityScore} / 100
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.justification}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400">Rekomendasi Instrumen:</span>
                    {item.recommendedInstruments.map((inst, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/60">
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBVIEW: REGISTRI METADATA & CRS GEOSPASIAL */}
      {activeSubView === 'metadata' && (
        <div className="space-y-4">
          {/* Feature Attribute Inspector */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Inspektur Atribut Fitur Geospasial: {inspectedFeature.name}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.entries(inspectedFeature.attributes).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">{key}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CRS Registry */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Registri Sistem Referensi Koordinat (CRS Engine) Indonesia</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INDONESIA_CRS_REGISTRY.map((crs) => (
                <div key={crs.epsgCode} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    <span>{crs.epsgCode}</span>
                    <span className="text-[10px] text-slate-400 font-sans font-normal">{crs.type}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{crs.name}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{crs.indonesiaUsage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Master Dataset Metadata Catalog & Lineage */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Katalog Metadata Dataset &amp; Rekam Jejak Data (Data Lineage)</span>
            </h3>
            <div className="space-y-3">
              {MASTER_METADATA_CATALOG.map((meta) => (
                <div key={meta.datasetId} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{meta.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {meta.agency}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Resolusi: {meta.spatialResolution} • {meta.temporalResolution}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {meta.description}
                  </p>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Rantai Transformasi (Data Lineage):</span>
                    <div className="space-y-0.5 pl-2">
                      {meta.lineage.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px]">
                          <span className="text-indigo-500 font-mono">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
