/**
 * Indonesian Air Pollutant Standard Index (ISPU) Calculator
 * Implements the official calculation methodology of Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020.
 * Decouples atmospheric model data (Open-Meteo / CAMS) from ground station sensor observations.
 */

export interface ISPUParameterInput {
  pm25_24h?: number | null; // ug/m3
  pm10_24h?: number | null; // ug/m3
  so2_24h?: number | null;  // ug/m3
  no2_24h?: number | null;  // ug/m3 (Permen LHK P.14/2020 Lampiran I 24 jam)
  no2_1h?: number | null;   // ug/m3 (1 jam peak)
  o3_24h?: number | null;   // ug/m3 (Permen LHK P.14/2020 Lampiran I 24 jam)
  o3_8h?: number | null;    // ug/m3 (8 jam)
  co_24h?: number | null;   // ug/m3 (Permen LHK P.14/2020 Lampiran I 24 jam)
  co_8h?: number | null;    // ug/m3 (8 jam)
  hc_3h?: number | null;    // ug/m3 (3 jam)
}

export type ISPUCategory = 'Baik' | 'Sedang' | 'Tidak Sehat' | 'Sangat Tidak Sehat' | 'Berbahaya' | 'Tidak Tersedia';

export interface ISPUSubIndex {
  parameter: 'PM2.5' | 'PM10' | 'SO2' | 'NO2' | 'O3' | 'CO';
  concentration: number;
  unit: string;
  ispuValue: number;
  category: ISPUCategory;
  averagingTime: string;
}

export interface ISPUCalculationResult {
  compositeISPU: number | null;
  dominantPollutant: 'PM2.5' | 'PM10' | 'SO2' | 'NO2' | 'O3' | 'CO' | null;
  category: ISPUCategory;
  badgeColor: string;
  subIndices: ISPUSubIndex[];
  availableParametersCount: number;
  missingParameters: string[];
  healthRecommendation: string;
  standardReference: string;
  isPartialEstimate: boolean;
}

interface Breakpoint {
  Ia: number;
  Ib: number;
  Xa: number;
  Xb: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 15.5 },
  { Ia: 51, Ib: 100, Xa: 15.6, Xb: 55.4 },
  { Ia: 101, Ib: 200, Xa: 55.5, Xb: 150.4 },
  { Ia: 201, Ib: 300, Xa: 150.5, Xb: 250.4 },
  { Ia: 301, Ib: 500, Xa: 250.5, Xb: 500.0 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 50 },
  { Ia: 51, Ib: 100, Xa: 51, Xb: 150 },
  { Ia: 101, Ib: 200, Xa: 151, Xb: 350 },
  { Ia: 201, Ib: 300, Xa: 351, Xb: 420 },
  { Ia: 301, Ib: 500, Xa: 421, Xb: 600 },
];

const SO2_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 52 },
  { Ia: 51, Ib: 100, Xa: 53, Xb: 180 },
  { Ia: 101, Ib: 200, Xa: 181, Xb: 400 },
  { Ia: 201, Ib: 300, Xa: 401, Xb: 800 },
  { Ia: 301, Ib: 500, Xa: 801, Xb: 1200 },
];

const NO2_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 80 },
  { Ia: 51, Ib: 100, Xa: 81, Xb: 200 },
  { Ia: 101, Ib: 200, Xa: 201, Xb: 1130 },
  { Ia: 201, Ib: 300, Xa: 1131, Xb: 2260 },
  { Ia: 301, Ib: 500, Xa: 2261, Xb: 3000 },
];

const O3_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 120 },
  { Ia: 51, Ib: 100, Xa: 121, Xb: 235 },
  { Ia: 101, Ib: 200, Xa: 236, Xb: 400 },
  { Ia: 201, Ib: 300, Xa: 401, Xb: 800 },
  { Ia: 301, Ib: 500, Xa: 801, Xb: 1000 },
];

const CO_BREAKPOINTS: Breakpoint[] = [
  { Ia: 0, Ib: 50, Xa: 0, Xb: 4000 },
  { Ia: 51, Ib: 100, Xa: 4001, Xb: 8000 },
  { Ia: 101, Ib: 200, Xa: 8001, Xb: 15000 },
  { Ia: 201, Ib: 300, Xa: 15001, Xb: 30000 },
  { Ia: 301, Ib: 500, Xa: 30001, Xb: 45000 },
];

export class ISPUCalculatorService {
  /**
   * Calculates rolling average with strict data completeness requirement (e.g. 75% valid samples).
   * Strictly limits sample window to targetHours so that extra samples (e.g. 48 hours) do not dilute the rolling window.
   */
  public calculateRollingAverage(
    samples: (number | null | undefined)[],
    targetHours: number = 24,
    minCoveragePct: number = 0.75
  ): { average: number | null; validSamples: number; coveragePct: number; isSufficient: boolean } {
    const windowSamples = samples.length > targetHours ? samples.slice(-targetHours) : samples;
    const valid = windowSamples.filter((s): s is number => typeof s === 'number' && Number.isFinite(s) && s >= 0);
    const count = valid.length;
    const coveragePct = parseFloat(Math.min(1, count / targetHours).toFixed(2));
    const isSufficient = count >= Math.ceil(targetHours * minCoveragePct);

    if (!isSufficient || count === 0) {
      return { average: null, validSamples: count, coveragePct, isSufficient: false };
    }

    const sum = valid.reduce((acc, v) => acc + v, 0);
    return {
      average: parseFloat((sum / count).toFixed(2)),
      validSamples: count,
      coveragePct,
      isSufficient: true,
    };
  }

  /**
   * Normalizes timestamps from seconds, milliseconds, or ISO strings to integer milliseconds.
   */
  public normalizeTimestampMs(time: number | string | undefined | null): number {
    if (time == null) return NaN;
    if (typeof time === 'number') {
      if (!Number.isFinite(time)) return NaN;
      return time < 1e11 ? Math.round(time * 1000) : Math.round(time);
    }
    const parsed = Date.parse(String(time));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  /**
   * Calculates rolling average from timestamped series, strictly bounded to past targetHours up to anchorTime.
   * Rejects future forecast hours and deduplicates hours.
   */
  public calculateRollingAverageFromSeries(
    series: Array<{ time: number | string; value: number | null | undefined }>,
    targetHours: number = 24,
    options: {
      anchorTime?: number | string;
      minCoveragePct?: number;
      direction?: 'past' | 'forward';
      allowFutureHours?: boolean; // deprecated fallback flag; past averages still reject future hours
    } = {}
  ): {
    average: number | null;
    validSamples: number;
    coveragePct: number;
    isSufficient: boolean;
    windowStart: string | null;
    windowEnd: string | null;
  } {
    const minCoveragePct = options.minCoveragePct ?? 0.75;
    let anchorMs: number;
    if (options.anchorTime !== undefined && options.anchorTime !== null) {
      anchorMs = this.normalizeTimestampMs(options.anchorTime);
      if (!Number.isFinite(anchorMs)) {
        return {
          average: null,
          validSamples: 0,
          coveragePct: 0,
          isSufficient: false,
          windowStart: null,
          windowEnd: null,
        };
      }
    } else {
      anchorMs = Date.now();
    }

    const isForward = options.direction === 'forward';
    const windowStartMs = isForward ? anchorMs : anchorMs - targetHours * 3600 * 1000;
    const windowEndMs = isForward ? anchorMs + targetHours * 3600 * 1000 : anchorMs;

    const hourMap = new Map<number, number>();
    for (const point of series) {
      const tMs = this.normalizeTimestampMs(point.time);
      if (!Number.isFinite(tMs)) continue;

      // Half-open intervals: (windowStart, windowEnd] for past, [windowStart, windowEnd) for forward
      if (isForward) {
        if (tMs < windowStartMs || tMs >= windowEndMs) continue;
      } else {
        // Historical rolling average strictly excludes future hours (tMs > anchorMs) and start boundary
        if (tMs <= windowStartMs || tMs > anchorMs) continue;
      }

      const val = point.value;
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        // Map strictly to a relative slot index [0, targetHours - 1] within the window
        // to prevent non-hour-aligned anchors from spilling into targetHours + 1 calendar buckets
        const offsetMs = isForward ? (tMs - windowStartMs) : (tMs - windowStartMs - 1);
        const relativeHourSlot = Math.min(targetHours - 1, Math.max(0, Math.floor(offsetMs / 3600000)));
        hourMap.set(relativeHourSlot, val);
      }
    }

    const validSamples = Math.min(targetHours, hourMap.size);
    const coveragePct = parseFloat(Math.min(1, validSamples / targetHours).toFixed(2));
    const isSufficient = validSamples >= Math.ceil(targetHours * minCoveragePct);

    if (!isSufficient || validSamples === 0) {
      return {
        average: null,
        validSamples,
        coveragePct,
        isSufficient: false,
        windowStart: new Date(windowStartMs).toISOString(),
        windowEnd: new Date(windowEndMs).toISOString(),
      };
    }

    const sum = Array.from(hourMap.values()).reduce((a, b) => a + b, 0);
    return {
      average: parseFloat((sum / validSamples).toFixed(2)),
      validSamples,
      coveragePct,
      isSufficient: true,
      windowStart: new Date(windowStartMs).toISOString(),
      windowEnd: new Date(windowEndMs).toISOString(),
    };
  }

  /**
   * Linear interpolation formula according to Permen LHK No. P.14/2020:
   * I = ((Ib - Ia) / (Xb - Xa)) * (X - Xa) + Ia
   * Returns null if concentration is negative, NaN, or non-finite.
   */
  public calculateSubIndex(concentration: number, breakpoints: Breakpoint[]): number | null {
    if (typeof concentration !== 'number' || !isFinite(concentration) || concentration < 0) {
      return null;
    }
    if (concentration === 0) return 0;

    for (const bp of breakpoints) {
      if (concentration <= bp.Xb) {
        const val = ((bp.Ib - bp.Ia) / (bp.Xb - bp.Xa)) * (concentration - bp.Xa) + bp.Ia;
        return Math.round(val);
      }
    }

    // Exceeding maximum table breakpoint
    const last = breakpoints[breakpoints.length - 1];
    const val = ((last.Ib - last.Ia) / (last.Xb - last.Xa)) * (concentration - last.Xa) + last.Ia;
    return Math.min(500, Math.round(val));
  }

  public getCategory(ispu: number): { category: ISPUCategory; color: string; recommendation: string } {
    if (ispu <= 50) {
      return {
        category: 'Baik',
        color: '#10b981',
        recommendation: 'Tingkat kualitas udara sangat baik, tidak memberikan efek negatif terhadap kesehatan manusia, hewan, dan tumbuhan.',
      };
    }
    if (ispu <= 100) {
      return {
        category: 'Sedang',
        color: '#3b82f6',
        recommendation: 'Tingkat kualitas udara masih dapat diterima pada kesehatan manusia, hewan, dan tumbuhan.',
      };
    }
    if (ispu <= 200) {
      return {
        category: 'Tidak Sehat',
        color: '#eab308',
        recommendation: 'Kualitas udara bersifat merugikan pada manusia, hewan, dan tumbuhan yang peka. Disarankan mengurangi aktivitas fisik luar ruangan.',
      };
    }
    if (ispu <= 300) {
      return {
        category: 'Sangat Tidak Sehat',
        color: '#ef4444',
        recommendation: 'Kualitas udara dapat meningkatkan sensitivitas pada populasi berisiko. Gunakan masker proteksi partikulat dan batasi aktivitas luar.',
      };
    }
    return {
      category: 'Berbahaya',
      color: '#000000',
      recommendation: 'Tingkat kualitas udara berbahaya secara umum bagi seluruh populasi. Tinggallah di dalam ruangan dengan purifikasi udara.',
    };
  }

  /**
   * Computes official composite ISPU and dominant pollutant
   */
  public calculateISPU(input: ISPUParameterInput): ISPUCalculationResult {
    return this.calculateCompositeISPU(input);
  }

  /**
   * Computes official composite ISPU and dominant pollutant
   */
  public calculateCompositeISPU(input: ISPUParameterInput): ISPUCalculationResult {
    const subIndices: ISPUSubIndex[] = [];
    const missingParameters: string[] = [];

    const testParam = (
      val: number | null | undefined,
      paramName: 'PM2.5' | 'PM10' | 'SO2' | 'NO2' | 'O3' | 'CO',
      unit: string,
      timeAvg: string,
      bps: Breakpoint[]
    ) => {
      if (val !== undefined && val !== null && typeof val === 'number' && isFinite(val) && val >= 0) {
        const ispu = this.calculateSubIndex(val, bps);
        if (ispu !== null) {
          const { category } = this.getCategory(ispu);
          subIndices.push({
            parameter: paramName,
            concentration: val,
            unit,
            ispuValue: ispu,
            category,
            averagingTime: timeAvg,
          });
          return;
        }
      }
      missingParameters.push(paramName);
    };

    const no2Val = input.no2_24h ?? input.no2_1h;
    const no2Time = input.no2_24h != null ? '24 Jam' : '1 Jam';
    const o3Val = input.o3_24h ?? input.o3_8h;
    const o3Time = input.o3_24h != null ? '24 Jam' : '8 Jam';
    const coVal = input.co_24h ?? input.co_8h;
    const coTime = input.co_24h != null ? '24 Jam' : '8 Jam';

    testParam(input.pm25_24h, 'PM2.5', 'µg/m³', '24 Jam', PM25_BREAKPOINTS);
    testParam(input.pm10_24h, 'PM10', 'µg/m³', '24 Jam', PM10_BREAKPOINTS);
    testParam(input.so2_24h, 'SO2', 'µg/m³', '24 Jam', SO2_BREAKPOINTS);
    testParam(no2Val, 'NO2', 'µg/m³', no2Time, NO2_BREAKPOINTS);
    testParam(o3Val, 'O3', 'µg/m³', o3Time, O3_BREAKPOINTS);
    testParam(coVal, 'CO', 'µg/m³', coTime, CO_BREAKPOINTS);
    if (input.hc_3h === undefined || input.hc_3h === null) {
      missingParameters.push('HC');
    }

    if (subIndices.length === 0) {
      return {
        compositeISPU: null,
        dominantPollutant: null,
        category: 'Tidak Tersedia',
        badgeColor: '#94a3b8',
        subIndices: [],
        availableParametersCount: 0,
        missingParameters,
        healthRecommendation: 'Data pengukuran polutan tidak mencukupi untuk mengalkulasi nilai ISPU resmi.',
        standardReference: 'Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020',
        isPartialEstimate: true,
      };
    }

    // Dominant pollutant has the highest sub-index
    const sorted = [...subIndices].sort((a, b) => b.ispuValue - a.ispuValue);
    const dominant = sorted[0];
    const catInfo = this.getCategory(dominant.ispuValue);

    return {
      compositeISPU: dominant.ispuValue,
      dominantPollutant: dominant.parameter,
      category: catInfo.category,
      badgeColor: catInfo.color,
      subIndices,
      availableParametersCount: subIndices.length,
      missingParameters,
      healthRecommendation: catInfo.recommendation,
      standardReference: 'Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020 (Lampiran II Pedoman Perhitungan ISPU)',
      isPartialEstimate: missingParameters.length > 0,
    };
  }
}

export const ispuCalculatorService = new ISPUCalculatorService();
