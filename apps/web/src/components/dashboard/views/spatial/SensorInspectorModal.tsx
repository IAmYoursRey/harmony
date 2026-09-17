import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Activity,
  Compass,
  Flame,
  Waves,
  CloudRain,
  CloudLightning,
  Mountain,
  Satellite,
  Leaf,
  Building2,
  Radio,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Crosshair,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import {
  EarthSensorNode,
  SENSOR_FAMILY_META,
  SensorFamily,
} from "@/services/earthSensorRegistry";
import { useToast } from "@/hooks/useToast";

interface SensorInspectorModalProps {
  sensor: EarthSensorNode | null;
  onClose: () => void;
  onCenterMap?: (lng: number, lat: number) => void;
}

const FAMILY_ICONS: Record<SensorFamily, any> = {
  SOLID_EARTH_SEISMIC: Activity,
  GEODESY_GNSS_GRAVITY: Compass,
  VOLCANO: Flame,
  OCEAN_HYDROLOGY: Waves,
  WEATHER: CloudRain,
  ATMOSPHERE: CloudLightning,
  LAND_TERRAIN: Mountain,
  REMOTE_SENSING: Satellite,
  BIOSPHERE_ENVIRONMENT: Leaf,
  HUMAN_INFRASTRUCTURE: Building2,
};

export function SensorInspectorModal({
  sensor,
  onClose,
  onCenterMap,
}: SensorInspectorModalProps) {
  const { show } = useToast();

  if (!sensor) return null;

  const meta = SENSOR_FAMILY_META[sensor.family];
  const IconComponent = FAMILY_ICONS[sensor.family] || Activity;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${sensor.lat}, ${sensor.lng}`);
    show(`Koordinat ${sensor.lat.toFixed(4)}, ${sensor.lng.toFixed(4)} disalin ke clipboard!`, "success");
  };

  const handleCenter = () => {
    if (onCenterMap) {
      onCenterMap(sensor.lng, sensor.lat);
      show(`Kamera diarahkan ke stasiun ${sensor.code}`, "info");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-md dark:bg-black/80"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-brand-100 bg-white/95 p-5 shadow-glass-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-6 z-10 my-auto"
        >
          {/* Top Decorative Color Bar */}
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: meta.colorHex }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Tutup inspektor"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 pr-6">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                backgroundColor: meta.colorHex,
                boxShadow: `0 8px 20px -4px ${meta.colorHex}55`,
              }}
            >
              <IconComponent className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{sensor.flag}</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${meta.badgeBg} ${meta.badgeText}`}>
                  {meta.name}
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {sensor.platform.replace('_', ' ')}
                </span>
              </div>

              <h2 className="font-display text-base font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-lg leading-snug">
                {sensor.name}
              </h2>
              <p className="text-xs text-ink-500 dark:text-slate-400">
                Kode Stasiun: <span className="font-semibold text-brand-600 dark:text-brand-400">{sensor.code}</span> • Pengelola: <span className="font-semibold text-ink-700 dark:text-slate-200">{sensor.provider}</span>
              </p>
            </div>
          </div>

          {/* Status & Telemetry Strip */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/50 text-xs">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 font-bold ${
                sensor.status === 'ALERT'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {sensor.status === 'ALERT' ? (
                  <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>● {sensor.status}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-ink-600 dark:text-slate-300">
                Sampling: <strong className="text-ink-900 dark:text-white">{sensor.samplingRate}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Radio className="h-3 w-3 text-brand-500" />
              <span>{sensor.telemetryType}</span>
            </div>
          </div>

          {/* Primary Telemetry Value Showcase Card */}
          <div className="mt-3.5 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-sky-50/40 p-3.5 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-800/80 dark:via-slate-900/90 dark:to-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Pengukuran Fisik Terkini
              </span>
              <span className="text-[10px] text-slate-400">
                Update: {sensor.lastPing}
              </span>
            </div>

            <div className="mt-1.5">
              <div className="text-lg font-extrabold text-ink-900 dark:text-white tracking-tight">
                {sensor.currentValue}
              </div>
              <p className="mt-0.5 text-xs text-ink-600 dark:text-slate-300">
                Parameter: <span className="font-semibold text-ink-800 dark:text-slate-100">{sensor.primaryMeasurement}</span>
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-100/60 pt-2.5 dark:border-slate-700/60 text-[11px]">
              <div>
                <span className="text-slate-400 block">Tingkat Akurasi:</span>
                <strong className="text-ink-800 dark:text-slate-200">{sensor.accuracy}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Jangkauan Pantau:</span>
                <strong className="text-ink-800 dark:text-slate-200">{sensor.coverage}</strong>
              </div>
            </div>
          </div>

          {/* Geographic Location Specs */}
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Latitude</span>
              <strong className="text-ink-800 dark:text-slate-200 font-mono">{sensor.lat.toFixed(4)}°</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Longitude</span>
              <strong className="text-ink-800 dark:text-slate-200 font-mono">{sensor.lng.toFixed(4)}°</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Elevasi / Kedalaman</span>
              <strong className="text-ink-800 dark:text-slate-200">
                {sensor.depthM !== undefined ? `-${sensor.depthM} m (Laut)` : `${sensor.altitudeM ?? 0} m DPL`}
              </strong>
            </div>
          </div>

          {/* Description & Role in Early Warning */}
          <div className="mt-3.5">
            <h4 className="text-xs font-bold text-ink-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              Peran dalam Mitigasi & Inferensi Bencana
            </h4>
            <p className="text-xs text-ink-600 dark:text-slate-400 leading-relaxed">
              {sensor.description}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Kategori Bahaya:
              </span>
              {sensor.disasterRelevance.map((d) => (
                <span
                  key={d}
                  className="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/40"
                >
                  {d.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {onCenterMap && (
              <button
                type="button"
                onClick={handleCenter}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:from-brand-700 hover:to-indigo-700 transition-all active:scale-[0.99]"
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>Pusatkan Peta ke Sensor</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyCoords}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-all"
              title="Salin Koordinat"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Posisi</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
