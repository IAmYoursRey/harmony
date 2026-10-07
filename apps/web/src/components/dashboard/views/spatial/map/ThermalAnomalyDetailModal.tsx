import React from 'react';
import {
  Flame,
  X,
  MapPin,
  Calendar,
  Satellite,
  Thermometer,
  Zap,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Radio,
  Clock,
  Compass,
} from 'lucide-react';
import { ActiveFireHotspot } from '../../../../../services/hotspotFireService';

interface ThermalAnomalyDetailModalProps {
  hotspot: ActiveFireHotspot | null;
  onClose: () => void;
  onCenterOnMap?: (lat: number, lng: number) => void;
}

export const ThermalAnomalyDetailModal: React.FC<ThermalAnomalyDetailModalProps> = ({
  hotspot,
  onClose,
  onCenterOnMap,
}) => {
  if (!hotspot) return null;

  const tempC = hotspot.brightnessCelsius ?? (hotspot.brightnessKelvin ? Number((hotspot.brightnessKelvin - 273.15).toFixed(1)) : 48.5);
  const tempK = hotspot.brightnessKelvin ?? Number((tempC + 273.15).toFixed(1));
  const frp = hotspot.frpMw ?? 12.4;

  // Temperature anomaly offset above normal ambient temperature (ambient assumed ~30°C in tropical regions)
  const ambientTempC = 30.0;
  const anomalyDeltaC = Math.max(1, Number((tempC - ambientTempC).toFixed(1)));

  // Risk Classification
  const isExtreme = frp >= 25 || tempC >= 75;
  const isHigh = !isExtreme && (frp >= 10 || tempC >= 55);
  const isModerate = !isExtreme && !isHigh && (frp >= 3 || tempC >= 42);

  const riskLabel = isExtreme
    ? 'Anomali Panas Ekstrem / Kebakaran Aktif Parah'
    : isHigh
    ? 'Anomali Panas Tinggi / Titik Api Signifikan'
    : isModerate
    ? 'Anomali Panas Sedang / Potensi Pembakaran Biomassa'
    : 'Titik Panas Rendah / Suhu Permukaan Terpapar';

  const riskBadgeColor = isExtreme
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isHigh
    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  const satelliteDisplay = hotspot.satellite
    ? hotspot.satellite.toUpperCase().includes('NOAA') || hotspot.satellite.toUpperCase().includes('SNPP') || hotspot.satellite.toUpperCase().includes('VIIRS')
      ? `VIIRS (${hotspot.satellite})`
      : hotspot.satellite.toUpperCase().includes('MODIS') || hotspot.satellite.toUpperCase().includes('TERRA') || hotspot.satellite.toUpperCase().includes('AQUA')
      ? `MODIS (${hotspot.satellite})`
      : hotspot.satellite
    : 'Satelit Penginderaan Jauh VIIRS S-NPP';

  const instrumentDisplay = hotspot.instrument === 'MODIS'
    ? 'MODIS 1km Thermal Infrared'
    : 'VIIRS 375m High-Resolution Infrared';

  const confidenceDisplay = typeof hotspot.confidence === 'number'
    ? `${hotspot.confidence}% Confidence`
    : hotspot.confidence === 'high'
    ? 'Tinggi (High Confidence - Terverifikasi)'
    : hotspot.confidence === 'nominal'
    ? 'Nominal (Terdeteksi Sensor)'
    : 'Estimasi Pengamatan Satelit';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="thermal-modal-title"
      className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tactical Header with Glowing Thermal Indicator */}
        <div className="relative p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/60 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/20">
                <Flame className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-rose-400" />
                    DETEKSI ANOMALI SUHU TERMAL
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${riskBadgeColor}`}>
                    {riskLabel}
                  </span>
                </div>
                <h3 id="thermal-modal-title" className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
                  Titik Anomali Panas #{hotspot.id.slice(-8) || 'SATELIT'}
                </h3>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <Satellite className="w-3.5 h-3.5 text-sky-400" />
                  <span>{satelliteDisplay} • Sensor {instrumentDisplay}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Detail Anomali"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Main Telemetry Grid (Suhu, FRP, Delta Anomali) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Suhu Radiasi Terdeteksi */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-rose-500/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                Suhu Pancaran Termal
              </span>
              <div className="text-xl font-extrabold text-rose-400">
                {tempC.toFixed(1)} °C
              </div>
              <span className="text-[10px] text-slate-500 block">
                {tempK.toFixed(1)} Kelvin (Brightness Temp)
              </span>
            </div>

            {/* Anomali Suhu Relatif */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Selisih Anomali Panas
              </span>
              <div className="text-xl font-extrabold text-amber-400">
                +{anomalyDeltaC} °C
              </div>
              <span className="text-[10px] text-slate-500 block">
                Di atas suhu normal sekitar (30°C)
              </span>
            </div>

            {/* Fire Radiative Power (FRP) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                Daya Radiasi (FRP)
              </span>
              <div className="text-xl font-extrabold text-purple-300">
                {frp.toFixed(1)} MW
              </div>
              <span className="text-[10px] text-slate-500 block">
                MegaWatt pelepasan energi panas
              </span>
            </div>
          </div>

          {/* Satellite Orbit & Geodetic Location Details */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-sky-400" />
              Koordinat & Data Lintasan Satelit
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Koordinat Geodesi:</span>
                <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {hotspot.lat.toFixed(5)}°, {hotspot.lng.toFixed(5)}°
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Waktu Akuisisi Sensor:</span>
                <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  {hotspot.acqDate || new Date().toISOString().slice(0, 10)} {hotspot.acqTime ? `(${hotspot.acqTime} UTC)` : ''}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Siklus Lintasan Orbit:</span>
                <span className="font-bold text-slate-200 mt-0.5 block">
                  {hotspot.dayNight === 'D' ? '☀️ Siang Hari (Daytime Overpass)' : hotspot.dayNight === 'N' ? '🌙 Malam Hari (Nighttime Overpass)' : 'Siklus Reguler Satelit'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Tingkat Keyakinan (Confidence):</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {confidenceDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Mitigation & SiPongi Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Protokol Verifikasi Lapangan & Mitigasi SiPongi KLHK</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              Deteksi satelit menandai anomali suhu termal tinggi pada piksel pengamatan. Sumber anomali dapat berasal dari kebakaran vegetasi/hutan, pembakaran sisa jerami pertanian, cerobong industri, atau permukaan batuan terbuka yang menyerap panas terik ekstrem.
            </p>
            <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1 font-sans">
              <li>Lakukan verifikasi visual lapangan / patroli udara pada koordinat terkait.</li>
              <li>Hindari pembukaan lahan dengan cara membakar pada radius sekitar.</li>
              <li>Hubungi posko Manggala Agni / BPBD setempat jika terindikasi kobaran api aktif tak terkendali.</li>
            </ul>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            {onCenterOnMap && (
              <button
                type="button"
                onClick={() => {
                  onCenterOnMap(hotspot.lat, hotspot.lng);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-rose-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Pusatkan di Peta</span>
              </button>
            )}

            <a
              href={`https://sipongi.menlhk.go.id/`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Portal SiPongi KLHK</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
