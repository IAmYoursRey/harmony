import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Search,
  X,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  Check,
  Compass,
  Activity,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ALL_CHARTS,
  CHART_CATEGORIES,
  ChartCategory,
  ChartDefinition,
} from './chartTaxonomy';
import { buildWindRose, summarizeTemperature } from '@/services/geospatial/chartStatistics';
import { WeatherConsensusData } from '@/services/weatherAggregatorService';

interface HarmonyChartEngineProps {
  weatherData?: WeatherConsensusData | null;
  earthquakes?: any[];
  defaultChartId?: string;
  className?: string;
  showSelectorModal?: boolean;
  title?: string;
  description?: string;
}

const PALETTE = [
  '#6366f1',
  '#38bdf8',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

export const HarmonyChartEngine: React.FC<HarmonyChartEngineProps> = ({
  weatherData,
  earthquakes = [],
  defaultChartId = 'line',
  className = '',
  title,
  description,
}) => {
  const [selectedChartId, setSelectedChartId] = useState<string>(defaultChartId);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily'>('hourly');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const activeChart = useMemo(() => {
    return ALL_CHARTS.find((c) => c.id === selectedChartId) || ALL_CHARTS[0];
  }, [selectedChartId]);

  const filteredCharts = useMemo(() => {
    return ALL_CHARTS.filter((chart) => {
      const matchCat = activeCategory === 'all' || chart.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        chart.name.toLowerCase().includes(q) ||
        chart.description.toLowerCase().includes(q) ||
        chart.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const timeSeriesData: any[] = useMemo<any[]>(() => {
    if (!weatherData) return [];
    if (timeframe === 'hourly') {
      return weatherData.hourly.map((h) => {
        const e = (h.humidity / 100) * 6.105 * Math.exp((17.27 * h.temperature) / (237.7 + h.temperature));
        const apparentTemp = h.apparentTemp ?? null;
        return {
          label: h.label,
          hour: h.hour,
          temperature: h.temperature,
          apparentTemp,


          precipitation: h.precipitation,
          precipitationProb: h.precipitationProb,
          windSpeed: h.windSpeed,
          windGust: h.windGusts ?? null,
          windDirection: Number.isFinite(h.windDirection) ? h.windDirection : null,
          pressure: h.pressure,
          humidity: h.humidity,
          pm25: h.pm25,
          ozone: h.ozone,
          uvIndex: h.uvIndex,
          ecmwf: h.ecmwfTemp ?? null,
          gfs: h.gfsTemp ?? null,
          icon: h.iconTemp ?? null,
          jma: h.jmaTemp ?? null,
        };
      });
    } else {
      return weatherData.daily.map((d) => ({
        label: d.dayName,
        temperature: d.tempMax,
        tempMin: d.tempMin,
        apparentTemp: d.apparentTempMax ?? null,


        precipitation: d.precipitationSum,
        precipitationProb: d.precipitationProbMax,
        windSpeed: d.windSpeedMax,
        windGust: d.windGustMax ?? null,
        windDirection: null,
        uvIndex: d.uvIndexMax,
        ecmwf: d.ecmwfTempMax ?? null,
        gfs: d.gfsTempMax ?? null,
        icon: d.iconTempMax ?? null,
        jma: null,
      }));
    }
  }, [weatherData, timeframe]);

  const seismicScatterData = useMemo(() => earthquakes.flatMap((event, index) => {
    const magnitude = event.mag ?? event.magnitude;
    const depth = event.depthKm ?? event.depth;
    if (!Number.isFinite(magnitude) || !Number.isFinite(depth)) return [];
    return [{ id: index, place: event.place || event.location || 'Pusat Gempa', magnitude, depth,
      zone: depth < 70 ? 'Dangkal (<70 km)' : 'Menengah/dalam (≥70 km)' }];
  }), [earthquakes]);

  const windRose = useMemo(() => buildWindRose(timeSeriesData), [timeSeriesData]);
  const windRoseData = windRose.bins;
  const statDistributionData = useMemo(() => summarizeTemperature(timeSeriesData.map(d => d.temperature)), [timeSeriesData]);
  const sampleUnit = timeframe === 'hourly' ? 'jam' : 'hari';

  // Only charts backed by supplied provider data can be rendered. Catalogue entries
  // requiring radar profiles, waves, sensors, or calibrated ensembles remain unavailable.
  const supportedCharts = new Set([
    'bar', 'horizontal_bar', 'grouped_bar', 'lollipop',
    'bullet', 'line', 'multi_line', 'step_line', 'area', 'forecast', 'scatter',
    'meteogram', 'aqi_gauge', 'depth_mag_scatter', 'wind_rose', 'histogram', 'boxplot'
  ]);
  const chartUnavailable = !supportedCharts.has(activeChart.id) ||
    (activeChart.id === 'depth_mag_scatter' ? !seismicScatterData.length :
      activeChart.id === 'aqi_gauge' ? weatherData?.current?.pm25 == null :
      activeChart.id === 'wind_rose' ? !windRoseData.length :
      (activeChart.id === 'boxplot' || activeChart.id === 'histogram') ? statDistributionData.validCount < 4 :
      !timeSeriesData.length);

  const renderChartCanvas = () => {
    switch (activeChart.id) {
      // 1. COMPARISON
      case 'bar':
        return (
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit=" mm" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="precipitation" name="Presipitasi / Curah Hujan (mm)" fill="#0284c7" radius={[6, 6, 0, 0]} />
          </BarChart>
        );

      case 'horizontal_bar':
        return (
          <BarChart data={timeSeriesData.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} width={55} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="windSpeed" name="Kecepatan Angin (km/h)" fill="#14b8a6" radius={[0, 6, 6, 0]} />
          </BarChart>
        );

      case 'grouped_bar':
        return (
          <BarChart data={timeSeriesData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="ecmwf" name="ECMWF IFS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gfs" name="GFS NOAA" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="icon" name="ICON DWD" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="temperature" name="Open-Meteo Best Match" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'lollipop':
        return (
          <ComposedChart data={timeSeriesData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="windGust" name="Batang Garis" fill="#8b5cf6" barSize={3} />
            <Line type="monotone" dataKey="windGust" name="Hembusan Puncak (km/h)" stroke="#a855f7" strokeWidth={0} dot={{ r: 6, fill: '#8b5cf6' }} />
          </ComposedChart>
        );

      case 'bullet':
        return (
          <BarChart data={timeSeriesData.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 50]} />
            <YAxis type="category" dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} width={55} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="precipitation" name="Prakiraan Curah Hujan (mm)" fill="#0284c7" barSize={12} radius={[0, 4, 4, 0]} />

          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" name="Suhu Prakiraan (°C)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        );

      case 'multi_line':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="ecmwf" name="ECMWF" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="gfs" name="GFS" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="icon" name="ICON" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="temperature" name="Open-Meteo Best Match" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        );

      case 'step_line':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="stepAfter" dataKey="temperature" name="Suhu Step (°C)" stroke="#f59e0b" strokeWidth={2.5} />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="temperature" name="Suhu Prakiraan (°C)" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2.5} />
            <Area type="monotone" dataKey="apparentTemp" name="Suhu Terasa (°C)" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        );

      case 'forecast':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" name="Suhu Prakiraan Penyedia" stroke="#10b981" strokeWidth={2.5} />
            <Line type="monotone" dataKey="apparentTemp" name="Suhu Terasa dari Penyedia" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        );

      case 'wind_rose':
        return (
          <RadarChart data={windRoseData} outerRadius="75%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="direction" stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 'bold' }} />
            <PolarRadiusAxis stroke="#64748b" tick={{ fontSize: 9 }} unit="%" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Radar name="Arah angin dari sampel prakiraan (%)" dataKey="frequency" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
            <Radar name="Kecepatan >15 km/h (%)" dataKey="strongPct" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
          </RadarChart>
        );

      case 'histogram':
        return (
          <BarChart data={statDistributionData.histogram}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="binRange" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit={` ${sampleUnit}`} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="frekuensi" name={`Frekuensi sampel prakiraan (${sampleUnit})`} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'boxplot':
        return (
          <div className="flex flex-col justify-center h-full space-y-4 p-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="font-bold text-slate-200">Statistik kuartil prakiraan suhu ({statDistributionData.validCount} sampel {sampleUnit})</span>
              <span className="text-[10px] text-slate-400">Kuartil dengan interpolasi linear</span>
            </div>
            <svg viewBox="0 0 500 70" role="img" aria-label="Box plot prakiraan suhu; garis ujung menunjukkan minimum dan maksimum" className="w-full h-20">
              {(() => {
                const low = statDistributionData.min ?? 0, high = statDistributionData.max ?? low;
                const x = (value: number | null) => high === low ? 250 : 40 + ((value ?? low) - low) / (high - low) * 420;
                return <g stroke="#38bdf8" strokeWidth="2">
                  <line x1={x(low)} x2={x(high)} y1="35" y2="35" />
                  <line x1={x(low)} x2={x(low)} y1="20" y2="50" /><line x1={x(high)} x2={x(high)} y1="20" y2="50" />
                  <rect x={x(statDistributionData.q1)} y="15" width={Math.max(1, x(statDistributionData.q3)-x(statDistributionData.q1))} height="40" fill="#6366f133" />
                  <line x1={x(statDistributionData.median)} x2={x(statDistributionData.median)} y1="15" y2="55" stroke="#34d399" />
                </g>;
              })()}
            </svg>
            <p className="text-slate-400 text-center">Kotak Q1–Q3, garis median; ujung garis menunjukkan minimum dan maksimum sampel.</p>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Min</span>
                <span className="text-sm font-bold text-sky-400">{statDistributionData.min?.toFixed(1)}°C</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kuartil 1 (Q1)</span>
                <span className="text-sm font-bold text-indigo-400">{statDistributionData.q1?.toFixed(1)}°C</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-indigo-500/40 bg-indigo-950/20">
                <span className="text-[10px] text-indigo-300 block font-semibold">Median (Q2)</span>
                <span className="text-base font-extrabold text-emerald-400">{statDistributionData.median?.toFixed(1)}°C</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kuartil 3 (Q3)</span>
                <span className="text-sm font-bold text-amber-400">{statDistributionData.q3?.toFixed(1)}°C</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Max</span>
                <span className="text-sm font-bold text-rose-400">{statDistributionData.max?.toFixed(1)}°C</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Rentang Antarkuartil (IQR): <strong>{((statDistributionData.q3 ?? 0) - (statDistributionData.q1 ?? 0)).toFixed(1)}°C</strong> • Dihitung dari sampel prakiraan valid; bukan pengamatan stasiun.
            </div>
          </div>
        );

      // 3. COMPOSITION
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" dataKey="temperature" name="Suhu (°C)" stroke="#94a3b8" unit="°C" />
            <YAxis type="number" dataKey="humidity" name="Kelembapan (%)" stroke="#94a3b8" unit="%" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Scatter name="Korelasi Suhu vs Kelembapan" data={timeSeriesData} fill="#6366f1" />
          </ScatterChart>
        );

      case 'meteogram':
        return (
          <ComposedChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="temp" stroke="#6366f1" unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="rain" orientation="right" stroke="#38bdf8" unit=" mm" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Area yAxisId="rain" type="monotone" dataKey="precipitation" name="Presipitasi (mm)" fill="#38bdf8" stroke="#0284c7" fillOpacity={0.3} />
            <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Suhu (°C)" stroke="#6366f1" strokeWidth={2.5} />
            <Line yAxisId="temp" type="monotone" dataKey="apparentTemp" name="Suhu Terasa (°C)" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" />
          </ComposedChart>
        );

      case 'aqi_gauge':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-3">
            <div className="relative w-44 h-24 overflow-hidden">
              <div className="w-44 h-44 rounded-full border-[14px] border-emerald-500 border-t-amber-500 border-r-rose-500 transform rotate-45" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {weatherData?.current?.pm25 != null ? weatherData.current.pm25 : '—'}
                </span>
                <span className={`text-[10px] uppercase font-bold ${
                  weatherData?.current?.aqiLevel === 'Baik' ? 'text-emerald-500' :
                  weatherData?.current?.aqiLevel === 'Sedang' ? 'text-sky-500' :
                  weatherData?.current?.aqiLevel === 'Tidak Sehat' ? 'text-amber-500' :
                  weatherData?.current?.aqiLevel === 'Berbahaya' ? 'text-rose-500' :
                  'text-slate-400'
                }`}>
                  {weatherData?.current?.aqiLevel ?? 'ISPU Tersedia'}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Konsentrasi Partikulat PM2.5 (µg/m³) • Prakiraan CAMS; bukan AQI atau pengukuran stasiun
            </div>
          </div>
        );

      // 7. SEISMIC & EARTHQUAKE
      case 'depth_mag_scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" dataKey="magnitude" name="Magnitudo (M)" stroke="#94a3b8" domain={[2.5, 7.5]} unit=" M" />
            <YAxis type="number" dataKey="depth" name="Kedalaman (km)" stroke="#94a3b8" reversed unit=" km" domain={[0, 250]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Scatter name="Episenter Gempa (Kedalaman vs Magnitudo)" data={seismicScatterData} fill="#f43f5e" />
          </ScatterChart>
        );

    }
  };

  const isRechartsComponent = useMemo(() => {
    return [
      'bar',
      'horizontal_bar',
      'grouped_bar',
      'stacked_bar',
      'percent_stacked',
      'lollipop',
      'bullet',
      'radar',
      'wind_rose',
      'line',
      'multi_line',
      'step_line',
      'area',
      'stacked_area',
      'streamgraph',
      'fan_chart',
      'forecast',
      'donut',
      'pie',
      'polar_rose',
      'waterfall',
      'histogram',
      'ogive',
      'pareto',
      'scatter',
      'bubble',
      'meteogram',
      'depth_mag_scatter',
      'gutenberg_richter',
      'isoseismal_curve',
    ].includes(activeChart.id);
  }, [activeChart.id]);

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-sm ${className}`}>
      {/* Engine Header & Quick Mode Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{activeChart.icon}</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {title || activeChart.name}
            </h3>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {activeChart.categoryName} • {activeChart.name}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
              {activeChart.complexity}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
            {description || activeChart.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {/* Timeframe selector for timeseries charts */}
          {['trend', 'compare', 'weather_scientific'].includes(activeChart.category) && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setTimeframe('hourly')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeframe === 'hourly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                24 Jam
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('daily')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeframe === 'daily'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                7-14 Hari
              </button>
            </div>
          )}

          {/* Master Catalog Launcher Button */}
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pilih Jenis Grafik (30+ Tipe)</span>
          </button>
        </div>
      </div>

      {/* Quick Access Top Chart Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x pb-1 text-xs font-bold">
        {[
          { id: 'line', label: '📈 Line Suhu' },
          { id: 'bar', label: '🌧️ Bar Hujan' },
          { id: 'wind_rose', label: '🧭 Wind Rose' },
          { id: 'meteogram', label: '📊 Meteogram' },
          { id: 'fan_chart', label: '🪭 Fan Chart' },
          { id: 'sounding', label: '🎈 Sounding Skew-T' },
          { id: 'wave_rose', label: '🌊 Swell Rose' },
          { id: 'violin_density', label: '🎻 Violin Density' },
          { id: 'boxplot', label: '📦 Box Plot' },
          { id: 'seismograph', label: '⚡ Seismogram' },
          { id: 'depth_mag_scatter', label: '🌋 Kedalaman Gempa' },
          { id: 'gutenberg_richter', label: '📉 Gutenberg-Richter' },
          { id: 'isoseismal_curve', label: '📐 Isoseismal MMI' },
          { id: 'calendar_heatmap', label: '📅 Kalender HTH' },
          { id: 'sankey_flow', label: '🔀 Sankey Aliran' },
          { id: 'parallel_coords', label: '📏 Parallel Coords' },
          { id: 'treemap', label: '🔲 Treemap Wilayah' },
          { id: 'funnel', label: '⏳ Funnel Respons' },
          { id: 'aqi_gauge', label: '🧭 Dial AQI' },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setSelectedChartId(pill.id)}
            className={`px-2.5 py-1.5 rounded-xl shrink-0 transition-all select-none cursor-pointer ${
              selectedChartId === pill.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-extrabold scale-[1.02]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {activeChart.id === 'wind_rose' && windRose.sampleCount > 0 && <p className="text-xs text-slate-500 dark:text-slate-300">{windRose.sampleCount} sampel prakiraan; angin tenang (&lt;{windRose.calmThresholdKmh} km/h): {windRose.calmPct.toFixed(1)}%. Arah menunjukkan asal angin; sampel kosong tidak dihitung.</p>}
      {/* Main Responsive Canvas Viewport */}
      <div className={`w-full transition-all duration-300 ${isExpanded ? 'h-[500px]' : 'h-64 sm:h-72'}`}>
        {chartUnavailable ? (
          <div role="status" className="h-full flex flex-col items-center justify-center text-center p-5 gap-2 text-slate-500 dark:text-slate-300">
            <Info className="w-6 h-6" />
            <strong>Data untuk grafik ini belum tersedia</strong>
            <p className="text-xs max-w-lg">Sumber dan perhitungan yang diperlukan belum terhubung atau belum menghasilkan data valid. Grafik tidak diisi dengan angka contoh.</p>
          </div>
        ) : isRechartsComponent ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChartCanvas()}
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col justify-center">
            {renderChartCanvas()}
          </div>
        )}
      </div>

      {/* Contextual Analytical Insights Bar */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            <strong>Kasus Penggunaan Terbaik:</strong> {activeChart.useCase}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
          <span>Kategori: <strong>{activeChart.categoryName}</strong></span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Buka Katalog Lengkap →
          </button>
        </div>
      </div>

      {/* MODAL: Full Visual Chart Catalog Picker */}
      {isCatalogOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsCatalogOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Katalog Lengkap Jenis Grafik & Visualisasi Data
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih visualisasi optimal sesuai dengan tujuan analisis (Perbandingan, Tren, Distribusi, Korelasi, Meteorologi, Seismologi)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input name="searchQuery" id="harmonychartengine-searchquery"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari grafik berdasarkan nama atau fungsi (cth: wind rose, seismogram, boxplot, fan chart, scatter, pareto)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                    activeCategory === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  🌟 Semua Kategori ({ALL_CHARTS.length})
                </button>
                {CHART_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                      activeCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon} {cat.name.split('(')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Chart Cards */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-h-[300px] max-h-[55vh]">
              {filteredCharts.map((chart) => {
                const isSelected = selectedChartId === chart.id;
                return (
                  <div
                    key={chart.id}
                    onClick={() => {
                      setSelectedChartId(chart.id);
                      setIsCatalogOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left group ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{chart.icon}</span>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          {chart.categoryName}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {chart.name}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {chart.description}
                      </p>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{chart.complexity}</span>
                      {isSelected ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Sedang Aktif
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-indigo-500 transition-colors font-semibold">
                          Pilih Grafik →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredCharts.length} dari {ALL_CHARTS.length} tipe grafik analitik</span>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="px-3.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
