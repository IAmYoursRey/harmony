import { AreaOfInterest, DataProvenance } from './types';

export type { AreaOfInterest };

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
}

export const aoiService = new AOIService();
