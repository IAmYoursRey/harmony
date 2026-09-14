import { CheckCircle2, XCircle, Heart, Clock, Route, Home } from "lucide-react";
import type { PlayerState } from "../types";

interface Props {
  phase: "won" | "lost";
  player: PlayerState;
  elapsedSeconds: number;
  onExit: () => void;
}

export function GameResult({ phase, player, elapsedSeconds, onExit }: Props) {
  const success = phase === "won";
  const elapsed = Math.round(elapsedSeconds);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const damageTaken = Math.round(player.maxHp - player.hp);
  const hpPct = Math.round((player.hp / player.maxHp) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
      {/* Icon */}
      <div
        className={`relative w-32 h-32 rounded-3xl flex items-center justify-center transform transition-all hover:scale-105 shadow-2xl ${
          success
            ? "bg-gradient-to-br from-green-400 to-green-600"
            : "bg-gradient-to-br from-red-500 to-rose-600"
        }`}
      >
        {success ? (
          <CheckCircle2 className="h-16 w-16 text-white drop-shadow-md" />
        ) : (
          <XCircle className="h-16 w-16 text-white drop-shadow-md" />
        )}
        <div
          className={`absolute -inset-4 rounded-3xl animate-ping opacity-20 ${
            success ? "bg-green-400" : "bg-red-500"
          }`}
          style={{ animationDuration: "3s" }}
        />
      </div>

      {/* Title */}
      <div className="text-center mt-6">
        <h2
          className={`font-display text-4xl font-extrabold tracking-tight drop-shadow-sm ${
            success
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {success ? "🎉 BERHASIL!" : "💀 GAGAL!"}
        </h2>
        <p className="text-ink-500 dark:text-slate-400 mt-3 text-sm max-w-xs mx-auto font-medium">
          {success
            ? "Kamu berhasil mengevakuasi diri ke titik aman! Kerja bagus, pertahankan."
            : player.status === "dead"
              ? "HP kamu habis. Ingat, hindari zona bahaya dan perhatikan rute evakuasi."
              : "Waktu evakuasi habis. Reaksi cepat adalah kunci keselamatan!"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-4">
        {[
          {
            Icon: Clock,
            label: "Waktu",
            value: `${elapsedMin}m ${elapsedSec}s`,
            color: "text-brand-600 dark:text-brand-400",
            bg: "bg-brand-50 dark:bg-brand-900/20",
          },
          {
            Icon: Heart,
            label: "HP Sisa",
            value: `${Math.round(player.hp)}%`,
            color: success
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400",
            bg: success
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20",
          },
          {
            Icon: Route,
            label: "Jarak",
            value: `${player.distanceTravelled}`,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-900/20",
          },
        ].map(({ Icon, label, value, color, bg }) => (
          <div
            key={label}
            className={`${bg} rounded-2xl p-4 text-center border border-white/50 dark:border-slate-700 shadow-sm transition-transform hover:-translate-y-1`}
          >
            <Icon className={`h-6 w-6 mx-auto mb-2 ${color}`} />
            <p className={`font-black text-lg ${color}`}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 dark:text-slate-500 mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* HP bar */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
          <span>Kesehatan Akhir</span>
          <span className="text-ink-700 dark:text-white">
            {Math.round(player.hp)}{" "}
            <span className="opacity-50">/ {player.maxHp}</span>
          </span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-inner">
          <div
            style={{ width: `${hpPct}%` }}
            className={`h-full rounded-full transition-all ${hpPct > 60 ? "bg-gradient-to-r from-green-400 to-green-500" : hpPct > 30 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          />
        </div>

        {/* Damage detail */}
        {damageTaken > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-3 text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg font-medium">
            Menerima <strong>{damageTaken} HP</strong> kerusakan dari zona
            bahaya.
          </p>
        )}
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-glow"
      >
        <Home className="h-4 w-4" /> Kembali ke Daftar Ruang
      </button>
    </div>
  );
}
