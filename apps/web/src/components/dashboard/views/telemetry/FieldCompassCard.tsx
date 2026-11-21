import React, { useEffect, useState } from "react";
import { Compass, Crosshair, Navigation, Wind } from "lucide-react";
import type { CompassWindInfo } from "@/services/fieldTelemetryService";

interface FieldCompassCardProps {
  compass: CompassWindInfo;
  jarakRumahLapanganKm: number | null;
  gpsLoading?: boolean;
  onUseDeviceGps: () => void;
}

const COMPASS_LABELS = [
  { label: "U", x: 160, y: 26, major: true },
  { label: "T", x: 294, y: 164, major: true },
  { label: "S", x: 160, y: 300, major: true },
  { label: "B", x: 26, y: 164, major: true },
  { label: "TL", x: 247, y: 74, major: false },
  { label: "TG", x: 247, y: 252, major: false },
  { label: "BD", x: 73, y: 252, major: false },
  { label: "BL", x: 73, y: 74, major: false },
];

export const FieldCompassCard: React.FC<FieldCompassCardProps> = ({
  compass,
  jarakRumahLapanganKm,
  gpsLoading = false,
  onUseDeviceGps,
}) => {
  const [heading, setHeading] = useState<number>(0);
  const [followDevice, setFollowDevice] = useState<boolean>(false);
  const [sensorSupported, setSensorSupported] = useState<boolean>(false);

  useEffect(() => {
    setSensorSupported(typeof window !== "undefined" && "DeviceOrientationEvent" in window);
  }, []);

  useEffect(() => {
    if (!followDevice) {
      setHeading(0);
      return;
    }

    const handleOrientation = (ev: DeviceOrientationEvent) => {
      const anyEv = ev as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof anyEv.webkitCompassHeading === "number" && Number.isFinite(anyEv.webkitCompassHeading)) {
        setHeading(anyEv.webkitCompassHeading);
      } else if (typeof ev.alpha === "number" && Number.isFinite(ev.alpha)) {
        setHeading((360 - ev.alpha) % 360);
      }
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener);
    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [followDevice]);

  const toggleFollowDevice = async () => {
    if (followDevice) {
      setFollowDevice(false);
      return;
    }
    const devOri = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (devOri && typeof devOri.requestPermission === "function") {
      try {
        const res = await devOri.requestPermission();
        if (res !== "granted") return;
      } catch {
        return;
      }
    }
    setFollowDevice(true);
  };

  const angin = compass.angin;
  const speedText =
    angin.kecepatan_km_jam !== null && Number.isFinite(angin.kecepatan_km_jam)
      ? `${angin.kecepatan_km_jam} km/j`
      : "--";
  const alatBearingDeg = compass.jarak_arah_ke_alat?.derajat ?? null;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Compass className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Kompas Lahan & Arah Angin
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{compass.titik_label}</p>
        </div>

        <div className="flex items-center gap-2">
          {sensorSupported && (
            <button
              type="button"
              onClick={toggleFollowDevice}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                followDevice
                  ? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              {followDevice ? "Kunci Utara" : "Ikuti Arah HP"}
            </button>
          )}
          <button
            type="button"
            onClick={onUseDeviceGps}
            disabled={gpsLoading}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {gpsLoading ? "Melacak..." : "GPS Saya"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-12">
        <div className="flex justify-center md:col-span-6">
          <div className="relative h-64 w-64 sm:h-72 sm:w-72">
            <svg viewBox="0 0 320 320" className="h-full w-full select-none" aria-label="Kompas arah angin dan posisi alat">
              <defs>
                <radialGradient id="compassBgField" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.08)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0.02)" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="160" r="146" fill="url(#compassBgField)" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
              <circle cx="160" cy="160" r="105" fill="none" className="stroke-slate-200/70 dark:stroke-slate-700/70" strokeDasharray="4 4" strokeWidth="1" />
              <circle cx="160" cy="160" r="56" fill="none" className="stroke-slate-200/50 dark:stroke-slate-800" strokeWidth="1" />

              <g transform={`rotate(${-heading} 160 160)`}>
                {Array.from({ length: 24 }, (_, idx) => {
                  const deg = idx * 15;
                  const len = deg % 90 === 0 ? 12 : deg % 45 === 0 ? 8 : 5;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const x1 = 160 + Math.cos(rad) * 144;
                  const y1 = 160 + Math.sin(rad) * 144;
                  const x2 = 160 + Math.cos(rad) * (144 - len);
                  const y2 = 160 + Math.sin(rad) * (144 - len);
                  return (
                    <line
                      key={deg}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={deg === 0 ? "stroke-rose-500" : "stroke-slate-300 dark:stroke-slate-600"}
                      strokeWidth={deg % 90 === 0 ? 2 : 1}
                    />
                  );
                })}

                {COMPASS_LABELS.map((item) => (
                  <text
                    key={item.label}
                    x={item.x}
                    y={item.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-bold ${
                      item.label === "U"
                        ? "fill-rose-500 text-[15px]"
                        : item.major
                          ? "fill-slate-700 dark:fill-slate-200 text-[13px]"
                          : "fill-slate-400 dark:fill-slate-500 text-[10px]"
                    }`}
                  >
                    {item.label}
                  </text>
                ))}

                {!angin.tenang && angin.kecepatan_km_jam !== null && (
                  <g transform={`rotate(${angin.menuju_derajat} 160 160)`}>
                    <line x1="160" y1="242" x2="160" y2="70" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round" />
                    <polygon points="160,54 151,75 169,75" fill="#0d9488" />
                    <circle cx="160" cy="242" r="5" fill="#14b8a6" />
                  </g>
                )}

                {alatBearingDeg !== null && (
                  <g transform={`rotate(${alatBearingDeg} 160 160)`}>
                    <circle cx="160" cy="48" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  </g>
                )}
              </g>

              <circle cx="160" cy="160" r="18" className="fill-white stroke-emerald-500 dark:fill-slate-900" strokeWidth="2.5" />
              <text x="160" y="160" textAnchor="middle" dominantBaseline="central" className="fill-slate-800 text-[10px] font-black dark:fill-slate-100">
                {angin.tenang ? "CALM" : angin.dari_kode_id}
              </text>
            </svg>
          </div>
        </div>

        <div className="space-y-3 md:col-span-6">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Hembusan Angin BMKG
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{speedText}</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {angin.tenang
                ? "Angin Tenang / Calm"
                : angin.kecepatan_km_jam !== null
                  ? `Dari ${angin.dari_nama} (${angin.dari_derajat}°) → ${angin.menuju_nama}`
                  : "Data arah angin menunggu koneksi BMKG"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Arah ke Unit Alat</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {compass.jarak_arah_ke_alat
                  ? `${compass.jarak_arah_ke_alat.jarak_km} km (${compass.jarak_arah_ke_alat.kode_id})`
                  : "Aktifkan GPS Anda"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Jarak Rumah ↔ Lahan</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {jarakRumahLapanganKm !== null ? `${jarakRumahLapanganKm} km` : "--"}
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Panah hijau kebiruan menunjuk arah hembusan angin untuk memprediksi sebaran asap bila muncul titik panas di sekitar lahan.
          </p>
        </div>
      </div>
    </div>
  );
};

