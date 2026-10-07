import { useState, useEffect } from 'react';
import { AreaOfInterest, DataProvenance } from './types';

export type { AreaOfInterest };

export function useActiveAOI(): AreaOfInterest | null {
  const [aoi, setAoi] = useState<AreaOfInterest | null>(() => aoiService.getActiveAOI());

  useEffect(() => {
    return aoiService.subscribe((newAoi) => {
      setAoi(newAoi);
    });
  }, []);

  return aoi;
}

class AOIService {
  private activeAOI: AreaOfInterest | null = null;
  private listeners: Set<(aoi: AreaOfInterest | null) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('harmony_active_aoi');
      if (stored) {
        this.activeAOI = JSON.parse(stored);
      }
    } catch {}
  }

  private saveToStorage() {
    try {
      if (this.activeAOI) {
        localStorage.setItem('harmony_active_aoi', JSON.stringify(this.activeAOI));
      } else {
        localStorage.removeItem('harmony_active_aoi');
      }
    } catch {}
  }

  public getActiveAOI(): AreaOfInterest | null {
    return this.activeAOI;
  }

  public setActiveAOI(aoi: AreaOfInterest | null) {
    this.activeAOI = aoi;
    this.saveToStorage();
    this.notifyListeners();
  }

  public subscribe(listener: (aoi: AreaOfInterest | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.activeAOI);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeAOI);
      } catch (e) {
        console.error('AOI listener error:', e);
      }
    });
  }

  /**
   * Create an authoritative AOI from a Point + Radius Buffer
   */
  public createBufferAOI(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    name = `Buffer ${radiusKm}km (${centerLat.toFixed(3)}, ${centerLng.toFixed(3)})`
  ): AreaOfInterest {
    const coordinates: [number, number][] = [];
    const earthRadiusKm = 6371;
    const numPoints = 64;

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const d = radiusKm / earthRadiusKm;
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

      coordinates.push([
        Math.round(((pLon * 180) / Math.PI) * 1e6) / 1e6,
        Math.round(((pLat * 180) / Math.PI) * 1e6) / 1e6,
      ]);
    }

    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    const bbox: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];

    const areaKm2 = parseFloat((Math.PI * radiusKm * radiusKm).toFixed(2));
    const perimeterKm = parseFloat((2 * Math.PI * radiusKm).toFixed(2));

    const provenance: DataProvenance = {
      sourceType: 'DERIVED_COMPUTATION',
      provider: 'Harmony Geoprocessing Engine',
      dataset: 'Geodesic Buffer AOI',
      dataStatus: 'DERIVED',
      crs: 'EPSG:4326',
      spatialResolution: `Radius ${radiusKm} km`,
      uncertainty: 'Toleransi Geodesi < 0.1%',
      attribution: 'Kalkulasi Geodesi Bola Bumi WGS 84',
    };

    const aoi: AreaOfInterest = {
      id: `aoi-buf-${Date.now()}`,
      name,
      sourceType: 'POINT_BUFFER',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
      crs: 'EPSG:4326',
      bbox,
      areaKm2,
      perimeterKm,
      centroid: [centerLng, centerLat],
      createdAt: new Date().toISOString(),
      provenance,
    };

    this.setActiveAOI(aoi);
    return aoi;
  }

  /**
   * Create an AOI from drawn or uploaded Polygon coordinates
   */
  public createPolygonAOI(
    coordinates: [number, number][][],
    name = 'Area of Interest Terpilih',
    sourceType: AreaOfInterest['sourceType'] = 'DRAWN_POLYGON'
  ): AreaOfInterest {
    const ring = coordinates[0] || [];
    const lngs = ring.map((c) => c[0]);
    const lats = ring.map((c) => c[1]);
    const bbox: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];

    // Spherical polygon area approximation via Shoelace formula on projected coordinates
    let areaSqMeters = 0;
    const R = 6378137;
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      const lat1 = (p1[1] * Math.PI) / 180;
      const lat2 = (p2[1] * Math.PI) / 180;
      const lonDiff = ((p2[0] - p1[0]) * Math.PI) / 180;
      areaSqMeters += lonDiff * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    areaSqMeters = Math.abs((areaSqMeters * R * R) / 2);
    const areaKm2 = parseFloat((areaSqMeters / 1e6).toFixed(2));

    const centroidLng = (bbox[0] + bbox[2]) / 2;
    const centroidLat = (bbox[1] + bbox[3]) / 2;

    const provenance: DataProvenance = {
      sourceType: 'VECTOR_MAP',
      provider: 'Harmony AOI Engine',
      dataset: 'Custom Polygon AOI',
      dataStatus: 'DERIVED',
      crs: 'EPSG:4326',
      attribution: 'Area of Interest Terdefinisi Pengguna',
    };

    const aoi: AreaOfInterest = {
      id: `aoi-poly-${Date.now()}`,
      name,
      sourceType,
      geometry: {
        type: 'Polygon',
        coordinates,
      },
      crs: 'EPSG:4326',
      bbox,
      areaKm2,
      perimeterKm: 0,
      centroid: [centroidLng, centroidLat],
      createdAt: new Date().toISOString(),
      provenance,
    };

    this.setActiveAOI(aoi);
    return aoi;
  }

  /**
   * Create an AOI from a Bounding Box
   */
  public createBboxAOI(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
    name = `BBox [${minLng.toFixed(2)}, ${minLat.toFixed(2)}]`
  ): AreaOfInterest {
    const coordinates: [number, number][][] = [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ];
    return this.createPolygonAOI(coordinates, name, 'MAP_EXTENT');
  }

  /**
   * Create an AOI from current Map Extent
   */
  public createExtentAOI(
    extentLonLat: [number, number, number, number],
    name = 'AOI Cakupan Peta Terkini'
  ): AreaOfInterest {
    const [minLng, minLat, maxLng, maxLat] = extentLonLat;
    return this.createBboxAOI(minLng, minLat, maxLng, maxLat, name);
  }

  /**
   * Validates GeoJSON Polygon / MultiPolygon coordinates
   */
  public validateGeometry(coords: any): { isValid: boolean; error?: string } {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      return { isValid: false, error: 'Koordinat AOI kosong atau bukan array.' };
    }

    const outerRing = Array.isArray(coords[0][0]) ? coords[0] : coords;
    if (outerRing.length < 4) {
      return { isValid: false, error: 'Ring poligon minimal harus memiliki 4 titik (3 unik + 1 penutup).' };
    }

    for (const pt of outerRing) {
      if (!Array.isArray(pt) || pt.length < 2) {
        return { isValid: false, error: 'Format koordinat harus berupa pasangan [lng, lat].' };
      }
      const [lng, lat] = pt;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        return { isValid: false, error: 'Nilai koordinat harus berupa angka valid (bukan NaN).' };
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return { isValid: false, error: `Koordinat keluar dari jangkauan WGS84: lng=${lng}, lat=${lat}` };
      }
    }

    const first = outerRing[0];
    const last = outerRing[outerRing.length - 1];
    if (Math.abs(first[0] - last[0]) > 1e-6 || Math.abs(first[1] - last[1]) > 1e-6) {
      return { isValid: false, error: 'Ring poligon belum tertutup (titik awal !== titik akhir).' };
    }

    return { isValid: true };
  }

  /**
   * Computes a deterministic canonical hash from AOI geometry and analysis parameters
   */
  public computeCanonicalHash(aoi: AreaOfInterest | null, extraParams: Record<string, any> = {}): string {
    if (!aoi) return 'no_aoi';
    const canonicalCoords = JSON.stringify(
      (aoi.geometry.coordinates as any).map((ring: any) =>
        Array.isArray(ring[0])
          ? ring.map((pt: any) => [parseFloat(pt[0].toFixed(5)), parseFloat(pt[1].toFixed(5))])
          : [parseFloat(ring[0].toFixed(5)), parseFloat(ring[1].toFixed(5))]
      )
    );
    const sortedParams = JSON.stringify(extraParams, Object.keys(extraParams).sort());
    let hash = 0;
    const str = `${aoi.id}:${canonicalCoords}:${sortedParams}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Authoritative Ray-Casting Point-in-Polygon check with interior holes support
   */
  public isPointInPolygonWithHoles(pt: [number, number], rings: [number, number][][]): boolean {
    if (!rings || rings.length === 0) return false;

    const inRing = (point: [number, number], ring: [number, number][]) => {
      let inside = false;
      const x = point[0];
      const y = point[1];
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    // Must be inside outer ring (rings[0])
    if (!inRing(pt, rings[0])) {
      return false;
    }

    // Must NOT be inside any hole (rings[1..n])
    for (let h = 1; h < rings.length; h++) {
      if (inRing(pt, rings[h])) {
        return false;
      }
    }

    return true;
  }
}

export const aoiService = new AOIService();

