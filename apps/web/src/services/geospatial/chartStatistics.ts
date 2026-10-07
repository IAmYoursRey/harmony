export const WIND_DIRECTIONS = ['U', 'U–TL', 'TL', 'T–TL', 'T', 'T–TG', 'TG', 'S–TG', 'S', 'S–BD', 'BD', 'B–BD', 'B', 'B–BL', 'BL', 'U–BL'];
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function buildWindRose(samples: Array<{ windSpeed?: unknown; windDirection?: unknown }>, calmThresholdKmh = 0.5) {
  const counts = WIND_DIRECTIONS.map(() => ({ total: 0, strong: 0 }));
  let sampleCount = 0, calmCount = 0, missingCount = 0;
  for (const sample of samples) {
    if (!isNumber(sample.windSpeed) || sample.windSpeed < 0) { missingCount++; continue; }
    if (sample.windSpeed < calmThresholdKmh) { sampleCount++; calmCount++; continue; }
    if (!isNumber(sample.windDirection) || sample.windDirection < 0 || sample.windDirection > 360) { missingCount++; continue; }
    sampleCount++;
    const index = Math.floor(((sample.windDirection + 11.25) % 360) / 22.5);
    counts[index].total++;
    if (sample.windSpeed > 15) counts[index].strong++;
  }
  return { sampleCount, calmCount, missingCount, calmThresholdKmh, calmPct: sampleCount ? calmCount / sampleCount * 100 : 0,
    bins: sampleCount ? WIND_DIRECTIONS.map((direction, index) => ({ direction, frequency: counts[index].total / sampleCount * 100, strongPct: counts[index].strong / sampleCount * 100, count: counts[index].total })) : [] };
}
export function summarizeTemperature(samples: unknown[]) {
  const sorted = samples.filter(isNumber).sort((a,b) => a-b);
  const n = sorted.length;
  const quantile = (p: number) => {
    if (!n) return null;
    const pos = (n - 1) * p, lower = Math.floor(pos), upper = Math.ceil(pos);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
  };
  const min = n ? sorted[0] : null, max = n ? sorted[n-1] : null;
  const histogram = [];
  if (min !== null && max !== null) {
    const bins = min === max ? 1 : 5, step = min === max ? 1 : (max - min) / bins;
    for (let i=0; i<bins; i++) {
      const lower = min+i*step, upper = i===bins-1 ? max : lower+step;
      histogram.push({ binRange: min === max ? `${min.toFixed(1)} °C` : `${lower.toFixed(1)}–${upper.toFixed(1)} °C`, frekuensi: sorted.filter(t => t>=lower && (i===bins-1 ? t<=upper : t<upper)).length });
    }
  }
  return { validCount: n, min, max, q1: quantile(.25), median: quantile(.5), q3: quantile(.75), histogram };
}
