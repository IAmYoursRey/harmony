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
  const [isWatchingGps, setIsWatchingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastCoordRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [isSimulatingWalk, setIsSimulatingWalk] = useState(false);
  const simIntervalRef = useRef<any>(null);
  const simStepRef = useRef<number>(0);

  const [position, setPosition] = useState<GNSSPositionState>(() => {
    const epsg3857 = geospatialAnalysisService.toEPSG3857(currentLat, currentLng);
    return {
      lat: currentLat,
      lng: currentLng,
      altitudeM: null,
      accuracyM: null,
      headingDeg: null,
      speedKmh: 0,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      epsg4326: `${currentLat.toFixed(6)}°, ${currentLng.toFixed(6)}°`,
      epsg3857,
      geoidHeightM: null,
      mode: 'SIMULATION',
      isLiveFix: false,
    };
  });

  const [isRecording, setIsRecording] = useState(false);
  const [trackPoints, setTrackPoints] = useState<GNSSTrackPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isConnectingGps, setIsConnectingGps] = useState(false);
  const timerRef = useRef<any>(null);
  const lastRecordedTimestampRef = useRef<number>(0);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const stopSimulationWalk = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatingWalk(false);
  };

  const toggleWatchGps = () => {
    stopSimulationWalk();
    if (isWatchingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatchingGps(false);
      setIsConnectingGps(false);
      setGpsError(null);
      lastCoordRef.current = null;
      if (isRecording) {
        setIsRecording(false);
      }
      return;
    }

    if (isConnectingGps) return;

    if (!('geolocation' in navigator)) {
      setGpsError('Browser Anda tidak mendukung Web Geolocation API.');
      return;
    }

    setGpsError(null);
    setIsConnectingGps(true);

    try {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setIsConnectingGps(false);
          setIsWatchingGps(true);
          const c = pos.coords;
          const nowMs = pos.timestamp || Date.now();
          const epsg3857 = geospatialAnalysisService.toEPSG3857(c.latitude, c.longitude);
          const altitudeM = c.altitude != null && Number.isFinite(c.altitude) ? Math.round(c.altitude) : null;
          const accuracyM = c.accuracy != null && Number.isFinite(c.accuracy) ? Math.round(c.accuracy * 10) / 10 : null;
          const rawHeading = c.heading != null && Number.isFinite(c.heading) ? Math.round(c.heading) : null;
          let effectiveHeading: number | null = rawHeading;

          let speedKmh: number | null = null;
          if (c.speed != null && Number.isFinite(c.speed)) {
            speedKmh = c.speed >= 0.35 ? Math.round(c.speed * 3.6 * 10) / 10 : 0;
          } else if (lastCoordRef.current) {
            const dtSec = Math.max(0.5, (nowMs - lastCoordRef.current.time) / 1000);
            const distKm = geospatialAnalysisService.calculateDistanceKm(
              lastCoordRef.current.lat,
              lastCoordRef.current.lng,
              c.latitude,
              c.longitude
            );
            const distMeters = distKm * 1000;
            const stationaryDeadband = Math.max(10.0, (accuracyM ?? 30) * 0.65);
            if (distMeters >= stationaryDeadband && dtSec < 60) {
              const rawSpeed = distKm / (dtSec / 3600);
              if (rawSpeed <= 120) {
                speedKmh = Math.round(rawSpeed * 10) / 10;
              } else {
                speedKmh = 0;
              }
            } else {
              speedKmh = 0;
            }

            if (effectiveHeading == null && distMeters >= 5.0) {
              const lat1Rad = (lastCoordRef.current.lat * Math.PI) / 180;
              const lat2Rad = (c.latitude * Math.PI) / 180;
              const dLngRad = ((c.longitude - lastCoordRef.current.lng) * Math.PI) / 180;
              const y = Math.sin(dLngRad) * Math.cos(lat2Rad);
              const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLngRad);
              effectiveHeading = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
            }
          }

          lastCoordRef.current = { lat: c.latitude, lng: c.longitude, time: nowMs };

          setPosition({
            lat: c.latitude,
            lng: c.longitude,
            altitudeM,
            accuracyM,
            headingDeg: effectiveHeading,
            speedKmh,
            timestamp: new Date(nowMs).toISOString(),
            epsg4326: `${c.latitude.toFixed(6)}°, ${c.longitude.toFixed(6)}°`,
            epsg3857,
            geoidHeightM: null,
            mode: 'DEVICE GNSS / BROWSER GEOLOCATION',
            isLiveFix: true,
          });

          if (isRecordingRef.current) {
            setTrackPoints((prev) => {
              const lastPt = prev[prev.length - 1];
              if (!lastPt) {
                if (accuracyM != null && accuracyM > 250) {
                  return prev;
                }
                lastRecordedTimestampRef.current = nowMs;
                return [
                  {
                    lat: c.latitude,
                    lng: c.longitude,
                    alt: altitudeM,
                    speedKmh: speedKmh ?? 0,
                    accuracyM,
                    time: nowMs,
                    source: 'DEVICE_GEOLOCATION',
                  },
                ];
              }

              const distKm = geospatialAnalysisService.calculateDistanceKm(
                lastPt.lat,
                lastPt.lng,
                c.latitude,
                c.longitude
              );
              const distMeters = distKm * 1000;
              const dtSec = Math.max(0.5, (nowMs - lastPt.time) / 1000);
              const computedSpeedKmh = distKm / (dtSec / 3600);
              const effectiveSpeed = (speedKmh != null && speedKmh > 0) ? speedKmh : computedSpeedKmh;

              // Discard impossible teleport jumps (>120 km/h or >300m in <10 seconds)
              if (computedSpeedKmh > 120 || (distMeters > 300 && dtSec < 10) || distKm > 1.0) {
                return prev;
              }

              // Stationary deadband filter: only record when user is genuinely moving past GPS uncertainty
              const deadbandThresholdMeters = Math.max(12.0, (accuracyM ?? 30) * 0.65);
              const isMoving = distMeters >= deadbandThresholdMeters && (effectiveSpeed >= 1.2 || (c.speed != null && c.speed >= 0.35));

              if (!isMoving) {
                return prev;
              }

              lastRecordedTimestampRef.current = nowMs;
              return [
                ...prev,
                {
                  lat: c.latitude,
                  lng: c.longitude,
                  alt: altitudeM,
                  speedKmh: Math.round(effectiveSpeed * 10) / 10,
                  accuracyM,
                  time: nowMs,
                  source: 'DEVICE_GEOLOCATION',
                },
              ];
            });
          }
        },
        (err) => {
          setIsConnectingGps(false);

          let msg = 'Gagal mengakses sensor lokasi perangkat.';
          if (err.code === 1) {
            msg = 'Izin akses lokasi ditolak oleh browser. Buka izin lokasi di pengaturan browser untuk melacak pergerakan nyata.';
            setIsWatchingGps(false);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            if (isRecordingRef.current) {
              setIsRecording(false);
            }
          } else if (err.code === 2) {
            msg = 'Sinyal satelit GNSS sementara tidak tersedia. Perangkat sedang mencoba menghubungkan kembali...';
          } else if (err.code === 3) {
            msg = 'Mencari sinyal GPS satelit baru (pastikan tidak berada di bawah kanopi beton tertutup)...';
          }

          setGpsError(msg);
        },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 1000 }
      );
    } catch (e: any) {
      setIsConnectingGps(false);
      setIsWatchingGps(false);
      setGpsError(e.message || 'Gagal memulai watchPosition.');
    }
  };

  useEffect(() => {
    return () => {
      stopSimulationWalk();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Update positioning when current coordinates change (only if not actively using device GPS)
  useEffect(() => {
    if (!isWatchingGps && !isSimulatingWalk) {
      const epsg3857 = geospatialAnalysisService.toEPSG3857(currentLat, currentLng);
      setPosition((prev) => ({
        ...prev,
        lat: currentLat,
        lng: currentLng,
        epsg4326: `${currentLat.toFixed(6)}°, ${currentLng.toFixed(6)}°`,
        epsg3857,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        mode: 'SIMULATION',
        isLiveFix: false,
      }));
    }
  }, [currentLat, currentLng, isWatchingGps, isSimulatingWalk]);

  // Track recording timer for elapsed seconds
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleSimulationWalk = () => {
    if (isSimulatingWalk) {
      stopSimulationWalk();
      return;
    }

    if (isWatchingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatchingGps(false);
    }

    setIsSimulatingWalk(true);
    setGpsError(null);
    simStepRef.current = 0;

    const centerLat = position.lat;
    const centerLng = position.lng;
    let currentAngle = 0;
    const radiusM = 35;
    const speedKmh = 3.6;

    if (!isRecording) {
      setIsRecording(true);
      setTrackPoints([]);
      setElapsedSeconds(0);
    }

    const nowMs = Date.now();
    lastRecordedTimestampRef.current = nowMs;
    lastCoordRef.current = { lat: centerLat, lng: centerLng, time: nowMs };

    setTrackPoints([
      {
        lat: centerLat,
        lng: centerLng,
        alt: 20,
        speedKmh: 0,
        accuracyM: 3.5,
        time: nowMs,
        source: 'SIMULATION',
      },
    ]);

    simIntervalRef.current = setInterval(() => {
      simStepRef.current += 1;
      currentAngle = (currentAngle + 15) % 360;
      const angleRad = (currentAngle * Math.PI) / 180;
      const dLat = (radiusM * Math.sin(angleRad)) / 111320;
      const dLng = (radiusM * Math.cos(angleRad)) / (111320 * Math.cos((centerLat * Math.PI) / 180));
      const newLat = centerLat + dLat;
      const newLng = centerLng + dLng;
      const stepTime = Date.now();
      const altitudeM = Math.round(20 + Math.sin(angleRad) * 2);
      const headingDeg = Math.round((currentAngle + 90) % 360);
      const epsg3857 = geospatialAnalysisService.toEPSG3857(newLat, newLng);

      setPosition({
        lat: newLat,
        lng: newLng,
        altitudeM,
        accuracyM: 3.5,
        headingDeg,
        speedKmh,
        timestamp: new Date(stepTime).toISOString(),
        epsg4326: `${newLat.toFixed(6)}°, ${newLng.toFixed(6)}°`,
        epsg3857,
        geoidHeightM: null,
        mode: 'SIMULATION',
        isLiveFix: false,
      });

      lastCoordRef.current = { lat: newLat, lng: newLng, time: stepTime };

      setTrackPoints((prev) => [
        ...prev,
        {
          lat: newLat,
          lng: newLng,
          alt: altitudeM,
          speedKmh,
          accuracyM: 3.5,
          time: stepTime,
          source: 'SIMULATION',
        },
      ]);
    }, 1500);
  };

  const handleStartRecording = () => {
    stopSimulationWalk();
    if (!isWatchingGps || !position.isLiveFix || (position.accuracyM != null && position.accuracyM > 250)) {
      if (!isWatchingGps) {
        toggleWatchGps();
      }
      setGpsError('Menghubungkan sensor GPS. Perekaman lintasan akan dimulai otomatis setelah sinyal satelit terkunci (< 250m)...');
      setTrackPoints([]);
      setElapsedSeconds(0);
      setIsRecording(true);
      return;
    }

    const fixTime = position.timestamp ? Date.parse(position.timestamp) : Date.now();
    const pointTime = Number.isFinite(fixTime) ? fixTime : Date.now();
    lastRecordedTimestampRef.current = pointTime;
    lastCoordRef.current = { lat: position.lat, lng: position.lng, time: pointTime };
    setTrackPoints([
      {
        lat: position.lat,
        lng: position.lng,
        alt: position.altitudeM,
        speedKmh: position.speedKmh ?? 0,
        accuracyM: position.accuracyM,
        time: pointTime,
        source: 'DEVICE_GEOLOCATION',
      },
    ]);
    setElapsedSeconds(0);
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopSimulationWalk();
  };

  const handleClearTrack = () => {
    stopSimulationWalk();
    setTrackPoints([]);
    setElapsedSeconds(0);
    lastCoordRef.current = null;
    lastRecordedTimestampRef.current = 0;
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

  const getExportTrackName = () => {
    return 'Harmony GNSS Real Field Survey Track';
  };

  const handleExportGeoJSON = () => {
    const trackName = getExportTrackName();
    const geojson = geospatialAnalysisService.exportTrackToGeoJSON(trackPoints, trackName);
    downloadFile(geojson, `harmony_gnss_track_${Date.now()}.geojson`, 'application/json');
  };

  const handleExportGPX = () => {
    const trackName = getExportTrackName();
    const gpx = geospatialAnalysisService.exportTrackToGPX(trackPoints, trackName);
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
                Datum WGS 84 / Referensi Geodesi
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Koordinat geodesi terproyeksi, altitude ortometrik, akurasi perkiraan posisi, dan perekaman trek geospasial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={toggleWatchGps}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isWatchingGps
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {isWatchingGps ? 'Matikan GPS Perangkat' : isConnectingGps ? 'Menghubungkan GPS...' : 'Gunakan GPS Perangkat'}
          </button>
          {isWatchingGps ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Geolokasi Browser Aktif (±{position.accuracyM ?? '—'}m)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200/70 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300 font-mono text-xs font-bold border border-slate-300 dark:border-slate-600">
              <MapPin className="w-3.5 h-3.5" /> Titik Peta Referensi (Klik &quot;Gunakan GPS Perangkat&quot; untuk Sensor Nyata)
            </span>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs">
          <strong>Perhatian Sensor GNSS:</strong> {gpsError}
        </div>
      )}

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

        {/* Accuracy & Instantaneous Speed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Akurasi & Kecepatan Instan</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {position.accuracyM != null ? `±${position.accuracyM}m` : '— (Titik Peta)'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {position.speedKmh != null && position.speedKmh > 0 ? `${position.speedKmh} km/h` : '0.0 km/h'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Azimuth: {position.headingDeg != null ? `${position.headingDeg}°` : '—'} • {isWatchingGps ? 'Sensor GPS aktif' : isSimulatingWalk ? 'Simulasi aktif' : 'Titik referensi'}
          </p>
        </div>

        {/* Altitude & Geoid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Ketinggian Ortometrik</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {position.altitudeM != null ? position.altitudeM : '—'}
            </span>
            <span className="text-xs text-slate-500 font-bold">m MSL</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {isWatchingGps ? 'Elevasi sensor perangkat' : 'Estimasi elevasi referensi'}
          </p>
        </div>
      </div>

      {/* Geodynamic & Tectonic GNSS Deformation Metrics (Standar Ilmu Kebumian & Geologi Geodinamika) */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-600/30 text-violet-400 border border-violet-500/40 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Taksonomi Variabel Fisik Geodinamika GNSS Geodetik &amp; Tektonik
              </h4>
              <p className="text-[11px] text-slate-400">
                Standar pengukuran geodinamika kerak bumi Badan Informasi Geospasial (BIG) &amp; Pusat Studi Gempa Nasional (PuSGeN)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 font-bold border border-violet-500/30 self-start sm:self-auto">
            ITRF2014 / Sunda Block Reference Frame
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Vektor Pergeseran Tektonik */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-violet-400 font-bold">1. Vektor Pergeseran Tektonik</span>
              <span className="text-[10px] font-mono bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                [dN, dE, dU]
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-white">
              Vektor 3D: ±25 - 72 mm/tahun
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Perpindahan stasiun geodesi kontinu (InaCORS) menghitung laju dan arah gerak blok litosfer Indonesia terhadap penunjaman Lempeng Indo-Australia.
            </p>
          </div>

          {/* 2. Laju Deformasi Lempeng */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400 font-bold">2. Laju Deformasi Lempeng</span>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                Deformation Rate
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-white">
              Relatif Sunda: ~5 - 18 mm/tahun
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mengukur diskontinuitas pergerakan relatif antar segmen sesar aktif (Sesar Semangko, Sesar Palu-Koro, Sesar Cimandiri, Sesar Opak).
            </p>
          </div>

          {/* 3. Akumulasi Regangan Tektonik */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold">3. Akumulasi Regangan Sesar</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                Tensor Strain Rate
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-white">
              Laju Regangan: 50 - 250 nstrain/th
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Memetakan defisit slip (*interseismic locking ratio*) dan konsentrasi tegangan elastis batuan untuk memperkirakan potensi magnitudo gempa bumi.
            </p>
          </div>
        </div>

        {/* Gravimetri Subsurface Integration Banner */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong className="text-emerald-300">Integrasi Gravimetri &amp; Mikrogravitasi:</strong> Pengukuran anomali gaya berat Bouguer (&mu;Gal), redistribusi massa air tanah terestrial (TWS cm EWH), dan intrusi kantung magma bawah permukaan (BPPTKG Merapi) dikombinasikan dengan GNSS untuk mitigasi deformasi vertikal dan amblesan tanah.
          </div>
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

          <div className="flex items-center gap-2 flex-wrap">
            {isRecording && (
              <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                (position.speedKmh ?? 0) >= 0.8
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  (position.speedKmh ?? 0) >= 0.8 ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`} />
                <span>
                  {(position.speedKmh ?? 0) >= 0.8
                    ? `Bergerak (${position.speedKmh} km/h)`
                    : 'Diam / Menunggu Gerak (0.0 km/h)'}
                </span>
              </span>
            )}
            {!isRecording ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleStartRecording()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Mulai Perekaman
                </button>
                <button
                  type="button"
                  onClick={handleToggleSimulationWalk}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-bold text-xs transition-all cursor-pointer"
                  title="Simulasikan lintasan survei berjalan (3.6 km/h) untuk menguji kalkulasi jarak dan perekaman waypoint"
                >
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isSimulatingWalk ? 'Hentikan Simulasi' : 'Uji Simulasi Lapangan'}</span>
                </button>
                {trackPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTrack}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    title="Hapus data rekaman lintasan dan reset ke nol"
                  >
                    <span>Reset</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all active:scale-95 animate-pulse cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" /> Hentikan ({formatTimer(elapsedSeconds)})
                </button>
                {isSimulatingWalk && (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Mode Simulasi Aktif
                  </span>
                )}
              </div>
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
              {calculateTotalTrackDistanceKm() < 1
                ? `${Math.round(calculateTotalTrackDistanceKm() * 1000)} m`
                : `${calculateTotalTrackDistanceKm().toFixed(3)} km`}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500">Kecepatan Rata-Rata</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {trackPoints.length > 1 && calculateTotalTrackDistanceKm() > 0.001 && elapsedSeconds > 0
                ? (calculateTotalTrackDistanceKm() / (elapsedSeconds / 3600)).toFixed(1)
                : '0.0'} km/h
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
