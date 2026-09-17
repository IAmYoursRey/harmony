import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sliders,
  Compass,
  Activity,
  Layers,
  Sparkles,
  Info,
  Radio,
} from 'lucide-react';
import { HarmonyChartEngine } from '../charts/HarmonyChartEngine';
import { WeatherConsensusData } from '@/services/weatherAggregatorService';

interface GeospatialChartsTabProps {
  weatherData?: WeatherConsensusData | null;
  earthquakes?: any[];
  regionName?: string;
}

export const GeospatialChartsTab: React.FC<GeospatialChartsTabProps> = ({
  weatherData,
  earthquakes = [],
  regionName = 'Indonesia',
}) => {
  const [selectedDomainPreset, setSelectedDomainPreset] = useState<
    'weather' | 'seismic' | 'climate' | 'hydrology'
  >('weather');

  const defaultChartForPreset: Record<string, string> = {
    weather: 'wind_rose',
    seismic: 'seismograph',
    climate: 'fan_chart',
    hydrology: 'waterfall',
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Studio Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              Data Visualization & Chart Engine Studio
            </span>
            <span className="text-[11px] text-slate-400">
              30+ Jenis Grafik Analitik Terpadu
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Mesin Visualisasi Data Spasial, Atmosfer & Ilmiah</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Pilih jenis grafik yang paling sesuai dengan tujuan pertanyaan data: perbandingan kategori, linimasa tren waktu, komposisi bagian, sebaran statistik, korelasi variabel, mawar angin (wind rose), hingga seismogram getaran bumi.
          </p>
        </div>

        {/* Domain Presets */}
        <div className="flex items-center gap-1.5 p-1 bg-white/10 dark:bg-slate-800/80 rounded-2xl border border-white/10 self-start sm:self-center shrink-0 overflow-x-auto no-scrollbar touch-pan-x max-w-full">
          {[
            { id: 'weather', label: '🌤️ Cuaca & Angin' },
            { id: 'seismic', label: '🌋 Seismik & Gempa' },
            { id: 'climate', label: '🌍 Iklim & Ensemble' },
            { id: 'hydrology', label: '💧 Neraca Hidrologi' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedDomainPreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDomainPreset === preset.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Engine Viewport */}
      <HarmonyChartEngine
        key={selectedDomainPreset}
        weatherData={weatherData}
        earthquakes={earthquakes}
        defaultChartId={defaultChartForPreset[selectedDomainPreset]}
      />

      {/* Scientific Guidance Footnote */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Pedoman Pemilihan Visualisasi Data Harmony:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-indigo-500 block mb-0.5">Perbandingan Antar Kategori</span>
            Gunakan Bar, Column, atau Grouped Bar untuk komparasi nilai nominal yang presisi.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-sky-500 block mb-0.5">Perubahan Terhadap Waktu</span>
            Gunakan Line, Area, atau Fan Chart jika ingin memperlihatkan ketidakpastian proyeksi masa depan.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-emerald-500 block mb-0.5">Sebaran & Distribusi</span>
            Gunakan Histogram, Box Plot, atau Density untuk melihat median, kuartil, dan keberadaan pencilan (*outliers*).
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-rose-500 block mb-0.5">Arah & Dinamika Vektor</span>
            Gunakan Wind Rose untuk 16 penjuru angin atau Seismogram untuk gelombang akselerasi tanah.
          </div>
        </div>
      </div>
    </div>
  );
};
