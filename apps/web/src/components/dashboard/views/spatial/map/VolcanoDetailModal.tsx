import React, { useState } from 'react';
import { X, Flame, ShieldAlert, Mountain, Clock, History, AlertTriangle, Compass, MapPin, ExternalLink } from 'lucide-react';
import type { VolcanoLiveStatus } from '@/services/volcanoService';

interface VolcanoDetailModalProps {
  volcano: VolcanoLiveStatus | null;
  onClose: () => void;
  onFocusOnMap?: (coords: [number, number], zoom?: number) => void;
}

export const VolcanoDetailModal: React.FC<VolcanoDetailModalProps> = ({
  volcano,
  onClose,
  onFocusOnMap,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'geology' | 'eruptions'>('status');

  if (!volcano) return null;

  const isLevel4 = volcano.levelCode === 4;
  const isLevel3 = volcano.levelCode === 3;
  const isLevel2 = volcano.levelCode === 2;
  const isLevel1 = volcano.levelCode === 1;
  const isInactive = volcano.levelCode === 0 || !volcano.isGeologicallyActive;

  const badgeColor = isLevel4
    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    : isLevel3
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : isLevel2
    ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
    : isLevel1
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';

  const dotColor = isLevel4
    ? 'bg-rose-500 animate-ping'
    : isLevel3
    ? 'bg-amber-500 animate-pulse'
    : isLevel2
    ? 'bg-yellow-500'
    : isLevel1
    ? 'bg-emerald-500'
    : 'bg-slate-500';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isLevel4 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' :
              isLevel3 ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
              isInactive ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' :
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              {isInactive ? <Mountain className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  {volcano.level}
                </span>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                  {volcano.volcanoClassification}
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                  ⛰️ {volcano.elevation.toLocaleString('id-ID')} mdpl
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {volcano.name}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{volcano.province || 'Indonesia'}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {volcano.lat.toFixed(4)}°, {volcano.lng.toFixed(4)}°
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 bg-slate-50/60 dark:bg-slate-900/60 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Status & Pengamatan PVMBG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geology')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'geology'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Pembentukan & Geologi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('eruptions')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'eruptions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Letusan ({volcano.eruptionHistory?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Danger Radius Alert */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                isLevel4 ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200' :
                isLevel3 ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' :
                isLevel2 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-900 dark:text-yellow-200' :
                'bg-slate-500/10 border-slate-500/20 text-slate-800 dark:text-slate-300'
              }`}>
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-0.5">
                    Zona Bahaya & Rekomendasi Steril
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    {volcano.dangerRadiusKm > 0
                      ? `Radius bahaya steril ditetapkan sebesar ${volcano.dangerRadiusKm} km dari kawah puncak. Seluruh aktivitas pariwisata dan penambangan di dalam radius dilarang.`
                      : 'Gunung api dalam status padam / tidak aktif. Tidak ada zona bahaya erupsi saat ini.'}
                  </p>
                </div>
              </div>

              {/* Visual and Seismicity summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Pengamatan Visual Terkini</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                    {volcano.visualSummary || 'Visual asap kawah terpantau stabil dalam batas pengamatan.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Aktivitas Kegempaan (Seismik)</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                    {volcano.seismicitySummary || 'Kegempaan vulkanik dalam batas latar belakang normal.'}
                  </p>
                </div>
              </div>

              {/* Recommendations list */}
              {volcano.recommendations && volcano.recommendations.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-2">
                  <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300">
                    Protokol Keselamatan PVMBG / Badan Geologi:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    {volcano.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Latest eruption quick badge */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Letusan Terakhir:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {volcano.latestEruption}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'geology' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Kapan Gunung Terbentuk?</span>
                </div>
                <p className="text-slate-900 dark:text-white font-medium text-xs leading-relaxed">
                  {volcano.formationEra}
                </p>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  Usia Geologis Estimasi: <strong className="text-slate-700 dark:text-slate-300">{volcano.geologicalAge}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tatanan Tektonik</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {volcano.tectonicSetting}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Morfologi & Struktur</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {volcano.geologicalStructure}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kawah Puncak</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {volcano.craterName || 'Kawah Utama'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Elevasi & Relief</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {volcano.elevation} mdpl {volcano.prominence ? `(Prominence ~${volcano.prominence}m)` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eruptions' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status Letusan Terkini:</span>
                  <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400">{volcano.latestEruption}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                  {volcano.volcanoClassification}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Kronologi Erupsi Bersejarah:
                </h4>

                {volcano.eruptionHistory && volcano.eruptionHistory.length > 0 ? (
                  <div className="space-y-2">
                    {volcano.eruptionHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 transition-colors flex items-start gap-3"
                      >
                        <div className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-black text-xs shrink-0">
                          {item.year < 0 ? `${Math.abs(item.year)} SM` : item.year}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            {item.vei != null && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                Skala VEI {item.vei}
                              </span>
                            )}
                            {item.duration && (
                              <span className="text-[9.5px] text-slate-400">
                                Durasi: {item.duration}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-snug">
                            {item.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                    Tidak ada catatan letusan eksplosif dalam sejarah modern (Gunung api purba / masa tidur panjang).
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[10px] text-slate-400">
            Sumber Data: <strong className="text-slate-600 dark:text-slate-300">{volcano.source}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onFocusOnMap && (
              <button
                type="button"
                onClick={() => {
                  onFocusOnMap([volcano.lng, volcano.lat], 13);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Pusatkan di Peta</span>
              </button>
            )}

            {volcano.magmaWebUrl && (
              <a
                href={volcano.magmaWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>MAGMA ESDM</span>
                <ExternalLink className="w-3 h-3" />
              </a>
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
