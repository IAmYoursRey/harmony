import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Clock, 
  Activity, 
  Brain, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Info,
  Maximize2
} from "lucide-react";
import { apiClient } from "@/services/apiClient";

interface SchoolRiskSynthesisCardProps {
  schoolId?: string | number | null;
  schoolName?: string;
  lat: number;
  lng: number;
  onOpenScenarioModal: () => void;
  onSwitchToExpertMode?: () => void;
}

export function SchoolRiskSynthesisCard({
  schoolId,
  schoolName = "Sekolah Pilihan",
  lat,
  lng,
  onOpenScenarioModal,
  onSwitchToExpertMode,
}: SchoolRiskSynthesisCardProps) {
  const [synthesis, setSynthesis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const query = schoolId ? `schoolId=${schoolId}` : `lat=${lat}&lng=${lng}&name=${encodeURIComponent(schoolName)}`;
    
    apiClient
      .get(`/api/spatial/school-risk-synthesis?${query}`)
      .then((res: any) => {
        if (isMounted && res.data?.data) {
          setSynthesis(res.data.data);
        }
      })
      .catch((err) => {
        console.warn("Could not load school risk synthesis:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [schoolId, lat, lng, schoolName]);

  const gm = synthesis?.seismicSynthesis;
  const leadTime = gm?.leadTimeSec;
  const pgaG = gm?.pgaG;
  const intensity = gm?.humanDescription?.intensity ?? "Kondisi Stabil";
  const actionRule = gm?.humanDescription?.actionRule ?? "Jauhi kaca dan ikuti jalur evakuasi bila terasa getaran.";
  const statusLevel = synthesis?.overallStatus ?? "AMAN";
  const hasActiveEvent = Boolean(gm && statusLevel !== "AMAN");
  const displaySchoolName = schoolName?.trim() || "Sekolah Terpilih";
  const isDanger = statusLevel.includes("BAHAYA");
  const isWarning = statusLevel.includes("WASPADA");

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl transition-all dark:border-slate-800 dark:bg-slate-900/95 sm:max-w-md">
      {/* Header Kartu */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
              isDanger
                ? "bg-rose-500 shadow-rose-500/25"
                : isWarning
                ? "bg-amber-500 shadow-amber-500/25"
                : "bg-emerald-500 shadow-emerald-500/25"
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="h-5 w-5" />
            ) : isWarning ? (
              <Flame className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Analisis Risiko Nyata
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                  isDanger
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    : isWarning
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                {statusLevel}
              </span>
            </div>
            <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
              {displaySchoolName}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={isMinimized ? "Buka kartu" : "Tutup kartu"}
        >
          {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!isMinimized && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-xs text-slate-500">
              <Activity className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
              Menghitung redaman rambatan gelombang & topografi...
            </div>
          ) : (
            <>
              {hasActiveEvent ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3 text-indigo-500" />
                      Estimasi Waktu
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        {leadTime ?? "--"}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        detik
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <Activity className="h-3 w-3 text-amber-500" />
                      Skala Getaran
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {pgaG != null ? `${pgaG}g` : "--"}
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        MMI {gm?.mmiEstimate ?? "-"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-slate-500 dark:text-slate-400">
                      {intensity}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Status wilayah aman. Tidak ada guncangan signifikan terdeteksi saat ini.
                </p>
              )}

              {/* Aturan Aksi Ringkas */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-2.5 text-left dark:border-indigo-900/40 dark:bg-indigo-950/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {actionRule}
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={onOpenScenarioModal}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
                >
                  <Brain className="h-4 w-4" />
                  Latihan Evakuasi 10 Detik
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {onSwitchToExpertMode && (
                  <button
                    onClick={onSwitchToExpertMode}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Buka Mode Analitik GIS
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
