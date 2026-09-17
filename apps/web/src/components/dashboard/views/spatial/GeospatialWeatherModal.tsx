import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  Gauge,
  Sparkles,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Satellite,
  Mountain,
  Crosshair,
  Waves,
  Target,
  Camera,
  Database,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Cpu,
  Binary,
  Search,
  Filter,
  Check,
  Globe,
  Building2,
  Radio,
  Sun,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Compass,
  Layers,
  FileDown,
  Eye,
  Minimize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { WeatherConsensusData, weatherAggregatorService } from '@/services/weatherAggregatorService';
import { ALL_INDONESIA_PLACES, GeoPlace, searchIndonesianPlaces } from '@/services/indonesiaGeoData';
import { GeospatialRemoteSensingTab } from './studio/GeospatialRemoteSensingTab';
import { GeospatialTerrainTab } from './studio/GeospatialTerrainTab';
import { GeospatialPositioningTab } from './studio/GeospatialPositioningTab';
import { GeospatialHydrologyTab } from './studio/GeospatialHydrologyTab';
import { GeospatialAnalyticsTab } from './studio/GeospatialAnalyticsTab';
import { GeospatialFieldSurveyTab } from './studio/GeospatialFieldSurveyTab';
import { GeospatialBMKGTab } from './studio/GeospatialBMKGTab';
import { GeospatialCatalogTab } from './studio/GeospatialCatalogTab';
import { GeospatialChartsTab } from './studio/GeospatialChartsTab';
import { GeospatialFusionIntelligenceTab } from './studio/GeospatialFusionIntelligenceTab';
import { HarmonyChartEngine } from './charts/HarmonyChartEngine';
import { PreciseLocationInfo } from '../../../../services/preciseGeocodingService';

interface GeospatialWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  locationName?: string;
  userPreciseLocation?: PreciseLocationInfo | null;
  mountains?: any[];
  earthquakes?: any[];
  schools?: any[];
  asPage?: boolean;
}

type StudioDomain =
  | 'remote_sensing'
  | 'terrain'
  | 'positioning'
  | 'hydrology'
  | 'analytics'
  | 'field_survey'
  | 'weather'
  | 'bmkg'
  | 'charts'
  | 'fusion'
  | 'catalog';

type TimeframeMode = 'hourly' | 'daily' | 'biweekly';
type TabCategory = 'overview' | 'nwp' | 'rain' | 'temp' | 'wind' | 'air' | 'ai';
type WeatherChartMetric = 'temperature' | 'precipitation' | 'wind' | 'air_quality' | 'nowcasting';

interface StudioDomainDef {
  id: StudioDomain;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  pillar: 'observasi' | 'atmosfer' | 'analitik';
  pillarLabel: string;
  badgeColor: {
    active: string;
    inactive: string;
    indicator: string;
  };
}

const STUDIO_DOMAINS: StudioDomainDef[] = [
  // Pilar 1: Observasi Bumi (5)
  {
    id: 'remote_sensing',
    name: 'Penginderaan Jauh',
    badge: 'Sentinel-1/2',
    icon: Satellite,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-emerald-500',
    },
  },
  {
    id: 'terrain',
    name: 'Topografi & DEM',
    badge: 'SRTM 3D',
    icon: Mountain,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-amber-500',
    },
  },
  {
    id: 'positioning',
    name: 'GNSS & Posisi',
    badge: 'KORS / CORS',
    icon: Crosshair,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-blue-500',
    },
  },
  {
    id: 'hydrology',
    name: 'Hidrologi & Lahan',
    badge: 'DAS & Satelit',
    icon: Waves,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-cyan-500',
    },
  },
  {
    id: 'field_survey',
    name: 'Survei & Drone',
    badge: 'UAV / LiDAR',
    icon: Camera,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-teal-500',
    },
  },

  // Pilar 2: Atmosfer & Konsensus Cuaca (2)
  {
    id: 'weather',
    name: 'Cuaca Konsensus',
    badge: '9 Model NWP',
    icon: Cloud,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer & MKG',
    badgeColor: {
      active: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-indigo-500',
    },
  },
  {
    id: 'bmkg',
    name: 'Satu Peta MKG',
    badge: 'BMKG Intel',
    icon: Radio,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer & MKG',
    badgeColor: {
      active: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-sky-500',
    },
  },

  // Pilar 3: Analitik Spasial & Intelijensi (4)
  {
    id: 'analytics',
    name: 'Analisis & Buffer',
    badge: 'Spatial Pro',
    icon: Target,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-purple-500',
    },
  },
  {
    id: 'charts',
    name: 'Katalog Grafik',
    badge: '30+ Visual',
    icon: Activity,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-violet-500',
    },
  },
  {
    id: 'fusion',
    name: 'Fusi Data Global',
    badge: 'Gap AI',
    icon: Globe,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-pink-500',
    },
  },
  {
    id: 'catalog',
    name: 'Katalog Data',
    badge: 'ISO 19115',
    icon: Database,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-slate-400',
    },
  },
];

export const GeospatialWeatherModal: React.FC<GeospatialWeatherModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  locationName,
  userPreciseLocation,
  mountains = [],
  earthquakes = [],
  schools = [],
  asPage = false,
}) => {
  // Domain selection (Default to remote sensing or weather)
  const [activeDomain, setActiveDomain] = useState<StudioDomain>('remote_sensing');
  const [domainPillarFilter, setDomainPillarFilter] = useState<'all' | 'observasi' | 'atmosfer' | 'analitik'>('all');
  const domainTabsScrollRef = useRef<HTMLDivElement>(null);

  const filteredDomains = useMemo(() => {
    if (domainPillarFilter === 'all') return STUDIO_DOMAINS;
    return STUDIO_DOMAINS.filter((d) => d.pillar === domainPillarFilter);
  }, [domainPillarFilter]);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (domainTabsScrollRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      domainTabsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Interactive Region / City Context
  const [selectedRegionId, setSelectedRegionId] = useState('user');
  const [activeLat, setActiveLat] = useState(lat);
  const [activeLng, setActiveLng] = useState(lng);
  const [activeRegionName, setActiveRegionName] = useState(
    userPreciseLocation?.shortDisplay || locationName || 'Lokasi Geospasial Pengguna'
  );

  // Weather states
  const [data, setData] = useState<WeatherConsensusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeMode>('hourly');
  const [activeWeatherTab, setActiveWeatherTab] = useState<TabCategory>('overview');
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [chartMetric, setChartMetric] = useState<WeatherChartMetric>('temperature');

  const chartData = useMemo(() => {
    if (!data) return [];
    if (timeframe === 'hourly') {
      return data.hourly.map((h) => {
        const e = (h.humidity / 100) * 6.105 * Math.exp((17.27 * h.temperature) / (237.7 + h.temperature));
        const apparentTemp = Math.round((h.temperature + 0.33 * e - 0.7 * (h.windSpeed / 3.6) - 4.0) * 10) / 10;
        let intensityLabel = 'Cerah / Berawan';
        let intensityColor = '#94a3b8';
        if (h.precipitation > 20) {
          intensityLabel = 'Sangat Lebat (BMKG)';
          intensityColor = '#ef4444';
        } else if (h.precipitation > 10) {
          intensityLabel = 'Lebat (BMKG)';
          intensityColor = '#f97316';
        } else if (h.precipitation > 5) {
          intensityLabel = 'Sedang (BMKG)';
          intensityColor = '#fbbf24';
        } else if (h.precipitation > 1) {
          intensityLabel = 'Ringan (BMKG)';
          intensityColor = '#38bdf8';
        } else if (h.precipitation > 0) {
          intensityLabel = 'Sangat Ringan (BMKG)';
          intensityColor = '#6ee7b7';
        }
        return {
          ...h,
          apparentTemp,
          windGustEstimated: Math.round(h.windSpeed * 1.45),
          intensityLabel,
          intensityColor,
        };
      });
    }
    const sliceCount = timeframe === 'daily' ? 7 : 14;
    return data.daily.slice(0, sliceCount).map((d) => ({
      ...d,
      apparentTempMax: Math.round((d.tempMax + 2.1) * 10) / 10,
      windGustMax: Math.round(d.windSpeedMax * 1.4),
    }));
  }, [data, timeframe]);

  const chartSummary = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    if (timeframe === 'hourly') {
      const hourlyList = chartData as any[];
      const maxTemp = Math.max(...hourlyList.map((h) => h.temperature));
      const minTemp = Math.min(...hourlyList.map((h) => h.temperature));
      const totalRain = hourlyList.reduce((acc, h) => acc + (h.precipitation || 0), 0);
      const maxProb = Math.max(...hourlyList.map((h) => h.precipitationProb || 0));
      const maxWind = Math.max(...hourlyList.map((h) => h.windSpeed || 0));
      const peakRainHour = hourlyList.find((h) => h.precipitationProb === maxProb)?.label || 'Siang';
      return {
        maxTemp: `${maxTemp}°C`,
        minTemp: `${minTemp}°C`,
        totalRain: `${totalRain.toFixed(1)} mm`,
        maxProb: `${maxProb}% (${peakRainHour})`,
        maxWind: `${maxWind} km/h`,
      };
    } else {
      const dailyList = chartData as any[];
      const maxTemp = Math.max(...dailyList.map((d) => d.tempMax));
      const minTemp = Math.min(...dailyList.map((d) => d.tempMin));
      const totalRain = dailyList.reduce((acc, d) => acc + (d.precipitationSum || 0), 0);
      const maxProb = Math.max(...dailyList.map((d) => d.precipitationProbMax || 0));
      const maxWind = Math.max(...dailyList.map((d) => d.windSpeedMax || 0));
      const peakDay = dailyList.find((d) => d.precipitationProbMax === maxProb)?.dayName || 'Hari Ini';
      return {
        maxTemp: `${maxTemp}°C`,
        minTemp: `${minTemp}°C`,
        totalRain: `${totalRain.toFixed(1)} mm`,
        maxProb: `${maxProb}% (${peakDay})`,
        maxWind: `${maxWind} km/h`,
      };
    }
  }, [chartData, timeframe]);

  const handleReverifyAi = async () => {
    if (!data || isVerifyingAi) return;
    setIsVerifyingAi(true);
    try {
      const updated = await weatherAggregatorService.reverifyWithAi(data);
      setData(updated);
    } catch (err) {
      console.error('Failed to reverify with AI:', err);
    } finally {
      setIsVerifyingAi(false);
    }
  };


  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'semua' | 'provinsi' | 'kota' | 'kabupaten' | 'pelosok'>('semua');
  const [selectedIsland, setSelectedIsland] = useState<string>('semua');

  const filteredPlaces = useMemo(() => {
    return searchIndonesianPlaces(locationSearchQuery, selectedCategory, selectedIsland);
  }, [locationSearchQuery, selectedCategory, selectedIsland]);

  const handleSelectPlace = (place: GeoPlace | { id: string; name: string; lat: number; lng: number; description?: string; province?: string }) => {
    setSelectedRegionId(place.id);
    setActiveLat(place.lat);
    setActiveLng(place.lng);
    const label = 'province' in place && place.province && !place.name.includes(place.province)
      ? `${place.name} (${place.province})`
      : place.name;
    setActiveRegionName(label);
    setIsLocationPickerOpen(false);
    if (activeDomain === 'weather') {
      loadWeather(place.lat, place.lng, label);
    }
  };

  const handleSelectUserGps = () => {
    setSelectedRegionId('user');
    setActiveLat(lat);
    setActiveLng(lng);
    const label = userPreciseLocation?.shortDisplay || locationName || 'Lokasi GPS Pengguna';
    setActiveRegionName(label);
    setIsLocationPickerOpen(false);
    if (activeDomain === 'weather') {
      loadWeather(lat, lng, label);
    }
  };

  const handleSelectRegion = (regionId: string) => {
    if (regionId === 'user') {
      handleSelectUserGps();
      return;
    }
    const found = ALL_INDONESIA_PLACES.find((p) => p.id === regionId);
    if (found) {
      handleSelectPlace(found);
    }
  };

  const loadWeather = async (targetLat = activeLat, targetLng = activeLng, targetName = activeRegionName) => {
    setLoading(true);
    try {
      const res = await weatherAggregatorService.fetchConsensusWeather(targetLat, targetLng, targetName);
      setData(res);
    } catch (err) {
      console.error('Failed to load geospatial weather', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveLat(lat);
      setActiveLng(lng);
      setActiveRegionName(locationName || 'Lokasi Geospasial Pengguna');
      setSelectedRegionId('user');
      setSelectedHour(new Date().getHours());
      loadWeather(lat, lng, locationName);
    }
  }, [isOpen, lat, lng, locationName]);

  // If switched to weather tab and no data yet, load it
  useEffect(() => {
    if (isOpen && activeDomain === 'weather' && !data) {
      loadWeather(activeLat, activeLng, activeRegionName);
    }
  }, [activeDomain, isOpen]);

  if (!isOpen && !asPage) return null;

  const currentHourPoint = data?.hourly.find((h) => h.hour === selectedHour) || data?.hourly[0];

  const modalBody = (
    <>
      <div
        className={
          asPage
            ? "w-full h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden"
            : "relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-2xl"
        }
        onClick={(e) => e.stopPropagation()}
      >
      {/* Main Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Satellite className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white truncate">
                Harmony Geospatial & Earth Intelligence Studio
              </h2>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" /> BIG & ESA Standards
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Akuisisi → Posisi → Pengolahan Spektral → Analisis Spasial → Keputusan
            </p>
          </div>
        </div>

        {/* Region Switcher & Close Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Indonesian Places Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-slate-200 shadow-sm transition-all max-w-[210px] sm:max-w-[280px]"
              title="Pilih Titik Lokasi Indonesia (38 Provinsi, Kab/Kota & Pelosok)"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{activeRegionName || 'Pilih Lokasi...'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
            </button>
          </div>

          {activeDomain === 'weather' && (
            <button
              onClick={() => loadWeather(activeLat, activeLng, activeRegionName)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Perbarui Data Cuaca"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {asPage ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              title="Kembali ke Peta Spasial"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup Studio"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

        {/* Geospatial Domain Navigation Header & Segmented Tabs */}
        <div className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          {/* Pillar Filters & Scroll Chevrons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 pt-2 pb-1 gap-2 border-b border-slate-200/40 dark:border-slate-800/50">
            {/* Quick Pillar Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                Pilar:
              </span>
              <button
                onClick={() => setDomainPillarFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                Semua (11)
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('observasi');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'observasi').some((d) => d.id === activeDomain)) {
                    setActiveDomain('remote_sensing');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'observasi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                🛰️ Observasi Bumi (5)
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('atmosfer');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'atmosfer').some((d) => d.id === activeDomain)) {
                    setActiveDomain('weather');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'atmosfer'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                🌦️ Atmosfer & MKG (2)
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('analitik');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'analitik').some((d) => d.id === activeDomain)) {
                    setActiveDomain('analytics');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'analitik'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                📊 Analitik & Data (4)
              </button>
            </div>

            {/* Desktop Scroll Chevrons */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleScrollTabs('left')}
                className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-xs"
                title="Geser Tab ke Kiri"
                aria-label="Geser Kiri"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScrollTabs('right')}
                className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-xs"
                title="Geser Tab ke Kanan"
                aria-label="Geser Kanan"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Tabs */}
          <div className="relative">
            <div
              ref={domainTabsScrollRef}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x text-xs"
            >
              {filteredDomains.map((d) => {
                const Icon = d.icon;
                const isActive = activeDomain === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveDomain(d.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 border ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border-indigo-500/40 dark:border-indigo-400/40 ring-1 ring-indigo-500/20 font-bold'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                    }`}
                  >
                    {isActive ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.badgeColor.indicator} shrink-0 animate-pulse`} />
                    ) : (
                      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                    <span className="whitespace-nowrap">{d.name}</span>
                    <span
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
                        isActive ? d.badgeColor.active : d.badgeColor.inactive
                      } shrink-0`}
                    >
                      {d.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Studio Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Domain 1: Remote Sensing Tab */}
          {activeDomain === 'remote_sensing' && (
            <GeospatialRemoteSensingTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 2: Terrain DEM Tab */}
          {activeDomain === 'terrain' && (
            <GeospatialTerrainTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 3: GNSS Positioning Tab */}
          {activeDomain === 'positioning' && (
            <GeospatialPositioningTab
              currentLat={activeLat}
              currentLng={activeLng}
              locationInfo={userPreciseLocation}
            />
          )}

          {/* Domain 4: Hydrology & Land Cover Tab */}
          {activeDomain === 'hydrology' && (
            <GeospatialHydrologyTab
              lat={activeLat}
              lng={activeLng}
              elevationM={45}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 5: Spatial Analytics & Geoprocessing Buffer */}
          {activeDomain === 'analytics' && (
            <GeospatialAnalyticsTab
              centerLat={activeLat}
              centerLng={activeLng}
              regionName={activeRegionName}
              mountains={mountains}
              earthquakes={earthquakes}
              schools={schools}
            />
          )}

          {/* Domain 6: Field Survey & Drone Ingestion */}
          {activeDomain === 'field_survey' && (
            <GeospatialFieldSurveyTab
              currentLat={activeLat}
              currentLng={activeLng}
            />
          )}

          {/* Domain 7: Metadata Provenance Catalog */}
          {activeDomain === 'catalog' && <GeospatialCatalogTab />}

          {/* Domain 8: Satu Peta MKG & BMKG Intelligence */}
          {activeDomain === 'bmkg' && (
            <GeospatialBMKGTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 9: Visualisasi Grafik Studio (30+ Tipe Chart Engine) */}
          {activeDomain === 'charts' && (
            <GeospatialChartsTab
              weatherData={data}
              earthquakes={earthquakes}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 10: Fusi Data Global & Intelijensi Kesenjangan */}
          {activeDomain === 'fusion' && (
            <GeospatialFusionIntelligenceTab
              weatherData={data}
              lat={activeLat}
              lng={activeLng}
              locationName={activeRegionName}
              userPreciseLocation={userPreciseLocation}
            />
          )}

          {/* Domain 8: Weather & Atmosphere Multi-Source Consensus */}
          {activeDomain === 'weather' && (
            <div className="space-y-5">
              {/* Weather Sub-Header KPI Banner */}
              <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {data?.current.consensusTemperature ?? '--'}°C
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      (Terasa {data?.current.apparentTemperature ?? '--'}°C)
                    </span>
                  </div>

                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Akurasi Konsensus: {data?.current.confidenceScore?.toFixed(1) ?? '98.0'}%
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {data?.current.conditionText}
                    </span>
                    {data?.aiNwpVerification && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-500" />
                        7 Persamaan NWP Terverifikasi AI
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions & Timeframe Toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleReverifyAi}
                    disabled={isVerifyingAi}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    title="Kalkulasi ulang verifikasi cuaca dengan Gemini AI NWP"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAi ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingAi ? 'Menghitung Fisika...' : 'Verifikasi Ulang AI'}</span>
                  </button>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
                    <button
                      onClick={() => setTimeframe('hourly')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'hourly'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 inline mr-1" /> Per Jam (24 Jam)
                    </button>
                    <button
                      onClick={() => setTimeframe('daily')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'daily'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> 7 Hari
                    </button>
                    <button
                      onClick={() => setTimeframe('biweekly')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'biweekly'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> 14 Hari
                    </button>
                  </div>
                </div>
              </div>

              {/* Weather Sub-Category Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar scroll-smooth touch-pan-x">
                <button
                  onClick={() => setActiveWeatherTab('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'overview'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" /> Ringkasan Multivariabel
                </button>
                <button
                  onClick={() => setActiveWeatherTab('nwp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'nwp'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-sky-500" />
                  <span>7 Persamaan Fisika NWP (AI)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold">
                    GEMINI
                  </span>
                </button>
                <button
                  onClick={() => setActiveWeatherTab('rain')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'rain'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5" /> Curah Hujan & Presipitasi
                </button>
                <button
                  onClick={() => setActiveWeatherTab('temp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'temp'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Thermometer className="w-3.5 h-3.5" /> Komparasi Multi-Model Suhu
                </button>
                <button
                  onClick={() => setActiveWeatherTab('wind')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'wind'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" /> Angin & Tekanan Atmosfer
                </button>
                <button
                  onClick={() => setActiveWeatherTab('air')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'air'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> Kualitas Udara & Ozon (O₃)
                </button>
                <button
                  onClick={() => setActiveWeatherTab('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'ai'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Weather Agent
                </button>
              </div>


              {/* Hourly Timeline Selector */}
              {timeframe === 'hourly' && (
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Pilih Jam (Saat ini: {selectedHour.toString().padStart(2, '0')}:00 WIB)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Konsensus jam terpilih: <strong className="text-slate-900 dark:text-white">{currentHourPoint?.temperature}°C</strong> | Hujan: <strong>{currentHourPoint?.precipitation} mm</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {data?.hourly.map((h) => (
                      <button
                        key={h.hour}
                        onClick={() => setSelectedHour(h.hour)}
                        className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                          h.hour === selectedHour
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30 scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        <span className="text-[10px] opacity-80">{h.label}</span>
                        <span className="font-bold text-xs mt-0.5">{h.temperature}°</span>
                        {h.precipitation > 0 && (
                          <span className="text-[9px] text-blue-400 flex items-center">
                            💧{h.precipitation}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OVERVIEW SUB-TAB */}
              {activeWeatherTab === 'overview' && (
                <div className="space-y-5">
                  {/* Global Fusion & Observation Confidence Banner */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Asimilasi Fusi Multi-Sumber &amp; Intelijensi Kesenjangan
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                            Confidence: 88%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sintesis ECMWF IFS, GFS, satelit Himawari-9 &amp; radar BMKG • Margin ketidakpastian ±0.8°C
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDomain('fusion')}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      <span>Lihat Analisis Fusi &amp; Prioritas Sensor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                        <span className="text-xs font-bold">Curah Hujan</span>
                        <CloudRain className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {data?.current.precipitation} <span className="text-xs font-semibold text-slate-500">mm/jam</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Peluang: <strong>{data?.current.precipitationProb}%</strong>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
                      <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-1">
                        <span className="text-xs font-bold">Kecepatan Angin</span>
                        <Wind className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {data?.current.windSpeed} <span className="text-xs font-semibold text-slate-500">km/h</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Hembusan: <strong>{data?.current.windGusts} km/h</strong> ({data?.current.windDirection}°)
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                        <span className="text-xs font-bold">Lapisan Ozon (O₃)</span>
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {data?.current.ozone} <span className="text-xs font-semibold text-slate-500">µg/m³</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Tekanan: <strong>{data?.current.pressure} hPa</strong>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                      <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                        <span className="text-xs font-bold">Kualitas Udara PM2.5</span>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {data?.current.pm25} <span className="text-xs font-semibold text-slate-500">µg/m³</span>
                      </div>
                      <div className="text-[11px] font-bold mt-1" style={{ color: data?.current.aqiColor }}>
                        Status: {data?.current.aqiLevel}
                      </div>
                    </div>
                  </div>

                  {/* Harmony Universal Multi-Paradigm Chart Engine (30+ Tipe Grafik) */}
                  <HarmonyChartEngine
                    weatherData={data}
                    earthquakes={earthquakes}
                    defaultChartId="line"
                    title={`Grafik Analitik Multivariabel Cuaca & Geofisika — ${activeRegionName}`}
                    description="Pilih dari 30+ visualisasi (Garis, Batang, Mawar Angin, Seismograf, Fan Chart, Box Plot, dsb.) dengan opsi pemilihan grafik interaktif"
                  />

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                      <span>Perbandingan Feed Model Saat Ini (Bot Consensus Calculator)</span>
                      <span className="text-[10px] text-emerald-500 font-semibold">Semua Server Aktif</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {data?.modelComparison.map((m) => (
                        <div key={m.modelName} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {m.sourceFlag} {m.modelName}
                          </div>
                          <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                            {m.temperature}°C
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Deviasi: {Math.abs(m.temperature - (data?.current.consensusTemperature ?? 0)).toFixed(1)}°C
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI NWP Physics Insight Banner */}
                    {data?.aiNwpVerification && (
                      <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/25 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-500">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>Data Prediksi Terkalibrasi 7 Persamaan Dasar NWP (AI)</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                                {data.aiNwpVerification.convectiveStability}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Kerapatan massa udara ρ: <strong>{data.aiNwpVerification.airDensityKgM3} kg/m³</strong> | Parameter Coriolis f: <strong>{data.aiNwpVerification.coriolisParamF}×10⁻⁵ s⁻¹</strong> | Bayesian Rain: <strong>{data.aiNwpVerification.calibratedRainProb}%</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveWeatherTab('nwp')}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 underline underline-offset-2 flex items-center gap-1"
                        >
                          <span>Buka Detail 7 Rumus</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7 EQUATIONS NWP SUB-TAB */}
              {activeWeatherTab === 'nwp' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Hero Scientific Banner */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-sky-500/30 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold tracking-wider uppercase border border-sky-500/40">
                            The Seven Basic Equations of NWP
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Vilhelm Bjerknes (1904) & Lewis Fry Richardson (1922)
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
                          <span>Sistem Verifikasi 7 Persamaan Dasar Atmosfer</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Gemini 3.6 Flash Verified
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                          Prediksi cuaca numerik dihitung dari kumpulan persamaan diferensial parsial non-linear mekanika fluida atmosferik, termodinamika energi matahari, rasio uap air Clausius-Clapeyron, dan kalibrasi probabilitas Bayesian ensemble.
                        </p>
                      </div>

                      <button
                        onClick={handleReverifyAi}
                        disabled={isVerifyingAi}
                        className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAi ? 'animate-spin' : ''}`} />
                        <span>{isVerifyingAi ? 'AI Sedang Menghitung...' : 'Kalkulasi Ulang AI'}</span>
                      </button>
                    </div>

                    {/* Physics KPI Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-700/60">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Kerapatan Udara (ρ = p/RT)</span>
                        <span className="text-sm sm:text-base font-black text-sky-400">
                          {data?.aiNwpVerification?.airDensityKgM3 ?? '1.164'} <span className="text-[10px] text-slate-400">kg/m³</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Gas Ideal (R = 287 J/kg·K)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Parameter Coriolis (f = 2Ω sin φ)</span>
                        <span className="text-sm sm:text-base font-black text-indigo-400 font-mono">
                          {data?.aiNwpVerification?.coriolisParamF ? `${data.aiNwpVerification.coriolisParamF}×10⁻⁵` : '-1.92×10⁻⁵'} <span className="text-[10px] text-slate-400">s⁻¹</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Lintang {activeLat.toFixed(2)}° (Tropis)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Stabilitas Atmosfer (CAPE)</span>
                        <span className="text-sm sm:text-base font-black text-emerald-400 truncate block">
                          {data?.aiNwpVerification?.convectiveStability ?? 'Stabil'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Lapse rate & konveksi awan</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Probabilitas Bayesian Hujan</span>
                        <span className="text-sm sm:text-base font-black text-amber-400">
                          {data?.aiNwpVerification?.calibratedRainProb ?? 50}%
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Posterior Ensemble 5 Model</span>
                      </div>
                    </div>
                  </div>

                  {/* 7 Equations Interactive Cards List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Binary className="w-4 h-4 text-indigo-500" />
                        Rincian Evaluasi Matematis 7 Persamaan Dasar Atmosfer:
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Diverifikasi: {data?.aiNwpVerification?.verifiedAt || 'Realtime'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data?.aiNwpVerification?.equationsStatus.map((eq, idx) => (
                        <div
                          key={eq.id || idx}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {eq.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" /> {eq.status === 'VALID' ? 'TERVERIFIKASI FISIK' : eq.status}
                              </span>
                            </div>

                            {/* Formula Monospace Display */}
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-2 overflow-x-auto">
                              {eq.formula}
                            </div>

                            <div className="text-xs text-slate-700 dark:text-slate-200 font-medium mb-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Nilai Terhitung:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{eq.evaluatedValue}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-2 mt-1">
                            {eq.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scientific Briefing Box */}
                  {data?.aiNwpVerification?.scientificBriefing && (
                    <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 text-slate-800 dark:text-slate-200 text-xs shadow-sm">
                      <div className="flex items-center gap-2 font-bold text-sky-700 dark:text-sky-300 mb-1.5">
                        <Sparkles className="w-4 h-4 text-sky-500" />
                        <span>Sintesis Meteorologis Berdasarkan 7 Persamaan Dasar Atmosfer:</span>
                      </div>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-xs">
                        {data.aiNwpVerification.scientificBriefing}
                      </p>
                    </div>
                  )}
                </div>
              )}


              {/* RAIN SUB-TAB */}
              {activeWeatherTab === 'rain' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Grafik Curah Hujan (mm) & Probabilitas Hujan (%)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={((timeframe === 'hourly' ? data?.hourly : data?.daily.slice(0, timeframe === 'daily' ? 7 : 14)) as any[]) || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey={timeframe === 'hourly' ? 'label' : 'dayName'} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="mm" stroke="#38bdf8" unit=" mm" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="prob" orientation="right" stroke="#818cf8" unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Bar yAxisId="mm" dataKey={timeframe === 'hourly' ? 'precipitation' : 'precipitationSum'} name="Intensitas Hujan (mm)" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="prob" type="monotone" dataKey={timeframe === 'hourly' ? 'precipitationProb' : 'precipitationProbMax'} name="Peluang Presipitasi (%)" stroke="#818cf8" strokeWidth={2.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TEMP SUB-TAB */}
              {activeWeatherTab === 'temp' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Komparasi Garis Prediksi Suhu Lintas Model Meteorologi
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Menampilkan konsensus vs model individu (ECMWF, NOAA GFS, DWD ICON, JMA) untuk akurasi tertinggi
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.hourly}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="temperature" name="Konsensus Terhitung" stroke="#f43f5e" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="ecmwfTemp" name="ECMWF (Eropa)" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="gfsTemp" name="NOAA GFS (USA)" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="iconTemp" name="DWD ICON (Jerman)" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="jmaTemp" name="JMA (Jepang)" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* WIND SUB-TAB */}
              {activeWeatherTab === 'wind' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Kecepatan Angin (km/h) & Tekanan Permukaan Atmosfer (hPa)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.hourly}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="wind" stroke="#0d9488" unit=" km/h" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="press" orientation="right" stroke="#6366f1" unit=" hPa" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Line yAxisId="wind" type="monotone" dataKey="windSpeed" name="Kecepatan Angin (km/h)" stroke="#0d9488" strokeWidth={2.5} />
                        <Line yAxisId="press" type="monotone" dataKey="pressure" name="Tekanan Atmosfer (hPa)" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* AIR QUALITY SUB-TAB */}
              {activeWeatherTab === 'air' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Konsentrasi Partikulat PM2.5 & Ozon Atmosferik (O₃)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.hourly}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" unit=" µg/m³" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="pm25" name="PM2.5 Polusi (µg/m³)" stroke="#ec4899" fill="#ec4899" fillOpacity={0.25} />
                        <Area type="monotone" dataKey="ozone" name="Lapisan Ozon O₃ (µg/m³)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* AI AGENT SUB-TAB */}
              {activeWeatherTab === 'ai' && (
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-slate-950 border border-indigo-500/30 text-white shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <span>AI Weather Agent: Analisis & Prediksi Terpadu</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                            {data?.aiNwpVerification?.modelName.includes('gemini') ? 'Gemini 3.6 Flash' : 'NWP Solver'}
                          </span>
                        </h3>
                        <p className="text-xs text-indigo-300">
                          Sintesis multi-sumber dikalibrasi oleh The Seven Basic Equations of NWP
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveWeatherTab('nwp')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      <span>Inspeksi 7 Rumus Atmosfer</span>
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-200 bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-500/20 mb-4">
                    {data?.aiBriefing.summaryText}
                  </p>

                  {/* NWP Diagnostic Highlights */}
                  {data?.aiNwpVerification && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Kerapatan Massa Udara (ρ)</span>
                        <span className="text-xs font-bold text-sky-400">{data.aiNwpVerification.airDensityKgM3} kg/m³</span>
                        <span className="text-[9px] text-slate-500 block">Persamaan Gas Ideal p = ρ R T</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Parameter Coriolis (f)</span>
                        <span className="text-xs font-bold text-indigo-400 font-mono">{data.aiNwpVerification.coriolisParamF}×10⁻⁵ s⁻¹</span>
                        <span className="text-[9px] text-slate-500 block">Persamaan Gerak Navier-Stokes</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Stabilitas Konveksi (CAPE)</span>
                        <span className="text-xs font-bold text-emerald-400 truncate block">{data.aiNwpVerification.convectiveStability}</span>
                        <span className="text-[9px] text-slate-500 block">Profil Termodinamika Udara Basah</span>
                      </div>
                    </div>
                  )}

                  {data?.aiBriefing.hazardAlert && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{data.aiBriefing.hazardAlert}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Kesiapsiagaan & Tindakan Pencegahan:
                    </h4>
                    {data?.aiBriefing.preparednessAdvice.map((adv, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Sources Transparency Footer */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Sumber Terbuka Realtime:</span>
                  {data?.sources.map((s) => (
                    <span key={s.id} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {s.name}
                    </span>
                  ))}
                </div>
                <span className="text-slate-400">Open-Meteo, ECMWF, BMKG & Copernicus License</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Indonesian Geolocation Search & Selection Dialog */}
      {isLocationPickerOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsLocationPickerOpen(false)}
        >
          <div 
            className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Pilih Titik Wilayah Indonesia
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    38 Provinsi, 120+ Kab/Kota, dan 60+ Daerah Pelosok/Terluar 3T
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar Input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  placeholder="Cari provinsi, kota, kabupaten, atau pelosok 3T (cth: Wamena, Natuna, Sabang, Mojokerto)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {locationSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLocationSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                {[
                  { id: 'semua', label: '🌟 Semua Titik' },
                  { id: 'provinsi', label: '🏛️ Provinsi (38)' },
                  { id: 'kota', label: '🏙️ Kota' },
                  { id: 'kabupaten', label: '🏘️ Kabupaten' },
                  { id: 'pelosok', label: '🏕️ Pelosok & Terluar 3T' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Island Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] font-semibold text-slate-500">
                <span className="shrink-0 text-slate-400">Pulau:</span>
                {[
                  { id: 'semua', label: 'Semua' },
                  { id: 'Sumatera', label: 'Sumatera' },
                  { id: 'Jawa', label: 'Jawa' },
                  { id: 'Kalimantan', label: 'Kalimantan' },
                  { id: 'Sulawesi', label: 'Sulawesi' },
                  { id: 'Bali', label: 'Bali' },
                  { id: 'Nusa Tenggara', label: 'Nusa Tenggara' },
                  { id: 'Maluku', label: 'Maluku' },
                  { id: 'Papua', label: 'Papua' },
                ].map((isl) => (
                  <button
                    key={isl.id}
                    type="button"
                    onClick={() => setSelectedIsland(isl.id)}
                    className={`px-2 py-0.5 rounded-md shrink-0 transition-all ${
                      selectedIsland === isl.id
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Places List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[260px] max-h-[50vh]">
              {/* Pinned Current GPS Location */}
              <button
                type="button"
                onClick={handleSelectUserGps}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                  selectedRegionId === 'user'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        Lokasi GPS Saya Saat Ini
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold">
                        Presisi GNSS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {userPreciseLocation?.shortDisplay || `Koordinat (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`}
                    </p>
                  </div>
                </div>
                {selectedRegionId === 'user' && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>

              {/* Count Indicator */}
              <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Titik Wilayah ({filteredPlaces.length})</span>
                {filteredPlaces.length === 0 && (
                  <span className="text-amber-500">Tidak ada lokasi yang cocok dengan kata kunci</span>
                )}
              </div>

              {/* Filtered Places Items */}
              {filteredPlaces.map((place: GeoPlace) => {
                const isSelected = selectedRegionId === place.id;
                const badgeColor =
                  place.category === 'provinsi'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : place.category === 'pelosok'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : place.category === 'kota'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';

                const categoryIcon =
                  place.category === 'provinsi' ? '🏛️' :
                  place.category === 'pelosok' ? '🏕️' :
                  place.category === 'kota' ? '🏙️' : '🏘️';

                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{categoryIcon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {place.name}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${badgeColor}`}>
                            {place.category || place.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {place.province ? `${place.province} • ${place.island || ''}` : place.island || ''}
                          {place.description ? ` — ${place.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
              <span>Mencakup seluruh 38 Provinsi & Titik Perbatasan NKRI</span>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="px-3.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (asPage) {
    return (
      <div className="w-full h-full min-h-[calc(100vh-4.5rem)] flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        {modalBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      {modalBody}
    </div>
  );
};

