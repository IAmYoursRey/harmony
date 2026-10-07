import React, { useState, useMemo } from 'react';
import {
  Leaf,
  Car,
  Fuel,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  TrendingDown,
  Download,
  Info,
  Trees,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  transportEmissionService,
  VERIFIED_EMISSION_FACTORS,
  EmissionTripInput,
  EmissionTripResult,
  EmissionScenarioComparison,
} from '../../../../../services/geospatial/transportEmissionService';

interface GeospatialEmissionsTabProps {
  defaultDistanceKm?: number;
  regionName: string;
}

export const GeospatialEmissionsTab: React.FC<GeospatialEmissionsTabProps> = ({
  defaultDistanceKm = 12.5,
  regionName,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(defaultDistanceKm);
  const [selectedFactorId, setSelectedFactorId] = useState<string>('car_gasoline_medium');
  const [alternativeFactorId, setAlternativeFactorId] = useState<string>('bus_transit_urban');
  const [occupancy, setOccupancy] = useState<number>(1);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);
  const [frequencyPerWeek, setFrequencyPerWeek] = useState<number>(5);
  const [idleDelayMinutes, setIdleDelayMinutes] = useState<number>(15);

  const baselineInput: EmissionTripInput = useMemo(() => ({
    distanceKm,
    factorId: selectedFactorId,
    occupancy,
    isRoundTrip,
    frequencyPerWeek,
    idleDelayMinutes,
  }), [distanceKm, selectedFactorId, occupancy, isRoundTrip, frequencyPerWeek, idleDelayMinutes]);

  const alternativeInput: EmissionTripInput = useMemo(() => ({
    distanceKm,
    factorId: alternativeFactorId,
    occupancy: VERIFIED_EMISSION_FACTORS[alternativeFactorId]?.defaultOccupancy || 1,
    isRoundTrip,
    frequencyPerWeek,
    idleDelayMinutes: 0,
  }), [distanceKm, alternativeFactorId, isRoundTrip, frequencyPerWeek]);

  const comparison: EmissionScenarioComparison = useMemo(() => {
    return transportEmissionService.compareScenarios(baselineInput, alternativeInput);
  }, [baselineInput, alternativeInput]);

  const baseline = comparison.baseline;
  const scenario = comparison.scenario;

  const handleExportCSV = () => {
    const headers = [
      'Scenario',
      'ModeCategory',
      'FactorName',
      'FactorValue',
      'FactorUnit',
      'Scope',
      'DistanceKm',
      'TripKgCO2e',
      'WeeklyKgCO2e',
      'AnnualKgCO2e',
      'AnnualSavedKgCO2e',
      'PercentReduction',
      'TreesSaved',
    ];

    const b = baseline;
    const s = scenario;
    const rows = [
      [
        'Baseline',
        `"${b.factorUsed.category}"`,
        `"${b.factorUsed.name}"`,
        b.factorUsed.value,
        `"${b.factorUsed.unit}"`,
        `"${b.factorUsed.scope}"`,
        b.totalDistanceKm,
        b.tripEmissionKgCO2e,
        b.weeklyEmissionKgCO2e,
        b.annualEmissionKgCO2e,
        0,
        0,
        0,
      ],
      [
        'Alternative',
        `"${s.factorUsed.category}"`,
        `"${s.factorUsed.name}"`,
        s.factorUsed.value,
        `"${s.factorUsed.unit}"`,
        `"${s.factorUsed.scope}"`,
        s.totalDistanceKm,
        s.tripEmissionKgCO2e,
        s.weeklyEmissionKgCO2e,
        s.annualEmissionKgCO2e,
        comparison.absoluteReductionKgCO2e,
        comparison.percentageReduction,
        comparison.treesEquivalentSaved,
      ],
    ];

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_carbon_emissions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Kalkulator Emisi Karbon Transportasi & Transisi Berkelanjutan
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                UK DESNZ & ESDM
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Perhitungan emisi gas rumah kaca berbasis faktor terverifikasi (vehicle-km vs passenger-km)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Unduh Laporan CSV
          </button>
        </div>
      </div>

      {/* Input Parameters Form */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <Car className="w-4 h-4 text-emerald-500" /> Parameter Perjalanan & Armada Mobilitas
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Distance */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Jarak Tempuh Satu Arah (km)
            </label>
            <input name="distanceKm" id="geospatialemissionstab-distancekm"
              type="number"
              min="0.5"
              step="0.5"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Math.max(0.1, parseFloat(e.target.value) || 0))}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Baseline Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Moda Perjalanan Utama (Baseline)
            </label>
            <select name="selectedFactorId" id="geospatialemissionstab-selectedfactorid"
              value={selectedFactorId}
              onChange={(e) => setSelectedFactorId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              {Object.values(VERIFIED_EMISSION_FACTORS).map((f) => (
                <option key={f.factorId} value={f.factorId}>
                  {f.name} ({f.value} {f.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Alternative Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alternatif Berkelanjutan
            </label>
            <select name="alternativeFactorId" id="geospatialemissionstab-alternativefactorid"
              value={alternativeFactorId}
              onChange={(e) => setAlternativeFactorId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              {Object.values(VERIFIED_EMISSION_FACTORS).map((f) => (
                <option key={f.factorId} value={f.factorId}>
                  {f.name} ({f.value} {f.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional commute toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Okupansi (Orang)
            </label>
            <input name="occupancy" id="geospatialemissionstab-occupancy"
              type="number"
              min="1"
              max="50"
              value={occupancy}
              onChange={(e) => setOccupancy(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Frekuensi Mingguan (Hari)
            </label>
            <input name="frequencyPerWeek" id="geospatialemissionstab-frequencyperweek"
              type="number"
              min="1"
              max="7"
              value={frequencyPerWeek}
              onChange={(e) => setFrequencyPerWeek(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Kemacetan / Idle (Menit)
            </label>
            <input name="idleDelayMinutes" id="geospatialemissionstab-idledelayminutes"
              type="number"
              min="0"
              max="120"
              value={idleDelayMinutes}
              onChange={(e) => setIdleDelayMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
              <input name="isRoundTrip" id="geospatialemissionstab-isroundtrip"
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Pulang-Pergi (2x Trip)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Scenario Comparison Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-teal-950/20 border border-emerald-500/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-600" /> Hasil Komparasi Jejak Karbon
            </h4>
            <p className="text-xs text-slate-500">
              Evaluasi penghematan emisi tahunan melalui peralihan moda transportasi
            </p>
          </div>

          <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">Potensi Reduksi:</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {comparison.percentageReduction}%
            </span>
          </div>
        </div>

        {/* 2-Column Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Baseline Side */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Baseline Saat Ini</span>
            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
              {baseline.factorUsed.name}
            </h5>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {baseline.annualEmissionKgCO2e}
              </span>
              <span className="text-xs text-slate-500 font-bold">kg CO₂e / tahun</span>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <div>Perjalanan: {baseline.tripEmissionKgCO2e} kg CO₂e ({baseline.totalDistanceKm} km)</div>
              <div>Per Penumpang: {baseline.perPassengerEmissionKgCO2e} kg CO₂e</div>
              {baseline.idleDelayEmissionKgCO2e > 0 && (
                <div className="text-amber-500 font-medium">+ Emisi Macet: {baseline.idleDelayEmissionKgCO2e} kg CO₂e</div>
              )}
            </div>
          </div>

          {/* Alternative Side */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <span className="text-[10px] font-bold uppercase text-emerald-500">Alternatif Ramah Lingkungan</span>
            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
              {scenario.factorUsed.name}
            </h5>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {scenario.annualEmissionKgCO2e}
              </span>
              <span className="text-xs text-slate-500 font-bold">kg CO₂e / tahun</span>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <div>Perjalanan: {scenario.tripEmissionKgCO2e} kg CO₂e ({scenario.totalDistanceKm} km)</div>
              <div>Per Penumpang: {scenario.perPassengerEmissionKgCO2e} kg CO₂e</div>
              <div className="text-emerald-600 font-semibold">
                Hemat: {comparison.absoluteReductionKgCO2e} kg CO₂e / tahun
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Benefit Equivalency */}
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <Trees className="w-6 h-6 text-emerald-200 shrink-0" />
            <div>
              <div className="text-xs font-bold">Dampak Ekologis Setara Penyerapan Karbon Pohon</div>
              <p className="text-[11px] text-emerald-100 opacity-90">
                Berdasarkan standar US EPA (1 pohon dewasa menyerap ~21.77 kg CO₂ per tahun)
              </p>
            </div>
          </div>
          <div className="text-xl font-black whitespace-nowrap">
            🌲 {comparison.treesEquivalentSaved} Pohon Dewasa
          </div>
        </div>

        {/* Provenance and Citation details */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5" /> Metodologi & Rujukan Faktor Emisi
          </div>
          <p>
            {baseline.assumptions[0]}
          </p>
          <p>
            {scenario.assumptions[0]}
          </p>
        </div>
      </div>
    </div>
  );
};
