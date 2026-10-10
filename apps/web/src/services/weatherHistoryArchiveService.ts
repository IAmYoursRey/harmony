import type { WeatherHourlyPoint, WeatherDailyPoint } from './weatherAggregatorService';

export interface WeatherArchiveRecord {
  isoTime: string;
  epoch: number;
  dateStr: string; // YYYY-MM-DD
  hour: number;
  temperature: number;
  apparentTemp: number | null;
  precipitation: number;
  precipitationProb: number | null;
  humidity: number;
  windSpeed: number;
  cloudCover: number;
  surfacePressure: number | null;
  uvIndex: number | null;
  weatherCode: number;
  recordedAt: string;
  isPermanent: true;
}

export interface DayWeatherSummary {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Sen 12 Okt" or "Kemarin"
  dayName: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  apparentTempAvg: number;
  precipitationSum: number;
  rainHoursCount: number;
  avgHumidity: number;
  maxWindSpeed: number;
  avgCloudCover: number;
  isFullyPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasPermanentRecord: boolean;
}

export interface MonthlyWeatherArchive {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "Oktober 2026"
  locationKey: string;
  totalDays: number;
  recordedDaysCount: number;
  overallTempMin: number;
  overallTempMax: number;
  overallTempAvg: number;
  totalRainfallMm: number;
  totalRainyDays: number;
  averageHumidity: number;
  peakWindSpeed: number;
  days: DayWeatherSummary[];
}

const STORAGE_PREFIX = 'harmony_weather_archive_v1';
const FROZEN_THRESHOLD_SECONDS = 300; // 5 menit ke belakang = permanen

class WeatherHistoryArchiveService {
  private memoryCache: Map<string, Map<number, WeatherArchiveRecord>> = new Map();

  private getStorageKey(lat: number, lng: number, dateStr: string): string {
    const latKey = Number(lat).toFixed(2);
    const lngKey = Number(lng).toFixed(2);
    return `${STORAGE_PREFIX}_${latKey}_${lngKey}_${dateStr}`;
  }

  private getLocationKey(lat: number, lng: number): string {
    return `${Number(lat).toFixed(2)}_${Number(lng).toFixed(2)}`;
  }

  public isPermanentThreshold(epochOrIso: number | string, nowMs = Date.now()): boolean {
    const epoch = typeof epochOrIso === 'number'
      ? (epochOrIso > 1e11 ? Math.floor(epochOrIso / 1000) : epochOrIso)
      : Math.floor(Date.parse(epochOrIso) / 1000);
    const cutoff = Math.floor(nowMs / 1000) - FROZEN_THRESHOLD_SECONDS;
    return epoch <= cutoff;
  }

  public recordPermanentPoints(
    lat: number,
    lng: number,
    points: WeatherHourlyPoint[],
    nowMs = Date.now()
  ): { newlyArchived: number; totalPermanent: number } {
    if (!Array.isArray(points) || points.length === 0) {
      return { newlyArchived: 0, totalPermanent: 0 };
    }

    const locKey = this.getLocationKey(lat, lng);
    if (!this.memoryCache.has(locKey)) {
      this.memoryCache.set(locKey, new Map());
    }
    const locMap = this.memoryCache.get(locKey)!;

    const pointsByDate: Map<string, WeatherArchiveRecord[]> = new Map();
    let newlyArchived = 0;

    for (const p of points) {
      const epoch = p.time ? Math.floor(Date.parse(p.time) / 1000) : null;
      if (!epoch) continue;

      if (!this.isPermanentThreshold(epoch, nowMs)) {
        continue;
      }

      if (locMap.has(epoch)) {
        continue;
      }

      const d = new Date(epoch * 1000);
      const dateStr = d.toISOString().split('T')[0];

      const record: WeatherArchiveRecord = {
        isoTime: p.time,
        epoch,
        dateStr,
        hour: p.hour,
        temperature: Number((p.temperature ?? 0).toFixed(1)),
        apparentTemp: p.apparentTemp != null ? Number(p.apparentTemp.toFixed(1)) : null,
        precipitation: Number((p.precipitation ?? 0).toFixed(2)),
        precipitationProb: p.precipitationProb ?? null,
        humidity: Math.round(p.humidity ?? 0),
        windSpeed: Number((p.windSpeed ?? 0).toFixed(1)),
        cloudCover: Math.round(p.cloudCover ?? 0),
        surfacePressure: p.pressure ?? null,
        uvIndex: p.uvIndex ?? null,
        weatherCode: p.conditionCode ?? (p as any).weatherCode ?? 0,
        recordedAt: new Date(nowMs).toISOString(),
        isPermanent: true,
      };

      locMap.set(epoch, record);
      newlyArchived++;

      if (!pointsByDate.has(dateStr)) {
        pointsByDate.set(dateStr, []);
      }
      pointsByDate.get(dateStr)!.push(record);
    }

    if (typeof window !== 'undefined' && window.localStorage && pointsByDate.size > 0) {
      try {
        for (const [dateStr, records] of pointsByDate.entries()) {
          const sKey = this.getStorageKey(lat, lng, dateStr);
          let existingRecords: WeatherArchiveRecord[] = [];
          try {
            const raw = localStorage.getItem(sKey);
            if (raw) existingRecords = JSON.parse(raw);
          } catch {}

          const recordMap = new Map<number, WeatherArchiveRecord>();
          existingRecords.forEach(r => recordMap.set(r.epoch, r));
          records.forEach(r => {
            if (!recordMap.has(r.epoch)) {
              recordMap.set(r.epoch, r);
            }
          });

          const merged = Array.from(recordMap.values()).sort((a, b) => a.epoch - b.epoch);
          localStorage.setItem(sKey, JSON.stringify(merged));
        }
      } catch (err) {
        console.warn('WeatherHistoryArchiveService: failed to persist to localStorage', err);
      }
    }

    return { newlyArchived, totalPermanent: locMap.size };
  }

  public getArchivedPoint(lat: number, lng: number, epoch: number): WeatherArchiveRecord | null {
    const locKey = this.getLocationKey(lat, lng);
    const locMap = this.memoryCache.get(locKey);
    if (locMap && locMap.has(epoch)) {
      return locMap.get(epoch)!;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const d = new Date(epoch * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const sKey = this.getStorageKey(lat, lng, dateStr);
        const raw = localStorage.getItem(sKey);
        if (raw) {
          const list: WeatherArchiveRecord[] = JSON.parse(raw);
          const found = list.find(r => r.epoch === epoch);
          if (found) {
            if (!this.memoryCache.has(locKey)) {
              this.memoryCache.set(locKey, new Map());
            }
            this.memoryCache.get(locKey)!.set(epoch, found);
            return found;
          }
        }
      } catch {}
    }

    return null;
  }

  public getMonthlyArchive(
    lat: number,
    lng: number,
    targetDate = new Date(),
    extendedHourlyPoints: WeatherHourlyPoint[] = [],
    dailyPoints: WeatherDailyPoint[] = []
  ): MonthlyWeatherArchive {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nowEpoch = Math.floor(Date.now() / 1000);
    const nowIsoDate = new Date().toISOString().split('T')[0];

    const hourlyByDate: Map<string, WeatherHourlyPoint[]> = new Map();
    for (const h of extendedHourlyPoints) {
      if (!h.time) continue;
      const dStr = h.time.split('T')[0];
      if (dStr.startsWith(monthKey)) {
        if (!hourlyByDate.has(dStr)) hourlyByDate.set(dStr, []);
        hourlyByDate.get(dStr)!.push(h);
      }
    }

    const dailyByDate: Map<string, WeatherDailyPoint> = new Map();
    for (const d of dailyPoints) {
      if (!d.date) continue;
      if (d.date.startsWith(monthKey)) {
        dailyByDate.set(d.date, d);
      }
    }

    const daysList: DayWeatherSummary[] = [];
    let overallMin = 999;
    let overallMax = -999;
    let sumTemp = 0;
    let tempPointsCount = 0;
    let totalRainfall = 0;
    let rainyDays = 0;
    let sumHumid = 0;
    let humidPointsCount = 0;
    let peakWind = 0;
    let recordedDaysCount = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dayDateStr = `${monthKey}-${String(dayNum).padStart(2, '0')}`;
      const dayDateObj = new Date(year, month, dayNum, 12, 0, 0);
      const isPast = dayDateStr < nowIsoDate;
      const isToday = dayDateStr === nowIsoDate;
      const isFuture = dayDateStr > nowIsoDate;

      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(dayDateObj);
      const dayLabel = isToday ? 'Hari Ini' : isPast && dayNum === new Date().getDate() - 1 ? 'Kemarin' : `${dayName} ${dayNum}`;

      const dayHourly = hourlyByDate.get(dayDateStr) || [];
      const dayDaily = dailyByDate.get(dayDateStr);

      let dMin = 0;
      let dMax = 0;
      let dAvg = 0;
      let dAppAvg = 0;
      let dRain = 0;
      let dRainHours = 0;
      let dHumid = 75;
      let dWind = 10;
      let dCloud = 50;
      let hasData = false;

      if (dayHourly.length > 0) {
        hasData = true;
        const validTemps = dayHourly.map(p => p.temperature).filter(t => t != null) as number[];
        dMin = validTemps.length ? Math.min(...validTemps) : 24;
        dMax = validTemps.length ? Math.max(...validTemps) : 32;
        dAvg = validTemps.length ? Number((validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)) : 28;

        const validApps = dayHourly.map(p => p.apparentTemp).filter(t => t != null) as number[];
        dAppAvg = validApps.length ? Number((validApps.reduce((a, b) => a + b, 0) / validApps.length).toFixed(1)) : dAvg;

        const validRains = dayHourly.map(p => p.precipitation || 0);
        dRain = Number(validRains.reduce((a, b) => a + b, 0).toFixed(1));
        dRainHours = validRains.filter(r => r > 0.1).length;

        const validHumids = dayHourly.map(p => p.humidity).filter(h => h != null) as number[];
        dHumid = validHumids.length ? Math.round(validHumids.reduce((a, b) => a + b, 0) / validHumids.length) : 75;

        const validWinds = dayHourly.map(p => p.windSpeed).filter(w => w != null) as number[];
        dWind = validWinds.length ? Number(Math.max(...validWinds).toFixed(1)) : 10;

        const validClouds = dayHourly.map(p => p.cloudCover).filter(c => c != null) as number[];
        dCloud = validClouds.length ? Math.round(validClouds.reduce((a, b) => a + b, 0) / validClouds.length) : 50;
      } else if (dayDaily) {
        hasData = true;
        dMin = dayDaily.tempMin ?? 24;
        dMax = dayDaily.tempMax ?? 32;
        dAvg = Number(((dMin + dMax) / 2).toFixed(1));
        dAppAvg = dayDaily.apparentTempMax ?? dAvg;
        dRain = Number((dayDaily.precipitationSum ?? 0).toFixed(1));
        dRainHours = dRain > 1 ? 2 : 0;
        dWind = dayDaily.windSpeedMax ?? 10;
      } else {
        dMin = 24;
        dMax = 32;
        dAvg = 28;
        dAppAvg = 29;
      }

      if (hasData) {
        if (dMin < overallMin) overallMin = dMin;
        if (dMax > overallMax) overallMax = dMax;
        sumTemp += dAvg;
        tempPointsCount++;
        totalRainfall += dRain;
        if (dRain >= 0.5) rainyDays++;
        sumHumid += dHumid;
        humidPointsCount++;
        if (dWind > peakWind) peakWind = dWind;
        if (isPast || isToday) recordedDaysCount++;
      }

      daysList.push({
        date: dayDateStr,
        dayLabel,
        dayName,
        tempMin: dMin,
        tempMax: dMax,
        tempAvg: dAvg,
        apparentTempAvg: dAppAvg,
        precipitationSum: dRain,
        rainHoursCount: dRainHours,
        avgHumidity: dHumid,
        maxWindSpeed: dWind,
        avgCloudCover: dCloud,
        isFullyPast: isPast,
        isToday,
        isFuture,
        hasPermanentRecord: isPast,
      });
    }

    return {
      monthKey,
      monthName,
      locationKey: this.getLocationKey(lat, lng),
      totalDays: daysInMonth,
      recordedDaysCount,
      overallTempMin: overallMin === 999 ? 24 : overallMin,
      overallTempMax: overallMax === -999 ? 32 : overallMax,
      overallTempAvg: tempPointsCount > 0 ? Number((sumTemp / tempPointsCount).toFixed(1)) : 28,
      totalRainfallMm: Number(totalRainfall.toFixed(1)),
      totalRainyDays: rainyDays,
      averageHumidity: humidPointsCount > 0 ? Math.round(sumHumid / humidPointsCount) : 75,
      peakWindSpeed: Number(peakWind.toFixed(1)),
      days: daysList,
    };
  }
}

export const weatherHistoryArchiveService = new WeatherHistoryArchiveService();
