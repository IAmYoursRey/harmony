import React, { useState, useEffect } from 'react';
import {
  CloudLightning,
  Radio,
  Satellite,
  Waves,
  Plane,
  ThermometerSnowflake,
  Wind,
  Activity,
  AlertTriangle,
  Clock,
  Sun,
  Moon,
  Compass,
  Layers,
  MapPin,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  ChevronRight,
  TrendingUp,
  FileText,
  Database,
  Building,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  bmkgService,
  BMKGEarthquake,
  BMKGWeatherWarning,
  BMKGSatelliteProduct,
  BMKGClimateData,
  BMKGAirQualityStation,
  BMKGGeophysicsData,
  BMKGTimeSun,
  BMKGSeismicMicrozonation,
  BMKGStoryMap,
} from '../../../../../services/bmkgService';

interface GeospatialBMKGTabProps {
  lat: number;
  lng: number;
  regionName?: string;
}

type BMKGSubModule =
  | 'weather_nowcast'
  | 'satellite_himawari'
  | 'aviation_maritime'
  | 'climate_stripes'
  | 'air_quality'
  | 'earthquake_tews'
  | 'lightning_geophysics'
  | 'time_astronomy'
  | 'engineering_seismology'
  | 'satu_peta_story';

export const GeospatialBMKGTab: React.FC<GeospatialBMKGTabProps> = ({
  lat,
  lng,
  regionName = 'Indonesia',
}) => {
  const [subModule, setSubModule] = useState<BMKGSubModule>('weather_nowcast');
  const [loading, setLoading] = useState(false);

  const [autoGempa, setAutoGempa] = useState<BMKGEarthquake | null>(null);
  const [recentQuakes, setRecentQuakes] = useState<BMKGEarthquake[]>([]);
  const [feltQuakes, setFeltQuakes] = useState<BMKGEarthquake[]>([]);
  const [warnings, setWarnings] = useState<BMKGWeatherWarning[]>([]);
  const [satellites, setSatellites] = useState<BMKGSatelliteProduct[]>([]);
  const [activeSatId, setActiveSatId] = useState<string>('ir_enhanced');
  const [climate, setClimate] = useState<BMKGClimateData | null>(null);
  const [airQuality, setAirQuality] = useState<BMKGAirQualityStation[]>([]);
  const [geophysics, setGeophysics] = useState<BMKGGeophysicsData | null>(null);
  const [timeSun, setTimeSun] = useState<BMKGTimeSun | null>(null);
  const [microzonation, setMicrozonation] = useState<BMKGSeismicMicrozonation | null>(null);
  const [storyMaps, setStoryMaps] = useState<BMKGStoryMap[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string>('story-cianjur');

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        gempaRes,
        terkiniRes,
        dirasakanRes,
        warnRes,
        satRes,
        climRes,
        airRes,
        geoRes,
        timeRes,
        seisRes,
      ] = await Promise.all([
        bmkgService.getAutoGempa(),
        bmkgService.getGempaTerkini(),
        bmkgService.getGempaDirasakan(),
        bmkgService.getWeatherWarnings(),
        bmkgService.getSatelliteProducts(),
        bmkgService.getClimateIndicators(),
        bmkgService.getAirQuality(),
        bmkgService.getGeophysicsData(),
        bmkgService.getTimeAndSun(lat, lng),
        bmkgService.getSeismicMicrozonation(lat, lng),
      ]);

      setAutoGempa(gempaRes);
      setRecentQuakes(terkiniRes);
      setFeltQuakes(dirasakanRes);
      setWarnings(warnRes);
      setSatellites(satRes);
      setClimate(climRes);
      setAirQuality(airRes);
      setGeophysics(geoRes);
      setTimeSun(timeRes);
      setMicrozonation(seisRes);
      setStoryMaps(bmkgService.getStoryMaps());
    } catch (err) {
      console.error('Failed loading BMKG intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lat, lng]);

  const activeSatellite = satellites.find((s) => s.id === activeSatId) || satellites[0];
  const activeStory = storyMaps.find((s) => s.id === activeStoryId) || storyMaps[0];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              Satu Peta MKG & BMKG Official Architecture
            </span>
            <span className="text-[11px] text-slate-400">
              Integrasi Multi-Disiplin MKG Nasional
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Harmony Earth, Atmosphere & Geophysics Intelligence</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Sintesis analitik geospasial berbasis data publik BMKG: InaTEWS, Himawari-9, Radar Doppler, Dinamika Iklim, Nowcasting Cuaca Ekstrem, Seismologi Teknik & Tanda Waktu Nasional.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Menyinkronkan...' : 'Sinkronkan BMKG'}</span>
          </button>
        </div>
      </div>

      {/* 10 BMKG Sub-Module Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        {[
          { id: 'weather_nowcast', label: '🌦️ Cuaca & Radar', icon: Radio },
          { id: 'satellite_himawari', label: '🛰️ Himawari-9', icon: Satellite },
          { id: 'aviation_maritime', label: '🛫 Penerbangan & Maritim', icon: Waves },
          { id: 'climate_stripes', label: '🌍 Iklim & Stripes', icon: ThermometerSnowflake },
          { id: 'air_quality', label: '🍃 Kualitas Udara & GRK', icon: Activity },
          { id: 'earthquake_tews', label: '🌋 Gempa & Tsunami InaTEWS', icon: ShieldAlert },
          { id: 'lightning_geophysics', label: '⚡ Petir & Gaya Berat', icon: CloudLightning },
          { id: 'time_astronomy', label: '⏱️ Tanda Waktu & Hilal', icon: Clock },
          { id: 'engineering_seismology', label: '🏗️ Seismologi Teknik', icon: Building },
          { id: 'satu_peta_story', label: '🗺️ Satu Peta & Story Maps', icon: Layers },
        ].map((mod) => {
          const isActive = subModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setSubModule(mod.id as BMKGSubModule)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: WEATHER & NOWCASTING */}
      {subModule === 'weather_nowcast' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Peringatan Dini Cuaca Ekstrem (Nowcasting 0–6 Jam) BMKG</span>
              </h3>
              <span className="text-[10px] text-slate-400">Atribusi Resmi: data.bmkg.go.id</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl border flex flex-col justify-between bg-slate-50 dark:bg-slate-900/60"
                  style={{ borderColor: `${w.color}50` }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{w.province}</span>
                      <span
                        className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${w.color}20`, color: w.color }}
                      >
                        {w.level}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{w.hazardType}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{w.meteorologicalDescription}</p>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] space-y-1">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Wilayah Terdampak:</div>
                      <div className="text-slate-500">{w.affectedAreas.join(', ')}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Berlaku: {w.validUntil}</span>
                    <span className="font-medium text-indigo-500">Nowcast</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Radar Intensity Legend */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-500" />
                <span>Klasifikasi Intensitas Sebaran Hujan Radar Cuaca Doppler BMKG</span>
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                Wajib menyertakan atribusi BMKG
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: 'Sangat Ringan', range: '0.1 - 1.0 mm/jam', dbz: '< 20 dBZ', color: '#6ee7b7' },
                { label: 'Ringan', range: '1.0 - 5.0 mm/jam', dbz: '20 - 30 dBZ', color: '#38bdf8' },
                { label: 'Sedang', range: '5.0 - 10.0 mm/jam', dbz: '30 - 40 dBZ', color: '#fbbf24' },
                { label: 'Lebat', range: '10.0 - 20.0 mm/jam', dbz: '40 - 50 dBZ', color: '#f97316' },
                { label: 'Sangat Lebat', range: '> 20.0 mm/jam', dbz: '> 50 dBZ (Potensi Cb)', color: '#ef4444' },
              ].map((lvl) => (
                <div
                  key={lvl.label}
                  className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-900/60"
                  style={{ borderColor: `${lvl.color}60` }}
                >
                  <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: lvl.color }} />
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{lvl.label}</div>
                  <div className="text-[10px] text-slate-500">{lvl.range}</div>
                  <div className="text-[9px] font-mono text-slate-400">{lvl.dbz}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: HIMAWARI-9 SATELLITE */}
      {subModule === 'satellite_himawari' && (
        <div className="space-y-4">
          {/* Satellite Product Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {satellites.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSatId(s.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  activeSatId === s.id
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <div className="text-xs font-bold truncate">{s.name.replace('Himawari-9 ', '')}</div>
                <div className={`text-[10px] truncate ${activeSatId === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {s.spectralBand.split('(')[0]}
                </div>
              </button>
            ))}
          </div>

          {activeSatellite && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-indigo-500" />
                    <span>{activeSatellite.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-500 font-mono">
                      10-Menit Refresh
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeSatellite.purpose}</p>
                </div>
                <div className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                  {activeSatellite.isDayNight}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-2xl bg-slate-950 p-2 border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[280px]">
                  <img
                    src={activeSatellite.sampleImage}
                    alt={activeSatellite.name}
                    className="w-full h-auto max-h-[380px] object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://satelit.bmkg.go.id/IMAGE/ANIMASI/H08_EH_Indonesia.gif';
                    }}
                  />
                  <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-700">
                    Satelit Himawari-9 BMKG • Posisi Orbit 140.7° BT
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Karakteristik Sensor:</span>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{activeSatellite.spectralBand}</div>
                    <div className="text-[11px] text-slate-500">Resolusi: <strong>{activeSatellite.resolution}</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Interpretasi Warna BMKG:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeSatellite.colorInterpretation}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300">
                    💡 <strong>Analisis Harmony:</strong> Citra satelit Himawari-9 diintegrasikan secara real-time untuk mendeteksi bibit konvektif sebelum tercermin pada radar permukaan.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: AVIATION & MARITIME */}
      {subModule === 'aviation_maritime' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Plane className="w-4 h-4 text-sky-500" />
              <span>Cuaca Penerbangan & Awan Cumulonimbus (Cb) Bandara</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { airport: 'Bandara Soekarno-Hatta (WIII/CGK)', cbPotential: 'Rendah (Awan Cb terpantau 25 NM Tenggara)', vis: '9.000 m', wind: '240° / 12 knot' },
                { airport: 'Bandara Juanda Surabaya (WARR/SUB)', cbPotential: 'Waspada Cb (Sel Konvektif di atas Selat Madura)', vis: '6.000 m', wind: '180° / 16 knot' },
                { airport: 'Bandara Ngurah Rai Bali (WADD/DPS)', cbPotential: 'Aman (Clear Skies)', vis: '> 10.000 m', wind: '120° / 08 knot' },
              ].map((apt) => (
                <div key={apt.airport} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{apt.airport}</div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{apt.cbPotential}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex gap-3">
                    <span>Visibilitas: {apt.vis}</span>
                    <span>Angin: {apt.wind}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Waves className="w-4 h-4 text-blue-500" />
              <span>Cuaca Maritim & Gelombang Laut Pelabuhan Indonesia</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { region: 'Samudra Hindia Selatan Jawa s.d. Bali', wave: '2.5 - 4.0 m (Tinggi)', risk: 'Risiko Tinggi Perahu Nelayan & Kapal Tongkang' },
                { region: 'Laut Jawa Bagian Timur', wave: '1.25 - 2.5 m (Sedang)', risk: 'Waspada Perahu Nelayan' },
                { region: 'Selat Sunda Bagian Selatan', wave: '2.5 - 3.5 m (Tinggi)', risk: 'Waspada Kapal Ferry Penyeberangan' },
              ].map((mar) => (
                <div key={mar.region} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{mar.region}</div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{mar.wave}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{mar.risk}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: CLIMATE & WARMING STRIPES */}
      {subModule === 'climate_stripes' && climate && (
        <div className="space-y-4">
          {/* Warming Stripes Visual Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Warming Stripes Indonesia (1981 - 2026)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visualisasi anomali suhu rata-rata tahunan BMKG (Ed Hawkins Methodology)
                </p>
              </div>
              <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg">
                Tren Pemanasan Nyata
              </span>
            </div>

            <div className="flex h-12 w-full rounded-xl overflow-hidden shadow-inner">
              {climate.warmingStripes.map((st) => (
                <div
                  key={st.year}
                  className="flex-1 transition-all hover:opacity-80 hover:scale-y-110 cursor-pointer"
                  style={{ backgroundColor: st.hexColor }}
                  title={`Tahun ${st.year}: Anomali ${st.anomalyC > 0 ? '+' : ''}${st.anomalyC}°C`}
                />
              ))}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1981 (-0.45°C Dingin)</span>
              <span>2000 (Transisi Netral)</span>
              <span>2026 (+0.88°C Terpanas)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-500">Status ENSO Samudra Pasifik:</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.enso.status} (ONI: {climate.enso.indexOni})</div>
              <p className="text-[11px] text-slate-500">{climate.enso.description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-500">Indian Ocean Dipole (IOD):</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.iod.status}</div>
              <p className="text-[11px] text-slate-500">{climate.iod.description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-500">Indeks Presipitasi (SPI):</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{climate.spi.category} ({climate.spi.indexValue})</div>
              <p className="text-[11px] text-slate-500">{climate.spi.note}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: AIR QUALITY & GREENHOUSE GAS */}
      {subModule === 'air_quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {airQuality.map((station) => (
              <div
                key={station.code}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{station.name}</h4>
                    <span className="text-[10px] text-slate-400">{station.province} • Elevasi {station.altitudeM} mdpl</span>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                    {station.code}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">PM2.5</span>
                    <span className="text-xs font-black text-purple-500">{station.pm25} µg/m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Ozon (O₃)</span>
                    <span className="text-xs font-black text-sky-500">{station.o3} µg/m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 block">NO₂ / SO₂</span>
                    <span className="text-xs font-black text-emerald-500">{station.no2} / {station.so2}</span>
                  </div>
                </div>

                {station.greenhouseGas && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gas Rumah Kaca (GRK) WMO GAW:</span>
                    </div>
                    <div>CO₂: <strong>{station.greenhouseGas.co2Ppm} ppm</strong> | CH₄: <strong>{station.greenhouseGas.ch4Ppb} ppb</strong></div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{station.greenhouseGas.note}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-400">
                  <span>pH Kimia Air Hujan: {station.rainChemistry.ph}</span>
                  <span>{station.rainChemistry.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: EARTHQUAKE & INATEWS */}
      {subModule === 'earthquake_tews' && (
        <div className="space-y-4">
          {/* Real-time Latest Earthquake Hero */}
          {autoGempa && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 border border-rose-500/30 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold uppercase">
                  Gempa Bumi Terkini Real-Time (InaTEWS BMKG)
                </span>
                <span className="text-xs text-slate-400">{autoGempa.date} • {autoGempa.time}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-400">M {autoGempa.magnitude}</span>
                    <span className="text-xs text-slate-300">Kedalaman: <strong>{autoGempa.depth}</strong></span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{autoGempa.location}</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">{autoGempa.potential}</p>
                  {autoGempa.felt && (
                    <div className="mt-2 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl inline-block">
                      Dirasakan: {autoGempa.felt}
                    </div>
                  )}
                </div>

                {autoGempa.shakemapUrl && (
                  <a
                    href={autoGempa.shakemapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 self-start shrink-0"
                  >
                    <span>Buka Shakemap Peta Guncangan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* List of Recent Earthquakes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Daftar Gempa Bumi M 5.0+ & Gempa Dirasakan Terkini
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[...recentQuakes, ...feltQuakes].slice(0, 6).map((g, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-500">M {g.magnitude}</span>
                    <span className="text-[10px] text-slate-400">{g.date}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{g.location}</div>
                  <div className="text-[10px] text-slate-400">Kedalaman: {g.depth}</div>
                  {g.felt && <div className="text-[9px] text-amber-500 font-medium">Skala: {g.felt}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: LIGHTNING & POTENTIAL GEOPHYSICS */}
      {subModule === 'lightning_geophysics' && geophysics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-amber-500" />
              <span>Sambaran Petir Real-time (Lightning Detection Network)</span>
            </h3>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {geophysics.lightning.strikesCount1Hour} <span className="text-xs font-semibold text-slate-500">sambaran/jam</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                CG Negatif: {geophysics.lightning.breakdown.cloudToGroundNegative} | CG Positif: {geophysics.lightning.breakdown.cloudToGroundPositive} | Intra-Cloud: {geophysics.lightning.breakdown.intraCloud}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Zona Densitas Petir Tertinggi:</span>
              {geophysics.lightning.highDensityZones.map((z, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{z.area}</span>
                  <span className="font-bold text-amber-500">{z.density}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-500" />
              <span>Gaya Berat Bouguer & Magnet Bumi</span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Anomali Gaya Berat Bouguer:</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {geophysics.gravity.interpretation}
              </p>
              <div className="text-[10px] text-slate-400 pt-1">Rentang: {geophysics.gravity.anomalyRangeIndonesia}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Parameter Medan Magnet Bumi:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>Deklinasi: <strong>{geophysics.geomagnetism.magneticFieldParameters.declination}</strong></div>
                <div>Inklinasi: <strong>{geophysics.geomagnetism.magneticFieldParameters.inclination}</strong></div>
                <div>Intensitas: <strong>{geophysics.geomagnetism.magneticFieldParameters.totalIntensityNt} nT</strong></div>
                <div>Status Badai: <strong>{geophysics.geomagnetism.geomagneticStormStatus.split('(')[0]}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 8: TIME & ASTRONOMY */}
      {subModule === 'time_astronomy' && timeSun && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Tanda Waktu Atom Nasional Terkalibrasi BMKG</span>
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Barat (WIB):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wib}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Tengah (WITA):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wita}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Indonesia Timur (WIT):</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{timeSun.atomicTime.wit}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400">{timeSun.atomicTime.standard}</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Jadwal Matahari, Kulminasi & Posisi Hilal</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Terbit Matahari</span>
                <span className="font-bold text-amber-500">{timeSun.solarSchedule.terbit}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Terbenam Matahari</span>
                <span className="font-bold text-amber-600">{timeSun.solarSchedule.terbenam}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-300">Kulminasi Utama / Hari Tanpa Bayangan:</div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{timeSun.solarSchedule.kulminasiUtama}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Fase Bulan: <strong>{timeSun.astronomy.moonPhase}</strong> | Tinggi Hilal: <strong>{timeSun.astronomy.hilalHeightDegrees}°</strong> ({timeSun.astronomy.imkanurRukyatStatus})
            </div>
          </div>
        </div>
      )}

      {/* MODULE 9: ENGINEERING SEISMOLOGY */}
      {subModule === 'engineering_seismology' && microzonation && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Seismologi Teknik: Mikrozonasi Seismik & Spektral Percepatan SNI 1726</span>
            </h3>
            <span className="text-[10px] text-slate-400">{microzonation.method}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Frekuensi Alami (f₀)</span>
              <span className="text-base font-black text-indigo-500">{microzonation.parameters.f0Hz} Hz</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Resonansi 4–6 lantai</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Amplifikasi Tanah (A₀)</span>
              <span className="text-base font-black text-rose-500">{microzonation.parameters.amplificationFactorA0}×</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Relatif batuan dasar</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Indeks Kerentanan (Kg)</span>
              <span className="text-base font-black text-amber-500">{microzonation.parameters.seismicVulnerabilityIndexKg}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Kg = A₀² / f₀</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Kecepatan Geser (Vs30)</span>
              <span className="text-base font-black text-emerald-500">{microzonation.parameters.vs30EstimatedMs} m/s</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{microzonation.soilClassification}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Rekomendasi Rekayasa Struktur Tahan Gempa BMKG:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {microzonation.engineeringRecommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* MODULE 10: SATU PETA MKG & STORY MAPS */}
      {subModule === 'satu_peta_story' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {storyMaps.map((st) => (
              <button
                key={st.id}
                onClick={() => setActiveStoryId(st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeStoryId === st.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {st.title.split('&')[0]}
              </button>
            ))}
          </div>

          {activeStory && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {activeStory.category}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">{activeStory.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{activeStory.summary}</p>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/20 pl-6">
                {activeStory.timeline.map((step, idx) => (
                  <div key={idx} className="relative space-y-1 text-xs">
                    <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{step.phase}</span>
                      <span className="text-[10px] text-slate-400">({step.timestamp})</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">{step.description}</p>
                    <span className="text-[10px] font-mono text-slate-400 block">Fitur: {step.geospatialFeature}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Insight Analitik Kunci:</span>
                <ul className="space-y-1 text-xs text-slate-500">
                  {activeStory.keyInsights.map((ins, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
