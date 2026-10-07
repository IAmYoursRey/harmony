// Query contracts use Celsius, km/h, hPa, percent and Unix seconds.
// Missing data is never converted into zero.
export function weatherValue(field: string, value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (field.includes('temperature')) return value >= -100 && value <= (field.includes('apparent') ? 100 : 70) ? value : null;
  if (field.includes('humidity') || field.includes('cloud') || field.includes('probability')) return value >= 0 && value <= 100 ? value : null;
  if (field.includes('wind_direction')) return value >= 0 && value <= 360 ? value : null;
  if (field.includes('wind_speed') || field.includes('wind_gust')) return value >= 0 && value <= 540 ? value : null;
  if (field.includes('pressure')) return value > 0 && value <= 1200 ? value : null;
  if (field === 'weather_code') return [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(value) ? value : null;
  return value >= 0 ? value : null;
}

export function forecastEpoch(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 4102444800;
}

export function increasingForecastTimes(times: unknown): times is number[] {
  return Array.isArray(times) && times.length > 0 && times.every((t, i) => forecastEpoch(t) && (i === 0 || t > times[i - 1]));
}

// Unit metadata may be omitted by older responses; an explicitly wrong unit
// cannot be interpreted using the default query unit.
export function weatherUnitError(units: any): string | null {
  if (!units || typeof units !== 'object') return null;
  for (const [field, unit] of Object.entries(units)) {
    let allowed: string[] | undefined;
    if (field.includes('temperature')) allowed = ['°c', 'celsius', 'c', 'degc'];
    else if (field.includes('humidity') || field.includes('cloud') || field.includes('probability')) allowed = ['%'];
    else if (field.includes('wind_speed') || field.includes('wind_gust')) allowed = ['km/h', 'km/jam'];
    else if (field.includes('wind_direction')) allowed = ['°', 'degrees'];
    else if (field.includes('pressure')) allowed = ['hpa', 'hectopascal'];
    else if (field.includes('precipitation') && !field.includes('probability')) allowed = ['mm'];
    else if (['pm2_5', 'pm10', 'ozone'].includes(field)) allowed = ['μg/m³', 'µg/m³', 'ug/m3'];
    else if (field === 'time') allowed = ['unixtime'];
    if (allowed && (typeof unit !== 'string' || !allowed.includes(unit.trim().toLowerCase()))) return `Satuan ${field} tidak sesuai kontrak permintaan.`;
  }
  return null;
}

export function validateAirQuality(data: any, lat: number, lng: number): string | null | { partial: true; message: string; acceptedCount: number; rejectedCount: number } {
  if (!data || data.error || data.success === false) return 'Sumber kualitas udara melaporkan kegagalan.';
  if (typeof data.latitude !== 'number' || !Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90 ||
      typeof data.longitude !== 'number' || !Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180 ||
      Math.abs(data.latitude - lat) > 2 || Math.abs(data.longitude - lng) > 2) return 'Koordinat kualitas udara tidak sesuai lokasi pilihan.';
  const unitError = weatherUnitError(data.current_units) || weatherUnitError(data.hourly_units);
  if (unitError) return unitError;
  if (!forecastEpoch(data.current?.time) || Math.abs(Date.now() / 1000 - data.current.time) > 3 * 3600) return 'Waktu kualitas udara tidak valid atau sudah usang.';
  if (!['pm2_5', 'pm10', 'ozone'].some(k => weatherValue(k, data.current[k]) !== null)) return 'Kualitas udara kosong/tidak valid.';
  const fields = ['pm2_5', 'pm10', 'ozone'];
  let acceptedCount = 0, rejectedCount = 0;
  fields.forEach(k => weatherValue(k, data.current[k]) === null ? rejectedCount++ : acceptedCount++);
  if (!increasingForecastTimes(data.hourly?.time)) {
    rejectedCount++;
  } else {
    let validPoints = 0;
    fields.forEach(k => {
      const arr = data.hourly[k];
      if (Array.isArray(arr)) {
        arr.forEach((val: any) => {
          if (weatherValue(k, val) !== null) {
            acceptedCount++;
            validPoints++;
          } else if (typeof val === 'number' && (!Number.isFinite(val) || val < 0)) {
            rejectedCount++;
          }
        });
      }
    });
    if (validPoints === 0) rejectedCount++;
  }
  if (rejectedCount) return { partial: true, message: 'Sebagian nilai atau deret kualitas udara tidak tersedia/tidak valid.', acceptedCount, rejectedCount };
  return null;
}
