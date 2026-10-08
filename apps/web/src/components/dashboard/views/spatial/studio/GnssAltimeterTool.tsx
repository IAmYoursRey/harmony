import React, { useState } from 'react';
import {
  Mountain,
  Crosshair,
  MapPin,
  Compass,
  Gauge,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  gnssElevationService,
  GnssElevationReport,
} from '../../../../../services/geospatial/gnssElevationService';

interface GnssAltimeterToolProps {
  onPositionUpdated?: (report: GnssElevationReport) => void;
  initialReport?: GnssElevationReport | null;
  className?: string;
}

export const GnssAltimeterTool: React.FC<GnssAltimeterToolProps> = ({
  onPositionUpdated,
  initialReport = null,
  className = '',
}) => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [report, setReport] = useState<GnssElevationReport | null>(initialReport);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleMeasure = async () => {
    setIsMeasuring(true);
    setErrorMessage(null);

    try {
      const result = await gnssElevationService.measureElevationAndPosition();
      setReport(result);
      if (onPositionUpdated) {
        onPositionUpdated(result);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat meminta izin lokasi GPS atau mengukur ketinggian.'
      );
    } finally {
      setIsMeasuring(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.formattedReportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report.formattedReportText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `Laporan_Ketinggian_GNSS_${safeDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getElevationPercentage = (altM: number) => {
    // Normalizes 0 - 3000 mdpl for visually appealing gauge bar
    const clamped = Math.max(0, Math.min(3000, altM));
    return Math.max(3, Math.round((clamped / 3000) * 100));
  };

  return (
    <div
      className={`rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 text-white shadow-xl overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-sky-500/20 bg-sky-500/10 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Alat Pengukur Ketinggian & Elevasi Presisi (Altimeter Geodesi GNSS)
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <Sparkles className="w-3 h-3 text-sky-400" /> WGS84 + DEM 30m
                </span>
              </div>
              <p className="text-xs text-sky-200/80 mt-1 leading-relaxed">
                Aplikasi akan meminta izin GPS berakurasi tinggi (High-Accuracy Fix) agar titik koordinat ngepas di lokasi Anda, lalu mengukur elevasi meter di atas permukaan laut (mdpl) beserta laporan geospasial terperinci.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleMeasure}
              disabled={isMeasuring}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isMeasuring
                  ? 'bg-sky-700/60 text-sky-200 border border-sky-500/40 cursor-wait'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white shadow-sky-500/25 border border-sky-400/40'
              }`}
            >
              {isMeasuring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
                  <span>Mengunci Satelit &amp; Sensor...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-white" />
                  <span>{report ? 'Ukur Ulang Ketinggian' : 'Mulai Ukur Ketinggian & Posisi (Minta Izin GPS)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Measuring Progress Bar / Status */}
        {isMeasuring && (
          <div className="mt-4 p-3 rounded-2xl bg-sky-950/70 border border-sky-500/40 animate-pulse text-xs text-sky-200 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sky-100">
                Meminta izin akses lokasi GPS &amp; membaca sensor barometrik perangkat...
              </p>
              <p className="text-[11px] text-sky-300/80 mt-0.5">
                Pastikan Anda mengklik &quot;Izinkan&quot; (Allow) pada dialog izin lokasi browser untuk mendapatkan akurasi maksimal.
              </p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-rose-100 block">
                Gagal Mendapatkan Koordinat Presisi
              </strong>
              <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Content Body */}
      {report ? (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Altitude Gauge Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Primary Altitude Metric */}
            <div className="lg:col-span-1 p-5 rounded-3xl bg-slate-800/90 border border-sky-500/30 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-sky-300 text-xs font-semibold">
                <span>Elevasi / Ketinggian Medan</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] uppercase font-mono">
                  {report.altitudeSource === 'device_sensor'
                    ? 'Sensor Internal'
                    : report.altitudeSource === 'sensor_fusion'
                    ? 'Sensor Fusion'
                    : 'SRTM DEM 30m'}
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {report.altitudeM >= 0 ? `+${report.altitudeM}` : report.altitudeM}
                  </span>
                  <span className="text-lg font-bold text-sky-400 font-mono">
                    mdpl
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Meter Di Atas Permukaan Laut (Mean Sea Level)
                </p>
              </div>

              {/* Progress Scale Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>0m (Laut)</span>
                  <span>1000m</span>
                  <span>3000m+ (Puncak)</span>
                </div>
                <div className="h-2 w-full bg-slate-700/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500 transition-all duration-700 shadow-sm"
                    style={{ width: `${getElevationPercentage(report.altitudeM)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Topography Classification & Terrain Description */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-800/90 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Klasifikasi Zona Topografi &amp; Morfologi</span>
                </div>
                <h4 className="text-lg font-extrabold text-white">
                  {report.topographyZone}
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {report.topographyDescription}
                </p>
              </div>

              {/* Environmental Physics Estimates */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-700/80">
                <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Tekanan Atmosfer</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-sky-300">
                    {report.estimatedBarometricPressureHpa} hPa
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Titik Didih Air</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                    {report.estimatedBoilingPointC} °C
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Akurasi GPS</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                    ±{report.accuracyM} meter
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinates & Geodetic Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Decimal Degrees */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span>Derajat Desimal (WGS84)</span>
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <p className="text-xs font-mono font-bold text-white truncate">
                {report.lat.toFixed(6)}°, {report.lng.toFixed(6)}°
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Lintang (Lat), Bujur (Lng)
              </p>
            </div>

            {/* DMS Geodetic */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span>Format Geodetik (DMS)</span>
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xs font-mono font-bold text-white truncate" title={report.dmsDisplay}>
                {report.dmsDisplay}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Derajat, Menit, Detik Geodesi
              </p>
            </div>

            {/* EPSG:3857 */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span>Proyeksi Web Mercator</span>
                <Layers className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <p className="text-xs font-mono font-bold text-white truncate">
                X: {report.epsg3857.x} m
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Y: {report.epsg3857.y} m (EPSG:3857)
              </p>
            </div>

            {/* Address / Location */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span>Wilayah Administrasi</span>
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p
                className="text-xs font-semibold text-white truncate"
                title={report.locationInfo?.fullAddress || 'Lokasi terverifikasi GPS'}
              >
                {report.locationInfo?.shortDisplay || report.locationInfo?.village || 'Lokasi Geografis'}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {report.locationInfo?.fullAddress || `${report.lat.toFixed(4)}°, ${report.lng.toFixed(4)}°`}
              </p>
            </div>
          </div>

          {/* Action Footer: Copy & Download Report */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Laporan ketinggian &amp; koordinat presisi siap disalin atau disimpan sebagai arsip teks.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Laporan Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Laporan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh TXT</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Prompt To Start */
        <div className="p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
            <Gauge className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">
            Altimeter Geodesi Belum Diaktifkan
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Klik tombol &quot;Mulai Ukur Ketinggian &amp; Posisi&quot; di atas. Aplikasi akan meminta izin lokasi presisi perangkat Anda untuk menghitung elevasi medan dan menghasilkan laporan geospasial lengkap.
          </p>
        </div>
      )}
    </div>
  );
};
