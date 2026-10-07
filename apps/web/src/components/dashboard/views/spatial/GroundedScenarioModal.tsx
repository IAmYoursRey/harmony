import React, { useState, useEffect } from "react";
import { 
  X, 
  Brain, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Boxes
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useNavigate } from "react-router-dom";

interface GroundedScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string | number | null;
  schoolName?: string;
  lat: number;
  lng: number;
}

export function GroundedScenarioModal({
  isOpen,
  onClose,
  schoolId,
  schoolName = "Sekolah Pilihan",
  lat,
  lng,
}: GroundedScenarioModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [scenario, setScenario] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(15);

  const fetchScenario = () => {
    setLoading(true);
    setSelectedOption(null);
    setIsAnswered(false);

    apiClient
      .post("/api/ai/grounded-scenario", {
        schoolId,
        schoolName,
        lat,
        lng,
        floorLevel: 2,
      })
      .then((res: any) => {
        if (res.data?.scenario) {
          setScenario(res.data.scenario);
          setCountdown(res.data.scenario.leadTimeSeconds || 14);
        }
      })
      .catch((err) => {
        console.error("Grounded scenario error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchScenario();
    }
  }, [isOpen, schoolId, lat, lng]);

  // Countdown timer simulasi tekanan waktu reaksi
  useEffect(() => {
    if (!isOpen || isAnswered || loading || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isAnswered, loading, countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Latihan Keputusan Berbasis Sains
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Fisika Spasial Real-Time
                </span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {scenario?.title || `Skenario Mitigasi: ${schoolName}`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Menghitung rambatan gelombang seismik & waktu lead-time sekolah...
              </p>
              <p className="text-xs text-slate-400">
                Sains empiris GMPE + Topografi tapak
              </p>
            </div>
          ) : scenario ? (
            <>
              {/* Baris Status Tekanan & Timer */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-center dark:border-indigo-950 dark:bg-indigo-950/40">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Lead Time Peringatan
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <Clock className={`h-4 w-4 ${countdown <= 5 ? "animate-pulse text-rose-500" : "text-indigo-600"}`} />
                    <span className={`text-xl font-black ${countdown <= 5 ? "text-rose-600" : "text-indigo-600 dark:text-indigo-400"}`}>
                      {countdown}s
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-center dark:border-amber-950 dark:bg-amber-950/40">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Intensitas Guncangan
                  </span>
                  <div className="mt-1 text-xl font-black text-amber-700 dark:text-amber-400">
                    {scenario.pgaG}g
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-center dark:border-rose-950 dark:bg-rose-950/40">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Skala MMI Lokal
                  </span>
                  <div className="mt-1 text-xl font-black text-rose-700 dark:text-rose-400">
                    MMI {scenario.mmi}
                  </div>
                </div>
              </div>

              {/* Skenario Nyata */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Situasi Lapangan di Gedung Sekolah:
                </span>
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                  {scenario.situation}
                </p>
              </div>

              {/* Pertanyaan Dilema */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {scenario.question}
                </h3>

                <div className="mt-3 space-y-2.5">
                  {scenario.options?.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === scenario.correctIndex;
                    let btnStyle = "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/80";

                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                      } else {
                        btnStyle = "border-slate-200 opacity-60 dark:border-slate-800";
                      }
                    } else if (isSelected) {
                      btnStyle = "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswered}
                        onClick={() => {
                          setSelectedOption(idx);
                          setIsAnswered(true);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold transition-all ${btnStyle}`}
                      >
                        <span className="flex-1 pr-3">{opt}</span>
                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pembahasan Ilmiah Pasca-Jawaban */}
              {isAnswered && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 animate-in fade-in duration-300 dark:border-indigo-900/60 dark:bg-indigo-950/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-300">
                      Rasional Sains & Prosedur SOP:
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    {scenario.scientificRationale}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              Gagal memuat skenario. Silakan coba lagi.
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            onClick={fetchScenario}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Skenario Baru
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate("/app/digital-twin");
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Boxes className="h-3.5 w-3.5" />
              Uji di Digital Twin Denah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
