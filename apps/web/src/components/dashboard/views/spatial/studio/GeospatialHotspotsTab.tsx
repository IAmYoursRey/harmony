import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Flame,
  Filter,
  Download,
  ExternalLink,
  ShieldAlert,
  Satellite,
  Layers,
  Sparkles,
  MapPin,
  RefreshCw,
  Info,
  Calendar,
  Globe,
  Radio,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { firmsService, HotspotRecord, HotspotAnalysisResult } from '../../../../../services/geospatial/firmsService';
import { aoiService, useActiveAOI } from '../../../../../services/geospatial/aoiService';
import { AnalysisEnvelope, DataStatus } from '../../../../../services/geospatial/types';
import { apiClient } from '@/services/apiClient';
import { GeospatialHotspotMapView } from './GeospatialHotspotMapView';

interface GeospatialHotspotsTabProps {
  lat: number;
  lng: number;
  regionName: string;
  onApplyFeaturesToMap?: (features: any[]) => void;
  refreshSignal?: number;
}

export const GeospatialHotspotsTab: React.FC<GeospatialHotspotsTabProps> = ({
  lat,
  lng,
  regionName,
  onApplyFeaturesToMap,
  refreshSignal,
}) => {
  const activeAOI = useActiveAOI();
  const [daysRange, setDaysRange] = useState<number>(1);
  const [minConfidence, setMinConfidence] = useState<'all' | 'nominal_high' | 'high_only'>('all');
  const [selectedSensor, setSelectedSensor] = useState<'ALL' | 'VIIRS' | 'MODIS'>('ALL');
  const [scope, setScope] = useState<'aoi' | 'java' | 'indonesia'>('indonesia');
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);

  // Operational satellite live mode (Zero-Fabrication principle: 100% real NASA EOSDIS LANCE feeds)
  const [customCsv, setCustomCsv] = useState<string>('');
  const [isUserUploaded, setIsUserUploaded] = useState<boolean>(false);
  const [appliedToMap, setAppliedToMap] = useState<boolean>(false);
  const [isLiveSource, setIsLiveSource] = useState(false);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [firmsMessage, setFirmsMessage] = useState('');
  const [liveMetadata, setLiveMetadata] = useState<{ status: DataStatus; cached: boolean; fetchedAt?: string; sourceAttempts?: Array<{ source: string; status: string }> } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(300);
  const requestRef = useRef<AbortController | null>(null);
  const liveSourceRef = useRef(false);

  const cancelFirmsRequest = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoadingFirms(false);
    setIsLiveSource(false);
    setLiveMetadata(null);
    liveSourceRef.current = false;
  };

  const handleClearUpload = () => {
    cancelFirmsRequest();
    setFirmsMessage('');
    setCustomCsv('');
    setIsUserUploaded(false);
    setSelectedHotspot(null);
    // Immediately return to live operational satellite feed
    handleLoadFirms(scope, false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      cancelFirmsRequest();
      setFirmsMessage('');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          setCustomCsv(text);
          setIsUserUploaded(true);
          setSelectedHotspot(null);
        }
      };
      reader.readAsText(file);
    }
  };

  // Geographic BBox centered around current focus point or active AOI
  const bbox: [number, number, number, number] = useMemo(() => {
    return activeAOI?.bbox ?? [Math.max(-180, lng - 1.5), Math.max(-90, lat - 1.5), Math.min(180, lng + 1.5), Math.min(90, lat + 1.5)];
  }, [lat, lng, activeAOI]);

  const effectiveBBox: [number, number, number, number] = useMemo(() => {
    if (scope === 'indonesia') return [95.0, -11.5, 141.0, 6.5];
    if (scope === 'java') return [105.0, -8.8, 114.6, -5.5];
    return bbox;
  }, [scope, bbox]);

  const effectiveAOI = useMemo(() => {
    if (scope === 'indonesia' || scope === 'java') return null;
    return activeAOI;
  }, [scope, activeAOI]);

  const handleLoadFirms = async (targetScope: 'aoi' | 'java' | 'indonesia' = scope, forceRefresh = false) => {
    cancelFirmsRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingFirms(true);
    setFirmsMessage('');
    if (!isUserUploaded) {
      setCustomCsv('');
    }
    setSelectedHotspot(null);
    try {
      const firmsSource = selectedSensor === 'MODIS' ? 'MODIS_NRT' : selectedSensor === 'VIIRS' ? 'VIIRS' : 'ALL';
      const queryParams: Record<string, string> = {
        bbox: bbox.join(','),
        dayRange: String(daysRange),
        source: firmsSource,
        scope: targetScope,
        minConfidence,
      };
      if (forceRefresh) {
        queryParams.force = 'true';
      }
      const query = new URLSearchParams(queryParams);

      // Access public open satellite feed directly without requiring private MAP_KEY
      const response = await apiClient.get<{
        success: boolean;
        rawCsv?: string;
        reason?: { message?: string; code?: string };
        error?: string;
        partial?: boolean;
        cached?: boolean;
        count?: number;
        totalMatched?: number;
        provenance?: { fetchedAt?: string; sensors?: string };
        sourceAttempts?: Array<{ source: string; status: string }>;
      }>(
        `/api/spatial/hotspots/public-feed?${query}`,
        { ttl: 0, signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (!response.success) {
        setFirmsMessage(response.reason?.message || response.error || 'Data satelit FIRMS belum tersedia.');
        return;
      }
      if (typeof response.rawCsv !== 'string' || !/latitude/i.test(response.rawCsv.split(/\r?\n/)[0]) || !/longitude/i.test(response.rawCsv.split(/\r?\n/)[0])) {
        throw new Error('Format data satelit FIRMS tidak sesuai.');
      }
      setCustomCsv(response.rawCsv);
      setLiveMetadata({
        status: response.partial ? 'PARTIAL' : response.cached ? 'CACHED' : 'LIVE',
        cached: response.cached === true,
        fetchedAt: response.provenance?.fetchedAt || new Date().toISOString(),
        sourceAttempts: response.sourceAttempts,
      });
      setIsLiveSource(true);
      liveSourceRef.current = true;
      setLastUpdated(new Date());
      setCountdownSeconds(300);
      const count = response.count ?? 0;
      const scopeLabel = targetScope === 'indonesia' ? 'Seluruh Indonesia' : targetScope === 'java' ? 'Pulau Jawa' : regionName;
      const cacheNote = response.cached ? ' (Cache Buffer NRT 5 Menit)' : ' (Satelit NASA Langsung)';
      setFirmsMessage(
        count > 0
          ? `NASA FIRMS LANCE: Berhasil memuat ${count} titik anomali termal aktif di ${scopeLabel} (${daysRange * 24} jam terakhir).${cacheNote}`
          : `NASA FIRMS LANCE: 0 anomali termal terdeteksi di ${scopeLabel} dalam ${daysRange * 24} jam terakhir. Area terpantau aman dan kondusif.`
      );
    } catch (error) {
      if (!controller.signal.aborted) setFirmsMessage(error instanceof Error ? error.message : 'Tidak dapat mengambil data satelit FIRMS.');
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setLoadingFirms(false); }
    }
  };

  // 1-second countdown ticker for transparent 5-minute auto-update cycle
  useEffect(() => {
    if (isUserUploaded) return;
    const ticker = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          handleLoadFirms(scope, false);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [scope, daysRange, selectedSensor, minConfidence, bbox, isUserUploaded]);

  // Initial load and auto-fetch on parameter/filter change
  useEffect(() => {
    if (isUserUploaded) return;
    handleLoadFirms(scope, false);
    setCountdownSeconds(300);
    return () => {
      requestRef.current?.abort();
    };
  }, [bbox, daysRange, selectedSensor, scope, minConfidence, isUserUploaded, refreshSignal]);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const analysisEnvelope: AnalysisEnvelope<HotspotAnalysisResult> = useMemo(() => {
    const source = isUserUploaded ? 'USER_CSV_IMPORT' : 'NASA_FIRMS';
    const envelope = firmsService.analyzeHotspots(customCsv, effectiveAOI, effectiveBBox, daysRange, minConfidence, source);
    if (isLiveSource && liveMetadata && envelope.processingState !== 'failed') {
      envelope.dataStatus = liveMetadata.status;
      envelope.provenance.dataStatus = liveMetadata.status;
      envelope.provenance.fetchedAt = liveMetadata.fetchedAt;
      envelope.provenance.quality = liveMetadata.sourceAttempts?.map(item => `${item.source}: ${item.status}`).join('; ');
    }
    return envelope;
  }, [customCsv, effectiveAOI, effectiveBBox, daysRange, minConfidence, isLiveSource, isUserUploaded, liveMetadata]);

  const data = analysisEnvelope.data;

  // Filtered list by sensor
  const displayedHotspots = useMemo(() => {
    if (!data?.hotspots) return [];
    if (selectedSensor === 'ALL') return data.hotspots;
    return data.hotspots.filter((h) => h.instrument === selectedSensor);
  }, [data, selectedSensor]);

  const handleApplyToMap = () => {
    if (!onApplyFeaturesToMap || !displayedHotspots.length) return;
    const features = displayedHotspots.map((h) => {
      const scanKm = h.scanKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
      const trackKm = h.trackKm ?? (h.instrument === 'VIIRS' ? 0.375 : 1.0);
      const latDeg = trackKm / 111.32;
      const lonDeg = scanKm / (111.32 * Math.max(0.15, Math.cos((h.latitude * Math.PI) / 180)));
      const halfLon = lonDeg / 2;
      const halfLat = latDeg / 2;

      return {
        type: 'Feature',
        id: h.id,
        properties: {
          layerType: 'hotspot',
          name: `Hotspot ${h.instrument} (${h.confidenceLevel.toUpperCase()})`,
          satellite: h.satellite,
          instrument: h.instrument,
          confidenceLevel: h.confidenceLevel,
          confidenceRaw: h.confidenceRaw,
          brightnessKelvin: h.brightnessKelvin,
          frpMw: h.frpMw,
          scanKm,
          trackKm,
          acqDate: h.acqDate,
          acqTimeUtc: h.acqTimeUtc,
          dayNight: h.dayNight,
          source: h.systemSource,
          isDemo: false,
          dataStatus: analysisEnvelope.dataStatus,
          color: h.confidenceLevel === 'high' ? '#ef4444' : h.confidenceLevel === 'nominal' ? '#f97316' : '#eab308',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [h.longitude - halfLon, h.latitude - halfLat],
            [h.longitude + halfLon, h.latitude - halfLat],
            [h.longitude + halfLon, h.latitude + halfLat],
            [h.longitude - halfLon, h.latitude + halfLat],
            [h.longitude - halfLon, h.latitude - halfLat],
          ]],
        },
      };
    });

    onApplyFeaturesToMap(features);
    setAppliedToMap(true);
    setTimeout(() => setAppliedToMap(false), 3000);
  };

  const handleExportGeoJSON = () => {
    if (!data) return;
    const geojson = {
      type: 'FeatureCollection',
      provenance: analysisEnvelope.provenance,
      features: displayedHotspots.map((h) => ({
        type: 'Feature',
        id: h.id,
        geometry: {
          type: 'Point',
          coordinates: [h.longitude, h.latitude],
        },
        properties: {
          satellite: h.satellite,
          instrument: h.instrument,
          confidenceLevel: h.confidenceLevel,
          confidenceRaw: h.confidenceRaw,
          brightnessKelvin: h.brightnessKelvin,
          frpMw: h.frpMw,
          acqDate: h.acqDate,
          acqTimeUtc: h.acqTimeUtc,
          dayNight: h.dayNight,
          source: h.systemSource,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_firms_hotspots_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!displayedHotspots.length) return;
    const headers = [
      'id',
      'latitude',
      'longitude',
      'satellite',
      'instrument',
      'confidenceLevel',
      'confidenceRaw',
      'brightnessKelvin',
      'frpMw',
      'acqDate',
      'acqTimeUtc',
      'dayNight',
    ];
    const rows = displayedHotspots.map((h) => [
      h.id,
      h.latitude,
      h.longitude,
      h.satellite,
      h.instrument,
      h.confidenceLevel,
      h.confidenceRaw,
      h.brightnessKelvin,
      h.frpMw ?? '',
      h.acqDate,
      h.acqTimeUtc,
      h.dayNight,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_firms_hotspots_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {analysisEnvelope.processingState === 'failed' && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{analysisEnvelope.reason?.message}</div>
      )}
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Deteksi Titik Panas Karhutla (NASA FIRMS & SiPongi)
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                NRT Satelit
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Anomali termal resolusi tinggi VIIRS 375m (Suomi-NPP / NOAA-20) & MODIS 1km
            </p>
          </div>
        </div>

        {/* Scope Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-rose-500/20 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setScope('aoi'); handleLoadFirms('aoi'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                scope === 'aoi'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>AOI ({regionName})</span>
            </button>
            <button
              type="button"
              onClick={() => { setScope('java'); handleLoadFirms('java'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                scope === 'java'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Pulau Jawa</span>
            </button>
            <button
              type="button"
              onClick={() => { setScope('indonesia'); handleLoadFirms('indonesia'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                scope === 'indonesia'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Seluruh Indonesia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time 5-Minute Auto-Sync Satellite Telemetry Bar */}
      {isUserUploaded ? (
        <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[10px] uppercase">
              CSV Kustom
            </span>
            <span>Menampilkan data anomali termal dari berkas CSV yang diunggah pengguna.</span>
          </div>
          <button
            onClick={handleClearUpload}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-900 dark:text-indigo-200 font-bold transition-colors cursor-pointer"
          >
            Kembali ke Satelit Live
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white tracking-wide">
                  Aliran Satelit Operasional NASA EOSDIS LANCE NRT
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                  100% Data Riil Terverifikasi
                </span>
                {liveMetadata?.cached && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    Buffer NRT 5 Menit
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                VIIRS 375m (Suomi-NPP & NOAA-20) • MODIS 1km (Terra & Aqua) • Siklus pembaruan otomatis setiap 5 menit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 text-[11px]">Sync Berikutnya:</span>
              <span className="font-bold text-emerald-400">{formatCountdown(countdownSeconds)}</span>
            </div>
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>Diperbarui:</span>
                <span className="text-slate-200 font-semibold">{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleLoadFirms(scope, true)}
              disabled={loadingFirms}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Ambil data satelit paling mutakhir dari NASA LANCE sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFirms ? 'animate-spin' : ''}`} />
              <span>{loadingFirms ? 'Menyinkronkan…' : 'Sync Sekarang'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter & Parameter Controls */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-500" /> Filter & Parameter Observasi
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih batas keyakinan, sensor satelit, dan rentang waktu deteksi
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => handleLoadFirms()} disabled={loadingFirms} className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingFirms ? 'animate-spin' : ''}`} />
              {loadingFirms ? 'Mengambil Data…' : 'Ambil Data FIRMS'}
            </button>
            {onApplyFeaturesToMap && displayedHotspots.length > 0 && (
              <button
                onClick={handleApplyToMap}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                {appliedToMap ? 'Tersinkron ke Peta!' : 'Tampilkan di Peta'}
              </button>
            )}

            <label className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors">
              <span>Unggah CSV</span>
              <input name="input_9b82f" id="geospatialhotspotstab-input_9b82f" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            {displayedHotspots.length > 0 && (
              <>
                <button
                  onClick={handleExportGeoJSON}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> GeoJSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </>
            )}
          </div>
        </div>

        {firmsMessage && <p role="status" className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-800 dark:text-sky-200">{firmsMessage}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Scope Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Cakupan Wilayah Satelit
            </label>
            <select
              name="satelliteScope"
              id="geospatialhotspotstab-satellitescope"
              value={scope}
              onChange={(e) => {
                const newScope = e.target.value as 'aoi' | 'java' | 'indonesia';
                setScope(newScope);
                handleLoadFirms(newScope);
              }}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="indonesia">Seluruh Indonesia (1.500+ Titik NRT)</option>
              <option value="aoi">Fokus AOI Setempat</option>
              <option value="java">Regional Pulau Jawa</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Ambang Keyakinan (Confidence)
            </label>
            <select name="minConfidence" id="geospatialhotspotstab-minconfidence"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Deteksi (Low, Nominal, High)</option>
              <option value="nominal_high">Nominal & Tinggi (Rekomendasi)</option>
              <option value="high_only">Hanya Keyakinan Tinggi (High / ≥ 80%)</option>
            </select>
          </div>

          {/* Sensor Select */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Sensor Satelit
            </label>
            <select name="selectedSensor" id="geospatialhotspotstab-selectedsensor"
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Semua Sensor (VIIRS 375m + MODIS 1km)</option>
              <option value="VIIRS">VIIRS 375m S-NPP / NOAA-20 / NOAA-21</option>
              <option value="MODIS">MODIS 1km Terra / Aqua</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Jendela Waktu Deteksi
            </label>
            <select name="daysRange" id="geospatialhotspotstab-daysrange"
              value={daysRange}
              onChange={(e) => setDaysRange(parseInt(e.target.value, 10))}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value={1}>24 Jam Terakhir</option>
              <option value={2}>48 Jam Terakhir</option>
              <option value={7}>7 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Satellite Hotspot Map */}
      <GeospatialHotspotMapView
        hotspots={displayedHotspots}
        activeAOI={activeAOI}
        effectiveBBox={effectiveBBox}
        lat={lat}
        lng={lng}
        regionName={scope === 'indonesia' ? 'Seluruh Indonesia' : scope === 'java' ? 'Pulau Jawa' : regionName}
        selectedHotspot={selectedHotspot}
        onSelectHotspot={(h) => setSelectedHotspot(h)}
        onApplyToMainMap={onApplyFeaturesToMap && displayedHotspots.length > 0 ? handleApplyToMap : undefined}
        appliedToMainMap={appliedToMap}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Deteksi</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {data && (customCsv || isLiveSource) ? data.totalDetections : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Piksel anomali termal</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Keyakinan Tinggi</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {data && (customCsv || isLiveSource) ? data.highConfidenceCount : '—'}
          </div>
          <span className="text-[10px] text-rose-500">Keyakinan deteksi tinggi; bukan tingkat risiko kebakaran</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">FRP Tertinggi</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {data?.maxFrpMw != null ? `${data?.maxFrpMw} MW` : '—'}
          </div>
          <span className="text-[10px] text-amber-500">Daya radiasi api (MW)</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter AOI</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {data && (customCsv || isLiveSource) ? data.filteredInAoi : '—'}
          </div>
          <span className="text-[10px] text-slate-500">
            {activeAOI ? 'Dalam batas AOI aktif' : 'Dalam BBox fokus'}
          </span>
        </div>
      </div>

      {/* SiPongi National Reference Notice */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
            <Info className="w-4 h-4 text-emerald-600" />
            Rujukan Resmi SiPongi KLHK Republik Indonesia
          </div>
          <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed">
            Data deteksi di atas bersumber dari NASA FIRMS (VIIRS 375m & MODIS 1km). Sistem SiPongi (Sistem Informasi Karhutla KLHK) adalah portal terpisah milik Kementerian Lingkungan Hidup dan Kehutanan RI.
          </p>
        </div>
        <a
          href="https://sipongi.menlhk.go.id"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Buka SiPongi</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hotspots Data Table */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Daftar Anomali Termal Terdeteksi ({displayedHotspots.length})
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {analysisEnvelope.provenance.crs} • {analysisEnvelope.provenance.algorithmVersion}
          </span>
        </div>

        {displayedHotspots.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {isLiveSource
                  ? `Nihil Titik Panas Karhutla di ${scope === 'indonesia' ? 'Seluruh Indonesia' : scope === 'java' ? 'Pulau Jawa' : regionName}`
                  : customCsv
                  ? 'Tidak ada deteksi yang cocok dengan kriteria filter'
                  : 'Sedang mengunduh data satelit NASA FIRMS…'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                {scope === 'aoi'
                  ? `Sensor satelit VIIRS (resolusi 375m) dan MODIS (1km) tidak mendeteksi adanya anomali termal/titik api aktif di ${regionName} dalam jendela observasi ${daysRange * 24} jam terakhir. Area terpantau aman dan kondusif. Pembaruan data satelit berlangsung otomatis setiap 5 menit.`
                  : `Tidak ada titik anomali termal dengan ambang keyakinan terpilih di ${scope === 'indonesia' ? 'Seluruh Indonesia' : 'Pulau Jawa'} pada orbit satelit ${daysRange * 24} jam terakhir.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              {scope === 'aoi' && (
                <button
                  type="button"
                  onClick={() => { setScope('indonesia'); handleLoadFirms('indonesia', false); }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Pantau Hotspot Seluruh Indonesia (Data Riil NRT)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleLoadFirms(scope, true)}
                disabled={loadingFirms}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFirms ? 'animate-spin' : ''}`} />
                <span>Periksa Ulang Satelit</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="p-2">Waktu (UTC)</th>
                  <th className="p-2">Satelit / Sensor</th>
                  <th className="p-2">Koordinat</th>
                  <th className="p-2">Suhu (K)</th>
                  <th className="p-2">FRP</th>
                  <th className="p-2">Keyakinan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedHotspots.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedHotspot(h)}
                    className={`cursor-pointer transition-colors ${
                      selectedHotspot?.id === h.id
                        ? 'bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-500/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                  <td className="p-2 font-mono">{h.acqDate} {h.acqTimeUtc}</td>
                  <td className="p-2">
                    <span className="font-semibold">{h.satellite}</span> ({h.instrument})
                  </td>
                  <td className="p-2 font-mono">
                    {h.latitude.toFixed(3)}°, {h.longitude.toFixed(3)}°
                  </td>
                  <td className="p-2 font-mono font-bold text-rose-600 dark:text-rose-400">
                    {h.brightnessKelvin} K
                  </td>
                  <td className="p-2 font-mono">
                    {h.frpMw !== null ? `${h.frpMw} MW` : '—'}
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.confidenceLevel === 'high'
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-500/25'
                          : h.confidenceLevel === 'nominal'
                          ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25'
                          : 'bg-slate-500/15 text-slate-600 border border-slate-500/25'
                      }`}
                    >
                      {h.confidenceLevel.toUpperCase()} {h.confidenceNumeric ? `(${h.confidenceNumeric}%)` : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};
