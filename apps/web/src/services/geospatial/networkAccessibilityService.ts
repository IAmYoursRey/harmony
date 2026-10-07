/**
 * GIS Network Accessibility, Isochrone & 15-Minute Service Area Engine
 * Solves real-world mobility reachability, facility service gaps, and scenario planning.
 */

import { AnalysisEnvelope, DataStatus, DataProvenance } from './types';
import { aoiService, AreaOfInterest } from './aoiService';

export type TransportProfile = 'foot-walking' | 'cycling-regular' | 'driving-car';

export interface IsochronePolygon {
  intervalMinutes: number; // 5, 10, 15
  intervalSeconds: number; // 300, 600, 900
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [lng, lat]
  };
  areaKm2: number;
  profile: TransportProfile;
}

export interface FacilityItem {
  id: string;
  name: string;
  category: 'sekolah' | 'kesehatan' | 'evakuasi' | 'pasar' | 'transportasi';
  lat: number;
  lng: number;
  source: string;
  address?: string;
}

export interface AccessibilityMatrixRecord {
  originId: string;
  originName: string;
  originCoord: [number, number]; // [lng, lat]
  facilityId: string;
  facilityName: string;
  facilityCategory: FacilityItem['category'];
  distanceMeters: number;
  travelTimeMinutes: number;
  reachableWithin15Min: boolean;
  status: 'REACHABLE' | 'UNREACHABLE' | 'OUT_OF_RANGE';
}

export interface ServiceGapAnalysisResult {
  originPoint: [number, number];
  profile: TransportProfile;
  isochrones: IsochronePolygon[];
  evaluatedFacilities: FacilityItem[];
  matrix: AccessibilityMatrixRecord[];
  categoryReachability: {
    category: FacilityItem['category'];
    label: string;
    evaluatedCount: number;
    evaluationStatus: 'EVALUATED_REACHABLE' | 'EVALUATED_UNREACHABLE' | 'INSUFFICIENT_DATA';
    hasAccess15Min: boolean | null;
    nearestFacilityName?: string;
    nearestTravelTimeMin?: number;
  }[];
  is15MinCityCompliant: boolean | null;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_EVALUABLE';
  unservedCategories: string[];
  insufficientDataCategories: string[];
  coverageAreaKm2: number;
  recommendation: string;
}

export interface ScenarioComparisonResult {
  baselineCoveragePct: number;
  scenarioCoveragePct: number;
  deltaCoveragePct: number;
  baselineAvgTravelTimeMin: number;
  scenarioAvgTravelTimeMin: number;
  deltaAvgTravelTimeMin: number;
  candidateFacilityAdded: FacilityItem;
  benefitedOriginsCount: number;
}

export class NetworkAccessibilityService {
  /**
   * Generates an illustrative radial estimate; no road graph or provider is queried here
   */
  public generateNetworkIsochrone(
    centerLng: number,
    centerLat: number,
    profile: TransportProfile = 'foot-walking',
    intervalsMinutes: number[] = [5, 10, 15]
  ): IsochronePolygon[] {
    const polygons: IsochronePolygon[] = [];
    const earthRadiusKm = 6371;

    // Approximate speed depending on profile (in km/h)
    // Walking ~ 4.5 km/h, Cycling ~ 15 km/h, Driving ~ 30 km/h (urban congested average)
    const speedKmh = profile === 'foot-walking' ? 4.5 : profile === 'cycling-regular' ? 14.0 : 28.0;

    intervalsMinutes.sort((a, b) => a - b).forEach((minutes) => {
      const radiusKm = (speedKmh * (minutes / 60)) * 0.78; // 0.78 network winding factor (tortuosity)
      const numPoints = 48;
      const ring: [number, number][] = [];

      for (let i = 0; i <= numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        // Directional variation simulating street network asymmetry
        const elongation = 1.0 + 0.15 * Math.sin(angle * 3) + 0.08 * Math.cos(angle * 2);
        const d = (radiusKm * elongation) / earthRadiusKm;

        const latRad = (centerLat * Math.PI) / 180;
        const lonRad = (centerLng * Math.PI) / 180;

        const pLat = Math.asin(
          Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(angle)
        );
        const pLon =
          lonRad +
          Math.atan2(
            Math.sin(angle) * Math.sin(d) * Math.cos(latRad),
            Math.cos(d) - Math.sin(latRad) * Math.sin(pLat)
          );

        ring.push([
          parseFloat(((pLon * 180) / Math.PI).toFixed(6)),
          parseFloat(((pLat * 180) / Math.PI).toFixed(6)),
        ]);
      }

      const areaKm2 = parseFloat((Math.PI * Math.pow(radiusKm, 2) * 0.95).toFixed(2));

      polygons.push({
        intervalMinutes: minutes,
        intervalSeconds: minutes * 60,
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
        areaKm2,
        profile,
      });
    });

    return polygons;
  }

  /**
   * Evaluates accessibility from an origin to a set of facilities
   */
  public evaluateServiceGaps(
    originPoint: [number, number], // [lng, lat]
    originName: string,
    profile: TransportProfile,
    facilities: FacilityItem[],
    aoi: AreaOfInterest | null = null
  ): AnalysisEnvelope<ServiceGapAnalysisResult> {
    const requestId = `access-${Date.now()}`;
    const aoiHash = aoiService.computeCanonicalHash(aoi, { originPoint, profile, facCount: facilities.length });

    const isochrones = this.generateNetworkIsochrone(originPoint[0], originPoint[1], profile, [5, 10, 15]);
    const maxIsochrone = isochrones[isochrones.length - 1];

    const matrix: AccessibilityMatrixRecord[] = [];
    const speedKmh = profile === 'foot-walking' ? 4.5 : profile === 'cycling-regular' ? 14.0 : 28.0;

    facilities.forEach((fac) => {
      const distKm = this.haversineDistanceKm(originPoint[1], originPoint[0], fac.lat, fac.lng);
      // Street network network factor: actual walking/driving distance is ~1.28x Euclidean
      const networkDistKm = distKm * 1.28;
      const travelTimeMinutes = parseFloat(((networkDistKm / speedKmh) * 60).toFixed(1));
      const reachableWithin15Min = travelTimeMinutes <= 15.0;

      matrix.push({
        originId: `orig-${originPoint[0].toFixed(3)}-${originPoint[1].toFixed(3)}`,
        originName,
        originCoord: originPoint,
        facilityId: fac.id,
        facilityName: fac.name,
        facilityCategory: fac.category,
        distanceMeters: Math.round(networkDistKm * 1000),
        travelTimeMinutes,
        reachableWithin15Min,
        status: reachableWithin15Min ? 'REACHABLE' : travelTimeMinutes <= 30 ? 'OUT_OF_RANGE' : 'UNREACHABLE',
      });
    });

    // Group by category to find accessibility completeness
    const categories: { cat: FacilityItem['category']; label: string }[] = [
      { cat: 'sekolah', label: 'Pendidikan / Sekolah' },
      { cat: 'kesehatan', label: 'Fasilitas Kesehatan / Puskesmas' },
      { cat: 'evakuasi', label: 'Tempat Evakuasi Bencana (TES/TEA)' },
      { cat: 'pasar', label: 'Pusat Logistik & Pasar' },
    ];

    const unserved: string[] = [];
    const insufficient: string[] = [];

    const categoryReachability = categories.map(({ cat, label }) => {
      const itemsInCat = matrix.filter((m) => m.facilityCategory === cat).sort((a, b) => a.travelTimeMinutes - b.travelTimeMinutes);
      const evaluatedCount = itemsInCat.length;

      if (evaluatedCount === 0) {
        insufficient.push(label);
        return {
          category: cat,
          label,
          evaluatedCount: 0,
          evaluationStatus: 'INSUFFICIENT_DATA' as const,
          hasAccess15Min: null,
          nearestFacilityName: undefined,
          nearestTravelTimeMin: undefined,
        };
      }

      const nearest = itemsInCat[0];
      const hasAccess = nearest.reachableWithin15Min;

      if (!hasAccess) {
        unserved.push(label);
      }

      return {
        category: cat,
        label,
        evaluatedCount,
        evaluationStatus: (hasAccess ? 'EVALUATED_REACHABLE' : 'EVALUATED_UNREACHABLE') as 'EVALUATED_REACHABLE' | 'EVALUATED_UNREACHABLE',
        hasAccess15Min: hasAccess,
        nearestFacilityName: nearest.facilityName,
        nearestTravelTimeMin: nearest.travelTimeMinutes,
      };
    });

    const is15MinCityCompliant = insufficient.length > 0 ? null : unserved.length === 0;
    const complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_EVALUABLE' =
      insufficient.length > 0
        ? 'NOT_EVALUABLE'
        : unserved.length === 0
        ? 'COMPLIANT'
        : 'NON_COMPLIANT';

    let recommendation = '';
    if (unserved.length === 0 && insufficient.length === 0) {
      recommendation = 'Lokasi memenuhi standar Akses Layanan 15 Menit. Semua kategori fasilitas esensial dapat dijangkau.';
    } else if (unserved.length > 0) {
      recommendation = `Ditemukan kesenjangan akses pada fasilitas terdaftar: ${unserved.join(', ')}. Disarankan intervensi penataan fasilitas atau perbaikan jaringan pejalan kaki.`;
    } else {
      recommendation = 'Fasilitas terdaftar yang dievaluasi berada dalam jangkauan 15 menit.';
    }

    if (insufficient.length > 0) {
      recommendation += ` Catatan: Kategori [${insufficient.join(', ')}] belum memiliki data inventaris pada titik ini (status: BELUM DIEVALUASI). Ketiadaan data bukan konfirmasi wilayah tidak terlayani.`;
    }

    const result: ServiceGapAnalysisResult = {
      originPoint,
      profile,
      isochrones,
      evaluatedFacilities: facilities,
      matrix,
      categoryReachability,
      is15MinCityCompliant,
      complianceStatus,
      unservedCategories: unserved,
      insufficientDataCategories: insufficient,
      coverageAreaKm2: maxIsochrone ? maxIsochrone.areaKm2 : 0,
      recommendation,
    };

    return {
      requestId,
      processingState: 'succeeded',
      dataStatus: 'ESTIMATED',
      data: result,
      aoiId: aoi?.id,
      aoiHash,
      parametersHash: aoiHash,
      provenance: {
        sourceType: 'DERIVED_COMPUTATION',
        provider: 'Harmony — perkiraan akses radial',
        dataset: 'Estimasi radial dan jarak geodesik; jaringan jalan belum dipakai',
        acquisitionTime: new Date().toISOString(),
        processingTime: new Date().toISOString(),
        dataStatus: 'ESTIMATED',
        crs: 'EPSG:4326',
        attribution: 'Perkiraan berdasarkan jarak dan kecepatan asumsi',
        algorithmVersion: 'Radial-Estimate-v1',
        assumptions: [
          'Estimasi waktu tempuh mengasumsikan kecepatan rata-rata moda pejalan kaki 4.5 km/jam, sepeda 14 km/jam, kendaraan 28 km/jam.',
          'Jarak Haversine dikalikan faktor asumsi 1.28; hasil bukan pengukuran jaringan jalan.',
          'Analisis akses fasilitas perkotaan dipisahkan secara ketat dari cakupan sensor radar cuaca BMKG.',
        ],
      },
    };
  }

  /**
   * Helper to compare 15-minute city scenario from an origin point and surrounding settlements
   */
  public compare15MinScenario(
    originPoint: [number, number],
    profile: TransportProfile,
    existingFacilities: FacilityItem[],
    candidateFacility: FacilityItem
  ): ScenarioComparisonResult {
    const testOrigins = [
      { name: 'Titik Evaluasi', coord: originPoint },
      { name: 'Permukiman Barat', coord: [originPoint[0] - 0.008, originPoint[1]] as [number, number] },
      { name: 'Permukiman Timur', coord: [originPoint[0] + 0.008, originPoint[1]] as [number, number] },
      { name: 'Permukiman Selatan', coord: [originPoint[0], originPoint[1] - 0.008] as [number, number] },
    ];
    return this.simulateScenarioPlanning(testOrigins, existingFacilities, candidateFacility, profile);
  }

  /**
   * Compares baseline coverage with a hypothetical new facility scenario
   */
  public simulateScenarioPlanning(
    origins: { name: string; coord: [number, number] }[],
    existingFacilities: FacilityItem[],
    candidateFacility: FacilityItem,
    profile: TransportProfile = 'foot-walking'
  ): ScenarioComparisonResult {
    let baselineReachable = 0;
    let scenarioReachable = 0;
    let totalBaseTime = 0;
    let totalScenTime = 0;
    let benefited = 0;

    origins.forEach((orig) => {
      const baseEval = this.evaluateServiceGaps(orig.coord, orig.name, profile, existingFacilities);
      const scenEval = this.evaluateServiceGaps(orig.coord, orig.name, profile, [...existingFacilities, candidateFacility]);

      const baseNearest = baseEval.data?.categoryReachability.find((c) => c.category === candidateFacility.category);
      const scenNearest = scenEval.data?.categoryReachability.find((c) => c.category === candidateFacility.category);

      const bTime = baseNearest?.nearestTravelTimeMin ?? 45;
      const sTime = scenNearest?.nearestTravelTimeMin ?? 45;

      totalBaseTime += bTime;
      totalScenTime += sTime;

      if (baseNearest?.hasAccess15Min) baselineReachable++;
      if (scenNearest?.hasAccess15Min) scenarioReachable++;

      if (sTime < bTime) benefited++;
    });

    const n = Math.max(1, origins.length);
    const baselineCoveragePct = parseFloat(((baselineReachable / n) * 100).toFixed(1));
    const scenarioCoveragePct = parseFloat(((scenarioReachable / n) * 100).toFixed(1));
    const deltaCoveragePct = parseFloat((scenarioCoveragePct - baselineCoveragePct).toFixed(1));

    const baselineAvgTravelTimeMin = parseFloat((totalBaseTime / n).toFixed(1));
    const scenarioAvgTravelTimeMin = parseFloat((totalScenTime / n).toFixed(1));
    const deltaAvgTravelTimeMin = parseFloat((scenarioAvgTravelTimeMin - baselineAvgTravelTimeMin).toFixed(1));

    return {
      baselineCoveragePct,
      scenarioCoveragePct,
      deltaCoveragePct,
      baselineAvgTravelTimeMin,
      scenarioAvgTravelTimeMin,
      deltaAvgTravelTimeMin,
      candidateFacilityAdded: candidateFacility,
      benefitedOriginsCount: benefited,
    };
  }

  public haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export const networkAccessibilityService = new NetworkAccessibilityService();
