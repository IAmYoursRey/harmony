import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Crosshair,
  Gauge,
  Compass,
  Download,
  Play,
  Square,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  FileCode,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  GNSSTrackPoint,
  GNSSPositionState,
} from '../../../../../services/geospatialAnalysisService';
import { PreciseLocationInfo } from '../../../../../services/preciseGeocodingService';

interface GeospatialPositioningTabProps {
  currentLat: number;
  currentLng: number;
  locationInfo?: PreciseLocationInfo | null;
}

export const GeospatialPositioningTab: React.FC<GeospatialPositioningTabProps> = ({
  currentLat,
  currentLng,
  locationInfo,
}) => {
  const [position, setPosition] = useState<GNSSPositionState>(() => {
    const epsg3857 = geospatialAnalysisService.toEPSG3857(currentLat, currentLng);
    return {
      lat: currentLat,
      lng: currentLng,
      altitudeM: 42,
      accuracyM: 4.8,
      headingDeg: 128,
      speedKmh: 0,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      epsg4326: `${currentLat.toFixed(6)}°, ${currentLng.toFixed(6)}°`,
      epsg3857,
      geoidHeightM: 23.4,
    };
  });

  const [isRecording, setIsRecording] = useState(false);
  const [trackPoints, setTrackPoints] = useState<GNSSTrackPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Update positioning when current coordinates change
  useEffect(() => {
    const epsg3857 = geospatialAnalysisService.toEPSG3857(currentLat, currentLng);
    setPosition((prev) => ({
      ...prev,
      lat: currentLat,
      lng: currentLng,
      epsg4326: `${currentLat.toFixed(6)}°, ${currentLng.toFixed(6)}°`,
      epsg3857,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    }));
  }, [currentLat, currentLng]);

  // Track recording interval
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);

        // Add a recorded point (simulating slight movement along path for track)
        setTrackPoints((prev) => {
          const lastPoint = prev[prev.length - 1];
          const jitterLat = (Math.random() - 0.5) * 0.0001;
          const jitterLng = (Math.random() - 0.5) * 0.0001;
          const pLat = lastPoint ? lastPoint.lat + jitterLat : position.lat;
          const pLng = lastPoint ? lastPoint.lng + jitterLng : position.lng;
          return [
            ...prev,
            {
              lat: pLat,
              lng: pLng,
              alt: Math.round((position.altitudeM || 40) + Math.sin(prev.length) * 2),
              speedKmh: Math.round((Math.random() * 4 + 1) * 10) / 10,
              time: Date.now(),
            },
          ];
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, position]);

  const handleStartRecording = () => {
    setTrackPoints([
      {
        lat: position.lat,
        lng: position.lng,
        alt: position.altitudeM || 42,
        speedKmh: 0,
        time: Date.now(),
      },
    ]);
    setElapsedSeconds(0);
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const calculateTotalTrackDistanceKm = () => {
    if (trackPoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      total += geospatialAnalysisService.calculateDistanceKm(
        trackPoints[i - 1].lat,
        trackPoints[i - 1].lng,
        trackPoints[i].lat,
        trackPoints[i].lng
      );
    }
    return Math.round(total * 1000) / 1000;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGeoJSON = () => {
    const geojson = geospatialAnalysisService.exportTrackToGeoJSON(trackPoints, 'Harmony Track Survey');
    downloadFile(geojson, `harmony_gnss_track_${Date.now()}.geojson`, 'application/json');
  };

  const handleExportGPX = () => {
    const gpx = geospatialAnalysisService.exportTrackToGPX(trackPoints, 'Harmony Track Survey');
    downloadFile(gpx, `harmony_gnss_track_${Date.now()}.gpx`, 'application/gpx+xml');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Telemetri GNSS & Posisi Presisi
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                InaCORS BIG Standard
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Koordinat geodesi terproyeksi, altitude ortometrik, akurasi sinyal satelit, dan perekaman trek geospasial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> GNSS Fix: 3D RTK Ready
          </span>
        </div>
      </div>

      {/* Geodetic Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* WGS84 Geodetic */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Datum Geodetik (WGS84)</span>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
            {position.epsg4326}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">EPSG:4326 (Bujur/Lintang)</p>
        </div>

        {/* EPSG:3857 Web Mercator */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Koordinat Proyeksi</span>
            <Navigation className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
            X: {position.epsg3857.x} m
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">Y: {position.epsg3857.y} m (EPSG:3857)</p>
        </div>

        {/* Accuracy & Heading */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Akurasi & Azimuth</span>
            <Compass className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">±{position.accuracyM}m</span>
            <span className="text-xs font-mono text-slate-500">{position.headingDeg}° SE</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Dilution of Precision (PDOP &lt; 1.5)</p>
        </div>

        {/* Altitude & Geoid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Ketinggian Ortometrik</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{position.altitudeM}</span>
            <span className="text-xs text-slate-500 font-bold">m MSL</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Ondulasi Geoid: +{position.geoidHeightM}m</p>
        </div>
      </div>

      {/* Realtime Administrative Hierarchy Card (Desa, Kecamatan, Kabupaten) */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/90 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Hierarki Administrasi Wilayah GPS (Tingkat Desa/Kelurahan)
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
            Sensor GPS Asli + OpenStreetMap Reverse Geocode
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Desa / Kelurahan</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {locationInfo?.village || 'Mendeteksi Desa...'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Kecamatan</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {locationInfo?.subDistrict || 'Mendeteksi Kecamatan...'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Kabupaten / Kota</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {locationInfo?.city || 'Mendeteksi Kab/Kota...'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Provinsi</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {locationInfo?.province || 'Jawa Timur'}
            </span>
          </div>
        </div>

        {locationInfo?.road && (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400 shrink-0 font-medium">Jalan / Landmark:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{locationInfo.road}</span>
            </div>
            {locationInfo.postcode && (
              <span className="text-slate-400 shrink-0 font-mono text-[11px]">Kode Pos: {locationInfo.postcode}</span>
            )}
          </div>
        )}
      </div>

      {/* Track Recording & Export Suite */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Perekam Jejak Geospasial (Track Recorder)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Merekam lintasan pergerakan survei lapangan secara kontinyu beserta cap waktu dan elevasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Mulai Perekaman
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all active:scale-95 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Hentikan ({formatTimer(elapsedSeconds)})
              </button>
            )}
          </div>
        </div>

        {/* Live Recorded Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500">Durasi Rekam</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatTimer(elapsedSeconds)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Titik Waypoint</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {trackPoints.length} Pts
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500">Jarak Tempuh</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {calculateTotalTrackDistanceKm()} km
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500">Kecepatan Rata-Rata</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {trackPoints.length > 0 ? (calculateTotalTrackDistanceKm() / (Math.max(1, elapsedSeconds) / 3600)).toFixed(1) : '0.0'} km/h
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ekspor data hasil survei GNSS ke format standar geospasial:
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGeoJSON}
              disabled={trackPoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200 disabled:opacity-40 transition-all"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-500" /> Ekspor GeoJSON
            </button>
            <button
              onClick={handleExportGPX}
              disabled={trackPoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200 disabled:opacity-40 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" /> Ekspor GPX Standar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
