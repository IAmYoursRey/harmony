import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Footprints,
  Bike,
  Car,
  Building,
  HeartPulse,
  ShoppingBag,
  Shield,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Gauge,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../../../../services/apiClient';
import {
  networkAccessibilityService,
  TransportProfile,
  FacilityItem,
  ServiceGapAnalysisResult,
  ScenarioComparisonResult,
} from '../../../../../services/geospatial/networkAccessibilityService';
import { aoiService, useActiveAOI } from '../../../../../services/geospatial/aoiService';

interface GeospatialAccessibilityTabProps {
  lat: number;
  lng: number;
  regionName: string;
  schools?: any[];
  onApplyFeaturesToMap?: (features: any[], layerName: string) => void;
  refreshSignal?: number;
}

export const GeospatialAccessibilityTab: React.FC<GeospatialAccessibilityTabProps> = ({
  lat,
  lng,
  regionName,
  schools = [],
  onApplyFeaturesToMap,
  refreshSignal,
}) => {
  const activeAOI = useActiveAOI();
  const [profile, setProfile] = useState<TransportProfile>('foot-walking');
  const [candidateName, setCandidateName] = useState<string>('Puskesmas Pembantu Baru');
  const [candidateCategory, setCandidateCategory] = useState<FacilityItem['category']>('kesehatan');
  const [showScenario, setShowScenario] = useState<boolean>(false);

  // TomTom Traffic Flow Proxy State & 5-Minute Auto-Refresh
  const [trafficData, setTrafficData] = useState<{
    currentSpeedKmh: number | null;
    freeFlowSpeedKmh: number | null;
    currentTravelTimeSec: number | null;
    freeFlowTravelTimeSec: number | null;
    confidence: number | null;
    roadClosure: boolean;
    provenanceStatus?: string;
    reason?: string;
  } | null>(null);
  const [trafficLoading, setTrafficLoading] = useState<boolean>(false);

  const fetchTrafficFlow = useCallback(async () => {
    setTrafficLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/spatial/traffic/flow?lat=${lat}&lng=${lng}`, { ttl: 0 });
      if (res?.success && res.data) {
        setTrafficData({
          ...res.data,
          provenanceStatus: res.provenance?.dataStatus || 'LIVE',
        });
      } else {
        setTrafficData({
          currentSpeedKmh: null,
          freeFlowSpeedKmh: null,
          currentTravelTimeSec: null,
          freeFlowTravelTimeSec: null,
          confidence: null,
          roadClosure: false,
          provenanceStatus: res?.provenance?.dataStatus || 'UNAVAILABLE',
          reason: res?.reason?.message || 'Proxy TomTom Traffic Flow memerlukan kunci server atau sedang dalam pemeliharaan upstream.',
        });
      }
    } catch (e: any) {
      setTrafficData({
        currentSpeedKmh: null,
        freeFlowSpeedKmh: null,
        currentTravelTimeSec: null,
        freeFlowTravelTimeSec: null,
        confidence: null,
        roadClosure: false,
        provenanceStatus: 'ERROR',
        reason: e?.message || 'Koneksi ke endpoint lalu lintas gagal.',
      });
    } finally {
      setTrafficLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchTrafficFlow();
    const interval = setInterval(fetchTrafficFlow, 5 * 60 * 1000); // 5-minute auto-refresh cycle
    return () => clearInterval(interval);
  }, [fetchTrafficFlow, refreshSignal]);

  // Verified facilities from verified registry sources (Dapodik schools sorted by distance)
  // No synthetic offset coordinates for unverified health/market facilities (Zero-Fabrication principle)
  const baselineFacilities: FacilityItem[] = useMemo(() => {
    const list: FacilityItem[] = [];

    if (Array.isArray(schools) && schools.length > 0) {
      const validSchools = schools
        .filter((s) => s && !isNaN(parseFloat(s[1])) && !isNaN(parseFloat(s[2])))
        .map((s, idx) => {
          const sLat = parseFloat(s[1]);
          const sLng = parseFloat(s[2]);
          const distKm = networkAccessibilityService.haversineDistanceKm(lat, lng, sLat, sLng);
          return {
            id: `fac-school-${s[0] || idx}`,
            name: s[4] || `Sekolah (${idx + 1})`,
            category: 'sekolah' as const,
            lat: sLat,
            lng: sLng,
            source: 'Dapodik Kemendikbudristek (Aktual Terverifikasi)',
            address: s[3] || undefined,
            distanceKm: distKm,
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 10); // Take closest 10 verified schools

      list.push(...validSchools);
    }

    return list;
  }, [lat, lng, schools]);

  const envelope = useMemo(() => {
    return networkAccessibilityService.evaluateServiceGaps(
      [lng, lat],
      `Pusat Titik Permukiman (${regionName})`,
      profile,
      baselineFacilities,
      activeAOI
    );
  }, [lat, lng, regionName, profile, baselineFacilities, activeAOI]);

  const analysis = envelope.data;

  // Scenario candidate facility explicitly marked as [RENCANA / USULAN]
  const candidateFacility: FacilityItem = useMemo(() => {
    return {
      id: 'candidate-fac-1',
      name: `[RENCANA / USULAN] ${candidateName}`,
      category: candidateCategory,
      lat: lat - 0.004,
      lng: lng + 0.004,
      source: 'Usulan Perencanaan Fasilitas (Simulasi Skenario)',
    };
  }, [candidateName, candidateCategory, lat, lng]);

  const scenarioComparison: ScenarioComparisonResult | null = useMemo(() => {
    if (!showScenario || !analysis) return null;
    return networkAccessibilityService.compare15MinScenario(
      [lng, lat],
      profile,
      baselineFacilities,
      candidateFacility
    );
  }, [showScenario, analysis, lng, lat, profile, baselineFacilities, candidateFacility]);

  const handleExportGeoJSON = () => {
    if (!analysis) return;
    const geojson = {
      type: 'FeatureCollection',
      provenance: envelope.provenance,
      features: analysis.isochrones.map((iso) => ({
        type: 'Feature',
        geometry: iso.geometry,
        properties: {
          intervalMinutes: iso.intervalMinutes,
          intervalSeconds: iso.intervalSeconds,
          areaKm2: iso.areaKm2,
          profile: iso.profile,
          origin: analysis.originPoint,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_isochrone_15min_${profile}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMatrixCSV = () => {
    if (!analysis?.matrix?.length) return;
    const headers = [
      'originId',
      'originName',
      'facilityId',
      'facilityName',
      'facilityCategory',
      'distanceMeters',
      'travelTimeMinutes',
      'reachableWithin15Min',
      'status',
    ];
    const rows = analysis.matrix.map((m) => [
      m.originId,
      `"${m.originName}"`,
      m.facilityId,
      `"${m.facilityName}"`,
      m.facilityCategory,
      m.distanceMeters,
      m.travelTimeMinutes,
      m.reachableWithin15Min,
      m.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_accessibility_matrix_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [appliedToMap, setAppliedToMap] = useState<boolean>(false);

  const handleApplyToMap = () => {
    if (!onApplyFeaturesToMap || !analysis) return;
    const features: any[] = [];

    const colors: Record<number, string> = {
      5: '#10b981',
      10: '#f59e0b',
      15: '#3b82f6',
    };

    // 1. Isochrone polygons
    analysis.isochrones.forEach((iso) => {
      features.push({
        type: 'Feature',
        id: `isochrone-${iso.intervalMinutes}m`,
        properties: {
          layerType: 'isochrone',
          name: `Perkiraan Jangkauan ${iso.intervalMinutes} Menit (${profile})`,
          dataStatus: envelope.dataStatus,
          method: 'RADIAL_ESTIMATE',
          intervalMinutes: iso.intervalMinutes,
          areaKm2: iso.areaKm2,
          color: colors[iso.intervalMinutes] || '#6366f1',
          opacity: 0.25,
        },
        geometry: iso.geometry,
      });
    });

    // 2. Evaluated facilities
    analysis.evaluatedFacilities.forEach((fac) => {
      const matrixItem = analysis.matrix.find((m) => m.facilityId === fac.id);
      features.push({
        type: 'Feature',
        id: fac.id,
        properties: {
          layerType: 'facility',
          name: fac.name,
          category: fac.category,
          source: fac.source,
          travelTimeMinutes: matrixItem?.travelTimeMinutes,
          reachable: matrixItem?.reachableWithin15Min ?? false,
        },
        geometry: {
          type: 'Point',
          coordinates: [fac.lng, fac.lat],
        },
      });
    });

    // 3. Scenario candidate if enabled
    if (showScenario && candidateFacility) {
      features.push({
        type: 'Feature',
        id: candidateFacility.id,
        properties: {
          layerType: 'candidate_facility',
          name: candidateFacility.name,
          category: candidateFacility.category,
          source: candidateFacility.source,
          isPlanCandidate: true,
        },
        geometry: {
          type: 'Point',
          coordinates: [candidateFacility.lng, candidateFacility.lat],
        },
      });
    }

    onApplyFeaturesToMap(features, `Aksesibilitas 15 Menit (${regionName})`);
    setAppliedToMap(true);
    setTimeout(() => setAppliedToMap(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Akses Layanan 15 Menit & Kesenjangan Fasilitas
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                Estimasi Radial
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Evaluasi keterjangkauan sekolah, puskesmas, pasar, dan jalur evakuasi dalam 5, 10, dan 15 menit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>Titik Evaluasi: <strong>{regionName}</strong></span>
        </div>
      </div>

      <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
        Tampilan ini memakai perkiraan jarak dan kecepatan, belum menghitung jaringan jalan. Kontur dan waktu tempuh bersifat ilustrasi; hasilnya belum membuktikan akses 15 menit atau jalur evakuasi.
      </div>

      {/* Mode Selector & Action Buttons */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" /> Moda Transportasi & Parameter Isokron
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih profil pergerakan untuk menghitung poligon kontur jangkauan waktu
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onApplyFeaturesToMap && (
              <button
                onClick={handleApplyToMap}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                {appliedToMap ? 'Tersinkron ke Peta!' : 'Tampilkan di Peta'}
              </button>
            )}
            <button
              onClick={handleExportGeoJSON}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Isokron GeoJSON
            </button>
            <button
              onClick={handleExportMatrixCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Matriks CSV
            </button>
          </div>
        </div>

        {/* Profile Buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => setProfile('foot-walking')}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              profile === 'foot-walking'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>Jalan Kaki (4.5 km/j)</span>
          </button>

          <button
            onClick={() => setProfile('cycling-regular')}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              profile === 'cycling-regular'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Sepeda (14 km/j)</span>
          </button>

          <button
            onClick={() => setProfile('driving-car')}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              profile === 'driving-car'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Kendaraan (28 km/j)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Isochrone Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {analysis?.isochrones.map((iso) => (
          <div
            key={iso.intervalMinutes}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold uppercase tracking-wider">Jangkauan {iso.intervalMinutes} Menit</span>
              <span className="font-mono">{iso.intervalSeconds} detik</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {iso.areaKm2} km²
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Luas area perkiraan dengan moda {profile.split('-')[0]}
            </p>
          </div>
        ))}
      </div>

      {/* 15-Minute City Compliance Status */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Estimasi Akses Layanan Esensial (15 Menit)
          </h4>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              analysis?.is15MinCityCompliant
                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                : (analysis?.unservedCategories.length ?? 0) > 0
                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25'
                : 'bg-slate-500/15 text-slate-600 border border-slate-500/25'
            }`}
          >
            {analysis?.is15MinCityCompliant
              ? 'Semua kategori dalam estimasi jangkauan'
              : (analysis?.unservedCategories.length ?? 0) > 0
              ? 'Sebagian di luar estimasi jangkauan'
              : 'Evaluasi Parsial (Data Katalog Sebagian)'}
          </span>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {analysis?.categoryReachability.map((cat) => {
            const isInsufficient = cat.evaluationStatus === 'INSUFFICIENT_DATA';
            const isReachable = cat.hasAccess15Min === true;
            return (
              <div
                key={cat.category}
                className={`p-3 rounded-2xl border text-xs ${
                  isInsufficient
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    : isReachable
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>{cat.label}</span>
                  {isInsufficient ? (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      N/A
                    </span>
                  ) : isReachable ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] truncate opacity-90">
                  {isInsufficient
                    ? 'Katalog Belum Tersedia'
                    : cat.nearestFacilityName || 'Tidak Terjangkau'}
                </p>
                <div className="mt-1 font-mono font-bold text-[11px]">
                  {cat.nearestTravelTimeMin !== undefined ? `${cat.nearestTravelTimeMin} menit` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
          <strong>Rekomendasi Tata Ruang:</strong> {analysis?.recommendation}
        </div>
      </div>

      {/* Scenario Planning Section */}
      <div className="p-4 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Skenario Perencanaan Fasilitas Baru (Uji Dampak)
            </h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Simulasikan penambahan fasilitas kandidat untuk mengukur peningkatan jangkauan warga
            </p>
          </div>

          <button
            onClick={() => setShowScenario(!showScenario)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showScenario
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200'
            }`}
          >
            {showScenario ? 'Sembunyikan Skenario' : '+ Uji Skenario Baru'}
          </button>
        </div>

        {showScenario && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Fasilitas Rencana
                </label>
                <input name="candidateName" id="geospatialaccessibilitytab-candidatename"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kategori Layanan
                </label>
                <select name="candidateCategory" id="geospatialaccessibilitytab-candidatecategory"
                  value={candidateCategory}
                  onChange={(e) => setCandidateCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="kesehatan">Puskesmas / Layanan Kesehatan</option>
                  <option value="sekolah">Sekolah / Pendidikan</option>
                  <option value="pasar">Pasar / Sentra Pangan</option>
                  <option value="evakuasi">Titik Evakuasi Bencana</option>
                </select>
              </div>
            </div>

            {scenarioComparison && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Cakupan Baseline</span>
                  <div className="text-lg font-black text-slate-700 dark:text-slate-300">
                    {scenarioComparison.baselineCoveragePct}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 uppercase font-bold block">Cakupan Skenario</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {scenarioComparison.scenarioCoveragePct}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-500 uppercase font-bold block">Peningkatan Akses</span>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    +{scenarioComparison.deltaCoveragePct}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-500 uppercase font-bold block">Efisiensi Waktu</span>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {scenarioComparison.deltaAvgTravelTimeMin} menit
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live TomTom Traffic Flow Telemetry & Segment Speed */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Telemetri Lalu Lintas & Kecepatan Ruas Jalan (TomTom Traffic Flow)
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Auto-Sync 5m
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan kecepatan aktual ruas jalan vs arus bebas untuk estimasi waktu tempuh riil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrafficFlow}
              disabled={trafficLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Perbarui data arus lalu lintas sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${trafficLoading ? 'animate-spin' : ''}`} />
              <span>Cek Lalu Lintas</span>
            </button>
          </div>
        </div>

        {trafficData?.currentSpeedKmh != null ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Kecepatan Aktual</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {trafficData.currentSpeedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Kecepatan Bebas Hambatan</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {trafficData.freeFlowSpeedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Keterlambatan Ruas</span>
              <div className={`text-xl font-black mt-0.5 ${
                (trafficData.currentTravelTimeSec || 0) > (trafficData.freeFlowTravelTimeSec || 0)
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {Math.max(0, (trafficData.currentTravelTimeSec || 0) - (trafficData.freeFlowTravelTimeSec || 0))} <span className="text-xs font-normal text-slate-500">detik</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Ruas Jalan</span>
              <div className="text-xs font-bold mt-1.5 flex items-center gap-1.5">
                {trafficData.roadClosure ? (
                  <span className="text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Jalan Ditutup</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ruas Terbuka</span>
                )}
                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                  Conf: {((trafficData.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Status Integrasi TomTom: {trafficData?.provenanceStatus === 'LIVE' ? 'Sedang Memuat Data...' : 'Proxy Memerlukan Kredensial Server'}
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                {trafficData?.reason || 'Kunci TomTom Traffic belum terpasang pada server backend. Simulasi jangkauan 15 menit menggunakan estimasi kecepatan jaringan jalan lokal standar (Zero-Fabrication).'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
