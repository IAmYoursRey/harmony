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
} from 'lucide-react';
import { firmsService, HotspotRecord, HotspotAnalysisResult } from '../../../../../services/geospatial/firmsService';
import { aoiService, useActiveAOI } from '../../../../../services/geospatial/aoiService';
import { AnalysisEnvelope, DataStatus } from '../../../../../services/geospatial/types';
import { apiClient } from '@/services/apiClient';

interface GeospatialHotspotsTabProps {
  lat: number;
  lng: number;
  regionName: string;
  onApplyFeaturesToMap?: (features: any[]) => void;
  refreshSignal?: number;
}

// Explicit demonstration CSV; not verified current observations.
const SAMPLE_FIRMS_INDONESIA_CSV = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-0.4521,101.4285,342.5,0.38,0.38,2026-10-01,0635,N,VIIRS,nominal,2.0NRT,298.2,14.8,D
-0.4610,101.4420,358.1,0.38,0.38,2026-10-01,0635,N,VIIRS,high,2.0NRT,301.4,28.5,D
-0.4750,101.4110,329.0,0.39,0.38,2026-10-01,0635,N,VIIRS,low,2.0NRT,295.0,6.2,D
-2.2150,113.9100,345.8,0.38,0.38,2026-10-01,0712,20,VIIRS,high,2.0NRT,299.7,21.3,D
-2.2300,113.9350,336.2,0.38,0.38,2026-10-01,0712,20,VIIRS,nominal,2.0NRT,296.8,11.0,D
-1.3500,103.5800,328.4,1.1,1.0,2026-10-01,0415,T,MODIS,65,6.1NRT,293.1,18.4,D
-1.3650,103.5950,338.9,1.1,1.0,2026-10-01,0415,T,MODIS,85,6.1NRT,297.5,34.2,D
-7.2600,112.7500,324.5,0.38,0.38,2026-10-01,0635,N,VIIRS,low,2.0NRT,294.0,4.5,D`;

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
  // Default to empty for live mode (Zero-Fabrication principle). Demo mode requires explicit user activation.
  const [customCsv, setCustomCsv] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isUserUploaded, setIsUserUploaded] = useState<boolean>(false);
  const [appliedToMap, setAppliedToMap] = useState<boolean>(false);
  const [isLiveSource, setIsLiveSource] = useState(false);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [firmsMessage, setFirmsMessage] = useState('');
  const [liveMetadata, setLiveMetadata] = useState<{ status: DataStatus; cached: boolean; fetchedAt?: string; sourceAttempts?: Array<{ source: string; status: string }> } | null>(null);
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

  const handleLoadDemo = () => {
    cancelFirmsRequest();
    setFirmsMessage('');
    setCustomCsv(SAMPLE_FIRMS_INDONESIA_CSV);
    setIsDemoMode(true);
    setIsUserUploaded(false);
  };

  const handleClearData = () => {
    cancelFirmsRequest();
    setFirmsMessage('');
    setCustomCsv('');
    setIsDemoMode(false);
    setIsUserUploaded(false);
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
          setIsDemoMode(false);
          setIsUserUploaded(true);
        }
      };
      reader.readAsText(file);
    }
  };

  // Geographic BBox centered around current focus point or active AOI
  const bbox: [number, number, number, number] = useMemo(() => {
    return activeAOI?.bbox ?? [Math.max(-180, lng - 1.5), Math.max(-90, lat - 1.5), Math.min(180, lng + 1.5), Math.min(90, lat + 1.5)];
  }, [lat, lng, activeAOI]);

  const handleLoadFirms = async () => {
    cancelFirmsRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingFirms(true);
    setFirmsMessage('');
    setCustomCsv('');
    setIsDemoMode(false);
    setIsUserUploaded(false);
    try {
      const firmsSource = selectedSensor === 'MODIS' ? 'MODIS_NRT' : selectedSensor === 'VIIRS' ? 'VIIRS' : 'ALL';
      const queryParams: Record<string, string> = {
        bbox: bbox.join(','),
        dayRange: String(daysRange),
        source: firmsSource,
      };
      const query = new URLSearchParams(queryParams);

      const response = await apiClient.get<{ success: boolean; rawCsv?: string; reason?: { message?: string }; error?: string; partial?: boolean; cached?: boolean; count?: number; provenance?: { fetchedAt?: string }; sourceAttempts?: Array<{ source: string; status: string }> }>(
        `/api/spatial/hotspots?${query}`,
        { ttl: 0, signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (!response.success) {
        setFirmsMessage(response.reason?.message || response.error || 'Data FIRMS belum tersedia.');
        return;
      }
      if (typeof response.rawCsv !== 'string' || !/latitude/i.test(response.rawCsv.split(/\r?\n/)[0]) || !/longitude/i.test(response.rawCsv.split(/\r?\n/)[0])) {
        throw new Error('Format data FIRMS tidak sesuai. Coba lagi atau gunakan impor CSV.');
      }
      setCustomCsv(response.rawCsv);
      setLiveMetadata({ status: response.partial ? 'PARTIAL' : response.cached ? 'CACHED' : 'LIVE', cached: response.cached === true, fetchedAt: response.provenance?.fetchedAt, sourceAttempts: response.sourceAttempts });
      setIsLiveSource(true);
      liveSourceRef.current = true;
      const partialNote = response.partial ? ' Sebagian sumber atau baris gagal; hasil ini belum mencakup semua permintaan.' : '';
      const cacheNote = response.cached ? ' Memakai respons cache sesuai wilayah dan waktu yang diminta.' : '';
      setFirmsMessage(`FIRMS: ${response.count ?? 0} deteksi valid dalam ${daysRange * 24} jam terakhir.${partialNote}${cacheNote}`);
    } catch (error) {
      if (!controller.signal.aborted) setFirmsMessage(error instanceof Error ? error.message : 'Tidak dapat mengambil data FIRMS.');
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setLoadingFirms(false); }
    }
  };

  // Auto-fetch on mount / filter change and continuous polling every 5 minutes
  useEffect(() => {
    if (isDemoMode || isUserUploaded) return;
    handleLoadFirms();
    const intervalTimer = setInterval(() => {
      handleLoadFirms();
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(intervalTimer);
      requestRef.current?.abort();
    };
  }, [bbox, daysRange, selectedSensor, isDemoMode, isUserUploaded, refreshSignal]);

  const analysisEnvelope: AnalysisEnvelope<HotspotAnalysisResult> = useMemo(() => {
    const source = isDemoMode
      ? 'DEMO'
      : isLiveSource
      ? 'NASA_FIRMS'
      : isUserUploaded
      ? 'USER_CSV_IMPORT'
      : 'NASA_FIRMS';
    const envelope = firmsService.analyzeHotspots(customCsv, activeAOI, bbox, daysRange, minConfidence, source);
    if (isLiveSource && liveMetadata && envelope.processingState !== 'failed') {
      // A verified empty feed differs from an unrequested feed; retain partial/cache status.
      envelope.dataStatus = liveMetadata.status;
      envelope.provenance.dataStatus = liveMetadata.status;
      envelope.provenance.fetchedAt = liveMetadata.fetchedAt;
      envelope.provenance.quality = liveMetadata.sourceAttempts?.map(item => `${item.source}: ${item.status}`).join('; ');
    }
    return envelope;
  }, [customCsv, activeAOI, bbox, daysRange, minConfidence, isDemoMode, isLiveSource, isUserUploaded, liveMetadata]);

  const data = analysisEnvelope.data;

  // Filtered list by sensor
  const displayedHotspots = useMemo(() => {
    if (!data?.hotspots) return [];
    if (selectedSensor === 'ALL') return data.hotspots;
    return data.hotspots.filter((h) => h.instrument === selectedSensor);
  }, [data, selectedSensor]);

  const handleApplyToMap = () => {
    if (!onApplyFeaturesToMap || !displayedHotspots.length) return;
    const features = displayedHotspots.map((h) => ({
      type: 'Feature',
      id: h.id,
      properties: {
        layerType: 'hotspot',
        name: `${isDemoMode ? 'Demo — ' : ''}Hotspot ${h.instrument} (${h.confidenceLevel.toUpperCase()})`,
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
        isDemo: isDemoMode,
        dataStatus: analysisEnvelope.dataStatus,
        color: h.confidenceLevel === 'high' ? '#ef4444' : h.confidenceLevel === 'nominal' ? '#f97316' : '#eab308',
      },
      geometry: {
        type: 'Point',
        coordinates: [h.longitude, h.latitude],
      },
    }));

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

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>Fokus: <strong>{regionName}</strong></span>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] uppercase">
              Mode Demonstrasi
            </span>
            <span>Menggunakan dataset simulasi 8 sampel FIRMS untuk evaluasi visual antarmuka (Bukan deteksi satelit operasional live).</span>
          </div>
          <button
            onClick={handleClearData}
            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-900 dark:text-amber-200 font-bold transition-colors"
          >
            Hapus Demo
          </button>
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
            <button type="button" onClick={handleLoadFirms} disabled={loadingFirms} className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
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

            {!isDemoMode && displayedHotspots.length === 0 && (
              <button
                onClick={handleLoadDemo}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Muat Contoh Demo
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Deteksi</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {data && (customCsv || isLiveSource || isDemoMode) ? data.totalDetections : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Piksel anomali termal</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Keyakinan Tinggi</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {data && (customCsv || isLiveSource || isDemoMode) ? data.highConfidenceCount : '—'}
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
            {data && (customCsv || isLiveSource || isDemoMode) ? data.filteredInAoi : '—'}
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
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isLiveSource ? 'Tidak ada deteksi pada data FIRMS yang dimuat' : customCsv ? 'Tidak ada deteksi yang cocok dengan filter' : 'Data titik panas belum dimuat'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Ambil data FIRMS melalui server, unggah CSV, atau pilih dataset demonstrasi. Akses FIRMS memerlukan konfigurasi kunci FIRMS pada server.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleLoadDemo}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Muat Dataset Demonstrasi
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
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
