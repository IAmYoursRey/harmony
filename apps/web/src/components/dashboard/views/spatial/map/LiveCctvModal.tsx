import React, { useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Radio, Compass, MapPin, ShieldCheck, Activity } from 'lucide-react';
import type { TrafficCctvCamera } from '@/services/trafficCctvService';

interface LiveCctvModalProps {
  camera: TrafficCctvCamera | null;
  onClose: () => void;
}

export const LiveCctvModal: React.FC<LiveCctvModalProps> = ({ camera, onClose }) => {
  const [frameTimestamp, setFrameTimestamp] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [frameCount, setFrameCount] = useState(1);

  useEffect(() => {
    if (!camera) return;
    const interval = setInterval(() => {
      setFrameTimestamp(new Date().toLocaleTimeString('id-ID'));
      setFrameCount((prev) => prev + 1);
    }, 2500);

    return () => clearInterval(interval);
  }, [camera]);

  if (!camera) return null;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setFrameTimestamp(new Date().toLocaleTimeString('id-ID'));
    setFrameCount((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl text-white flex flex-col"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 shrink-0 border border-red-500/30">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                  {camera.name}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9.5px] font-bold text-red-300 border border-red-500/40 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE CCTV
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {camera.road} • {camera.city}, {camera.region}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Perbarui Gambar Kamera"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup CCTV"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video / Snapshot Viewport */}
        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none">
          <img
            key={`cctv-${camera.id}-${frameCount}`}
            src={`${camera.streamUrl}?v=${frameCount}`}
            alt={camera.name}
            className="w-full h-full object-cover"
          />

          {/* Futuristic HUD Video Overlay */}
          <div className="absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 font-mono">
            {/* Top HUD Line */}
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold drop-shadow">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Radio className="h-3 w-3 animate-pulse text-red-500" />
                  REC {camera.fps} FPS
                </span>
                <span className="bg-slate-950/70 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                  {camera.resolution}
                </span>
              </div>
              <div className="bg-slate-950/70 px-2.5 py-0.5 rounded border border-slate-700 text-slate-200">
                {frameTimestamp} WIB
              </div>
            </div>

            {/* Crosshair Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/20 rounded-full flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 bg-red-500/60 rounded-full" />
            </div>

            {/* Bottom HUD Line */}
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <div className="bg-slate-950/75 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-cyan-400" />
                <span>Arah: {camera.direction}</span>
              </div>
              <div className="bg-slate-950/75 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5 text-emerald-400">
                <Activity className="h-3 w-3" />
                <span>Kepadatan: {camera.trafficDensity}% ({camera.statusText})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Footer Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950/90 border-t border-slate-800 text-[11px]">
          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Otoritas / Pengelola</span>
            <div className="font-semibold text-white flex items-center gap-1 mt-0.5 truncate">
              <ShieldCheck className="h-3 w-3 text-sky-400 shrink-0" />
              <span className="truncate">{camera.authority}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Koordinat Geografis</span>
            <div className="font-mono font-semibold text-white mt-0.5 truncate">
              {camera.lat.toFixed(4)}°, {camera.lng.toFixed(4)}°
            </div>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Status Aliran</span>
            <div className="font-semibold text-emerald-400 mt-0.5 truncate flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {camera.status} Transmisi
            </div>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Kondisi Visual</span>
            <div className="font-semibold text-amber-300 mt-0.5 truncate">
              {camera.statusText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
