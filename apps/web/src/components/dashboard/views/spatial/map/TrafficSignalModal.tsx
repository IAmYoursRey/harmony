import React, { useState, useEffect } from 'react';
import { X, Clock, ShieldCheck, Activity, Users, Radio } from 'lucide-react';
import { TrafficSignalIntersection, computeLiveSignalState } from '@/services/trafficSignalsService';

interface TrafficSignalModalProps {
  signalId: string | null;
  onClose: () => void;
}

export const TrafficSignalModal: React.FC<TrafficSignalModalProps> = ({ signalId, onClose }) => {
  const [signal, setSignal] = useState<TrafficSignalIntersection | null>(null);

  useEffect(() => {
    if (!signalId) return;

    const updateSignal = () => {
      const all = computeLiveSignalState(Date.now());
      const found = all.find((s) => s.id === signalId);
      if (found) setSignal(found);
    };

    updateSignal();
    const interval = setInterval(updateSignal, 1000);
    return () => clearInterval(interval);
  }, [signalId]);

  if (!signal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl text-white flex flex-col"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
              <span className="text-base">🚦</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-white block truncate">
                {signal.name}
              </span>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {signal.city} • {signal.intersectionType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Tutup Lampu Merah"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Traffic Light Physical Console Simulation */}
        <div className="p-5 flex flex-col items-center bg-slate-950/60 border-b border-slate-800">
          {/* Signal Housing */}
          <div className="relative flex flex-col items-center gap-3 p-3 rounded-2xl bg-slate-950 border-2 border-slate-700 shadow-2xl">
            {/* RED LIGHT */}
            <div 
              className={`h-12 w-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                signal.currentPhase === 'RED'
                  ? 'bg-red-500 border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-pulse'
                  : 'bg-red-950/40 border-red-900/50 opacity-40'
              }`}
            >
              {signal.currentPhase === 'RED' && (
                <span className="font-mono text-xs font-black text-white">
                  {signal.remainingSec}s
                </span>
              )}
            </div>

            {/* YELLOW LIGHT */}
            <div 
              className={`h-12 w-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                signal.currentPhase === 'YELLOW'
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse'
                  : 'bg-amber-950/40 border-amber-900/50 opacity-40'
              }`}
            >
              {signal.currentPhase === 'YELLOW' && (
                <span className="font-mono text-xs font-black text-slate-950">
                  {signal.remainingSec}s
                </span>
              )}
            </div>

            {/* GREEN LIGHT */}
            <div 
              className={`h-12 w-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                signal.currentPhase === 'GREEN'
                  ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.9)] animate-pulse'
                  : 'bg-emerald-950/40 border-emerald-900/50 opacity-40'
              }`}
            >
              {signal.currentPhase === 'GREEN' && (
                <span className="font-mono text-xs font-black text-white">
                  {signal.remainingSec}s
                </span>
              )}
            </div>
          </div>

          {/* Phase Badge & Status */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <span 
              className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md flex items-center gap-1.5"
              style={{
                backgroundColor: `${signal.phaseColor}20`,
                borderColor: `${signal.phaseColor}50`,
                color: signal.phaseColor,
              }}
            >
              <Radio className="h-3 w-3 animate-pulse" />
              FASE AKTIF: {signal.currentPhase === 'RED' ? 'BERHENTI (MERAH)' : signal.currentPhase === 'YELLOW' ? 'HATI-HATI (KUNING)' : 'JALAN (HIJAU)'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Sisa Durasi Fase: <strong className="text-white text-xs">{signal.remainingSec} detik</strong> (Siklus Total: {signal.cycleTotalSec}s)
            </span>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-4 bg-slate-900/90 text-[11px]">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Sistem Pengendali</span>
            <div className="font-semibold text-white flex items-center gap-1 mt-0.5 truncate">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{signal.controller}</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Antrean Kendaraan Terdeteksi</span>
            <div className="font-semibold text-amber-300 flex items-center gap-1 mt-0.5">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              <span>±{signal.queueVehicles} Kendaraan / Lajur</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Penyeberang Jalan (Pelican)</span>
            <div className="font-semibold mt-0.5 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className={signal.pedestrianActive ? "text-emerald-300 font-bold" : "text-slate-400"}>
                {signal.pedestrianActive ? "AMAN MENYEBERANG" : "MENUNGGU SIKLUS"}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Sinkronisasi Jam Atom</span>
            <div className="font-mono text-[10px] font-semibold text-sky-300 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{new Date(signal.lastSync).toLocaleTimeString('id-ID')} WIB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
