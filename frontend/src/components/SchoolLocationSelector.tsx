import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ChevronDown,
  School as SchoolIcon,
  Building2,
  Navigation,
  ArrowRight,
  CheckCircle2,
  Search,
  Route,
  Home,
  Shield,
  AlertTriangle,
  BookOpen,
  Clock,
  Waves,
  Mountain,
  Trees,
  Flame,
  GraduationCap,
  X,
  Compass,
  Locate,
  Info,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { getAllSchools, extractProvinces, extractRegencies } from '@/services/schoolService';
import {
  riskStyles,
  recommendedModules,
  evacuationInfo,
  sortByNearest,
  type School,
  type NearbySchoolResult,
  type SearchSchoolResult,
} from '@/data/schools';
import { useSchool } from '@/context/SchoolContext';
import { useToast } from '@/context/ToastContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatDistance } from '@/utils/geoUtils';

interface SearchableDropdownProps {
  label: string;
  icon: LucideIcon;
  value: string;
  options: { id: string; name: string }[];
  placeholder: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function SearchableDropdown({
  label,
  icon: Icon,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [query, options]);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-slate-400">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
          disabled
            ? 'cursor-not-allowed border-brand-50 bg-brand-50/30 text-ink-400 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-600'
            : 'border-brand-100 bg-white/70 text-ink-900 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <Icon className="h-4 w-4 shrink-0 text-brand-500" />
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-brand-100 bg-white shadow-glass-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="border-b border-brand-50 p-2 dark:border-slate-700">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="w-full rounded-lg border border-brand-100 bg-white/70 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-ink-400 dark:text-slate-500">No results found</p>
                ) : (
                  filtered.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        onChange(o.id);
                        setOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        o.id === value
                          ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-slate-700 dark:text-brand-400'
                          : 'text-ink-700 hover:bg-brand-50/60 dark:text-slate-300 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {o.name}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const hazardIcons: { icon: LucideIcon; label: string; key: keyof School }[] = [
  { icon: Mountain, label: 'Earthquake', key: 'earthquake' },
  { icon: Waves, label: 'Flood', key: 'flood' },
  { icon: Trees, label: 'Landslide', key: 'landslide' },
  { icon: Flame, label: 'Volcanic', key: 'volcanic' },
  { icon: Waves, label: 'Tsunami', key: 'tsunami' },
];

function hazardColor(value: number): string {
  if (value >= 70) return 'bg-brand-800';
  if (value >= 50) return 'bg-brand-600';
  if (value >= 35) return 'bg-brand-400';
  return 'bg-brand-200';
}

export function SchoolLocationSelector() {
  const navigate = useNavigate();
  const { selection, setSelection, clearSelection } = useSchool();
  const { show } = useToast();
  const { t, locale } = useI18n();

  const [activeTab, setActiveTab] = useState<'manual' | 'zonasi'>('manual');

  // Manual select state
  const [provinceId, setProvinceId] = useState('');
  const [regencyId, setRegencyId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Zonasi / Proximity state
  const { location, status: locStatus, error: locError, detect: detectLoc } = useUserLocation();
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'SD' | 'SMP' | 'SMA' | 'SMK'>('ALL');

  const [allSchools, setAllSchools] = useState<School[]>([]);
  useEffect(() => {
    getAllSchools().then(setAllSchools).catch(console.error);
  }, []);

  const provinces = useMemo(() => extractProvinces(allSchools), [allSchools]);
  const regencies = useMemo(() => (provinceId ? extractRegencies(allSchools, provinceId) : []), [provinceId, allSchools]);
  const schools = useMemo(() => (provinceId && regencyId ? allSchools.filter(s => s.province === provinceId && s.regency === regencyId) : []), [provinceId, regencyId, allSchools]);

  // Retrieve current active school selection based on active schoolId
  const selectedSchool = useMemo(() => {
    if (!schoolId) return undefined;
    return allSchools.find((s) => s.id === schoolId);
  }, [schoolId, allSchools]);

  // If a school is active, find its matching province & regency ID
  const selectedSchoolLocationInfo = useMemo(() => {
    if (!selectedSchool) return null;
    return { provinceId: selectedSchool.province || '', regencyId: selectedSchool.regency || '' };
  }, [selectedSchool]);

  const searchResults = useMemo(() => {
    if (globalSearch.trim().length < 2) return [];
    const q = globalSearch.toLowerCase();
    return allSchools
      .filter(s => s.name.toLowerCase().includes(q) || s.province?.toLowerCase().includes(q) || s.regency?.toLowerCase().includes(q))
      .slice(0, 10)
      .map(s => ({
        school: s,
        provinceName: s.province || '',
        regencyName: s.regency || ''
      }));
  }, [globalSearch, allSchools]);

  // Calculate nearest schools if location is detected
  const nearestSchools = useMemo(() => {
    if (!location) return [];
    return sortByNearest(allSchools, location.lat, location.lng, 5, levelFilter === 'ALL' ? undefined : [levelFilter as School['level']]);
  }, [location, levelFilter, allSchools]);

  const handleConfirm = () => {
    if (!selectedSchool || !selectedSchoolLocationInfo) return;
    setSelection(selectedSchool);
    setConfirmed(true);
    show('School selection saved successfully', 'success');
  };

  const handleGlobalSelect = (result: SearchSchoolResult) => {
    setProvinceId(result.provinceName);
    setRegencyId(result.regencyName);
    setSchoolId(result.school.id);
    setGlobalSearch('');
    setShowGlobalResults(false);
    setConfirmed(false);
  };

  const handleNearSelect = (sch: School, provId: string, regId: string) => {
    setProvinceId(provId);
    setRegencyId(regId);
    setSchoolId(sch.id);
    setConfirmed(false);
  };

  const riskStyle = selectedSchool ? riskStyles[selectedSchool.risk] : null;
  const modules = selectedSchool ? recommendedModules[selectedSchool.risk] : [];
  const evacInfo = selectedSchool ? evacuationInfo[selectedSchool.risk] : null;

  const getZoneBadge = (distance: number) => {
    if (distance < 1) {
      return {
        label: 'Zona 1 (Prioritas Utama)',
        style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
      };
    } else if (distance < 3) {
      return {
        label: 'Zona 2 (Radius Dekat)',
        style: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      };
    }
    return {
      label: 'Zona 3 (Luar Ring Utama)',
      style: 'bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-400 border-slate-200 dark:border-slate-700/30',
    };
  };

  return (
    <div className="space-y-6 relative z-50">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Navigation className="h-3.5 w-3.5" /> {t('school.title')}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {locale === 'id' ? 'Sistem Pemilihan Sekolah & Penentuan Zonasi' : t('school.title')}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            {locale === 'id' 
              ? 'Tentukan sekolah Anda secara manual atau gunakan sistem GPS terintegrasi untuk kalkulasi zonasi PPDB terdekat.'
              : t('school.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-brand-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'manual'
              ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {locale === 'id' ? '🔍 Pencarian Manual' : '🔍 Manual Search'}
        </button>
        <button
          onClick={() => setActiveTab('zonasi')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'zonasi'
              ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {locale === 'id' ? '📍 Deteksi Lokasi & Zonasi PPDB' : '📍 Auto Proximity / Zonasi'}
        </button>
      </div>

      {/* Manual selection tab */}
      {activeTab === 'manual' && (
        <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-slate-400">
              {t('school.quick_search')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowGlobalResults(true);
                }}
                onFocus={() => setShowGlobalResults(true)}
                placeholder={t('school.search')}
                className="w-full rounded-xl border border-brand-100 bg-white/70 py-3 pl-10 pr-10 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
              />
              {globalSearch && (
                <button
                  onClick={() => {
                    setGlobalSearch('');
                    setShowGlobalResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-brand-50 dark:hover:bg-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showGlobalResults && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowGlobalResults(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-brand-100 bg-white p-1.5 shadow-glass-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                    {searchResults.map((r) => (
                      <button
                        key={r.school.id}
                        onClick={() => handleGlobalSelect(r)}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50/60 dark:hover:bg-slate-700/60"
                      >
                        <SchoolIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{r.school.name}</p>
                          <p className="truncate text-xs text-ink-500 dark:text-slate-400">
                            {r.regencyName}, {r.provinceName}
                          </p>
                        </div>
                        <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${riskStyles[r.school.risk].bg} ${riskStyles[r.school.risk].text}`}>
                          {r.school.risk}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-100 dark:bg-slate-700" />
            <span className="text-xs font-medium text-ink-400 dark:text-slate-500">{t('school.or_manual')}</span>
            <div className="h-px flex-1 bg-brand-100 dark:bg-slate-700" />
          </div>

          {/* Cascading dropdowns */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SearchableDropdown
              label={t('school.province')}
              icon={MapPin}
              value={provinceId}
              options={provinces}
              placeholder={t('school.province')}
              onChange={(id) => {
                setProvinceId(id);
                setRegencyId('');
                setSchoolId('');
                setConfirmed(false);
              }}
            />
            <SearchableDropdown
              label={t('school.regency')}
              icon={Building2}
              value={regencyId}
              options={regencies}
              placeholder={t('school.regency')}
              disabled={!provinceId}
              onChange={(id) => {
                setRegencyId(id);
                setSchoolId('');
                setConfirmed(false);
              }}
            />
            <SearchableDropdown
              label={t('school.select')}
              icon={SchoolIcon}
              value={schoolId}
              options={schools}
              placeholder={t('school.select')}
              disabled={!regencyId}
              onChange={(id) => {
                setSchoolId(id);
                setConfirmed(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Zonasi / Proximity selection tab */}
      {activeTab === 'zonasi' && (
        <div className="glass rounded-2xl p-5 dark:bg-slate-900/60 space-y-6">
          {/* Geo Detection Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-brand-100 bg-brand-50/20 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                <Locate className={`h-5 w-5 ${locStatus === 'loading' ? 'animate-spin' : ''}`} />
                {locStatus === 'loading' && (
                  <span className="absolute -inset-1 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-900 dark:text-white">
                  {locale === 'id' ? 'Layanan GPS Zonasi PPDB' : 'PPDB Proximity Geolocation'}
                </h4>
                <p className="text-xs text-ink-500 dark:text-slate-400">
                  {locStatus === 'success' && location
                    ? `Lokasi terdeteksi: Lintang ${location.lat.toFixed(4)}°, Bujur ${location.lng.toFixed(4)}°`
                    : locale === 'id' 
                      ? 'Gunakan GPS browser Anda untuk mendeteksi sekolah dalam radius terdekat.'
                      : 'Detect your browser location to compute nearby schools within zoning rings.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={detectLoc}
              disabled={locStatus === 'loading'}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition-all shadow-glow"
            >
              <Compass className="h-4 w-4" />
              {locStatus === 'loading' 
                ? (locale === 'id' ? 'Mendeteksi...' : 'Detecting...') 
                : (locale === 'id' ? 'Deteksi Lokasi Saya' : 'Detect My Location')
              }
            </button>
          </div>

          {/* Show location error */}
          {locStatus === 'error' && locError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="font-bold">{locale === 'id' ? 'Kesalahan Sensor GPS' : 'GPS Sensor Error'}</p>
                <p className="mt-0.5">{locError}</p>
              </div>
            </div>
          )}

          {/* Proximity Results */}
          {locStatus === 'success' && location && (
            <div className="space-y-4">
              {/* Level Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-50 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                  <span className="text-xs font-bold text-ink-700 dark:text-slate-300">
                    {locale === 'id' ? 'Filter Tingkat Sekolah:' : 'Filter School Level:'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'SD', 'SMP', 'SMA', 'SMK'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevelFilter(lvl)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                        levelFilter === lvl
                          ? 'bg-brand-600 text-white shadow-glow'
                          : 'bg-brand-50 text-ink-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {lvl === 'ALL' ? (locale === 'id' ? 'Semua' : 'All') : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Near Schools */}
              {nearestSchools.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-brand-100 rounded-xl">
                  <Info className="mx-auto h-6 w-6 text-ink-400 mb-1.5" />
                  <p className="text-xs text-ink-500 dark:text-slate-400">
                    {locale === 'id' 
                      ? 'Tidak ditemukan sekolah dengan filter ini di sekitar Anda.' 
                      : 'No schools found near your location with the active filters.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {nearestSchools.map((item) => {
                    const zone = getZoneBadge(item.distanceKm);
                    const isSchSelected = schoolId === item.school.id;
                    return (
                      <button
                        key={item.school.id}
                        onClick={() => handleNearSelect(item.school, item.provinceName, item.regencyName)}
                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                          isSchSelected
                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 ring-2 ring-brand-500/20'
                            : 'border-brand-100 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${riskStyles[item.school.risk].bg} ${riskStyles[item.school.risk].text}`}>
                            {item.school.risk} Risk
                          </span>
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                            {formatDistance(item.distanceKm)}
                          </span>
                        </div>
                        <h5 className="mt-2 font-display text-sm font-bold text-ink-900 dark:text-white line-clamp-1">
                          {item.school.name}
                        </h5>
                        <p className="text-[10px] text-ink-500 dark:text-slate-400 mt-0.5 truncate w-full">
                          {item.regencyName}, {item.provinceName}
                        </p>
                        <div className="mt-3 flex w-full items-center justify-between gap-1 border-t border-brand-50/50 pt-2 dark:border-slate-700/50">
                          <span className={`rounded-lg border px-1.5 py-0.5 text-[8px] font-bold ${zone.style}`}>
                            {zone.label}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-brand-500 bg-brand-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                            {item.school.level}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Location prompt if not success */}
          {locStatus === 'idle' && (
            <div className="text-center py-8 border border-dashed border-brand-100 rounded-xl dark:border-slate-800">
              <Compass className="mx-auto h-8 w-8 text-brand-400 animate-pulse mb-2" />
              <p className="text-xs text-ink-500 dark:text-slate-400 max-w-sm mx-auto">
                {locale === 'id' 
                  ? 'Klik tombol "Deteksi Lokasi Saya" di atas untuk mencari sekolah dalam zona radius terdekat dari koordinat GPS Anda saat ini.'
                  : 'Click the detection button to retrieve nearest schools. Distances will be calculated using GPS coordinates.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected school info */}
      <AnimatePresence>
        {selectedSchool && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass space-y-5 rounded-2xl p-6 dark:bg-slate-900/60">
              {/* School header */}
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glass">
                  <SchoolIcon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                    {selectedSchool.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-ink-700 dark:bg-slate-700 dark:text-slate-300">
                      <MapPin className="h-3 w-3" /> {selectedSchoolLocationInfo?.provinceId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-ink-700 dark:bg-slate-700 dark:text-slate-300">
                      <Building2 className="h-3 w-3" /> {selectedSchoolLocationInfo?.regencyId}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {selectedSchool.level}
                    </span>
                    <span>·</span>
                    <span>{selectedSchool.isPublic ? t('school.public') : t('school.private')}</span>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Coordinates */}
                <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.coordinates')}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">
                    {selectedSchool.lat.toFixed(4)}°, {selectedSchool.lng.toFixed(4)}°
                  </p>
                </div>

                {/* Hazard Category */}
                <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.hazard_category')}</p>
                  {riskStyle && (
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${riskStyle.bg} ${riskStyle.text}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {selectedSchool.risk}
                    </span>
                  )}
                </div>

                {/* Disaster Risk Level */}
                <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.risk_level')}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${hazardColor(
                          (selectedSchool.earthquake + selectedSchool.flood + selectedSchool.landslide + selectedSchool.volcanic + selectedSchool.tsunami) / 5
                        )}`}
                        style={{
                          width: `${(selectedSchool.earthquake + selectedSchool.flood + selectedSchool.landslide + selectedSchool.volcanic + selectedSchool.tsunami) / 5}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-ink-900 dark:text-white">
                      {Math.round((selectedSchool.earthquake + selectedSchool.flood + selectedSchool.landslide + selectedSchool.volcanic + selectedSchool.tsunami) / 5)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Hazard breakdown */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.risk_profile')}</p>
                <div className="grid gap-3 sm:grid-cols-5">
                  {hazardIcons.map((h) => {
                    const value = selectedSchool[h.key as keyof typeof selectedSchool] as number;
                    return (
                      <div key={h.label} className="rounded-xl border border-brand-100 p-3 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <h.icon className="h-4 w-4 text-brand-500" />
                          <span className="text-xs font-medium text-ink-600 dark:text-slate-300">{h.label}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-50 dark:bg-slate-800">
                            <div className={`h-full rounded-full ${hazardColor(value)}`} style={{ width: `${value}%` }} />
                          </div>
                          <span className="text-xs font-bold text-ink-900 dark:text-white">${value}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended modules */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.rec_modules')}</p>
                <div className="flex flex-wrap gap-2">
                  {modules.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/60 px-3 py-1.5 text-xs font-medium text-brand-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-brand-400">
                      <BookOpen className="h-3 w-3" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evacuation info */}
              {evacInfo && (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400 dark:text-slate-500">{t('school.evac_info')}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-3 rounded-xl border border-brand-100 p-3 dark:border-slate-700">
                      <Route className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div>
                        <p className="text-xs font-semibold text-ink-900 dark:text-white">{t('school.evac_route')}</p>
                        <p className="text-[11px] text-ink-500 dark:text-slate-400">{evacInfo.route}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-brand-100 p-3 dark:border-slate-700">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div>
                        <p className="text-xs font-semibold text-ink-900 dark:text-white">{t('school.assembly_pt')}</p>
                        <p className="text-[11px] text-ink-500 dark:text-slate-400">{evacInfo.assemblyPoint}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-brand-100 p-3 dark:border-slate-700">
                      <Home className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div>
                        <p className="text-xs font-semibold text-ink-900 dark:text-white">{t('school.shelter')}</p>
                        <p className="text-[11px] text-ink-500 dark:text-slate-400">{evacInfo.shelter}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-brand-100 p-3 dark:border-slate-700">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div>
                        <p className="text-xs font-semibold text-ink-900 dark:text-white">{t('school.est_time')}</p>
                        <p className="text-[11px] text-ink-500 dark:text-slate-400">{evacInfo.estimatedTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={clearSelection}
                  className="rounded-full px-6 py-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('school.cancel')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmed}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all ${
                    confirmed
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
                      : 'bg-brand-600 text-white hover:bg-brand-700 hover:-translate-y-0.5 hover:shadow-glow'
                  }`}
                >
                  {confirmed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Selection Saved
                    </>
                  ) : (
                    <>
                      Confirm Selection <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {confirmed && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/app/geo-risk-map')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white/70 px-6 py-3 text-sm font-semibold text-brand-700 transition-all hover:bg-white hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800/70 dark:text-brand-400"
                  >
                    View on Risk Map <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}
                {confirmed && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/app/ai-learning')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white/70 px-6 py-3 text-sm font-semibold text-brand-700 transition-all hover:bg-white hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800/70 dark:text-brand-400"
                  >
                    Continue to Learning <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing selection */}
      {selection && !selectedSchool && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
          <p className="text-sm text-brand-700 dark:text-brand-400">
            <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
            Current selection: <strong>{selection.school.name}</strong> — {selection.regencyName}, {selection.provinceName}
          </p>
        </div>
      )}
    </div>
  );
}

export default SchoolLocationSelector;
