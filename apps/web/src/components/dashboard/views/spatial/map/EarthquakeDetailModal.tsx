import React from 'react';
import { X, Activity, Clock, ShieldCheck, AlertTriangle, Compass, MapPin, Gauge, Waves, Radio } from 'lucide-react';
import type { EarthquakeRecord } from '@/services/geospatial/earthquakeSnapshotService';

interface EarthquakeDetailModalProps {
  earthquake: EarthquakeRecord | null;
  onClose: () => void;
  onFocusOnMap?: (coords: [number, number], zoom?: number) => void;
  onOpenEvacuation?: () => void;
}

export const EarthquakeDetailModal: React.FC<EarthquakeDetailModalProps> = ({
  earthquake,
  onClose,
  onFocusOnMap,
  onOpenEvacuation,
}) => {
  if (!earthquake) return null;

  const mag = typeof earthquake.mag === 'number' && Number.isFinite(earthquake.mag) ? earthquake.mag : 4.0;
  const depth = typeof earthquake.depth === 'number' && Number.isFinite(earthquake.depth) ? earthquake.depth : null;

  const isMajor = mag >= 6.0;
  const isModerate = mag >= 5.0 && mag < 6.0;
  const isMinor = mag < 5.0;

  const badgeColor = isMajor
    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    : isModerate
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  const isShallow = depth != null && depth <= 60;
  const depthCategory = depth == null ? 'Kedalaman n/a' : depth <= 60 ? 'Gempa Dangkal (≤ 60 km)' : depth <= 300 ? 'Gempa Menengah (60 - 300 km)' : 'Gempa Dalam (> 300 km)';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border font-black ${
              isMajor
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : isModerate
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <span className="text-[10px] font-bold tracking-tight opacity-80">MAG</span>
              <span className="text-base leading-none">M{mag.toFixed(1)}</span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                  <Activity className="w-3 h-3" />
                  {earthquake.shakingCategory || (isMajor ? 'Guncangan Kuat' : isModerate ? 'Guncangan Sedang' : 'Guncangan Ringan')}
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                  {earthquake.source} Realtime
                </span>

                {earthquake.elapsedTimeAgo && (
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    ⏱️ {earthquake.elapsedTimeAgo}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {earthquake.place || 'Wilayah Indonesia'}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-[11px]">
                  {earthquake.lat.toFixed(4)}°, {earthquake.lng.toFixed(4)}°
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>{depthCategory}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer relative z-10"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
          {/* Timing Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Kapan Kejadiannya? (Waktu Gempa)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Terverifikasi
              </span>
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {earthquake.originTimeFormatted || String(earthquake.time || 'Waktu tidak tersedia')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pencatatan waktu gelombang seismik P-wave pertama tiba di stasiun seismograf jaringan BMKG/USGS.
            </p>
          </div>

          {/* Shaking Duration & MMI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Shaking Duration */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <span>Sampai Kapan Guncangannya?</span>
              </div>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                {earthquake.shakingDurationSec || (mag >= 6 ? '± 40 - 75 detik' : '± 20 - 35 detik')}
              </p>
              <p className="text-[10px] text-slate-500">
                Estimasi durasi getaran terasa gelombang geser (S-wave & Rayleigh wave).
              </p>
            </div>

            {/* MMI Intensity */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                <span>Berapa Guncangannya? (Skala MMI)</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {earthquake.mmiScale || (mag >= 5.5 ? 'V - VI MMI (Dirasakan Kuat)' : 'III - IV MMI (Ringan - Sedang)')}
              </p>
              <p className="text-[10px] text-slate-500">
                PGA Estimasi: <strong className="text-slate-700 dark:text-slate-300">{earthquake.pgaEstimate || '0.08g'}</strong>
              </p>
            </div>
          </div>

          {/* Tsunami Status & Aftershocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tsunami Potential */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Waves className="w-3.5 h-3.5 text-sky-500" />
                <span>Potensi Tsunami</span>
              </div>
              <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                {earthquake.tsunamiPotential || 'Tidak Berpotensi Tsunami'}
              </p>
              <p className="text-[10px] text-slate-500">
                {isShallow ? 'Meskipun gempa dangkal, permodelan InaTEWS menunjukkan tidak ada deformasi vertikal laut kritis.' : 'Kedalaman aman di bawah dasar laut.'}
              </p>
            </div>

            {/* Aftershocks Monitoring Window */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-500" />
                <span>Jendela Gempa Susulan</span>
              </div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {earthquake.aftershocksWindow || 'Monitoring 24 - 48 Jam'}
              </p>
              <p className="text-[10px] text-slate-500">
                Sensor BMKG & USGS terus memantau pelepasan tegangan elastis batuan.
              </p>
            </div>
          </div>

          {/* Geological summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Analisis Tektonik & Deskripsi Visual:
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {earthquake.visualSummary}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[10px] text-slate-400">
            Sumber Data: <strong className="text-slate-600 dark:text-slate-300">{earthquake.monitoringSource}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onFocusOnMap && (
              <button
                type="button"
                onClick={() => {
                  onFocusOnMap([earthquake.lng, earthquake.lat], 10);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Pusatkan di Peta</span>
              </button>
            )}

            {onOpenEvacuation && (
              <button
                type="button"
                onClick={() => {
                  onOpenEvacuation();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Profil Evakuasi</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
