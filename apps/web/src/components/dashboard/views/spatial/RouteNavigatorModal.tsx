import React, { useState, useEffect } from 'react';
import {
  X,
  Navigation,
  MapPin,
  Compass,
  AlertTriangle,
  ShieldCheck,
  Send,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Crosshair,
  Clock,
  Search,
  Loader2,
} from 'lucide-react';
import { routingService, RouteResult } from '../../../../services/routingService';
import { preciseGeocodingService, LocationSearchResult } from '../../../../services/preciseGeocodingService';
import { askRouteCopilotAI } from '../../../../services/geminiService';

interface RouteNavigatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: { lat: number; lng: number } | null;
  onApplyRoute: (route: RouteResult) => void;
  onClearRoute: () => void;
  activeRoute: RouteResult | null;
  schools: any[];
  isPickingOnMap?: boolean;
  onTogglePickOnMap?: (active: boolean) => void;
  pickedCoords?: { lat: number; lng: number; label: string } | null;
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const RouteNavigatorModal: React.FC<RouteNavigatorModalProps> = ({
  isOpen,
  onClose,
  userCoords,
  onApplyRoute,
  onClearRoute,
  activeRoute,
  schools = [],
  isPickingOnMap = false,
  onTogglePickOnMap,
  pickedCoords = null,
}) => {
  const [destinationQuery, setDestinationQuery] = useState('');
  const [selectedDestCoords, setSelectedDestCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(activeRoute);
  
  // Geocoding and auto-suggest state
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showTimelineExpanded, setShowTimelineExpanded] = useState(false);

  // AI Chat Copilot
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    {
      role: 'ai',
      text: 'Halo! Saya AI Route & Weather Copilot. Saya siap menelusuri rute Anda, memprediksi jam perjalanan di tiap segmen, mengevaluasi cuaca realtime, dan memberikan rekomendasi keselamatan.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sync picked coordinate from Map click
  useEffect(() => {
    if (pickedCoords) {
      setSelectedDestCoords(pickedCoords);
      setDestinationQuery(pickedCoords.label);
      setSearchResults([]);
    }
  }, [pickedCoords]);

  // Sync active route from props
  useEffect(() => {
    if (activeRoute) {
      setRouteResult(activeRoute);
    }
  }, [activeRoute]);

  // Debounced multi-source geocoding search (Google Maps style)
  useEffect(() => {
    const trimmed = destinationQuery.trim();
    if (!trimmed || trimmed.length < 2 || selectedDestCoords) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        // 1. Search coordinates, reference Indonesian cities/districts, and OSM Nominatim
        const geoResults = await preciseGeocodingService.searchLocations(trimmed, userCoords);

        // 2. Search school catalog
        const matchedSchools: LocationSearchResult[] = (schools || [])
          .filter((s) => s[4]?.toLowerCase().includes(trimmed.toLowerCase()))
          .slice(0, 4)
          .map((s) => {
            const dist = userCoords
              ? calculateHaversine(userCoords.lat, userCoords.lng, s[1], s[2])
              : undefined;
            return {
              id: `school-${s[0]}`,
              label: s[4],
              shortDisplay: `${s[4]} (Katalog Sekolah)`,
              lat: s[1],
              lng: s[2],
              type: 'school',
              distanceKm: dist !== undefined ? parseFloat(dist.toFixed(1)) : undefined,
            };
          });

        // Merge & deduplicate
        const combined = [...geoResults];
        matchedSchools.forEach((sch) => {
          if (!combined.some((c) => Math.abs(c.lat - sch.lat) < 0.003 && Math.abs(c.lng - sch.lng) < 0.003)) {
            combined.push(sch);
          }
        });

        if (userCoords) {
          combined.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        }

        setSearchResults(combined.slice(0, 7));
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [destinationQuery, userCoords, selectedDestCoords, schools]);

  if (!isOpen) return null;

  const handleSelectLocation = (loc: LocationSearchResult) => {
    setSelectedDestCoords({
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
    });
    setDestinationQuery(loc.label);
    setSearchResults([]);
  };

  const handleCalculateRoute = async () => {
    if (!userCoords) {
      alert('Lokasi pengguna belum terdeteksi. Silakan klik tombol Find GPS terlebih dahulu.');
      return;
    }
    if (!selectedDestCoords) {
      alert('Pilih tujuan terlebih dahulu atau klik titik di peta.');
      return;
    }

    setIsCalculating(true);
    try {
      const res = await routingService.calculateRoute(
        { lat: userCoords.lat, lng: userCoords.lng, label: 'Lokasi Anda' },
        selectedDestCoords
      );
      setRouteResult(res);
      onApplyRoute(res);

      // Call AI Copilot for path tracing and time prediction
      setIsAiThinking(true);
      try {
        const aiBriefing = await askRouteCopilotAI({
          route: res,
          userQuery: 'Berikan evaluasi kelayakan rute, penelusuran tahapan perjalanan per jam, dan kesimpulan kesiapan berangkat.',
        });
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: aiBriefing,
          },
        ]);
      } catch (aiErr) {
        const scoreText = res.safetyScore !== null ? ` (${res.safetyScore}/100)` : '';
        const speedText = res.recommendedSpeedKmh !== null ? ` Kecepatan saran: ${res.recommendedSpeedKmh} km/jam.` : '';
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `Rute ke ${res.destination.label} berhasil dikalkulasi! Jarak: ${res.distanceKm} km (~${res.durationText}). Status Keamanan: ${res.safetyLevel}${scoreText}.${speedText} ${res.weatherRiskSummary}`,
          },
        ]);
      } finally {
        setIsAiThinking(false);
      }
    } catch (err) {
      console.error('Failed to calculate route', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSendQuery = async () => {
    if (!inputQuery.trim()) return;
    const userQ = inputQuery.trim();
    setInputQuery('');

    const nextMessages = [...chatMessages, { role: 'user' as const, text: userQ }];
    setChatMessages(nextMessages);
    setIsAiThinking(true);

    try {
      const aiAns = await askRouteCopilotAI({
        route: routeResult,
        userQuery: userQ,
        chatHistory: nextMessages,
      });
      setChatMessages((prev) => [...prev, { role: 'ai', text: aiAns }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: routeResult
            ? `Asisten Navigasi (${routeResult.destination.label}): Estimasi durasi ${routeResult.durationText} (${routeResult.distanceKm} km). Status keamanan: ${routeResult.safetyLevel}. ${routeResult.weatherRiskSummary}`
            : 'Silakan tentukan rute perjalanan terlebih dahulu untuk analisis geospasial mendalam.',
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-[9980] w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] flex flex-col rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-500/30">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              AI Route & Weather Copilot
            </h3>
            <p className="text-[10px] text-slate-500">Navigasi jalan raya, meteorologi & analisis waktu</p>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          title="Tutup Navigasi & Rute"
          aria-label="Tutup Navigasi & Rute"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Origin / User Location */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 text-xs">
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Titik Asal</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
              {userCoords ? `Lokasi GPS Anda (${userCoords.lat.toFixed(3)}°, ${userCoords.lng.toFixed(3)}°)` : 'Mencari sinyal GPS...'}
            </span>
          </div>
        </div>

        {/* Destination Input with Google Maps style search & Pick on Map button */}
        <div className="relative">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            <Compass className="w-4 h-4 text-indigo-500 shrink-0 ml-1" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Titik Tujuan</span>
              <input
                id="route-destination-query-input"
                name="destinationQuery"
                type="text"
                value={destinationQuery}
                onChange={(e) => {
                  setDestinationQuery(e.target.value);
                  setSelectedDestCoords(null);
                }}
                placeholder="Cari kota, alamat, sekolah, atau koordinat..."
                className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 placeholder:font-normal text-xs"
              />
            </div>

            {isSearching && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />}

            {/* Tombol Pilih Titik di Peta (Google Maps style) */}
            <button
              type="button"
              onClick={() => onTogglePickOnMap?.(!isPickingOnMap)}
              title="Pilih titik koordinat langsung di peta"
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                isPickingOnMap
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{isPickingOnMap ? 'Batal' : 'Peta'}</span>
            </button>
          </div>

          {/* Mode Pilih di Peta Alert Banner */}
          {isPickingOnMap && (
            <div className="mt-2 p-2 rounded-xl bg-gradient-to-r from-indigo-500/15 to-sky-500/15 border border-indigo-400/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-in fade-in">
              <Crosshair className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              <div className="leading-tight">
                <strong className="block font-bold">Mode Klik Peta Aktif</strong>
                <span className="text-[10px] opacity-90">Klik di mana saja pada peta untuk menentukan titik tujuan secara presisi.</span>
              </div>
            </div>
          )}

          {/* Multi-source Auto-suggest Dropdown */}
          {searchResults.length > 0 && !selectedDestCoords && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-56 overflow-y-auto">
              {searchResults.map((loc) => {
                const badgeColor =
                  loc.type === 'coordinate'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : loc.type === 'city'
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                    : loc.type === 'district'
                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                    : loc.type === 'school'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20';

                const badgeLabel =
                  loc.type === 'coordinate'
                    ? 'KOORDINAT'
                    : loc.type === 'city'
                    ? 'KOTA'
                    : loc.type === 'district'
                    ? 'KECAMATAN'
                    : loc.type === 'school'
                    ? 'SEKOLAH'
                    : 'TEMPAT';

                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase border ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                        <span className="font-semibold truncate">{loc.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">{loc.shortDisplay}</span>
                    </div>

                    {loc.distanceKm !== undefined && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold shrink-0">
                        {loc.distanceKm} km
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button: Calculate */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCalculateRoute}
            disabled={isCalculating || !selectedDestCoords}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:brightness-110 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Navigation className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Menelusuri Rute & Cuaca...' : 'Cari Rute & Prediksi'}</span>
          </button>

          {routeResult && (
            <button
              onClick={() => {
                setRouteResult(null);
                setSelectedDestCoords(null);
                setDestinationQuery('');
                onClearRoute();
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              title="Hapus Rute"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Route Result Card */}
        {routeResult && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 animate-in fade-in duration-300">
            {/* Skenario Rute Evakuasi Geologi Masif (Jika Dijalankan dari Pusat Risiko) */}
            {(routeResult as any).evacuationPlan && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🚨</span>
                    <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-300">
                      {(routeResult as any).evacuationPlan.scenarioTitle}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    Evakuasi Sekolah
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-rose-200/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Titik Kumpul Aman (TES/TEA)</span>
                    <strong className="text-slate-800 dark:text-slate-100 truncate block">
                      {(routeResult as any).evacuationPlan.safeAssemblyPoint.name}
                    </strong>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Elevasi: +{(routeResult as any).evacuationPlan.safeAssemblyPoint.elevationM} mdpl
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-rose-200/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Estimasi Waktu Evakuasi</span>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span>🚶 Kaki:</span>
                      <span className="text-rose-600 font-mono">~{(routeResult as any).evacuationPlan.walkDurationMin} menit</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>🚗 Armada:</span>
                      <span className="font-mono">~{(routeResult as any).evacuationPlan.vehicleDurationMin} menit</span>
                    </div>
                  </div>
                </div>

                {/* Aturan Penghindaran Bahaya */}
                {(routeResult as any).evacuationPlan.hazardAvoidanceRecommendations?.length > 0 && (
                  <div className="text-[10.5px] p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 text-rose-800 dark:text-rose-200 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      ⚠️ Protokol Jalur Evakuasi Aman:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] opacity-90">
                      {(routeResult as any).evacuationPlan.hazardAvoidanceRecommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {routeResult.distanceKm} km
                </span>
                <span className="text-xs text-slate-500">({routeResult.durationText})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                  routeResult.routeMode === 'ROAD_NETWORK'
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {routeResult.routeMode === 'ROAD_NETWORK' ? 'OSRM Aspal Nyata' : 'Garis Geodesi'}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                  routeResult.safetyLevel === 'Sangat Aman'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : routeResult.safetyLevel === 'Cukup Aman'
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                    : routeResult.safetyLevel === 'Waspada'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : routeResult.safetyLevel === 'Bahaya'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                }`}>
                  <ShieldCheck className="w-3 h-3" /> {routeResult.safetyLevel}
                </span>
              </div>
            </div>

            {/* Prediksi Pukul Keberangkatan & Estimasi Tiba (ETA) */}
            {routeResult.departureTimeText && routeResult.arrivalTimeText && (
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" /> Jam Berangkat
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {routeResult.departureTimeText}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" /> Estimasi Tiba (ETA)
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    {routeResult.arrivalTimeText}
                  </span>
                </div>
              </div>
            )}

            {/* Expandable Tahapan Waktu & Cuaca Koridor Jalan */}
            {routeResult.timelineStages && routeResult.timelineStages.length > 0 && (
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTimelineExpanded(!showTimelineExpanded)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Penelusuran Tahapan Jalan & Pukul
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    {routeResult.timelineStages.length} segmen
                    {showTimelineExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                </button>

                {showTimelineExpanded && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 animate-in fade-in max-h-40 overflow-y-auto pr-1">
                    {routeResult.timelineStages.map((stage, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 text-[10.5px] border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
                          <span>{stage.title}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">{stage.estimatedHour}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>KM {stage.milestoneKm} • {stage.weatherSummary}</span>
                        </div>
                        <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {stage.roadCondition}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Estimasi Emisi Karbon Perjalanan */}
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1">🍃 Estimasi Emisi ({routeResult.distanceKm} km):</span>
                <span className="text-emerald-600 font-mono">
                  {((routeResult.distanceKm * 170.5) / 1000).toFixed(2)} kg CO₂e
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Motor: {((routeResult.distanceKm * 103.1) / 1000).toFixed(2)} kg</span>
                <span>Bus: {((routeResult.distanceKm * 28.4) / 1000).toFixed(2)} kg</span>
                <span className="text-emerald-500 font-semibold">Sepeda: 0 kg</span>
              </div>
            </div>

            {/* Weather Risk */}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Kondisi Cuaca & Jalan: </span>
              {routeResult.weatherRiskSummary}
            </div>

            {routeResult.volcanoHazardSummary && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{routeResult.volcanoHazardSummary}</span>
              </div>
            )}

            {/* AI Advice list */}
            {routeResult.aiAdvice?.length > 0 && (
              <div className="space-y-1 text-[11px] text-slate-500">
                {routeResult.aiAdvice.map((adv, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-indigo-500">•</span>
                    <span>{adv}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Chat Copilot Section */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Tanya AI Seputar Lokasi & Cuaca
            </span>
            {isAiThinking && (
              <span className="text-[9.5px] text-indigo-500 animate-pulse flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Menelusuri jalur...
              </span>
            )}
          </span>

          <div className="max-h-40 overflow-y-auto space-y-2 mb-2 p-1 no-scrollbar">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`text-xs p-2.5 rounded-2xl leading-relaxed whitespace-pre-line ${
                  m.role === 'ai'
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    : 'bg-indigo-600 text-white ml-6 font-medium shadow-sm'
                }`}
              >
                {m.text}
              </div>
            ))}
            {isAiThinking && (
              <div className="text-xs p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>AI sedang menelusuri data jalan & prakiraan jam perjalanan...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              id="route-ai-query-input"
              name="routeAiQuery"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleSendQuery()}
              placeholder="Tanya kelayakan jam berangkat, cuaca, atau kondisi jalan..."
              disabled={isAiThinking}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              onClick={handleSendQuery}
              disabled={isAiThinking || !inputQuery.trim()}
              className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
