/**
 * Transportation Carbon Emissions Calculator & Registry
 * Verified GHG Emission Factors based on UK Government GHG Factors 2026 & Kementerian ESDM RI.
 * Reference: UK DESNZ / Defra GHG Conversion Factors 2026 & ESDM Pedoman Emisi Sektor Transportasi.
 */

export type EmissionBasis = 'vehicle-km' | 'passenger-km' | 'liter' | 'kWh';
export type EmissionScope = 'Scope 1 (Direct Tailpipe)' | 'Scope 2 (Indirect Electricity)' | 'Scope 3 (Well-to-Wheel / Lifecycle)';

export interface EmissionFactorEntry {
  factorId: string;
  name: string;
  category: 'Mobil Bensin' | 'Mobil Diesel' | 'Mobil Listrik (EV)' | 'Sepeda Motor' | 'Bus Trans / Kota' | 'Kereta Rel Listrik (KRL/LRT)' | 'Jalan Kaki / Sepeda';
  value: number; // in numerical factor
  unit: string;  // e.g. "g CO2e / vkm", "kg CO2e / pkm"
  basis: EmissionBasis;
  scope: EmissionScope;
  co2Equivalent: boolean;
  country: 'Indonesia (Lokal)' | 'Global / Proxy (UK Defra 2026)';
  year: number;
  sourceCitation: string;
  sourceUrl: string;
  defaultOccupancy: number;
}

export interface EmissionTripInput {
  distanceKm: number;
  factorId: string;
  occupancy?: number;
  isRoundTrip?: boolean;
  frequencyPerWeek?: number; // e.g. 5 days a week
  idleDelayMinutes?: number; // Traffic idle delay
}

export interface EmissionTripResult {
  factorUsed: EmissionFactorEntry;
  totalDistanceKm: number;
  tripEmissionKgCO2e: number;
  perPassengerEmissionKgCO2e: number;
  weeklyEmissionKgCO2e: number;
  annualEmissionKgCO2e: number; // 52 weeks
  idleDelayEmissionKgCO2e: number;
  assumptions: string[];
}

export interface EmissionScenarioComparison {
  baseline: EmissionTripResult;
  scenario: EmissionTripResult;
  absoluteReductionKgCO2e: number;
  percentageReduction: number;
  treesEquivalentSaved: number; // ~21.77 kg CO2 absorbed per tree per year (EPA)
  treeEquivalenceDisclaimer: string;
}

export const VERIFIED_EMISSION_FACTORS: Record<string, EmissionFactorEntry> = {
  car_petrol_avg: {
    factorId: 'car_petrol_avg',
    name: 'Mobil Bensin Rata-rata (Semua Kapasitas)',
    category: 'Mobil Bensin',
    value: 164.5,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK Department for Energy Security and Net Zero (DESNZ) GHG Factors 2026, Table Passenger vehicles - Petrol average',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.5,
  },
  car_gasoline_medium: {
    factorId: 'car_gasoline_medium',
    name: 'Mobil Penumpang Bensin (1.4 - 2.0L)',
    category: 'Mobil Bensin',
    value: 170.5,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ Greenhouse Gas Conversion Factors 2026, Table Passenger vehicles - Cars Medium Petrol',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.5,
  },
  car_diesel_avg: {
    factorId: 'car_diesel_avg',
    name: 'Mobil Diesel Rata-rata',
    category: 'Mobil Diesel',
    value: 168.2,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Conversion Factors 2026, Table Passenger vehicles - Diesel average',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.5,
  },
  car_diesel_medium: {
    factorId: 'car_diesel_medium',
    name: 'Mobil Penumpang Diesel (1.7 - 2.0L)',
    category: 'Mobil Diesel',
    value: 168.2,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Conversion Factors 2026, Passenger vehicles',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.5,
  },
  car_hybrid_avg: {
    factorId: 'car_hybrid_avg',
    name: 'Mobil Hybrid Bensin (HEV)',
    category: 'Mobil Bensin',
    value: 112.4,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Conversion Factors 2026, Table Passenger vehicles - Hybrid average',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.5,
  },
  car_electric_bev: {
    factorId: 'car_electric_bev',
    name: 'Mobil Listrik Murni (BEV) - Grid Indonesia (0.15 kWh/km)',
    category: 'Mobil Listrik (EV)',
    value: 117.0, // 0.15 kWh/km * 0.78 kg CO2/kWh = 117 g CO2e/km
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2025,
    sourceCitation: 'Kementerian ESDM RI: Faktor Emisi Grid Ketenagalistrikan Jamali (0.78 kg CO2/kWh) dikalikan konsumsi baterai BEV standar 0.15 kWh/km',
    sourceUrl: 'https://ebtke.esdm.go.id',
    defaultOccupancy: 1.5,
  },
  car_electric_beve: {
    factorId: 'car_electric_beve',
    name: 'Mobil Listrik Murni (BEV) - Grid Indonesia',
    category: 'Mobil Listrik (EV)',
    value: 117.0,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2025,
    sourceCitation: 'Kementerian ESDM RI: Grid Jamali (0.78 kg CO2/kWh) x 0.15 kWh/km',
    sourceUrl: 'https://ebtke.esdm.go.id',
    defaultOccupancy: 1.5,
  },
  car_bev_id: {
    factorId: 'car_bev_id',
    name: 'Mobil Listrik Murni (BEV) - Jamali',
    category: 'Mobil Listrik (EV)',
    value: 117.0,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2025,
    sourceCitation: 'ESDM RI: Grid Jamali x 0.15 kWh/km',
    sourceUrl: 'https://ebtke.esdm.go.id',
    defaultOccupancy: 1.5,
  },
  car_bev_id_mini: {
    factorId: 'car_bev_id_mini',
    name: 'Mobil Listrik Kompak / City BEV (0.10 kWh/km)',
    category: 'Mobil Listrik (EV)',
    value: 78.6, // 0.10 kWh/km * 0.785 kg CO2/kWh = 78.5 g CO2e/km
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2025,
    sourceCitation: 'Kementerian ESDM RI: Grid Jamali (0.785 kg CO2/kWh) x 0.10 kWh/km untuk mobil listrik mini perkotaan',
    sourceUrl: 'https://ebtke.esdm.go.id',
    defaultOccupancy: 1.2,
  },
  motorcycle_small: {
    factorId: 'motorcycle_small',
    name: 'Sepeda Motor Kecil (<125cc)',
    category: 'Sepeda Motor',
    value: 82.8,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Motorbikes - Small motorbike <125cc',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.2,
  },
  motorcycle_avg: {
    factorId: 'motorcycle_avg',
    name: 'Sepeda Motor Rata-rata / Bebek / Matic (110 - 150cc)',
    category: 'Sepeda Motor',
    value: 103.1,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Motorbikes - Average motorbike',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.2,
  },
  motorcycle_gasoline: {
    factorId: 'motorcycle_gasoline',
    name: 'Sepeda Motor Bebek / Matic (110 - 150cc)',
    category: 'Sepeda Motor',
    value: 103.1,
    unit: 'g CO2e / vehicle-km',
    basis: 'vehicle-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Motorbikes - Average motorbike',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 1.2,
  },
  bus_city_passenger: {
    factorId: 'bus_city_passenger',
    name: 'Bus Kota Reguler / Non-BRT',
    category: 'Bus Trans / Kota',
    value: 0.0965, // 96.5 g CO2e / pkm
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Business travel - Local bus (average)',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 24,
  },
  bus_brt_passenger: {
    factorId: 'bus_brt_passenger',
    name: 'Bus Rapid Transit (BRT / TransJakarta Koridor)',
    category: 'Bus Trans / Kota',
    value: 0.0284, // 28.4 g CO2e / pkm
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Business travel - Coach / High occupancy BRT',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 35,
  },
  bus_transit_urban: {
    factorId: 'bus_transit_urban',
    name: 'Bus Raya Terpadu (BRT / TransJakarta)',
    category: 'Bus Trans / Kota',
    value: 0.0284,
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Business travel - Coach / BRT',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 35,
  },
  train_commuter_passenger: {
    factorId: 'train_commuter_passenger',
    name: 'Kereta Komuter Listrik (KRL Commuterline)',
    category: 'Kereta Rel Listrik (KRL/LRT)',
    value: 0.0351, // 35.1 g CO2e / pkm
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Business travel - National rail / KRL Commuterline',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 150,
  },
  train_electric_krl: {
    factorId: 'train_electric_krl',
    name: 'Kereta Rel Listrik (KRL)',
    category: 'Kereta Rel Listrik (KRL/LRT)',
    value: 0.0351,
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, National rail / KRL Commuterline',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 150,
  },
  train_light_rail: {
    factorId: 'train_light_rail',
    name: 'LRT / Trem Listrik Perkotaan',
    category: 'Kereta Rel Listrik (KRL/LRT)',
    value: 0.0286, // 28.6 g CO2e / pkm
    unit: 'kg CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 2 (Indirect Electricity)',
    co2Equivalent: true,
    country: 'Global / Proxy (UK Defra 2026)',
    year: 2026,
    sourceCitation: 'UK DESNZ GHG Factors 2026, Table Business travel - Light rail and tram',
    sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    defaultOccupancy: 100,
  },
  active_walk_bike: {
    factorId: 'active_walk_bike',
    name: 'Jalan Kaki / Sepeda Kayuh (Mobilitas Aktif)',
    category: 'Jalan Kaki / Sepeda',
    value: 0.0,
    unit: 'g CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2026,
    sourceCitation: 'IPCC Guidelines for National Greenhouse Gas Inventories: Zero direct operational tailpipe emissions',
    sourceUrl: 'https://www.ipcc-nggip.iges.or.jp',
    defaultOccupancy: 1,
  },
  walking: {
    factorId: 'walking',
    name: 'Jalan Kaki',
    category: 'Jalan Kaki / Sepeda',
    value: 0.0,
    unit: 'g CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2026,
    sourceCitation: 'IPCC Guidelines: Zero direct tailpipe emissions',
    sourceUrl: 'https://www.ipcc-nggip.iges.or.jp',
    defaultOccupancy: 1,
  },
  bicycle: {
    factorId: 'bicycle',
    name: 'Sepeda Kayuh',
    category: 'Jalan Kaki / Sepeda',
    value: 0.0,
    unit: 'g CO2e / passenger-km',
    basis: 'passenger-km',
    scope: 'Scope 1 (Direct Tailpipe)',
    co2Equivalent: true,
    country: 'Indonesia (Lokal)',
    year: 2026,
    sourceCitation: 'IPCC Guidelines: Zero direct tailpipe emissions',
    sourceUrl: 'https://www.ipcc-nggip.iges.or.jp',
    defaultOccupancy: 1,
  },
};

export class TransportEmissionService {
  /**
   * Calculates carbon emissions from a single journey or periodic commute
   */
  public calculateTripEmission(input: EmissionTripInput): EmissionTripResult {
    const factor = VERIFIED_EMISSION_FACTORS[input.factorId] || VERIFIED_EMISSION_FACTORS.car_gasoline_medium;
    const distanceKm = Math.max(0, input.distanceKm);
    const multiplier = input.isRoundTrip ? 2 : 1;
    const totalDistance = distanceKm * multiplier;
    const occupancy = Math.max(1, input.occupancy || factor.defaultOccupancy);
    const frequency = typeof input.frequencyPerWeek === 'number' && Number.isFinite(input.frequencyPerWeek)
      ? Math.max(0, input.frequencyPerWeek)
      : 5;

    let tripEmissionKg = 0;
    let perPassengerKg = 0;

    if (factor.basis === 'vehicle-km') {
      // Formula: distance (km) * factor (g/km) / 1000 => kg CO2e
      tripEmissionKg = (totalDistance * factor.value) / 1000;
      perPassengerKg = tripEmissionKg / occupancy;
    } else if (factor.basis === 'passenger-km') {
      // Formula: distance (km) * factor (kg/pkm) => kg CO2e per passenger directly
      perPassengerKg = totalDistance * factor.value;
      tripEmissionKg = perPassengerKg * occupancy;
    }

    // Vehicle specific idle delay emission rate (kg CO2e / min)
    // Mobil bensin/diesel: 0.020 kg/min (1.2 kg CO2e/hr)
    // Hybrid: 0.010 kg/min (engine shut-off)
    // Motor: 0.005 kg/min (0.3 kg CO2e/hr)
    // EV, bus penumpang, KRL, sepeda, jalan kaki: 0 kg knalpot per penumpang
    let idleRateKgPerMin = 0;
    if (factor.category === 'Mobil Bensin' || factor.category === 'Mobil Diesel') {
      idleRateKgPerMin = factor.factorId === 'car_hybrid_avg' ? 0.010 : 0.020;
    } else if (factor.category === 'Sepeda Motor') {
      idleRateKgPerMin = 0.005;
    }

    let idleEmissionKg = 0;
    if (input.idleDelayMinutes && input.idleDelayMinutes > 0 && idleRateKgPerMin > 0) {
      idleEmissionKg = input.idleDelayMinutes * idleRateKgPerMin * multiplier;
    }

    const netTripEmissionKg = parseFloat((tripEmissionKg + idleEmissionKg).toFixed(3));
    const netPassengerEmissionKg = parseFloat((perPassengerKg + (factor.basis === 'vehicle-km' ? idleEmissionKg / occupancy : idleEmissionKg)).toFixed(3));
    const weeklyEmissionKg = parseFloat((netPassengerEmissionKg * frequency).toFixed(2));
    const annualEmissionKg = parseFloat((weeklyEmissionKg * 52).toFixed(2));

    const assumptions: string[] = [
      `Faktor emisi: ${factor.value} ${factor.unit} (${factor.scope}) bersumber dari ${factor.sourceCitation}.`,
      `Okupansi perjalanan: ${occupancy} penumpang. ${input.isRoundTrip ? 'Termasuk perjalanan pulang-pergi (2x trip).' : 'Perjalanan satu arah.'}`,
    ];

    if (idleEmissionKg > 0) {
      assumptions.push(`Tambahan emisi idle akibat kemacetan lalu lintas (${input.idleDelayMinutes} menit): +${idleEmissionKg.toFixed(2)} kg CO2e.`);
    }

    if (factor.category === 'Mobil Listrik (EV)') {
      assumptions.push('EV tidak memiliki emisi tailpipe langsung (Scope 1 = 0), emisi dihitung dari bauran pembangkit listrik grid Indonesia (Scope 2).');
    }

    return {
      factorUsed: factor,
      totalDistanceKm: totalDistance,
      tripEmissionKgCO2e: netTripEmissionKg,
      perPassengerEmissionKgCO2e: netPassengerEmissionKg,
      weeklyEmissionKgCO2e: weeklyEmissionKg,
      annualEmissionKgCO2e: annualEmissionKg,
      idleDelayEmissionKgCO2e: parseFloat(idleEmissionKg.toFixed(3)),
      assumptions,
    };
  }

  /**
   * Compares baseline travel mode with sustainable alternative scenario
   */
  public compareScenarios(baselineInput: EmissionTripInput, scenarioInput: EmissionTripInput): EmissionScenarioComparison {
    const baseline = this.calculateTripEmission(baselineInput);
    const scenario = this.calculateTripEmission(scenarioInput);

    const absoluteReduction = parseFloat((baseline.annualEmissionKgCO2e - scenario.annualEmissionKgCO2e).toFixed(2));
    const pct = baseline.annualEmissionKgCO2e > 0
      ? parseFloat(((absoluteReduction / baseline.annualEmissionKgCO2e) * 100).toFixed(1))
      : 0;

    // US EPA standard: 1 mature tree absorbs ~21.77 kg CO2 / year
    const treesEquivalent = parseFloat((Math.max(0, absoluteReduction) / 21.77).toFixed(1));

    return {
      baseline,
      scenario,
      absoluteReductionKgCO2e: absoluteReduction,
      percentageReduction: pct,
      treesEquivalentSaved: treesEquivalent,
      treeEquivalenceDisclaimer: 'Nilai pohon merupakan ilustrasi serapan karbon biologis rata-rata (US EPA ~21.77 kg CO2/tahun/pohon), BUKAN unit kredit karbon tersertifikasi (carbon offset verified).',
    };
  }
}

export const transportEmissionService = new TransportEmissionService();
