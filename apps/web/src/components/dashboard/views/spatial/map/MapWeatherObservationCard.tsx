import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudSun,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database,
} from 'lucide-react';
import {
  mapWeatherLiveService,
  MapWeatherState,
} from '@/services/geospatial/mapWeatherLiveService';
import {
  formatCountdown,
  getTimezoneInfo,
  MAP_REFRESH_INTERVAL_MS,
} from '@/services/geospatial/mapFreshnessEngine';

interface MapWeatherObservationCardProps {
  lat: number;
  lng: number;
  onOpenDetails?: () => void;
}

export const MapWeatherObservationCard: React.FC<MapWeatherObservationCardProps> = ({
  lat,
  lng,
}) => {
  const [weatherState, setWeatherState] = useState<MapWeatherState>(() =>
    mapWeatherLiveService.getState()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  // 1. Subscribe to Live Weather Service
  useEffect(() => {
    const unsubscribe = mapWeatherLiveService.subscribe((state: MapWeatherState) => {
      setWeatherState(state);
    });
    return unsubscribe;
  }, []);

  // 2. Initial Fetch & Coordinate Tracking
  useEffect(() => {
    // A failed fetch changes state, not coordinates. Do not trigger a new
    // request on every failure render; polling/manual refresh handles retries.
    void mapWeatherLiveService.fetchWeather(lat, lng, false);
  }, [lat, lng]);

  // 3. Automated 5-Minute Polling Lifecycle
  useEffect(() => {
    const timer = setInterval(() => {
      mapWeatherLiveService.fetchWeather(lat, lng, true);
    }, MAP_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [lat, lng]);

  // 4. Tab Visibility Change Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastFetch = weatherState.lastCheckedAt
          ? new Date(weatherState.lastCheckedAt).getTime()
          : 0;
        const elapsed = Date.now() - lastFetch;
        // If hidden for longer than 5 minutes, refresh immediately upon return
        if (elapsed >= MAP_REFRESH_INTERVAL_MS) {
          mapWeatherLiveService.fetchWeather(lat, lng, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lat, lng, weatherState.lastCheckedAt]);

  // 5. Local 1-Second Countdown Timer (No network requests)
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      if (!weatherState.nextRefreshAt) {
        setRemainingSeconds(300);
        return;
      }
      const targetTime = new Date(weatherState.nextRefreshAt).getTime();
      const remainingMs = Math.max(0, targetTime - Date.now());
      setRemainingSeconds(Math.ceil(remainingMs / 1000));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [weatherState.nextRefreshAt]);

  const data = weatherState.data;
  const freshness = weatherState.freshness;

  const tzInfo = useMemo(() => {
    return getTimezoneInfo(data?.providerTimezone, lng);
  }, [data?.providerTimezone, lng]);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (weatherState.isFetching) return;
    mapWeatherLiveService.fetchWeather(lat, lng, true);
  };

  const statusBadge = useMemo(() => {
    const status = freshness?.status || 'UNKNOWN_FRESHNESS';
    switch (status) {
      case 'CURRENT':
        return {
          label: '● TERKINI',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
        };
      case 'RECENT':
        return {
          label: '● BARU',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          dot: 'bg-sky-400',
        };
      case 'STALE':
        return {
          label: '● KEDALUWARSA',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
        };
      case 'CACHED':
        return {
          label: '● CACHED',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400',
        };
      case 'UNAVAILABLE':
        return {
          label: '● TIDAK TERSEDIA',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
        };
      default:
        return {
          label: '● TIDAK DIKETAHUI',
          bg: 'bg-slate-600/30 text-slate-300 border-slate-600/40',
          dot: 'bg-slate-400',
        };
    }
  }, [freshness?.status]);

  return (
    <div
      className="rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200 w-72 sm:w-80 select-none text-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
            <CloudSun className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-white block truncate">
              CUACA TERKINI
            </span>
            <span className="text-[9.5px] text-slate-300 block -mt-0.5 truncate font-medium">
              {tzInfo.abbr} • Siklus Peta 5 Menit
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${statusBadge.bg}`}
          >
            {statusBadge.label}
          </span>
          <button
            type="button"
            className="p-1 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle card"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 animate-in fade-in duration-150 text-white">
          {/* Temperature & Weather Condition */}
          <div className="flex items-baseline justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {data ? `${data.temperature.toFixed(1)}°C` : '--.-°C'}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {data ? data.weatherDesc : 'Memuat data atmosfer...'}
              </div>
            </div>
            {data && (
              <div className="text-right text-[10px] text-slate-300 space-y-0.5 font-medium">
                <div>Terasa: {data.apparentTemp.toFixed(1)}°C</div>
                <div>Lembap: {data.humidity}%</div>
              </div>
            )}
          </div>

          {/* Provenance & Time Metadata Table */}
          <div className="space-y-1.5 text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            {/* Tanggal Data */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Tanggal Data</span>
              <span className="font-semibold text-white text-right flex items-center gap-1.5">
                <span>{freshness ? freshness.formattedDate : '--'}</span>
                {freshness?.dateRecency === 'HARI_INI' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                    HARI INI
                  </span>
                )}
                {freshness?.dateRecency === 'KEMARIN' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    KEMARIN
                  </span>
                )}
                {freshness?.dateRecency === 'DATA_LAMA' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
                    DATA LAMA
                  </span>
                )}
              </span>
            </div>

            {/* Waktu Data */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Waktu Data</span>
              <span className="font-semibold text-white text-right font-mono text-[10.5px]">
                {freshness ? freshness.formattedTime : '--:--'}
              </span>
            </div>

            {/* Sumber Data */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span className="text-slate-300 font-medium">Sumber</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Database className="h-3 w-3 text-sky-400" />
                {data?.provider || 'Open-Meteo'}
              </span>
            </div>

            {/* Jenis Data */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Jenis Data</span>
              <span className="font-mono text-[10px] font-bold text-slate-200 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                {data?.classification || 'MODEL'}
              </span>
            </div>

            {/* Kesegaran Data */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Kesegaran Data</span>
              <span className={`font-bold text-[10px] ${statusBadge.bg} px-1.5 py-0.2 rounded border`}>
                {statusBadge.label}
              </span>
            </div>

            {/* Usia Data */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Usia Data</span>
              <span className="font-bold text-sky-400">
                {freshness?.ageMinutes !== null && freshness?.ageMinutes !== undefined
                  ? `${freshness.ageMinutes} menit`
                  : '-'}
              </span>
            </div>

            {/* Terakhir Diperiksa */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span className="text-slate-300 font-medium">Terakhir Diperiksa</span>
              <span className="font-semibold text-white text-right font-mono text-[10.5px]">
                {freshness ? freshness.formattedLastChecked : '--:--'}
              </span>
            </div>

            {/* Pengecekan Berikutnya */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Pengecekan Berikutnya</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">
                {formatCountdown(remainingSeconds * 1000)}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={weatherState.isFetching}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                weatherState.isFetching
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-95'
              }`}
              title="Perbarui Data Cuaca Sekarang"
            >
              <RefreshCw
                className={`h-3 w-3 ${weatherState.isFetching ? 'animate-spin' : ''}`}
              />
              <span>{weatherState.isFetching ? 'Memeriksa...' : 'Perbarui Data'}</span>
            </button>
          </div>

          {weatherState.error && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800/80">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{weatherState.error}. Menyajikan cache tersimpan.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
