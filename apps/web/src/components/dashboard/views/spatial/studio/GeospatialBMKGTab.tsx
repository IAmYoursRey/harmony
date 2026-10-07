import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CloudLightning,
  Radio,
  Satellite,
  Waves,
  Plane,
  ThermometerSnowflake,
  Wind,
  Activity,
  AlertTriangle,
  Clock,
  Sun,
  Moon,
  Compass,
  Layers,
  MapPin,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  ChevronRight,
  TrendingUp,
  FileText,
  Database,
  Building,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  bmkgService,
  BMKGEarthquake,
  BMKGWeatherWarning,
  BMKGSatelliteProduct,
  BMKGClimateData,
  BMKGAirQualityStation,
  BMKGGeophysicsData,
  BMKGTimeSun,
  BMKGSeismicMicrozonation,
  BMKGStoryMap,
} from '../../../../../services/bmkgService';
import {
  earthquakeSnapshotService,
  EarthquakeRecord,
} from '../../../../../services/geospatial/earthquakeSnapshotService';
import {
  pusgenFaultService,
  PuSGenFault,
  NearestFaultResult,
} from '../../../../../services/geospatial/pusgenFaultService';
import { WeatherConsensusData } from '../../../../../services/weatherAggregatorService';

interface GeospatialBMKGTabProps {
  lat: number;
  lng: number;
  regionName?: string;
  refreshSignal?: number;
  weatherData?: WeatherConsensusData | null;
}

type BMKGSubModule =
  | 'weather_nowcast'
  | 'satellite_himawari'
  | 'aviation_maritime'
  | 'climate_stripes'
  | 'air_quality'
  | 'earthquake_tews'
  | 'lightning_geophysics'
  | 'time_astronomy'
  | 'engineering_seismology'
  | 'satu_peta_story';

export const GeospatialBMKGTab: React.FC<GeospatialBMKGTabProps> = ({
  lat,
  lng,
  regionName = 'Indonesia',
  refreshSignal,
  weatherData,
}) => {
  const [subModule, setSubModule] = useState<BMKGSubModule>('weather_nowcast');
  const [loading, setLoading] = useState(false);

  const [autoGempa, setAutoGempa] = useState<BMKGEarthquake | null>(null);
  const [recentQuakes, setRecentQuakes] = useState<BMKGEarthquake[]>([]);
  const [feltQuakes, setFeltQuakes] = useState<BMKGEarthquake[]>([]);
  const [warnings, setWarnings] = useState<BMKGWeatherWarning[]>([]);
  const [satellites, setSatellites] = useState<BMKGSatelliteProduct[]>([]);
  const [satelliteImageStatus, setSatelliteImageStatus] = useState<'LOADING' | 'VIEW_LOADED' | 'FAILED'>('LOADING');
  const [activeSatId, setActiveSatId] = useState<string>('ir_enhanced');
  const [climate, setClimate] = useState<BMKGClimateData | null>(null);
  const [airQuality, setAirQuality] = useState<BMKGAirQualityStation[]>([]);
  const [geophysics, setGeophysics] = useState<BMKGGeophysicsData | null>(null);
  const [timeSun, setTimeSun] = useState<BMKGTimeSun | null>(null);
  const [microzonation, setMicrozonation] = useState<BMKGSeismicMicrozonation | null>(null);
  const [storyMaps, setStoryMaps] = useState<BMKGStoryMap[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string>('story-cianjur');

  // Multi-Source Seismic & Fault States (InaTEWS + USGS + PuSGeN)
  const [quakeSourceTab, setQuakeSourceTab] = useState<'inatews' | 'usgs' | 'pusgen'>('inatews');
  const [usgsQuakes, setUsgsQuakes] = useState<EarthquakeRecord[]>([]);
  const [faultSearchQuery, setFaultSearchQuery] = useState('');
  const [faultRegionFilter, setFaultRegionFilter] = useState<string>('Semua');

  const nearestFault: NearestFaultResult = useMemo(() => {
    return pusgenFaultService.getNearestFault(lat, lng);
  }, [lat, lng]);

  const allFaults: PuSGenFault[] = useMemo(() => {
    let list = pusgenFaultService.getAllFaults();
    if (faultRegionFilter !== 'Semua') {
      list = list.filter((f) => f.region === faultRegionFilter);
    }
    if (faultSearchQuery.trim()) {
      const q = faultSearchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.segment.toLowerCase().includes(q));
    }
    return list;
  }, [faultRegionFilter, faultSearchQuery]);

  const nearestUsgsQuake = useMemo(() => {
    if (usgsQuakes.length === 0) return null;
    let closest = usgsQuakes[0];
    let minD = Infinity;
    for (const q of usgsQuakes) {
      const d = pusgenFaultService.calculateDistanceKm(lat, lng, q.lat, q.lng);
      if (d < minD) {
        minD = d;
        closest = q;
      }
    }
    return { quake: closest, distanceKm: minD };
  }, [usgsQuakes, lat, lng]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reqGenRef = useRef(0);

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentGen = ++reqGenRef.current;

    setLoading(true);
    try {
      const [
        gempaRes,
        terkiniRes,
        dirasakanRes,
        satRes,
        quakeSnap,
      ] = await Promise.all([
        bmkgService.getAutoGempa(controller.signal),
        bmkgService.getGempaTerkini(controller.signal),
        bmkgService.getGempaDirasakan(controller.signal),
        bmkgService.getSatelliteProducts(controller.signal),
        earthquakeSnapshotService.fetchEarthquakeSnapshot({ feed: '2.5_day' }).catch(() => null),
      ]);

      if (currentGen !== reqGenRef.current) return;

      setAutoGempa(gempaRes);
      setRecentQuakes(terkiniRes);
      setFeltQuakes(dirasakanRes);
      if (quakeSnap?.records) {
        setUsgsQuakes(quakeSnap.records.filter((r) => r.source === 'USGS' || !r.source.includes('BMKG')));
      }
      setSatellites(satRes.length > 0 ? satRes : [
        {
          id: 'ir_enhanced',
          name: 'Himawari-9 IR Enhanced',
          spectralBand: 'Inframerah Termal Band 13 (10.4 µm)',
          resolution: '2 km',
          colorInterpretation: 'Gradasi hitam-putih-oranye-merah mencerminkan suhu puncak awan (Cloud Top Temperature). Puncak awan sangat dingin (<-60°C) berwarna merah menunjukkan awan konvektif Cumulonimbus aktif.',
          purpose: 'Deteksi dini awan badai konvektif, bibit siklon, dan potensi curah hujan intensif.',
          refreshInterval: '10 Menit',
          sampleImage: '/api/bmkg/satellite/image?product=ir_enhanced',
          isDayNight: '24 Jam (Siang & Malam)',
          directUrl: 'https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_EH_Indonesia.png',
        },
        {
          id: 'natural_color',
          name: 'Himawari-9 Natural Color',
          spectralBand: 'RGB Gabungan Kanal Tampak & NIR',
          resolution: '1 km',
          refreshInterval: '10 Menit',
          colorInterpretation: 'Menampilkan permukaan bumi menyerupai penglihatan mata manusia. Daratan hijau/coklat, laut biru gelap, awan air putih terang, dan awan es/badai tampak kebiruan.',
          purpose: 'Analisis visual sebaran awan, aerosol kabut asap, dan tutupan vegetasi.',
          sampleImage: '/api/bmkg/satellite/image?product=natural_color',
          isDayNight: 'Siang Hari (Optimal)',
          directUrl: 'https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_NC_Indonesia.png',
        },
      ]);
      setWarnings(bmkgService.getDynamicWeatherWarnings(lat, lng, weatherData?.current, regionName));
      setClimate(bmkgService.getDynamicClimateData());
      setAirQuality(bmkgService.getDynamicAirQuality(lat, lng, weatherData?.current, regionName));
      setGeophysics(bmkgService.getReferenceGeophysicsData());
      setTimeSun(bmkgService.getDynamicTimeSun(lat, lng));
      setMicrozonation(bmkgService.getReferenceMicrozonation(lat, lng));
      setStoryMaps(bmkgService.getStoryMaps());
    } catch (err) {
      if (currentGen === reqGenRef.current && !controller.signal.aborted) {
        console.error('Failed loading BMKG intelligence data:', err);
      }
    } finally {
      if (currentGen === reqGenRef.current) {
        setLoading(false);
      }
    }
  }, [lat, lng, weatherData, regionName]);

  useEffect(() => {
    loadData();
    const intervalTimer = setInterval(() => {
      loadData();
    }, 60 * 1000); // 60s continuous polling for InaTEWS earthquake telemetry
    return () => {
      clearInterval(intervalTimer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData, refreshSignal]);

  const activeSatellite = satellites.find((s) => s.id === activeSatId) || satellites[0];
  useEffect(() => { setSatelliteImageStatus('LOADING'); }, [activeSatellite?.sampleImage]);
  const activeStory = storyMaps.find((s) => s.id === activeStoryId) || storyMaps[0];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            <strong>Pusat Intelijen BMKG & Multi-Disiplin MKG:</strong> Data gempa terkini aktif dari InaTEWS, citra satelit Himawari-9 live, serta modul edukasi nowcast, iklim, dan geofisika berstandar BMKG.
          </span>
        </div>
        <span className="self-start sm:self-auto text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25 shrink-0">
          InaTEWS Live & Standar Geospasial
        </span>
      </div>

      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              Informasi dan katalog BMKG
            </span>
            <span className="text-[11px] text-slate-400">
              Integrasi Multi-Disiplin MKG Nasional
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Harmony Earth, Atmosphere & Geophysics Intelligence</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Data gempa bumi real-time InaTEWS BMKG, citra satelit cuaca Himawari-9, dan sistem informasi analitik iklim, atmosfer, serta geofisika komprehensif Indonesia.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Menyinkronkan...' : 'Sinkronkan BMKG'}</span>
          </button>
        </div>
      </div>

      {/* 10 BMKG Sub-Module Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        {[
          { id: 'weather_nowcast', label: '🌦️ Cuaca & Radar', icon: Radio },
          { id: 'satellite_himawari', label: '🛰️ Himawari-9', icon: Satellite },
          { id: 'aviation_maritime', label: '🛫 Penerbangan & Maritim', icon: Waves },
          { id: 'climate_stripes', label: '🌍 Iklim & Stripes', icon: ThermometerSnowflake },
          { id: 'air_quality', label: '🍃 Kualitas Udara & GRK', icon: Activity },
          { id: 'earthquake_tews', label: '🌋 Gempa & Tsunami InaTEWS', icon: ShieldAlert },
          { id: 'lightning_geophysics', label: '⚡ Petir & Gaya Berat', icon: CloudLightning },
          { id: 'time_astronomy', label: '⏱️ Tanda Waktu & Hilal', icon: Clock },
          { id: 'engineering_seismology', label: '🏗️ Seismologi Teknik', icon: Building },
          { id: 'satu_peta_story', label: '🗺️ Satu Peta & Story Maps', icon: Layers },
        ].map((mod) => {
          const isActive = subModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setSubModule(mod.id as BMKGSubModule)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: WEATHER & NOWCASTING */}
      {subModule === 'weather_nowcast' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Peringatan Dini Cuaca Ekstrem (Nowcasting 0–6 Jam) BMKG</span>
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Mode Rujukan SOP Nowcasting BMKG
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {!warnings.length && <p role="status" className="text-xs text-amber-600 md:col-span-3">Data peringatan belum tersedia.</p>}
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl border flex flex-col justify-between bg-slate-50 dark:bg-slate-900/60"
                  style={{ borderColor: `${w.color}50` }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{w.province}</span>
                      <span
                        className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${w.color}20`, color: w.color }}
                      >
                        {w.level}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{w.hazardType}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{w.meteorologicalDescription}</p>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] space-y-1">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Wilayah Terdampak:</div>
                      <div className="text-slate-500">{w.affectedAreas.join(', ')}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Berlaku: {w.validUntil}</span>
                    <span className="font-medium text-indigo-500">Nowcast BMKG</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Radar Intensity Legend */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-500" />
                <span>Klasifikasi Intensitas Sebaran Hujan Radar Cuaca Doppler BMKG</span>
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                Wajib menyertakan atribusi BMKG
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: 'Sangat Ringan', range: '0.1 - 1.0 mm/jam', dbz: '< 20 dBZ', color: '#6ee7b7' },
                { label: 'Ringan', range: '1.0 - 5.0 mm/jam', dbz: '20 - 30 dBZ', color: '#38bdf8' },
                { label: 'Sedang', range: '5.0 - 10.0 mm/jam', dbz: '30 - 40 dBZ', color: '#fbbf24' },
                { label: 'Lebat', range: '10.0 - 20.0 mm/jam', dbz: '40 - 50 dBZ', color: '#f97316' },
                { label: 'Sangat Lebat', range: '> 20.0 mm/jam', dbz: '> 50 dBZ (Potensi Cb)', color: '#ef4444' },
              ].map((lvl) => (
                <div
                  key={lvl.label}
                  className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-900/60"
                  style={{ borderColor: `${lvl.color}60` }}
                >
                  <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: lvl.color }} />
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{lvl.label}</div>
                  <div className="text-[10px] text-slate-500">{lvl.range}</div>
                  <div className="text-[9px] font-mono text-slate-400">{lvl.dbz}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: HIMAWARI-9 SATELLITE */}
      {subModule === 'satellite_himawari' && (
        <div className="space-y-4">
          {/* Satellite Product Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {satellites.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSatId(s.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeSatId === s.id
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <div className="text-xs font-bold truncate">{s.name.replace('Himawari-9 ', '')}</div>
                <div className={`text-[10px] truncate ${activeSatId === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {s.spectralBand.split('(')[0]}
                </div>
              </button>
            ))}
          </div>

          {activeSatellite && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-indigo-500" />
                    <span>{activeSatellite.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-500 font-mono">
                      10-Menit Refresh
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeSatellite.purpose}</p>
                </div>
                <div className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                  {activeSatellite.isDayNight}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-2xl bg-slate-950 p-2 border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[280px]">
                  {satelliteImageStatus !== 'FAILED' ? (
                    <img
                      key={activeSatellite.sampleImage}
                      src={activeSatellite.sampleImage}
                      onLoad={() => setSatelliteImageStatus('VIEW_LOADED')}
                      alt={activeSatellite.name}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[380px] object-contain rounded-xl"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (activeSatellite.directUrl && target.src !== activeSatellite.directUrl) {
                          target.src = activeSatellite.directUrl;
                        } else {
                          setSatelliteImageStatus('FAILED');
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <p className="text-xs text-slate-300">Tampilan citra {activeSatellite.name} belum dapat dimuat dari raster Inderaja BMKG.</p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() => setSatelliteImageStatus('LOADING')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          Coba Muat Ulang Citra
                        </button>
                        {activeSatellite.directUrl && (
                          <a
                            href={activeSatellite.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                          >
                            <span>Buka di Inderaja BMKG</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-700">
                    {satelliteImageStatus === 'FAILED' ? 'Citra gagal dimuat' : satelliteImageStatus === 'VIEW_LOADED' ? 'Tampilan citra tersedia via Inderaja BMKG' : 'Memuat tampilan citra…'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Karakteristik Sensor:</span>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{activeSatellite.spectralBand}</div>
                    <div className="text-[11px] text-slate-500">Resolusi: <strong>{activeSatellite.resolution}</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Interpretasi Warna BMKG:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeSatellite.colorInterpretation}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300">
                    💡 <strong>Analisis Harmony:</strong> Citra satelit Himawari-9 ditampilkan sebagai rujukan penginderaan jauh BMKG. Puncak awan dingin mencerminkan aktivitas konveksi lokal.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: AVIATION & MARITIME */}
      {subModule === 'aviation_maritime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
            <span className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-sky-500" />
              <strong>Meteorologi Penerbangan & Maritim:</strong> Format observasi METAR/TAF stasiun bandara dan panduan keselamatan tinggi gelombang perairan Indonesia.
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold shrink-0">
              Standar WMO & BMKG
            </span>
          </div>

          {/* Aviation METAR / TAF */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Plane className="w-4 h-4 text-indigo-500" />
                <span>Format Observasi Cuaca Bandara Utama (METAR / TAF Standard)</span>
              </h3>
              <span className="text-[10px] text-slate-400">ICAO International Aerodrome Code</span>
            </div>

            {(() => {
              const now = new Date();
              const utcDay = String(now.getUTCDate()).padStart(2, '0');
              const utcHour = String(now.getUTCHours()).padStart(2, '0');
              const timeMetar = `${utcDay}${utcHour}00Z`;
              const curTemp = weatherData?.current?.consensusTemperature != null ? Math.round(weatherData.current.consensusTemperature) : 31;
              const curPress = weatherData?.current?.pressure != null ? Math.round(weatherData.current.pressure) : 1010;
              const curWindSpeed = weatherData?.current?.windSpeed != null ? Math.round(weatherData.current.windSpeed * 0.539957) : 8;
              const curWindDir = weatherData?.current?.windDirection != null ? String(Math.round(weatherData.current.windDirection)).padStart(3, '0') : '110';
              const curWindStr = `${curWindDir}${String(curWindSpeed).padStart(2, '0')}KT`;

              const airports = [
                {
                  code: 'WARR',
                  name: 'Bandara Juanda (Surabaya)',
                  metar: `WARR ${timeMetar} ${curWindStr} 9999 FEW018 ${curTemp}/24 Q${curPress} NOSIG`,
                  wind: `${curWindDir}° / ${curWindSpeed} knot`,
                  vis: '> 10 km',
                  temp: `${curTemp}°C / DP 24°C`,
                  cloud: 'Few 1800 ft',
                },
                {
                  code: 'WIII',
                  name: 'Bandara Soekarno-Hatta (Jakarta)',
                  metar: `WIII ${timeMetar} 05010KT 8000 SCT020 ${curTemp + 1}/25 Q${curPress - 1} NOSIG`,
                  wind: '050° / 10 knot',
                  vis: '8 km',
                  temp: `${curTemp + 1}°C / DP 25°C`,
                  cloud: 'Scattered 2000 ft',
                },
                {
                  code: 'WADD',
                  name: 'Bandara I Gusti Ngurah Rai (Bali)',
                  metar: `WADD ${timeMetar} 14012KT 9999 SCT018 ${curTemp - 1}/23 Q${curPress + 1} NOSIG`,
                  wind: '140° / 12 knot',
                  vis: '> 10 km',
                  temp: `${curTemp - 1}°C / DP 23°C`,
                  cloud: 'Scattered 1800 ft',
                },
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {airports.map((apt) => (
                    <div key={apt.code} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{apt.code}</span>
                          <p className="text-[11px] text-slate-500">{apt.name}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          METAR {timeMetar}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 break-all select-all">
                        {apt.metar}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                        <div>Angin: <strong className="text-slate-700 dark:text-slate-300">{apt.wind}</strong></div>
                        <div>Visibilitas: <strong className="text-slate-700 dark:text-slate-300">{apt.vis}</strong></div>
                        <div>Suhu: <strong className="text-slate-700 dark:text-slate-300">{apt.temp}</strong></div>
                        <div>Awan: <strong className="text-slate-700 dark:text-slate-300">{apt.cloud}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Maritime Sea Wave Classification */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Waves className="w-4 h-4 text-sky-500" />
              <span>Klasifikasi Skala Tinggi Gelombang Signifikan Perairan BMKG</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
              {[
                { label: 'Tenang', height: '0.0 - 0.5 m', color: '#10b981', vessel: 'Semua kapal aman' },
                { label: 'Rendah', height: '0.5 - 1.25 m', color: '#06b6d4', vessel: 'Waspada perahu nelayan' },
                { label: 'Sedang', height: '1.25 - 2.5 m', color: '#f59e0b', vessel: 'Waspada tongkang / ferry' },
                { label: 'Tinggi', height: '2.5 - 4.0 m', color: '#f97316', vessel: 'Risiko tinggi kapal kargo' },
                { label: 'Sangat Tinggi', height: '4.0 - 6.0 m', color: '#ef4444', vessel: 'Bahaya pelayaran umum' },
                { label: 'Ekstrem', height: '> 6.0 m', color: '#7c3aed', vessel: 'Peringatan badai laut' },
              ].map((w) => (
                <div key={w.label} className="p-3 rounded-xl border space-y-1 bg-slate-50 dark:bg-slate-900/60" style={{ borderColor: `${w.color}50` }}>
                  <div className="w-2.5 h-2.5 rounded-full mx-auto" style={{ backgroundColor: w.color }} />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{w.label}</div>
                  <div className="text-[11px] font-mono font-semibold" style={{ color: w.color }}>{w.height}</div>
                  <div className="text-[9px] text-slate-400">{w.vessel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: CLIMATE & WARMING STRIPES */}
      {subModule === 'climate_stripes' && climate && (
        <div className="space-y-4">
          {/* Warming Stripes Visual Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Warming Stripes Indonesia (1981 - 2026)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visualisasi anomali suhu rata-rata tahunan BMKG (Ed Hawkins Methodology)
                </p>
              </div>
              <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg">
                Tren Pemanasan Nyata
              </span>
            </div>

            <div className="flex h-12 w-full rounded-xl overflow-hidden shadow-inner">
              {climate.warmingStripes.map((st) => (
                <div
                  key={st.year}
                  className="flex-1 transition-all hover:opacity-80 hover:scale-y-110 cursor-pointer"
                  style={{ backgroundColor: st.hexColor }}
                  title={`Tahun ${st.year}: Anomali ${st.anomalyC > 0 ? '+' : ''}${st.anomalyC}°C`}
                />
              ))}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1981 (-0.45°C Dingin)</span>
              <span>2000 (Transisi Netral)</span>
              <span>2026 (+0.88°C Terpanas)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-500">Status ENSO Samudra Pasifik:</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.enso.status} (ONI: {climate.enso.indexOni})</div>
              <p className="text-[11px] text-slate-500">{climate.enso.description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-500">Indian Ocean Dipole (IOD):</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.iod.status}</div>
              <p className="text-[11px] text-slate-500">{climate.iod.description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-500">Indeks Presipitasi (SPI):</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.spi.category} ({climate.spi.indexValue})</div>
              <p className="text-[11px] text-slate-500">{climate.spi.note}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: AIR QUALITY & GREENHOUSE GAS */}
      {subModule === 'air_quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {airQuality.map((station) => (
              <div
                key={station.code}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{station.name}</h4>
                    <span className="text-[10px] text-slate-400">{station.province} • Elevasi {station.altitudeM} mdpl</span>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                    {station.code}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">PM2.5</span>
                    <span className="text-xs font-black text-purple-500">{station.pm25} µg/m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Ozon (O₃)</span>
                    <span className="text-xs font-black text-sky-500">{station.o3} µg/m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">NO₂ / SO₂</span>
                    <span className="text-xs font-black text-emerald-500">{station.no2} / {station.so2}</span>
                  </div>
                </div>

                {station.greenhouseGas && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gas Rumah Kaca (GRK) WMO GAW:</span>
                    </div>
                    <div>CO₂: <strong>{station.greenhouseGas.co2Ppm} ppm</strong> | CH₄: <strong>{station.greenhouseGas.ch4Ppb} ppb</strong></div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{station.greenhouseGas.note}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-400">
                  <span>pH Kimia Air Hujan: {station.rainChemistry.ph}</span>
                  <span>{station.rainChemistry.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: EARTHQUAKE & INATEWS + USGS + PUSGEN ACTIVE FAULTS */}
      {subModule === 'earthquake_tews' && (
        <div className="space-y-4">
          {/* Sub-Source Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setQuakeSourceTab('inatews')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                quakeSourceTab === 'inatews'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>InaTEWS BMKG (Nasional)</span>
            </button>
            <button
              type="button"
              onClick={() => setQuakeSourceTab('usgs')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                quakeSourceTab === 'usgs'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>USGS M2.5+ (Global Feed)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {usgsQuakes.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setQuakeSourceTab('pusgen')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                quakeSourceTab === 'pusgen'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PuSGeN 295 Sesar Aktif</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                SNI 1726
              </span>
            </button>
          </div>

          {/* VIEW 1: INATEWS BMKG */}
          {quakeSourceTab === 'inatews' && (
            <div className="space-y-4">
              {/* Real-time Latest Earthquake Hero */}
              {autoGempa && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 border border-rose-500/30 text-white shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Gempa Terkini Real-Time (InaTEWS BMKG)
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{autoGempa.date} • {autoGempa.time}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-rose-400 font-mono">M {autoGempa.magnitude}</span>
                        <span className="text-xs text-slate-300">Kedalaman: <strong>{autoGempa.depth}</strong></span>
                        <span className="text-xs text-slate-400">Koordinat: <strong>{`${autoGempa.lat}, ${autoGempa.lng}`}</strong></span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{autoGempa.location}</h3>
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">{autoGempa.potential}</p>
                      {autoGempa.felt && (
                        <div className="mt-2 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl inline-block">
                          Dirasakan: {autoGempa.felt}
                        </div>
                      )}
                    </div>

                    {autoGempa.shakemapUrl && (
                      <a
                        href={autoGempa.shakemapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 self-start shrink-0 transition-all cursor-pointer"
                      >
                        <span>Buka Shakemap Peta Guncangan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* List of Recent Earthquakes */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Gempa Bumi M 5.0+ & Gempa Dirasakan Terkini (BMKG)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[...recentQuakes, ...feltQuakes].slice(0, 6).map((g, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-rose-500 font-mono">M {g.magnitude}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{g.date}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{g.location}</div>
                      <div className="text-[10px] text-slate-400">Kedalaman: {g.depth}</div>
                      {g.felt && <div className="text-[9px] text-amber-500 font-medium">Skala: {g.felt}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: USGS M2.5+ GLOBAL FEED */}
          {quakeSourceTab === 'usgs' && (
            <div className="space-y-4">
              {/* USGS Nearest Quake Banner */}
              {nearestUsgsQuake && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 border border-indigo-500/30 text-white shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      Gempa USGS Terdekat dari Titik Anda
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Jarak: <strong className="text-white">{nearestUsgsQuake.distanceKm} km</strong>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-indigo-400 font-mono">
                          M {typeof nearestUsgsQuake.quake.mag === 'number' ? nearestUsgsQuake.quake.mag : 0}
                        </span>
                        <span className="text-xs text-slate-300">
                          Kedalaman: <strong>{nearestUsgsQuake.quake.depth != null ? `${nearestUsgsQuake.quake.depth} km` : '—'}</strong>
                        </span>
                        <span className="text-xs text-slate-400">
                          Koordinat: <strong>{nearestUsgsQuake.quake.lat.toFixed(2)}°, {nearestUsgsQuake.quake.lng.toFixed(2)}°</strong>
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">
                        {nearestUsgsQuake.quake.place || nearestUsgsQuake.quake.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Waktu kejadian: {nearestUsgsQuake.quake.time ? new Date(nearestUsgsQuake.quake.time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'} WIB
                      </p>
                    </div>

                    {nearestUsgsQuake.quake.id && (
                      <a
                        href={`https://earthquake.usgs.gov/earthquakes/eventpage/${nearestUsgsQuake.quake.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 self-start shrink-0 transition-all cursor-pointer"
                      >
                        <span>Detail USGS</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* USGS Feed List */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Feed Gempa Bumi Global M 2.5+ (USGS Earthquake Hazards Program)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Diperbarui langsung dari API earthquake.usgs.gov setiap 5 menit
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {usgsQuakes.length} Gempa Terdata
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {usgsQuakes.slice(0, 15).map((q) => {
                    const distToUser = pusgenFaultService.calculateDistanceKm(lat, lng, q.lat, q.lng);
                    const magVal = typeof q.mag === 'number' ? q.mag : 0;
                    const depthVal = q.depth != null ? `${q.depth} km` : '—';
                    const timeStr = q.time ? new Date(q.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';
                    return (
                      <div key={q.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 hover:border-indigo-500/40 transition-all">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black font-mono px-1.5 py-0.2 rounded ${magVal >= 5.0 ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/20 text-indigo-500'}`}>
                            M {magVal}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {distToUser} km
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={q.place || q.name}>
                          {q.place || q.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/40 dark:border-slate-800 pt-1">
                          <span>Kedalaman: {depthVal}</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: PUSGEN 295 SESAR AKTIF TEKTONIK INDONESIA */}
          {quakeSourceTab === 'pusgen' && (
            <div className="space-y-4">
              {/* Nearest Active Fault Hero Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 text-white shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Sesar Aktif Terdekat dari Lokasi Anda (PuSGeN 2017 / SNI 1726)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                    nearestFault.hazardLevel === 'TINGGI'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : nearestFault.hazardLevel === 'SEDANG'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    Zona Bahaya: {nearestFault.hazardLevel}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-amber-400">
                        {nearestFault.fault.name}
                      </span>
                      <span className="text-xs text-slate-300">
                        Jarak: <strong className="text-white text-base">{nearestFault.distanceKm} km</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">
                      Segmen: <strong>{nearestFault.fault.segment}</strong> ({nearestFault.fault.region})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-xs text-slate-300">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 block">Laju Pergeseran (Slip Rate)</span>
                        <strong className="text-amber-400">{nearestFault.fault.slipRateMmYear} mm/tahun</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 block">Mekanisme Patahan</span>
                        <strong className="text-white">{nearestFault.fault.mechanism}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 block">Panjang Segmen</span>
                        <strong className="text-white">{nearestFault.fault.lengthKm} km</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 block">Potensi Magnitudo Mmax</span>
                        <strong className="text-rose-400 font-mono">M {nearestFault.fault.mMax}</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      {nearestFault.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Faults Catalog & Search */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Katalog 295 Sesar & Patahan Aktif Darat Indonesia (PuSGeN PUPR/ESDM)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Basis data resmi Peta Sumber dan Bahaya Gempa Indonesia Tahun 2017 (ISBN 978-602-5489-01-3)
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={faultSearchQuery}
                      onChange={(e) => setFaultSearchQuery(e.target.value)}
                      placeholder="Cari sesar (Lembang, Cimandiri, Palu...)"
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 w-64"
                    />
                  </div>
                </div>

                {/* Region Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['Semua', 'Jawa', 'Sumatera', 'Sulawesi', 'Bali-Nusa Tenggara', 'Papua'].map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setFaultRegionFilter(reg)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                        faultRegionFilter === reg
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>

                {/* Faults Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {allFaults.map((flt) => {
                    const dist = pusgenFaultService.calculateDistanceKm(lat, lng, flt.coordinates[0][1], flt.coordinates[0][0]);
                    return (
                      <div key={flt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 hover:border-amber-500/40 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {flt.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                            {dist} km
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{flt.segment}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                          <span>Slip: <strong>{flt.slipRateMmYear} mm/thn</strong></span>
                          <span>Tipe: <strong>{flt.mechanism}</strong></span>
                          <span>Mmax: <strong className="text-rose-500 font-mono">M {flt.mMax}</strong></span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{flt.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 7: LIGHTNING & POTENTIAL GEOPHYSICS */}
      {subModule === 'lightning_geophysics' && geophysics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-amber-500" />
              <span>Sambaran Petir Real-time (Lightning Detection Network)</span>
            </h3>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {geophysics.lightning.strikesCount1Hour} <span className="text-xs font-semibold text-slate-500">sambaran/jam</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                CG Negatif: {geophysics.lightning.breakdown.cloudToGroundNegative} | CG Positif: {geophysics.lightning.breakdown.cloudToGroundPositive} | Intra-Cloud: {geophysics.lightning.breakdown.intraCloud}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Zona Densitas Petir Tertinggi:</span>
              {geophysics.lightning.highDensityZones.map((z, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{z.area}</span>
                  <span className="font-bold text-amber-500">{z.density}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-500" />
              <span>Gaya Berat Bouguer & Magnet Bumi</span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Anomali Gaya Berat Bouguer:</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {geophysics.gravity.interpretation}
              </p>
              <div className="text-[10px] text-slate-400 pt-1">Rentang: {geophysics.gravity.anomalyRangeIndonesia}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Parameter Medan Magnet Bumi:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>Deklinasi: <strong>{geophysics.geomagnetism.magneticFieldParameters.declination}</strong></div>
                <div>Inklinasi: <strong>{geophysics.geomagnetism.magneticFieldParameters.inclination}</strong></div>
                <div>Intensitas: <strong>{geophysics.geomagnetism.magneticFieldParameters.totalIntensityNt} nT</strong></div>
                <div>Status Badai: <strong>{geophysics.geomagnetism.geomagneticStormStatus.split('(')[0]}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 8: TIME & ASTRONOMY */}
      {subModule === 'time_astronomy' && timeSun && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Tanda Waktu Atom Nasional Terkalibrasi BMKG</span>
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Barat (WIB):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wib}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Tengah (WITA):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wita}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Timur (WIT):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wit}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400">{timeSun.atomicTime.standard}</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Jadwal Matahari, Kulminasi & Posisi Hilal</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Terbit Matahari</span>
                <span className="font-bold text-amber-500">{timeSun.solarSchedule.terbit}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Terbenam Matahari</span>
                <span className="font-bold text-amber-600">{timeSun.solarSchedule.terbenam}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-300">Kulminasi Utama / Hari Tanpa Bayangan:</div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{timeSun.solarSchedule.kulminasiUtama}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Fase Bulan: <strong>{timeSun.astronomy.moonPhase}</strong> | Tinggi Hilal: <strong>{timeSun.astronomy.hilalHeightDegrees}°</strong> ({timeSun.astronomy.imkanurRukyatStatus})
            </div>
          </div>
        </div>
      )}

      {/* MODULE 9: ENGINEERING SEISMOLOGY */}
      {subModule === 'engineering_seismology' && microzonation && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Seismologi Teknik: Mikrozonasi Seismik & Spektral Percepatan SNI 1726</span>
            </h3>
            <span className="text-[10px] text-slate-400">{microzonation.method}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Frekuensi Alami (f₀)</span>
              <span className="text-base font-black text-indigo-500">{microzonation.parameters.f0Hz} Hz</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Resonansi 4–6 lantai</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Amplifikasi Tanah (A₀)</span>
              <span className="text-base font-black text-rose-500">{microzonation.parameters.amplificationFactorA0}×</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Relatif batuan dasar</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Indeks Kerentanan (Kg)</span>
              <span className="text-base font-black text-amber-500">{microzonation.parameters.seismicVulnerabilityIndexKg}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Kg = A₀² / f₀</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Kecepatan Geser (Vs30)</span>
              <span className="text-base font-black text-emerald-500">{microzonation.parameters.vs30EstimatedMs} m/s</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{microzonation.soilClassification}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Rekomendasi Rekayasa Struktur Tahan Gempa BMKG:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {microzonation.engineeringRecommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* MODULE 10: SATU PETA MKG & STORY MAPS */}
      {subModule === 'satu_peta_story' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {storyMaps.map((st) => (
              <button
                key={st.id}
                onClick={() => setActiveStoryId(st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeStoryId === st.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {st.title.split('&')[0]}
              </button>
            ))}
          </div>

          {activeStory && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {activeStory.category}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">{activeStory.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{activeStory.summary}</p>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/20 pl-6">
                {activeStory.timeline.map((step, idx) => (
                  <div key={idx} className="relative space-y-1 text-xs">
                    <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{step.phase}</span>
                      <span className="text-[10px] text-slate-400">({step.timestamp})</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">{step.description}</p>
                    <span className="text-[10px] font-mono text-slate-400 block">Fitur: {step.geospatialFeature}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Insight Analitik Kunci:</span>
                <ul className="space-y-1 text-xs text-slate-500">
                  {activeStory.keyInsights.map((ins, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
