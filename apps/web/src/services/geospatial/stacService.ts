import { DataProvenance } from './types';

export interface STACSearchQuery {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  intersects?: {
    type: 'Point' | 'Polygon';
    coordinates: any;
  };
  collections?: string[];
  datetime?: string; // e.g. "2026-01-01T00:00:00Z/2026-09-20T23:59:59Z"
  limit?: number;
  maxCloudCover?: number;
}

export interface SatelliteSceneItem {
  id: string;
  collection: string;
  satellite: 'Sentinel-2' | 'Sentinel-1' | 'Landsat';
  platform: string;
  datetime: string;
  cloudCover: number | null;
  sunElevation?: number;
  bbox: [number, number, number, number];
  thumbnailUrl?: string;
  visualUrl?: string;
  assets: Record<string, { href: string; type?: string; title?: string }>;
  provenance: DataProvenance;
}

export interface STACSearchResult {
  success: boolean;
  totalFound: number;
  scenes: SatelliteSceneItem[];
  provider: string;
  endpointUrl: string;
  queryTimeMs: number;
  message?: string;
}

const PUBLIC_STAC_ENDPOINTS = [
  {
    name: 'Earth Search by Element84 (AWS Open Data)',
    url: 'https://earth-search.aws.element84.com/v1/search',
    collections: ['sentinel-2-l2a', 'sentinel-1-grd'],
    attribution: 'Copernicus Sentinel data / Element84 Earth Search STAC',
  },
  {
    name: 'Microsoft Planetary Computer STAC',
    url: 'https://planetarycomputer.microsoft.com/api/stac/v1/search',
    collections: ['sentinel-2-l2a'],
    attribution: 'Copernicus Sentinel data / Microsoft Planetary Computer',
  },
];

class STACService {
  /**
   * Search real STAC catalog for Earth observation scenes
   */
  public async searchSatelliteScenes(query: STACSearchQuery): Promise<STACSearchResult> {
    const startTime = Date.now();
    const limit = query.limit || 8;
    const collections = query.collections || ['sentinel-2-l2a'];

    let bbox = query.bbox;
    if (!bbox && query.intersects?.type === 'Point') {
      const [lng, lat] = query.intersects.coordinates;
      bbox = [lng - 0.05, lat - 0.05, lng + 0.05, lat + 0.05];
    } else if (!bbox && !query.intersects) {
      // Default to Java/Surabaya region if nothing specified
      bbox = [112.5, -7.5, 113.0, -7.0];
    }

    const payload: any = {
      collections,
      limit,
    };

    if (bbox) {
      payload.bbox = bbox;
    } else if (query.intersects) {
      payload.intersects = query.intersects;
    }

    if (query.datetime) {
      payload.datetime = query.datetime;
    } else {
      // Default to past 90 days
      const now = new Date();
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      payload.datetime = `${past.toISOString()}/${now.toISOString()}`;
    }

    // Iterate through public endpoints
    for (const endpoint of PUBLIC_STAC_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/geo+json, application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          continue;
        }

        const data = await res.json();
        const features = data.features || [];

        const scenes: SatelliteSceneItem[] = features.map((f: any) => {
          const props = f.properties || {};
          const isS1 = f.collection?.includes('sentinel-1') || f.id?.startsWith('S1');
          const isS2 = f.collection?.includes('sentinel-2') || f.id?.startsWith('S2');
          const satellite = isS1 ? 'Sentinel-1' : isS2 ? 'Sentinel-2' : 'Landsat';

          const assets: Record<string, any> = {};
          if (f.assets) {
            Object.entries(f.assets).forEach(([k, v]: [string, any]) => {
              assets[k] = { href: v.href, type: v.type, title: v.title };
            });
          }

          const thumbnailUrl =
            f.assets?.thumbnail?.href ||
            f.assets?.rendered_preview?.href ||
            f.assets?.overview?.href ||
            f.assets?.visual?.href;

          const provenance: DataProvenance = {
            sourceType: 'SATELLITE_RASTER',
            provider: endpoint.name,
            agency: 'European Space Agency (ESA) & Copernicus',
            dataset: f.collection || 'sentinel-2-l2a',
            endpointOrAsset: f.id,
            acquisitionTime: props.datetime,
            processingTime: new Date().toISOString(),
            dataStatus: 'LIVE',
            license: 'Copernicus Open Access Free and Open License',
            crs: 'EPSG:4326',
            spatialResolution: isS2 ? '10m - 20m GSD' : '10m High-Res Ground Range',
            quality: props['eo:cloud_cover'] !== undefined ? `Tutupan Awan: ${props['eo:cloud_cover'].toFixed(1)}%` : 'Tembus Cuaca / Radar C-Band',
            uncertainty: 'Ortorektifikasi CE90 < 2.5m (ESA Level-2A)',
            attribution: endpoint.attribution,
          };

          return {
            id: f.id,
            collection: f.collection,
            satellite,
            platform: props.platform || (isS2 ? 'Sentinel-2A/B' : 'Sentinel-1A'),
            datetime: props.datetime,
            cloudCover: props['eo:cloud_cover'] !== undefined ? parseFloat(props['eo:cloud_cover'].toFixed(1)) : null,
            sunElevation: props['view:sun_elevation'],
            bbox: f.bbox || bbox || [0, 0, 0, 0],
            thumbnailUrl,
            visualUrl: f.assets?.visual?.href,
            assets,
            provenance,
          };
        });

        // Filter by cloud cover if requested
        const filteredScenes = query.maxCloudCover !== undefined
          ? scenes.filter((s) => s.cloudCover === null || s.cloudCover <= query.maxCloudCover!)
          : scenes;

        return {
          success: true,
          totalFound: filteredScenes.length,
          scenes: filteredScenes,
          provider: endpoint.name,
          endpointUrl: endpoint.url,
          queryTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        // Fallback to next endpoint
      }
    }

    return {
      success: false,
      totalFound: 0,
      scenes: [],
      provider: 'STAC Catalog Endpoint',
      endpointUrl: PUBLIC_STAC_ENDPOINTS[0].url,
      queryTimeMs: Date.now() - startTime,
      message: 'Katalog STAC tidak dapat dijangkau saat ini atau tidak ada scene satelit valid pada rentang tanggal tersebut.',
    };
  }
}

export const stacService = new STACService();
