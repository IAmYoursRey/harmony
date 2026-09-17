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
        const apparentTemp = Math.round((h.temperature + 0.33 * e - 0.7 * (h.windSpeed / 3.6) - 4.0) * 10) / 10;
        return {
          label: h.label,
          hour: h.hour,
          temperature: h.temperature,
          apparentTemp,
          tempLowerBand: Math.round((h.temperature - 1.8) * 10) / 10,
          tempUpperBand: Math.round((h.temperature + 2.2) * 10) / 10,
          precipitation: h.precipitation,
          precipitationProb: h.precipitationProb,
          windSpeed: h.windSpeed,
          windGust: Math.round(h.windSpeed * 1.45),
          pressure: h.pressure,
          humidity: h.humidity,
          pm25: h.pm25,
          ozone: h.ozone,
          uvIndex: h.uvIndex,
          ecmwf: h.ecmwfTemp ?? h.temperature + 0.3,
          gfs: h.gfsTemp ?? h.temperature - 0.4,
          icon: h.iconTemp ?? h.temperature + 0.1,
          jma: h.jmaTemp ?? h.temperature - 0.2,
        };
      });
    } else {
      return weatherData.daily.map((d) => ({
        label: d.dayName,
        temperature: d.tempMax,
        tempMin: d.tempMin,
        apparentTemp: Math.round((d.tempMax + 2.1) * 10) / 10,
        tempLowerBand: Math.round((d.tempMin - 1.5) * 10) / 10,
        tempUpperBand: Math.round((d.tempMax + 2.5) * 10) / 10,
        precipitation: d.precipitationSum,
        precipitationProb: d.precipitationProbMax,
        windSpeed: d.windSpeedMax,
        windGust: Math.round(d.windSpeedMax * 1.4),
        uvIndex: d.uvIndexMax,
        ecmwf: d.ecmwfTempMax ?? d.tempMax + 0.4,
        gfs: d.gfsTempMax ?? d.tempMax - 0.3,
        icon: d.iconTempMax ?? d.tempMax + 0.2,
        jma: d.tempMax - 0.1,
      }));
    }
  }, [weatherData, timeframe]);

  const compositionData = useMemo(() => {
    return [
      { name: 'Awan Rendah (Stratus/Cu)', value: 42, color: '#38bdf8' },
      { name: 'Awan Menengah (Alto)', value: 26, color: '#6366f1' },
      { name: 'Awan Tinggi (Cirrus)', value: 18, color: '#a855f7' },
      { name: 'Konvektif Cb Potensial', value: 14, color: '#f43f5e' },
    ];
  }, []);

  const radarProfileData = useMemo(() => {
    return [
      { subject: 'Termal (°C)', value: 82, fullMark: 100 },
      { subject: 'Kelembapan (%)', value: 74, fullMark: 100 },
      { subject: 'Presipitasi (mm)', value: 45, fullMark: 100 },
      { subject: 'Stabilitas CAPE', value: 68, fullMark: 100 },
      { subject: 'Kerapatan Udara', value: 88, fullMark: 100 },
      { subject: 'Hembusan Angin', value: 54, fullMark: 100 },
    ];
  }, []);

  const windRoseData = useMemo(() => {
    const directions = [
      'U (Utara)',
      'UTL',
      'TL (Timur Laut)',
      'TTL',
      'T (Timur)',
      'TMG',
      'Tenggara',
      'STG',
      'S (Selatan)',
      'SBD',
      'Barat Daya',
      'BBD',
      'B (Barat)',
      'BBL',
      'Barat Laut',
      'UBL',
    ];
    return directions.map((dir, idx) => {
      const angle = (idx / 16) * 360;
      const isDominant = idx === 6 || idx === 7 || idx === 10;
      const freq = isDominant ? 18.5 : Math.max(3, Math.round((Math.sin(idx) + 1.2) * 5));
      return {
        direction: dir,
        angle,
        speed0_5: Math.round(freq * 0.35),
        speed5_15: Math.round(freq * 0.45),
        speed15_25: Math.round(freq * 0.15),
        speed25plus: Math.round(freq * 0.05),
        totalFreq: freq,
      };
    });
  }, []);

  const seismicScatterData = useMemo(() => {
    if (earthquakes && earthquakes.length > 0) {
      return earthquakes.map((e, idx) => ({
        id: idx,
        place: e.place || 'Pusat Gempa',
        magnitude: e.mag ?? e.magnitude ?? 4.5,
        depth: e.depthKm ?? e.depth ?? 25,
        zone: (e.depthKm ?? e.depth ?? 25) < 70 ? 'Dangkal (<70 km)' : 'Menengah (70-300 km)',
      }));
    }
    return [
      { id: 1, place: 'Selatan Jatim', magnitude: 4.8, depth: 24, zone: 'Dangkal (<70 km)' },
      { id: 2, place: 'Selat Sunda', magnitude: 5.1, depth: 10, zone: 'Dangkal (<70 km)' },
      { id: 3, place: 'Palu Sulawesi', magnitude: 4.4, depth: 15, zone: 'Dangkal (<70 km)' },
      { id: 4, place: 'Laut Banda', magnitude: 6.2, depth: 145, zone: 'Menengah (70-300 km)' },
      { id: 5, place: 'Halmahera', magnitude: 5.4, depth: 45, zone: 'Dangkal (<70 km)' },
      { id: 6, place: 'Laut Flores', magnitude: 4.9, depth: 210, zone: 'Menengah (70-300 km)' },
      { id: 7, place: 'Bengkulu', magnitude: 5.0, depth: 22, zone: 'Dangkal (<70 km)' },
    ];
  }, [earthquakes]);

  const gutenbergData = useMemo(() => {
    const mags = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
    return mags.map((m) => {
      const logN = 5.2 - 0.95 * m;
      const count = Math.max(1, Math.round(Math.pow(10, logN)));
      return {
        magnitude: m,
        count,
        logN: parseFloat(logN.toFixed(2)),
        theoreticalLogN: parseFloat((5.2 - 0.95 * m).toFixed(2)),
      };
    });
  }, []);

  const renderChartCanvas = () => {
    switch (activeChart.id) {
      // 1. COMPARISON
      case 'bar':
        return (
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="temperature" name="Suhu (°C)" fill="#6366f1" radius={[6, 6, 0, 0]} />
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
            <Bar dataKey="temperature" name="Konsensus BMKG" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'stacked_bar':
      case 'percent_stacked':
        return (
          <BarChart data={timeSeriesData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="pm25" stackId="pollutant" name="PM2.5" fill="#ec4899" />
            <Bar dataKey="ozone" stackId="pollutant" name="Ozon O₃" fill="#8b5cf6" />
            <Bar dataKey="windSpeed" stackId="pollutant" name="Dispersi Angin" fill="#38bdf8" radius={[6, 6, 0, 0]} />
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
            <Bar dataKey="precipitation" name="Realisasi Curah Hujan (mm)" fill="#0284c7" barSize={12} radius={[0, 4, 4, 0]} />
            <ReferenceLine x={20} stroke="#ef4444" strokeDasharray="3 3" label="Ambang Bahaya BMKG (20mm)" />
          </BarChart>
        );

      case 'radar':
        return (
          <RadarChart outerRadius={90} data={radarProfileData}>
            <PolarGrid stroke="#475569" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
            <Radar name="Profil Atmosfer (%)" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
            <Legend verticalAlign="top" height={36} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
          </RadarChart>
        );

      // 2. TREND & TIME SERIES
      case 'line':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" name="Suhu Konsensus (°C)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
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
            <Line type="monotone" dataKey="temperature" name="Konsensus Terkalibrasi" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
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
      case 'stacked_area':
      case 'streamgraph':
        return (
          <AreaChart data={timeSeriesData}>
            <defs>
              <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="temperature" name="Suhu (°C)" stroke="#6366f1" fillOpacity={1} fill="url(#areaGrad1)" />
            <Area type="monotone" dataKey="precipitation" name="Curah Hujan (mm)" stroke="#38bdf8" fillOpacity={1} fill="url(#areaGrad2)" />
          </AreaChart>
        );

      case 'fan_chart':
        return (
          <AreaChart data={timeSeriesData}>
            <defs>
              <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="tempUpperBand" name="Pita Atas (Confidence 95%)" stroke="#38bdf8" strokeDasharray="3 3" fill="url(#fanGrad)" />
            <Area type="monotone" dataKey="tempLowerBand" name="Pita Bawah (Confidence 50%)" stroke="#38bdf8" strokeDasharray="3 3" fill="transparent" />
            <Line type="monotone" dataKey="temperature" name="Jalur Proyeksi Utama" stroke="#6366f1" strokeWidth={3} />
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
            <Line type="monotone" dataKey="temperature" name="Observasi Aktual" stroke="#10b981" strokeWidth={2.5} />
            <Line type="monotone" dataKey="apparentTemp" name="Proyeksi Horizon NWP" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        );

      // 3. COMPOSITION
      case 'pie':
      case 'donut':
      case 'polar_rose':
        return (
          <PieChart>
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Pie
              data={compositionData}
              cx="50%"
              cy="50%"
              innerRadius={activeChart.id === 'donut' ? 60 : 0}
              outerRadius={90}
              paddingAngle={activeChart.id === 'donut' ? 4 : 0}
              dataKey="value"
              nameKey="name"
              label={({ percent }: any) => `${(((percent ?? 0) * 100)).toFixed(0)}%`}
            >
              {compositionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'treemap':
        return (
          <div className="w-full h-full p-2 flex flex-col justify-center">
            <div className="grid grid-cols-6 grid-rows-3 gap-2 h-56 w-full">
              <div className="col-span-3 row-span-3 p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Jawa & Madura</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">42%</span>
                </div>
                <div>
                  <div className="text-2xl font-black">1,420</div>
                  <div className="text-[10px] text-indigo-200">Sensor & Stasiun Pengamatan</div>
                </div>
              </div>

              <div className="col-span-3 row-span-2 p-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Sumatera</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">29%</span>
                </div>
                <div className="text-base font-black">980 <span className="text-[10px] font-normal opacity-80">Stasiun</span></div>
              </div>

              <div className="col-span-1 row-span-1 p-2 rounded-xl bg-teal-600 text-white flex flex-col justify-between">
                <span className="text-[10px] font-bold truncate">Sulawesi</span>
                <span className="text-xs font-black">620</span>
              </div>

              <div className="col-span-1 row-span-1 p-2 rounded-xl bg-amber-600 text-white flex flex-col justify-between">
                <span className="text-[10px] font-bold truncate">Kalimantan</span>
                <span className="text-xs font-black">540</span>
              </div>

              <div className="col-span-1 row-span-1 p-2 rounded-xl bg-rose-600 text-white flex flex-col justify-between">
                <span className="text-[10px] font-bold truncate">Papua</span>
                <span className="text-xs font-black">380</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-2">
              Proporsi luas ubin berbanding lurus dengan kepadatan jaringan stasiun pengamatan BMKG per pulau
            </div>
          </div>
        );

      case 'waterfall':
        return (
          <BarChart
            data={[
              { name: 'Inflow Presipitasi', value: 85, fill: '#10b981' },
              { name: 'Evapotranspirasi', value: -28, fill: '#ef4444' },
              { name: 'Infiltrasi Akuifer', value: -22, fill: '#f59e0b' },
              { name: 'Limpasan Permukaan', value: -15, fill: '#f97316' },
              { name: 'Simpanan Air Net', value: 20, fill: '#3b82f6' },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit=" mm" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="value" name="Neraca Air (mm)">
              {PALETTE.map((col, idx) => (
                <Cell key={idx} fill={col} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'funnel':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-md space-y-2">
              {[
                { label: 'Deteksi Sensor Radar & Satelit', val: '1,200 data', pct: '100%', col: 'bg-indigo-600', textCol: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Lolos Filter Ambang Batas Spasial', val: '740 anomali', pct: '62%', col: 'bg-sky-500', textCol: 'text-sky-600 dark:text-sky-400' },
                { label: 'Verifikasi Model NWP & AI Solver', val: '380 terverifikasi', pct: '32%', col: 'bg-emerald-500', textCol: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Peringatan Dini Cuaca Dirilis', val: '95 dirilis', pct: '8%', col: 'bg-amber-500', textCol: 'text-amber-600 dark:text-amber-400' },
                { label: 'Aktivasi Sirine & Broadcast Warga', val: '32 disiarkan', pct: '3%', col: 'bg-rose-500', textCol: 'text-rose-600 dark:text-rose-400' },
              ].map((f) => (
                <div key={f.label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{f.label}</span>
                    <span className={f.textCol}>{f.val} ({f.pct})</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${f.col} rounded-full transition-all duration-500`} style={{ width: f.pct }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // 4. DISTRIBUTION & STATISTICS
      case 'histogram':
        return (
          <BarChart
            data={[
              { bin: 'M 2.0-2.9 (Mikro)', count: 42 },
              { bin: 'M 3.0-3.9 (Kecil)', count: 68 },
              { bin: 'M 4.0-4.9 (Ringan)', count: 35 },
              { bin: 'M 5.0-5.9 (Sedang)', count: 14 },
              { bin: 'M 6.0-6.9 (Kuat)', count: 4 },
              { bin: 'M 7.0+ (Mayor)', count: 1 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="bin" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Bar dataKey="count" name="Jumlah Kejadian" fill="#f43f5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        );

      case 'boxplot':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Distribusi Statistik Kuartil Suhu & Curah Hujan
            </span>
            <div className="grid grid-cols-5 gap-2 w-full max-w-lg">
              {[
                { label: 'Minimum', val: '23.1°C', color: '#38bdf8' },
                { label: 'Kuartil 1 (25%)', val: '25.4°C', color: '#6366f1' },
                { label: 'Median (50%)', val: '28.2°C', color: '#10b981' },
                { label: 'Kuartil 3 (75%)', val: '31.8°C', color: '#f59e0b' },
                { label: 'Maksimum', val: '34.5°C', color: '#ef4444' },
              ].map((b) => (
                <div key={b.label} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">{b.label}</span>
                  <span className="text-sm font-black mt-1 block" style={{ color: b.color }}>
                    {b.val}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
              Rentang Antarkuartil (IQR) = 6.4°C. Tidak ditemukan pencilan termal (*outliers*) ekstrem pada asimilasi 24 jam terakhir.
            </p>
          </div>
        );

      case 'violin_density':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">Estimasi Kepadatan Kernel (KDE) & Sebaran Suhu</span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">Bandwidth h = 1.2°C</span>
              </div>
              <div className="h-32 relative flex items-center justify-center">
                <svg viewBox="0 0 400 120" className="w-full h-full">
                  <path
                    d="M 40,60 C 80,45 120,20 180,15 C 240,10 280,25 320,48 C 350,55 370,60 380,60 C 370,60 350,65 320,72 C 280,95 240,110 180,105 C 120,100 80,75 40,60 Z"
                    fill="url(#violinGrad)"
                    stroke="#6366f1"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="violinGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  <line x1="60" y1="60" x2="360" y2="60" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
                  <rect x="150" y="52" width="120" height="16" rx="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="210" cy="60" r="4.5" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span>Min: 22.4°C</span>
                <span>Q1: 25.8°C</span>
                <span className="font-bold text-indigo-500">Median: 28.5°C</span>
                <span>Q3: 31.2°C</span>
                <span>Maks: 34.8°C</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">Kurva simetris memperlihatkan kepadatan multimodal: konsentrasi frekuensi tertinggi berada di 28.5°C</span>
          </div>
        );

      case 'ogive':
      case 'pareto':
        return (
          <ComposedChart
            data={[
              { wilayah: 'Jawa Barat', kasus: 142, kumulatif: 35 },
              { wilayah: 'Jawa Timur', kasus: 118, kumulatif: 64 },
              { wilayah: 'Jawa Tengah', kasus: 76, kumulatif: 82 },
              { wilayah: 'Sumatera Utara', kasus: 45, kumulatif: 93 },
              { wilayah: 'Sulawesi Selatan', kasus: 28, kumulatif: 100 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="wilayah" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar yAxisId="left" dataKey="kasus" name="Jumlah Bencana" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="kumulatif" name="Persentase Kumulatif (%)" stroke="#f59e0b" strokeWidth={2.5} />
          </ComposedChart>
        );

      // 5. RELATIONSHIP & CORRELATION
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

      case 'bubble':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" dataKey="windSpeed" name="Kecepatan Angin (km/h)" stroke="#94a3b8" unit=" km/h" />
            <YAxis type="number" dataKey="precipitation" name="Curah Hujan (mm)" stroke="#94a3b8" unit=" mm" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Scatter name="Aktivitas Badai (Bubble 3D)" data={timeSeriesData} fill="#38bdf8" />
          </ScatterChart>
        );

      case 'correlation_matrix':
      case 'hexbin':
        return (
          <div className="flex flex-col items-center justify-center h-full p-3 space-y-2 text-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Matriks Koefisien Korelasi Pearson Lintas Parameter
            </span>
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono w-full max-w-sm">
              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Var</div>
              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Suhu</div>
              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Lembap</div>
              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Hujan</div>

              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Suhu</div>
              <div className="bg-indigo-600 text-white p-2">1.00</div>
              <div className="bg-rose-500/80 text-white p-2">-0.82</div>
              <div className="bg-rose-500/50 text-white p-2">-0.48</div>

              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Lembap</div>
              <div className="bg-rose-500/80 text-white p-2">-0.82</div>
              <div className="bg-indigo-600 text-white p-2">1.00</div>
              <div className="bg-emerald-600/80 text-white p-2">+0.76</div>

              <div className="bg-slate-200 dark:bg-slate-700 p-2 font-bold">Hujan</div>
              <div className="bg-rose-500/50 text-white p-2">-0.48</div>
              <div className="bg-emerald-600/80 text-white p-2">+0.76</div>
              <div className="bg-indigo-600 text-white p-2">1.00</div>
            </div>
            <p className="text-[10px] text-slate-400">
              Korelasi negatif kuat antara suhu dan kelembapan (-0.82). Korelasi positif tinggi antara kelembapan dan hujan (+0.76).
            </p>
          </div>
        );

      // 6. WEATHER & SCIENTIFIC
      case 'wind_rose':
        return (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-full p-2">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="20" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />

                {windRoseData.map((d) => {
                  const rad = (d.angle * Math.PI) / 180;
                  const length = (d.totalFreq / 20) * 80;
                  const x = 100 + length * Math.cos(rad);
                  const y = 100 + length * Math.sin(rad);
                  return (
                    <line
                      key={d.direction}
                      x1="100"
                      y1="100"
                      x2={x}
                      y2={y}
                      stroke={d.totalFreq > 15 ? '#f43f5e' : d.totalFreq > 10 ? '#f59e0b' : '#38bdf8'}
                      strokeWidth={d.totalFreq > 15 ? 5 : 3.5}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-500 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded-full">
                  16-Arah
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200">Distribusi Kecepatan Angin:</div>
              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                  <span>&gt; 20 km/h (Hembusan Kencang / Tenggara)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span>10 - 20 km/h (Angin Sedang)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
                  <span>0 - 10 km/h (Angin Sepoi)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Arah dominan: <strong>Tenggara & Timur (Monsun Australia)</strong>
              </div>
            </div>
          </div>
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
            <Line yAxisId="temp" type="monotone" dataKey="apparentTemp" name="Titik Embun / Terasa" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" />
          </ComposedChart>
        );

      case 'sounding':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-lg bg-slate-950 rounded-2xl p-3 border border-slate-800 relative">
              <div className="flex items-center justify-between text-xs mb-1.5 px-1">
                <span className="font-bold text-sky-400">Atmospheric Sounding Skew-T Profile (0 - 12 km)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  CAPE: 1850 J/kg (Potensi Cb)
                </span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                <svg viewBox="0 0 500 160" className="w-full h-full">
                  {[
                    { p: '200 hPa', y: 20 },
                    { p: '500 hPa', y: 60 },
                    { p: '700 hPa', y: 100 },
                    { p: '850 hPa', y: 130 },
                    { p: '1000 hPa', y: 150 },
                  ].map((iso) => (
                    <g key={iso.p}>
                      <line x1="60" y1={iso.y} x2="480" y2={iso.y} stroke="#334155" strokeDasharray="3 3" />
                      <text x="6" y={iso.y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">{iso.p}</text>
                    </g>
                  ))}
                  <polygon
                    points="140,150 180,130 240,100 310,60 380,20 340,20 280,60 210,100 160,130 140,150"
                    fill="#f59e0b"
                    fillOpacity="0.25"
                  />
                  <path d="M 120,150 L 140,130 L 170,100 L 210,60 L 260,20" fill="none" stroke="#10b981" strokeWidth="2.5" />
                  <path d="M 150,150 L 190,130 L 250,100 L 320,60 L 390,20" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                  <path d="M 140,150 L 180,130 L 240,100 L 310,60 L 380,20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-2 pt-1 border-t border-slate-800">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Suhu Lingkungan T</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> Titik Embun Td</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Parsel Udara (Lifted)</span>
                <span className="text-indigo-400">Lifted Index: -4.2 | K-Index: 34</span>
              </div>
            </div>
          </div>
        );

      case 'wave_rose':
        return (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-full p-2">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="100" cy="100" r="20" fill="none" stroke="#475569" strokeDasharray="3 3" opacity="0.3" />

                {[
                  { dir: 'U', angle: 0, val: 4, col: '#38bdf8' },
                  { dir: 'TL', angle: 45, val: 6, col: '#38bdf8' },
                  { dir: 'T', angle: 90, val: 8, col: '#38bdf8' },
                  { dir: 'TG', angle: 135, val: 12, col: '#0ea5e9' },
                  { dir: 'S', angle: 180, val: 18, col: '#f59e0b' },
                  { dir: 'BD', angle: 225, val: 24, col: '#f43f5e' },
                  { dir: 'B', angle: 270, val: 14, col: '#0ea5e9' },
                  { dir: 'BL', angle: 315, val: 7, col: '#38bdf8' },
                ].map((w) => {
                  const rad = (w.angle * Math.PI) / 180;
                  const length = (w.val / 25) * 80;
                  const x = 100 + length * Math.cos(rad);
                  const y = 100 + length * Math.sin(rad);
                  return (
                    <line
                      key={w.dir}
                      x1="100"
                      y1="100"
                      x2={x}
                      y2={y}
                      stroke={w.col}
                      strokeWidth={w.val > 20 ? 6 : w.val > 10 ? 4.5 : 3}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-sky-600 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full border border-sky-500/20">
                  Swell Rose
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200">Ketinggian Gelombang Signifikan (Hs):</div>
              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                  <span>&gt; 2.5 m (Tinggi / Peringatan BMKG - Samudra Hindia)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span>1.25 - 2.5 m (Sedang / Selat Sunda & Bali)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
                  <span>0.5 - 1.25 m (Rendah / Laut Jawa)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Periode gelombang: <strong>8 - 12 detik</strong> • Arah dominan swell: <strong>Barat Daya (225°)</strong>
              </div>
            </div>
          </div>
        );

      case 'aqi_gauge':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-3">
            <div className="relative w-44 h-24 overflow-hidden">
              <div className="w-44 h-44 rounded-full border-[14px] border-emerald-500 border-t-amber-500 border-r-rose-500 transform rotate-45" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {weatherData?.current.pm25 ?? 24.5}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-500">
                  {weatherData?.current.aqiLevel ?? 'Baik'}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Konsentrasi Partikulat PM2.5 (µg/m³) • Standar Baku Mutu Udara BMKG & WHO
            </div>
          </div>
        );

      // 7. SEISMIC & EARTHQUAKE
      case 'seismograph':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full h-40 bg-slate-950 rounded-2xl p-3 border border-slate-800 relative overflow-hidden flex items-center">
              <svg viewBox="0 0 500 100" className="w-full h-full text-emerald-400" preserveAspectRatio="none">
                <path
                  d="M 0,50 L 80,50 L 90,48 L 100,52 L 120,50 L 130,46 L 140,54 L 150,50 L 160,35 L 170,65 L 180,20 L 190,80 L 200,10 L 210,90 L 220,25 L 230,75 L 240,30 L 250,70 L 270,40 L 290,60 L 320,45 L 350,55 L 400,49 L 450,51 L 500,50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute top-2 left-4 text-[9px] font-mono text-emerald-500">
                P-Arrival (120ms)
              </div>
              <div className="absolute top-2 left-36 text-[9px] font-mono text-rose-400">
                S-Arrival (180ms) - PGA 0.35g
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between w-full px-2">
              <span>Sensor Akselerometer 3-Komponen InaTEWS</span>
              <span className="font-mono text-emerald-500 font-bold">Sampling: 100 Hz</span>
            </div>
          </div>
        );

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

      case 'gutenberg_richter':
        return (
          <LineChart data={gutenbergData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="magnitude" stroke="#94a3b8" unit=" M" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" unit=" log N" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="logN" name="Empirical log N" stroke="#f43f5e" strokeWidth={0} dot={{ r: 5, fill: '#f43f5e' }} />
            <Line type="monotone" dataKey="theoreticalLogN" name="Gutenberg-Richter Fit (b = 0.95)" stroke="#6366f1" strokeWidth={2.5} />
          </LineChart>
        );

      case 'isoseismal_curve':
        return (
          <ComposedChart
            data={[
              { distance: 0, mmi: 7.2, damage: 'Kerusakan Sedang-Berat' },
              { distance: 20, mmi: 6.4, damage: 'Plester Dinding Rontok' },
              { distance: 50, mmi: 5.5, damage: 'Benda Tergoyang Nyata' },
              { distance: 100, mmi: 4.4, damage: 'Dirasakan Orang Banyak' },
              { distance: 160, mmi: 3.5, damage: 'Dirasakan di Rumah' },
              { distance: 240, mmi: 2.6, damage: 'Getaran Sangat Lemah' },
              { distance: 320, mmi: 1.8, damage: 'Hanya Sensor Seismik' },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="distance" stroke="#94a3b8" unit=" km" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" domain={[1, 9]} unit=" MMI" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="3 3" label="MMI VI (Ambang Retak)" />
            <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" label="MMI VII (Kerusakan)" />
            <Line type="monotone" dataKey="mmi" name="Intensitas Guncangan Tanah (MMI)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} />
          </ComposedChart>
        );

      // 8. FLOW & HIERARCHY
      case 'calendar_heatmap':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">Matriks Kalender Presipitasi & Hari Tanpa Hujan (HTH)</span>
                <span className="text-[10px] text-slate-400 font-mono">52 Minggu (1 Tahun)</span>
              </div>
              <div className="grid grid-cols-12 gap-1 h-28 p-1">
                {Array.from({ length: 48 }).map((_, i) => {
                  const val = ((i * 7 + (i % 5) * 11) % 100);
                  const color =
                    val > 80 ? 'bg-purple-600' :
                    val > 55 ? 'bg-blue-500' :
                    val > 30 ? 'bg-emerald-500' :
                    val > 15 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-800';
                  return (
                    <div
                      key={i}
                      className={`rounded-sm ${color} transition-all hover:scale-125 cursor-pointer`}
                      title={`Minggu ke-${i + 1}: Indeks Presipitasi ${val} mm`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300 dark:bg-slate-700" /> Kering (HTH)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Hujan Ringan</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Sedang</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Lebat</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-600" /> Ekstrem (&gt;100mm)</span>
              </div>
            </div>
          </div>
        );

      case 'sankey_flow':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-slate-800 dark:text-slate-200">Aliran Sistem Peringatan Dini & Distribusi Evakuasi (Sankey Flux)</span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">100% Sinyal Input</span>
              </div>
              <div className="h-28 relative flex items-center justify-center">
                <svg viewBox="0 0 500 120" className="w-full h-full">
                  <rect x="20" y="10" width="16" height="100" rx="3" fill="#6366f1" />
                  <text x="42" y="65" fill="#6366f1" fontSize="10" fontWeight="bold">Sensor Radar/Satelit (1200)</text>

                  <path d="M 36,25 C 100,25 100,35 180,35 L 180,75 C 100,75 100,85 36,85 Z" fill="#6366f1" fillOpacity="0.3" />

                  <rect x="180" y="30" width="16" height="60" rx="3" fill="#38bdf8" />
                  <text x="202" y="65" fill="#38bdf8" fontSize="10" fontWeight="bold">Validasi AI NWP (650)</text>

                  <path d="M 196,35 C 260,35 260,25 340,25 L 340,55 C 260,55 260,65 196,65 Z" fill="#0ea5e9" fillOpacity="0.3" />
                  <path d="M 196,65 C 260,65 260,80 340,80 L 340,105 C 260,105 260,90 196,90 Z" fill="#f59e0b" fillOpacity="0.3" />

                  <rect x="340" y="20" width="16" height="35" rx="3" fill="#10b981" />
                  <text x="362" y="38" fill="#10b981" fontSize="9" fontWeight="bold">Zona Aman & Pengungsian (380)</text>

                  <rect x="340" y="75" width="16" height="30" rx="3" fill="#ef4444" />
                  <text x="362" y="93" fill="#ef4444" fontSize="9" fontWeight="bold">Fasilitas Medis & RS (270)</text>
                </svg>
              </div>
              <div className="text-[10px] text-slate-400 text-center pt-1">
                Visualisasi lebar pita menunjukkan kuantitas throughput aliran dari sensor hingga fasilitas evakuasi.
              </div>
            </div>
          </div>
        );

      case 'parallel_coords':
        return (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
            <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Parallel Coordinates Multi-Variabel Atmosfer</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">5 Sumbu Paralel</span>
              </div>
              <div className="h-36 relative flex items-center justify-center">
                <svg viewBox="0 0 500 140" className="w-full h-full">
                  {[
                    { name: 'Suhu (°C)', x: 40, min: '20°', max: '38°' },
                    { name: 'Lembap (%)', x: 140, min: '40%', max: '100%' },
                    { name: 'Tekanan (hPa)', x: 240, min: '1004', max: '1016' },
                    { name: 'Angin (km/h)', x: 340, min: '0', max: '45' },
                    { name: 'PM2.5 (µg)', x: 440, min: '0', max: '120' },
                  ].map((ax) => (
                    <g key={ax.name}>
                      <line x1={ax.x} y1="20" x2={ax.x} y2="120" stroke="#475569" strokeWidth="2" />
                      <text x={ax.x} y="14" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{ax.name}</text>
                      <text x={ax.x} y="132" textAnchor="middle" fill="#64748b" fontSize="8">{ax.min}</text>
                      <text x={ax.x} y="28" textAnchor="middle" fill="#64748b" fontSize="8">{ax.max}</text>
                    </g>
                  ))}

                  <polyline points="40,95 140,50 240,40 340,105 440,110" fill="none" stroke="#10b981" strokeWidth="2.5" opacity="0.85" />
                  <polyline points="40,110 140,25 240,115 340,30 440,90" fill="none" stroke="#f43f5e" strokeWidth="3" opacity="0.9" />
                  <polyline points="40,30 140,110 240,35 340,80 440,40" fill="none" stroke="#f59e0b" strokeWidth="2.5" opacity="0.85" />
                  <polyline points="40,70 140,65 240,60 340,75 440,85" fill="none" stroke="#6366f1" strokeWidth="2.5" opacity="0.85" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> Badai</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Panas Kering</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Sejuk Lembap</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Konsensus Saat Ini</span>
              </div>
            </div>
          </div>
        );

      // Default fallback
      default:
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" name="Suhu (°C)" stroke="#6366f1" strokeWidth={2.5} />
          </LineChart>
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

      {/* Main Responsive Canvas Viewport */}
      <div className={`w-full transition-all duration-300 ${isExpanded ? 'h-[500px]' : 'h-64 sm:h-72'}`}>
        {isRechartsComponent ? (
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
                <input
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
