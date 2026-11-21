import React from "react";
import { AlertTriangle, CheckCircle2, Flame, WifiOff } from "lucide-react";
import type { FfmcSummary } from "@/services/fieldTelemetryService";

interface FfmcGaugeChartProps {
  ffmc: FfmcSummary;
}

const BADGE_STYLES: Record<string, string> = {
  bahaya: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  siaga: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  waspada: "border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  aman: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  offline: "border-slate-400/40 bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

const GAUGE_COLORS: Record<string, string> = {
  bahaya: "#ef4444",
  siaga: "#f59e0b",
  waspada: "#eab308",
  aman: "#10b981",
  offline: "#64748b",
};

export const FfmcGaugeChart: React.FC<FfmcGaugeChartProps> = ({ ffmc }) => {
  const status = ffmc.status_kebakaran;
  const val = ffmc.nilai;
  const hasValue = typeof val === "number" && Number.isFinite(val);
  const clamped = hasValue ? Math.max(0, Math.min(101, val)) : 0;
  const pct = clamped / 101;

  // Semi-circle SVG arc geometry (radius = 84, circumference/2 = 263.89)
  const radius = 84;
  const halfCircumference = Math.PI * radius;
  const dashOffset = halfCircumference * (1 - pct);
  const strokeColor = GAUGE_COLORS[status.nada] || "#64748b";

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Indeks Kekeringan Bahan Bakar (FFMC)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Van Wagner (1987) · Acuan siang {ffmc.masukan.jam_acuan || "--"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${
            BADGE_STYLES[status.nada] || BADGE_STYLES.offline
          }`}
        >
          {status.nada === "bahaya" || status.nada === "siaga" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : status.nada === "offline" ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {status.status}
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <div className="flex flex-col items-center justify-center sm:col-span-5">
          <svg viewBox="0 0 220 125" className="w-52">
            <path
              d="M 26 105 A 84 84 0 0 1 194 105"
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {hasValue && (
              <path
                d="M 26 105 A 84 84 0 0 1 194 105"
                fill="none"
                stroke={strokeColor}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={halfCircumference}
                strokeDashoffset={dashOffset}
              />
            )}
            <text
              x="110"
              y="84"
              textAnchor="middle"
              className="fill-slate-900 text-3xl font-black dark:fill-white"
            >
              {hasValue ? val.toFixed(1) : "--"}
            </text>
            <text
              x="110"
              y="104"
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400"
            >
              {status.kelas_ffmc}
            </text>
          </svg>
        </div>

        <div className="space-y-3 sm:col-span-7">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-extrabold text-slate-900 dark:text-white">{status.judul}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{status.saran}</p>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Interval pantau: <span className="font-bold text-slate-700 dark:text-slate-200">{status.interval}</span>
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Suhu</div>
              <div className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                {ffmc.masukan.suhu_c !== null ? `${ffmc.masukan.suhu_c}°C` : "--"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">RH</div>
              <div className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                {ffmc.masukan.rh_persen !== null ? `${ffmc.masukan.rh_persen}%` : "--"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Angin</div>
              <div className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                {ffmc.masukan.angin_km_jam !== null ? `${ffmc.masukan.angin_km_jam}` : "--"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Hujan 24j</div>
              <div className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                {ffmc.masukan.hujan_24jam_mm} mm
              </div>
            </div>
          </div>
        </div>
      </div>

      {ffmc.proyeksi.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-200/70 pt-3.5 sm:grid-cols-3 dark:border-slate-800">
          {ffmc.proyeksi.map((day) => (
            <div
              key={day.tanggal}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{day.tanggal}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {day.suhu_siang}°C · RH {day.rh_siang}% · {day.prakiraan_hujan_mm} mm
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-black text-slate-900 dark:text-white">{day.ffmc}</div>
                <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">{day.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

