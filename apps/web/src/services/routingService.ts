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

export interface RouteResult {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  distanceKm: number;
  durationMin: number;
  durationText: string;
  coordinates: [number, number][]; // [lng, lat]
  steps: RouteStep[];
  
  // AI Environmental Hazard & Safety Analysis
  safetyLevel: 'Sangat Aman' | 'Cukup Aman' | 'Waspada' | 'Bahaya';
  safetyScore: number; // 0 - 100
  weatherRiskSummary: string;
  volcanoHazardSummary?: string;
  recommendedSpeedKmh: number;
  aiAdvice: string[];
}

class RoutingService {
  /**
   * Menghitung rute mengemudi antara dua titik koordinat
   */
  public async calculateRoute(
    origin: { lat: number; lng: number; label?: string },
    destination: { lat: number; lng: number; label?: string },
    weatherRainIntensityMm = 0,
    windSpeedKmh = 10
  ): Promise<RouteResult> {
    const originLng = origin.lng;
    const originLat = origin.lat;
    const destLng = destination.lng;
    const destLat = destination.lat;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates;
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
                distance: s.distance,
                duration: s.duration,
              });
            }
          });
        }

        const hazardAnalysis = this.evaluateHazards(coords, weatherRainIntensityMm, windSpeedKmh);

        return {
          origin: { lat: originLat, lng: originLng, label: origin.label || 'Lokasi Anda' },
          destination: { lat: destLat, lng: destLng, label: destination.label || 'Tujuan' },
          distanceKm: distKm,
          durationMin: durMin,
          durationText: durMin > 60 ? `${Math.floor(durMin / 60)} jam ${durMin % 60} menit` : `${durMin} menit`,
          coordinates: coords,
          steps: steps.slice(0, 8),
          ...hazardAnalysis,
        };
      }
    } catch (err) {
      console.warn('OSRM routing network fallback, using geodesic line', err);
    }

    // Fallback: Interpolasi jalur langsung jika offline/network timeout
    return this.createDirectFallbackRoute(origin, destination, weatherRainIntensityMm, windSpeedKmh);
  }

  private evaluateHazards(
    coords: [number, number][],
    rainMm: number,
    windKmh: number
  ) {
    const volcanoes = volcanoService.getAllMonitoredVolcanoes();
    let closestVolcanoDistance = Infinity;
    let closestVolcanoName = '';
    let closestVolcanoAlertLevel = '';

    // Cek jarak terdekat rute dengan gunung api aktif
    coords.forEach(([lng, lat]) => {
      volcanoes.forEach((v) => {
        const d = this.calculateHaversine(lat, lng, v.lat, v.lng);
        if (d < closestVolcanoDistance) {
          closestVolcanoDistance = d;
          closestVolcanoName = v.name;
          closestVolcanoAlertLevel = v.level;
        }
      });
    });

    const advice: string[] = [];
    let safetyScore = 95;
    let safetyLevel: 'Sangat Aman' | 'Cukup Aman' | 'Waspada' | 'Bahaya' = 'Sangat Aman';
    let recommendedSpeed = 60;

    let weatherRisk = 'Kondisi cuaca di sepanjang rute normal & kondusif.';
    if (rainMm > 10) {
      weatherRisk = 'Hujan lebat terdeteksi di sepanjang rute. Risiko jalan licin & jarak pandang terbatas.';
      safetyScore -= 20;
      safetyLevel = 'Waspada';
      recommendedSpeed = 40;
      advice.push('Jaga jarak aman pengereman minimal 4 detik karena aspal basah.');
      advice.push('Waspadai genangan air di bahu jalan dan titik blind spot.');
    } else if (rainMm > 2) {
      weatherRisk = 'Gerimis ringan hingga sedang berpotensi membasahi lintasan jalan.';
      safetyScore -= 8;
      recommendedSpeed = 50;
      advice.push('Nyalakan lampu utama untuk meningkatkan visibilitas pengendara lain.');
    }

    if (windKmh > 25) {
      safetyScore -= 10;
      advice.push(`Hembusan angin samping mencapai ${windKmh} km/h, waspadai kendaraan roda dua.`);
    }

    let volcanoHazard: string | undefined;
    if (closestVolcanoDistance < 15 && closestVolcanoAlertLevel.includes('Siaga')) {
      volcanoHazard = `Rute melintas dalam radius ${closestVolcanoDistance.toFixed(1)} km dari ${closestVolcanoName} (${closestVolcanoAlertLevel}).`;
      safetyScore -= 25;
      safetyLevel = 'Waspada';
      advice.push(`Perhatikan rambu evakuasi dan jauhi lembah sungai aktif buangan lahar ${closestVolcanoName}.`);
    } else if (closestVolcanoDistance < 8 && closestVolcanoAlertLevel.includes('Awas')) {
      volcanoHazard = `PERINGATAN BAHAYA: Rute mendekati radius bahaya ${closestVolcanoName} (${closestVolcanoAlertLevel})!`;
      safetyScore -= 50;
      safetyLevel = 'Bahaya';
      advice.push('Zona tidak disarankan untuk dilintasi karena aktivitas erupsi paroksismal.');
    }

    if (safetyScore >= 85) safetyLevel = 'Sangat Aman';
    else if (safetyScore >= 70) safetyLevel = 'Cukup Aman';
    else if (safetyScore >= 45) safetyLevel = 'Waspada';
    else safetyLevel = 'Bahaya';

    if (advice.length === 0) {
      advice.push('Rute prima: Tidak ada kendala cuaca ekstrem atau bahaya geologis di sepanjang jalur.');
      advice.push('Patuhi rambu batas kecepatan lalu lintas dan gunakan sabuk keselamatan.');
    }

    return {
      safetyLevel,
      safetyScore: Math.max(10, safetyScore),
      weatherRiskSummary: weatherRisk,
      volcanoHazardSummary: volcanoHazard,
      recommendedSpeedKmh: recommendedSpeed,
      aiAdvice: advice,
    };
  }

  private createDirectFallbackRoute(
    origin: { lat: number; lng: number; label?: string },
    destination: { lat: number; lng: number; label?: string },
    rainMm: number,
    windKmh: number
  ): RouteResult {
    const dist = this.calculateHaversine(origin.lat, origin.lng, destination.lat, destination.lng);
    const durMin = Math.round((dist / 45) * 60);

    // 10 titik interpolasi kurva halus
    const coords: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const frac = i / 10;
      const lat = origin.lat + (destination.lat - origin.lat) * frac;
      const lng = origin.lng + (destination.lng - origin.lng) * frac;
      coords.push([lng, lat]);
    }

    const hazard = this.evaluateHazards(coords, rainMm, windKmh);

    return {
      origin: { lat: origin.lat, lng: origin.lng, label: origin.label || 'Lokasi Asal' },
      destination: { lat: destination.lat, lng: destination.lng, label: destination.label || 'Lokasi Tujuan' },
      distanceKm: parseFloat(dist.toFixed(1)),
      durationMin: durMin,
      durationText: `${durMin} menit`,
      coordinates: coords,
      steps: [
        { instruction: 'Arahkan kendaraan ke jalur utama', name: 'Jalur Utama', distance: dist * 500, duration: durMin * 30 },
        { instruction: 'Lanjutkan menuju lokasi tujuan', name: destination.label || 'Tujuan', distance: dist * 500, duration: durMin * 30 },
      ],
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
}

export const routingService = new RoutingService();
