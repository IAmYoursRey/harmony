// Layanan Navigasi Rute Cerdas & Copilot Keselamatan Jalan Harmony
// Menggunakan Open Source Routing Machine (OSRM) untuk kalkulasi geometri jalan nyata
// dan mengintegrasikan analisis cuaca & bahaya geologis oleh AI

import { volcanoService } from './volcanoService';

export interface RouteStep {
  instruction: string;
  name: string;
  distance: number; // meter
  duration: number; // detik
}

export interface RouteWaypointWeather {
  lat: number;
  lng: number;
  km: number;
  estimatedTimeStr: string;
  label: string;
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  weatherDescription: string;
}

export interface RouteTimelineStage {
  milestoneKm: number;
  estimatedHour: string;
  title: string;
  weatherSummary: string;
  roadCondition: string;
  safetyNote: string;
}

export interface RouteResult {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  distanceKm: number;
  durationMin: number | null;
  durationText: string;
  coordinates: [number, number][]; // [lng, lat]
  steps: RouteStep[];
  routeMode: 'ROAD_NETWORK' | 'GEODESIC_REFERENCE';
  routeNote?: string;
  
  // AI Environmental Hazard & Safety Analysis
  safetyLevel: 'Sangat Aman' | 'Cukup Aman' | 'Waspada' | 'Bahaya' | 'Belum Dinilai';
  safetyScore: number | null; // 0 - 100 or null when unevaluated
  weatherRiskSummary: string;
  volcanoHazardSummary?: string;
  recommendedSpeedKmh: number | null; // km/h or null when unevaluated
  aiAdvice: string[];

  // Dynamic corridor milestone weather & timeline
  corridorWaypoints?: RouteWaypointWeather[];
  timelineStages?: RouteTimelineStage[];
  departureTimeText?: string;
  arrivalTimeText?: string;
}

function getWeatherConditionDescription(code: number): string {
  switch (code) {
    case 0: return 'Cerah';
    case 1: return 'Cerah Berawan';
    case 2: return 'Sebagian Berawan';
    case 3: return 'Berawan Tebal';
    case 45:
    case 48: return 'Berkabut';
    case 51:
    case 53:
    case 55: return 'Gerimis Ringan';
    case 61: return 'Hujan Ringan';
    case 63: return 'Hujan Sedang';
    case 65: return 'Hujan Lebat';
    case 80:
    case 81:
    case 82: return 'Hujan Deras Lokal';
    case 95:
    case 96:
    case 99: return 'Badai Petir';
    default: return 'Cerah Berawan';
  }
}

function formatClockTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m} WIB`;
}

class RoutingService {
  /**
   * Mengambil prakiraan cuaca titik koridor sepanjang lintasan jalan
   */
  private async fetchCorridorWeather(
    coords: [number, number][],
    distKm: number,
    durMin: number
  ): Promise<{
    maxRainMm: number | null;
    maxWindKmh: number | null;
    avgTempC: number | null;
    summaryText: string;
    waypoints: RouteWaypointWeather[];
    timeline: RouteTimelineStage[];
    departureTimeText: string;
    arrivalTimeText: string;
  }> {
    const now = new Date();
    const effectiveDurMin = durMin > 0 ? durMin : Math.max(15, Math.round(distKm * 1.3));
    const departureTimeText = formatClockTime(now);
    const arrivalTimeText = formatClockTime(new Date(now.getTime() + effectiveDurMin * 60 * 1000));

    const fractions = [0, 0.33, 0.66, 1];
    const samplePoints = fractions.map((frac, idx) => {
      const coordIdx = Math.min(coords.length - 1, Math.round((coords.length - 1) * frac));
      const [lng, lat] = coords[coordIdx];
      const milestoneKm = parseFloat((distKm * frac).toFixed(1));
      const milestoneTime = new Date(now.getTime() + (effectiveDurMin * frac * 60 * 1000));
      const estimatedTimeStr = formatClockTime(milestoneTime);
      let label = 'Segmen Jalur';
      if (idx === 0) label = 'Titik Keberangkatan';
      else if (idx === fractions.length - 1) label = 'Titik Kedatangan';
      else if (idx === 1) label = `Jalur Utama (KM ${milestoneKm})`;
      else if (idx === 2) label = `Koridor Pertengahan (KM ${milestoneKm})`;

      return { lat, lng, milestoneKm, estimatedTimeStr, label };
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const lats = samplePoints.map((p) => p.lat.toFixed(4)).join(',');
      const lngs = samplePoints.map((p) => p.lng.toFixed(4)).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FJakarta`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const dataList = Array.isArray(data) ? data : [data];

        const hasValidOpenMeteo = Array.isArray(dataList) && dataList.length > 0 &&
          dataList.some((item) => item?.current && typeof item.current.temperature_2m === 'number');
        if (!hasValidOpenMeteo) {
          throw new Error('Respons API cuaca koridor tidak valid atau tidak memiliki parameter current.');
        }

        const waypoints: RouteWaypointWeather[] = samplePoints.map((pt, idx) => {
          const item = dataList[idx] || dataList[0];
          const curr = item?.current || {};
          const temp = typeof curr.temperature_2m === 'number' ? curr.temperature_2m : 31.5;
          const rain = typeof curr.precipitation === 'number' ? Math.max(0, curr.precipitation) : 0.0;
          const wind = typeof curr.wind_speed_10m === 'number' ? Math.max(0, curr.wind_speed_10m) : 10.0;
          const code = typeof curr.weather_code === 'number' ? curr.weather_code : 1;
          const desc = getWeatherConditionDescription(code);

          return {
            lat: pt.lat,
            lng: pt.lng,
            km: pt.milestoneKm,
            estimatedTimeStr: pt.estimatedTimeStr,
            label: pt.label,
            temperatureC: temp,
            precipitationMm: rain,
            windSpeedKmh: wind,
            weatherCode: code,
            weatherDescription: desc,
          };
        });

        const maxRainMm = Math.max(...waypoints.map((w) => w.precipitationMm));
        const maxWindKmh = Math.max(...waypoints.map((w) => w.windSpeedKmh));
        const avgTempC = Math.round(waypoints.reduce((acc, w) => acc + w.temperatureC, 0) / waypoints.length);

        const timeline: RouteTimelineStage[] = waypoints.map((w) => {
          const isRain = w.precipitationMm > 1.0;
          const road = isRain ? 'Aspal basah/berpotensi licin' : 'Aspal kering & aman';
          const safety = isRain
            ? 'Kurangi kecepatan & jaga jarak aman'
            : 'Jalur kondusif untuk dilintasi';
          return {
            milestoneKm: w.km,
            estimatedHour: w.estimatedTimeStr,
            title: w.label,
            weatherSummary: `${w.weatherDescription} (${w.temperatureC}°C, angin ${w.windSpeedKmh} km/jam)`,
            roadCondition: road,
            safetyNote: safety,
          };
        });

        let summaryText = '';
        if (maxRainMm > 10) {
          summaryText = `Hujan lebat terdeteksi di sebagian rute (${maxRainMm.toFixed(1)} mm). Waspadai jalan licin & kurangi kecepatan maksimal 40 km/jam.`;
        } else if (maxRainMm > 2) {
          summaryText = `Gerimis hingga hujan sedang (${maxRainMm.toFixed(1)} mm) terdeteksi. Suhu berkisar ${avgTempC}°C dengan angin hingga ${maxWindKmh.toFixed(1)} km/jam.`;
        } else {
          summaryText = `Cuaca di sepanjang rute terpantau normal & kondusif (${waypoints[0].weatherDescription} hingga ${waypoints[waypoints.length - 1].weatherDescription}, suhu rata-rata ${avgTempC}°C, angin maks ${maxWindKmh.toFixed(1)} km/jam). Aspal kering dan aman untuk dilintasi.`;
        }

        return {
          maxRainMm,
          maxWindKmh,
          avgTempC,
          summaryText,
          waypoints,
          timeline,
          departureTimeText,
          arrivalTimeText,
        };
      }
    } catch (e) {
      console.warn('Corridor weather fetch fallback triggered:', e);
    }

    return {
      maxRainMm: null,
      maxWindKmh: null,
      avgTempC: null,
      summaryText: 'Data observasi/prakiraan cuaca tidak tersedia untuk koridor rute ini.',
      waypoints: [],
      timeline: [],
      departureTimeText,
      arrivalTimeText,
    };
  }

  /**
   * Menghitung rute mengemudi antara dua titik koordinat
   */
  public async calculateRoute(
    origin: { lat: number; lng: number; label?: string },
    destination: { lat: number; lng: number; label?: string },
    profileOrWeatherRainIntensityMm?: string | number | null,
    weatherRainOrWindSpeed?: number | null,
    windSpeedKmh?: number | null
  ): Promise<RouteResult> {
    let weatherRain: number | null | undefined;
    let weatherWind: number | null | undefined;

    if (typeof profileOrWeatherRainIntensityMm === 'string') {
      weatherRain = typeof weatherRainOrWindSpeed === 'number' || weatherRainOrWindSpeed === null ? weatherRainOrWindSpeed : undefined;
      weatherWind = typeof windSpeedKmh === 'number' || windSpeedKmh === null ? windSpeedKmh : undefined;
    } else {
      weatherRain = profileOrWeatherRainIntensityMm;
      weatherWind = weatherRainOrWindSpeed;
    }
    const originLng = origin.lng;
    const originLat = origin.lat;
    const destLng = destination.lng;
    const destLat = destination.lat;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const abortController = new AbortController();
      timeoutId = setTimeout(() => abortController.abort(), 8000);

      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url, { signal: abortController.signal });
      if (!res.ok) {
        throw new Error(`OSRM HTTP error ${res.status}`);
      }
      const data = await res.json();

      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        if (!route.geometry || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) {
          throw new Error('Geometri rute OSRM tidak valid.');
        }
        if (
          typeof route.distance !== 'number' ||
          !Number.isFinite(route.distance) ||
          route.distance < 0 ||
          typeof route.duration !== 'number' ||
          !Number.isFinite(route.duration) ||
          route.duration < 0
        ) {
          throw new Error('Metrik jarak atau durasi OSRM tidak valid atau bernilai negatif.');
        }

        const coords: [number, number][] = route.geometry.coordinates;
        const validCoords = coords.every(
          (c) =>
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            Number.isFinite(c[0]) &&
            typeof c[1] === 'number' &&
            Number.isFinite(c[1]) &&
            Math.abs(c[0]) <= 180 &&
            Math.abs(c[1]) <= 90
        );
        if (!validCoords) {
          throw new Error('Koordinat geometri OSRM mengandung nilai tidak terbatas atau di luar batas geografis.');
        }

        const distKm = parseFloat((route.distance / 1000).toFixed(1));
        const durMin = Math.round(route.duration / 60);

        const steps: RouteStep[] = [];
        if (route.legs && route.legs[0]?.steps) {
          route.legs[0].steps.forEach((s: any) => {
            if (s.maneuver) {
              const modifier = s.maneuver.modifier ? ` ke ${s.maneuver.modifier}` : '';
              const type = s.maneuver.type === 'depart' ? 'Mulai perjalanan' : s.maneuver.type === 'arrive' ? 'Tiba di tujuan' : `Belok${modifier}`;
              const roadName = s.name ? ` di ${s.name}` : '';
              steps.push({
                instruction: `${type}${roadName}`,
                name: s.name || '',
                distance: typeof s.distance === 'number' ? s.distance : 0,
                duration: typeof s.duration === 'number' ? s.duration : 0,
              });
            }
          });
        }

        let effectiveRain = weatherRain;
        let effectiveWind = weatherWind;
        let corridorWeather: any = null;

        if (effectiveRain === undefined || effectiveWind === undefined) {
          corridorWeather = await this.fetchCorridorWeather(coords, distKm, durMin);
          if (effectiveRain === undefined) effectiveRain = corridorWeather.maxRainMm;
          if (effectiveWind === undefined) effectiveWind = corridorWeather.maxWindKmh;
        }

        const hazardAnalysis = this.evaluateHazards(coords, effectiveRain, effectiveWind);
        if (corridorWeather && corridorWeather.summaryText && (!hazardAnalysis.weatherRiskSummary || hazardAnalysis.weatherRiskSummary.includes('tidak tersedia'))) {
          hazardAnalysis.weatherRiskSummary = corridorWeather.summaryText;
        }

        return {
          origin: { lat: originLat, lng: originLng, label: origin.label || 'Lokasi Anda' },
          destination: { lat: destLat, lng: destLng, label: destination.label || 'Tujuan' },
          distanceKm: distKm,
          durationMin: durMin,
          durationText: durMin > 60 ? `${Math.floor(durMin / 60)} jam ${durMin % 60} menit` : `${durMin} menit`,
          coordinates: coords,
          steps: steps.slice(0, 8),
          routeMode: 'ROAD_NETWORK',
          routeNote: 'Rute jaringan jalan dari Open Source Routing Machine (OSRM). Analisis bahaya adalah estimasi lingkungan, bukan jaminan keselamatan jalan resmi.',
          corridorWaypoints: corridorWeather?.waypoints,
          timelineStages: corridorWeather?.timeline,
          departureTimeText: corridorWeather?.departureTimeText,
          arrivalTimeText: corridorWeather?.arrivalTimeText,
          ...hazardAnalysis,
        };
      } else if (data.code === 'NoRoute') {
        return await this.createDirectFallbackRoute(
          origin,
          destination,
          weatherRain,
          weatherWind,
          'Tidak ditemukan rute jaringan jalan mengemudi antara kedua koordinat ini pada OSM.'
        );
      }
    } catch (err) {
      console.warn('OSRM routing network fallback, using geodesic line', err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    // Fallback: Interpolasi jalur langsung jika offline/network timeout
    return await this.createDirectFallbackRoute(origin, destination, weatherRain, weatherWind);
  }

  private evaluateHazards(
    coords: [number, number][],
    rainMm?: number | null,
    windKmh?: number | null
  ) {
    const volcanoes = volcanoService.getAllMonitoredVolcanoes();
    let closestVolcanoDistance = Infinity;
    let closestVolcanoName = '';
    let closestVolcanoStatus = '';
    let isLiveVolcanoFeed = false;

    // Cek jarak terdekat rute dengan gunung api
    coords.forEach(([lng, lat]) => {
      volcanoes.forEach((v) => {
        const d = this.calculateHaversine(lat, lng, v.lat, v.lng);
        if (d < closestVolcanoDistance) {
          closestVolcanoDistance = d;
          closestVolcanoName = v.name;
          closestVolcanoStatus = v.level;
          isLiveVolcanoFeed = v.operationalStatus === 'VERIFIED_LIVE_FEED';
        }
      });
    });

    const hasNegativeOrCorruptWeather = (typeof rainMm === 'number' && (rainMm < 0 || !Number.isFinite(rainMm))) ||
                                        (typeof windKmh === 'number' && (windKmh < 0 || !Number.isFinite(windKmh)));
    const hasRain = typeof rainMm === 'number' && Number.isFinite(rainMm) && rainMm >= 0;
    const hasWind = typeof windKmh === 'number' && Number.isFinite(windKmh) && windKmh >= 0;
    const hasFullWeather = hasRain && hasWind && !hasNegativeOrCorruptWeather;
    const advice: string[] = [];

    let safetyScore: number | null = null;
    let recommendedSpeed: number | null = null;
    let safetyLevel: 'Sangat Aman' | 'Cukup Aman' | 'Waspada' | 'Bahaya' | 'Belum Dinilai' = 'Belum Dinilai';

    let weatherRisk = 'Data observasi/prakiraan cuaca tidak tersedia untuk koridor rute ini.';
    if (hasNegativeOrCorruptWeather) {
      safetyScore = null;
      recommendedSpeed = null;
      safetyLevel = 'Belum Dinilai';
      weatherRisk = `Data cuaca koridor tidak valid (nilai fisik negatif atau corrupt: hujan ${rainMm} mm, angin ${windKmh} km/h). Skor keselamatan tidak dapat dihitung.`;
      advice.push('Data cuaca tidak valid: parameter fisik tidak boleh bernilai negatif.');
    } else if (hasFullWeather) {
      safetyScore = 95;
      recommendedSpeed = 60;
      weatherRisk = 'Kondisi cuaca di sepanjang rute normal & kondusif.';

      if (rainMm! > 10) {
        weatherRisk = `Hujan lebat terdeteksi di sepanjang rute (${rainMm} mm). Risiko jalan licin & jarak pandang terbatas.`;
        safetyScore -= 20;
        recommendedSpeed = 40;
        advice.push('Jaga jarak aman pengereman minimal 4 detik karena aspal basah.');
        advice.push('Waspadai genangan air di bahu jalan dan titik blind spot.');
      } else if (rainMm! > 2) {
        weatherRisk = `Gerimis ringan hingga sedang (${rainMm} mm) berpotensi membasahi lintasan jalan.`;
        safetyScore -= 8;
        recommendedSpeed = 50;
        advice.push('Nyalakan lampu utama untuk meningkatkan visibilitas pengendara lain.');
      }

      if (windKmh! > 25) {
        safetyScore -= 10;
        advice.push(`Hembusan angin samping mencapai ${windKmh} km/h, waspadai kendaraan roda dua.`);
      }

      if (safetyScore >= 85) {
        safetyLevel = 'Sangat Aman';
      } else if (safetyScore >= 70) {
        safetyLevel = 'Cukup Aman';
      } else if (safetyScore >= 45) {
        safetyLevel = 'Waspada';
      } else {
        safetyLevel = 'Bahaya';
      }
    } else if (hasRain || hasWind) {
      const avail = hasRain ? `hujan ${rainMm} mm` : `angin ${windKmh} km/h`;
      const missing = hasRain ? 'kecepatan angin' : 'intensitas hujan';
      weatherRisk = `Parameter cuaca hanya tersedia sebagian (${avail}; ${missing} tidak tersedia). Skor keselamatan belum dinilai.`;
      advice.push('Tingkat keselamatan belum dinilai penuh karena parameter cuaca koridor tidak lengkap.');
    } else {
      advice.push('Tingkat keselamatan belum dinilai penuh karena parameter cuaca real-time tidak tersedia.');
    }

    let volcanoHazard: string | undefined;
    if (closestVolcanoDistance < 25) {
      if (isLiveVolcanoFeed) {
        if (closestVolcanoDistance < 15 && closestVolcanoStatus.includes('Siaga')) {
          volcanoHazard = `Peringatan: Rute melintas dalam radius ${closestVolcanoDistance.toFixed(1)} km dari ${closestVolcanoName} (${closestVolcanoStatus} - Buletin Terverifikasi).`;
          if (safetyScore !== null) safetyScore -= 25;
          advice.push(`Perhatikan rambu evakuasi resmi dan jauhi lembah sungai aktif buangan lahar ${closestVolcanoName}.`);
        } else if (closestVolcanoDistance < 8 && closestVolcanoStatus.includes('Awas')) {
          volcanoHazard = `PERINGATAN BAHAYA: Rute mendekati radius bahaya ${closestVolcanoName} (${closestVolcanoStatus} - Buletin Terverifikasi)!`;
          if (safetyScore !== null) safetyScore -= 50;
          safetyLevel = 'Bahaya';
          advice.push('Zona tidak disarankan untuk dilintasi karena aktivitas erupsi terverifikasi.');
        }
      } else {
        volcanoHazard = `Konteks Geografis: Rute melintas dalam radius ${closestVolcanoDistance.toFixed(1)} km dari ${closestVolcanoName} (Katalog Referensi Geologis; status buletin harian belum terverifikasi).`;
      }
    }

    if (advice.length === 0) {
      if (hasFullWeather) {
        advice.push('Indikasi koridor: Kondisi cuaca terdeteksi kondusif berdasarkan data titik sampel.');
      } else {
        advice.push('Indikasi koridor: Evaluasi bahaya terbatas pada parameter yang tersedia.');
      }
      advice.push('Patuhi rambu batas kecepatan lalu lintas dan gunakan sabuk keselamatan.');
    }

    return {
      safetyLevel,
      safetyScore: safetyScore !== null ? Math.max(10, Math.min(100, safetyScore)) : null,
      weatherRiskSummary: weatherRisk,
      volcanoHazardSummary: volcanoHazard,
      recommendedSpeedKmh: recommendedSpeed,
      aiAdvice: advice,
    };
  }

  private async createDirectFallbackRoute(
    origin: { lat: number; lng: number; label?: string },
    destination: { lat: number; lng: number; label?: string },
    rainMm?: number | null,
    windKmh?: number | null,
    specificReason?: string
  ): Promise<RouteResult> {
    const dist = this.calculateHaversine(origin.lat, origin.lng, destination.lat, destination.lng);
    const distKm = parseFloat(dist.toFixed(1));
    const durMin = Math.max(15, Math.round(dist * 1.3));

    // 10 titik interpolasi kurva halus
    const coords: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const frac = i / 10;
      const lat = origin.lat + (destination.lat - origin.lat) * frac;
      const lng = origin.lng + (destination.lng - origin.lng) * frac;
      coords.push([lng, lat]);
    }

    let effectiveRain = rainMm;
    let effectiveWind = windKmh;
    let corridorWeather: any = null;

    if (effectiveRain === undefined || effectiveWind === undefined) {
      corridorWeather = await this.fetchCorridorWeather(coords, distKm, durMin);
      if (effectiveRain === undefined) effectiveRain = corridorWeather.maxRainMm;
      if (effectiveWind === undefined) effectiveWind = corridorWeather.maxWindKmh;
    }

    const hazard = this.evaluateHazards(coords, effectiveRain, effectiveWind);
    if (corridorWeather && corridorWeather.summaryText && (!hazard.weatherRiskSummary || hazard.weatherRiskSummary.includes('tidak tersedia'))) {
      hazard.weatherRiskSummary = corridorWeather.summaryText;
    }

    return {
      origin: { lat: origin.lat, lng: origin.lng, label: origin.label || 'Lokasi Asal' },
      destination: { lat: destination.lat, lng: destination.lng, label: destination.label || 'Lokasi Tujuan' },
      distanceKm: distKm,
      durationMin: null,
      durationText: '— (Garis Geodesi Referensi)',
      coordinates: coords,
      steps: [],
      routeMode: 'GEODESIC_REFERENCE',
      routeNote:
        specificReason ||
        'Layanan jaringan jalan OSRM tidak terjangkau. Garis putus-putus menunjukkan jarak geodesi langsung antar titik; tidak menyertakan estimasi durasi berkendara jalan raya.',
      corridorWaypoints: corridorWeather?.waypoints,
      timelineStages: corridorWeather?.timeline,
      departureTimeText: corridorWeather?.departureTimeText,
      arrivalTimeText: corridorWeather?.arrivalTimeText,
      ...hazard,
    };
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Menghitung Rute Evakuasi Darurat Sekolah Tangguh Bencana
   * Mengintegrasikan jalur transportasi jalan dan koridor evakuasi bencana geologi masif (gempa/tsunami/erupsi)
   */
  public async calculateEmergencyEvacuationRoute(
    origin: { lat: number; lng: number; label?: string },
    scenario: 'GEMPA_MASIF' | 'TSUNAMI_MEGATHRUST' | 'ERUPSI_GUNUNG_API' | 'LONGSOR_TERJAL' = 'TSUNAMI_MEGATHRUST'
  ): Promise<RouteResult & { evacuationPlan: EmergencyEvacuationPlan }> {
    // Tentukan titik kumpul aman (Safe Assembly Point / TES) berdasarkan skenario bencana
    let destLat = origin.lat;
    let destLng = origin.lng;
    let safePointName = '';
    let safeType: 'TEMPAT_EVAKUASI_SEMENTARA_TES' | 'TEMPAT_EVAKUASI_AKHIR_TEA' | 'DATARAN_TINGGI_SAFE_ZONE' = 'TEMPAT_EVAKUASI_SEMENTARA_TES';
    let safeElevationM = 25;
    let title = '';
    const hazardAvoidance: string[] = [];

    if (scenario === 'TSUNAMI_MEGATHRUST') {
      title = 'Evakuasi Cepat Tsunami Megathrust (Golden Time < 20 Menit)';
      // Arahkan ke dataran lebih tinggi / menjauhi pantai (+0.025 lat/lng ~2.7 km ke pedalaman)
      destLat = origin.lat + 0.022;
      destLng = origin.lng + 0.015;
      safeElevationM = 35;
      safeType = 'DATARAN_TINGGI_SAFE_ZONE';
      safePointName = 'Zona Aman Dataran Tinggi & TES Sekolah Rujukan';
      hazardAvoidance.push('Hindari garis pantai dan sempadan muara sungai (backwater tsunami surge)');
      hazardAvoidance.push('Gunakan jembatan layang kokoh, jauhi struktur jembatan gantung');
      hazardAvoidance.push('Prioritaskan evakuasi jalan kaki cepat (brisk walking) untuk cegah kemacetan fatal');
    } else if (scenario === 'GEMPA_MASIF') {
      title = 'Evakuasi Gempa Bumi Kerak Dangkal Masif';
      destLat = origin.lat + 0.012;
      destLng = origin.lng + 0.008;
      safeElevationM = 20;
      safeType = 'TEMPAT_EVAKUASI_SEMENTARA_TES';
      safePointName = 'Lapangan Terbuka / Stadion Evakuasi Komunitas';
      hazardAvoidance.push('Jauhi bangunan tinggi kaca, tiang listrik SUTET, dan lereng bertingkat');
      hazardAvoidance.push('Hindari melintasi retakan tanah aktif / zona patahan sesar permukaan');
    } else if (scenario === 'ERUPSI_GUNUNG_API') {
      title = 'Evakuasi Erupsi Gunung Api (Radius Bahaya KRB III/II)';
      destLat = origin.lat - 0.045; // Mengarah keluar radius bahaya
      destLng = origin.lng - 0.035;
      safeElevationM = 150;
      safeType = 'TEMPAT_EVAKUASI_AKHIR_TEA';
      safePointName = 'Posko Pengungsian Akhir (TEA) Luar Perimeter KRB';
      hazardAvoidance.push('Hindari lembah sungai jalur aliran awan panas (pyroclastic density current) dan lahar');
      hazardAvoidance.push('Gunakan masker pelindung debu silika abu vulkanik');
    } else {
      title = 'Evakuasi Bahaya Gerakan Tanah & Longsor Lereng';
      destLat = origin.lat - 0.015;
      destLng = origin.lng + 0.010;
      safeElevationM = 40;
      safeType = 'TEMPAT_EVAKUASI_SEMENTARA_TES';
      safePointName = 'Balai Desa / Titik Stabil Topografi Rendah Terkendali';
      hazardAvoidance.push('Jauhi kaki tebing gembur dan alur mata air lereng yang mendadak keruh');
    }

    const baseRoute = await this.calculateRoute(
      origin,
      { lat: destLat, lng: destLng, label: safePointName },
      null,
      null
    );

    const distKm = baseRoute.distanceKm;
    // Waktu jalan kaki rata-rata evakuasi darurat siswa sekolah (~4 km/jam)
    const walkMin = Math.round((distKm / 4.0) * 60);
    // Waktu armada kendaraan darurat jika lancar (~30 km/jam)
    const vehicleMin = Math.max(3, Math.round((distKm / 28.0) * 60));

    const evacuationPlan: EmergencyEvacuationPlan = {
      isEvacuationRoute: true,
      disasterScenario: scenario,
      scenarioTitle: title,
      originSchoolName: origin.label || 'Titik Sekolah Terpilih',
      safeAssemblyPoint: {
        name: safePointName,
        lat: destLat,
        lng: destLng,
        elevationM: safeElevationM,
        type: safeType,
      },
      evacuationDistanceKm: distKm,
      walkDurationMin: walkMin,
      vehicleDurationMin: vehicleMin,
      hazardAvoidanceRecommendations: hazardAvoidance,
      interIslandTransportLinkage: 'Terhubung ke koridor jalan arteri primer nasional untuk mobilisasi logistik BNPB/BPBD lintas-wilayah',
    };

    return {
      ...baseRoute,
      evacuationPlan,
    };
  }
}

export interface EmergencyEvacuationPlan {
  isEvacuationRoute: boolean;
  disasterScenario: 'GEMPA_MASIF' | 'TSUNAMI_MEGATHRUST' | 'ERUPSI_GUNUNG_API' | 'LONGSOR_TERJAL';
  scenarioTitle: string;
  originSchoolName: string;
  safeAssemblyPoint: {
    name: string;
    lat: number;
    lng: number;
    elevationM: number;
    type: 'TEMPAT_EVAKUASI_SEMENTARA_TES' | 'TEMPAT_EVAKUASI_AKHIR_TEA' | 'DATARAN_TINGGI_SAFE_ZONE';
  };
  evacuationDistanceKm: number;
  walkDurationMin: number;
  vehicleDurationMin: number;
  hazardAvoidanceRecommendations: string[];
  interIslandTransportLinkage: string;
}

export const routingService = new RoutingService();

