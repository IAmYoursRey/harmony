import { Flame, Waves, Activity, Wind, Mountain, Heart, Clock, AlertTriangle } from 'lucide-react';
import type { DisasterType } from '../types';

const DISASTER_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  fire:       { label: 'KEBAKARAN', Icon: Flame,    color: 'text-red-500' },
  earthquake: { label: 'GEMPA BUMI', Icon: Activity, color: 'text-amber-500' },
  flood:      { label: 'BANJIR',     Icon: Waves,    color: 'text-blue-500' },
  storm:      { label: 'BADAI',      Icon: Wind,     color: 'text-purple-500' },
  landslide:  { label: 'LONGSOR',    Icon: Mountain, color: 'text-orange-500' },
  tsunami:    { label: 'TSUNAMI',    Icon: Waves,    color: 'text-cyan-500' },
};

interface Props {
  hp: number;
  maxHp: number;
  timerRemaining: number;
  disasterType: DisasterType;
  phase: string;
}

export function GameHUD({ hp, maxHp, timerRemaining, disasterType, phase }: Props) {
  const meta = DISASTER_META[disasterType] || { label: disasterType.toUpperCase(), Icon: AlertTriangle, color: 'text-red-500' };
  const { label, Icon, color } = meta;
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpColor = hpPct > 60 ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                  hpPct > 20 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                               'bg-gradient-to-r from-red-500 to-rose-600';
  const timerSec = Math.max(0, Math.ceil(timerRemaining));
  const timerMin = Math.floor(timerSec / 60);
  const timerSecRem = timerSec % 60;
  const timerStr = `${timerMin}:${String(timerSecRem).padStart(2, '0')}`;
  const timerCritical = timerSec <= 10 && phase === 'running';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 shadow-xl">
      {/* Background decoration */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-3xl ${color.replace('text-', 'bg-')}`} />

      {/* Disaster label */}
      <div className={`flex items-center gap-2 font-display font-extrabold text-sm tracking-wide ${color} animate-pulse mb-3`}>
        <Icon className="h-5 w-5 drop-shadow-md" />
        {label} — EVAKUASI SEKARANG
      </div>

      <div className="flex gap-5 items-center">
        {/* HP bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-ink-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Heart className={`h-3.5 w-3.5 ${hpPct <= 20 ? 'text-red-500 animate-ping' : 'text-rose-500'}`} /> 
              Kesehatan
            </span>
            <span className="text-xs font-black text-ink-700 dark:text-white">{Math.round(hp)} <span className="opacity-50 font-normal">/ {maxHp}</span></span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
            <div
              style={{ width: `${hpPct}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              className={`h-full rounded-full ${hpColor} shadow-md ${hpPct <= 20 ? 'animate-pulse' : ''}`}
            />
          </div>
        </div>

        {/* Timer */}
        <div className={`flex flex-col items-center justify-center min-w-[70px] transition-transform duration-300 ${
          timerCritical ? 'scale-110 text-red-600 dark:text-red-400 animate-bounce' : 'text-ink-800 dark:text-white'
        }`}>
          <div className="flex items-center gap-1.5 font-mono font-black text-2xl drop-shadow-sm">
            <Clock className={`h-5 w-5 ${timerCritical ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
            {timerStr}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sisa Waktu</span>
        </div>
      </div>

      {phase === 'running' && timerCritical && (
        <div className="mt-3 text-xs text-white font-bold text-center bg-red-600 rounded-lg py-1.5 animate-pulse shadow-lg ring-2 ring-red-400">
          ⚠ WAKTU HAMPIR HABIS! LARI!
        </div>
      )}
    </div>
  );
}
