import { DataProvenance } from './types';

export interface STACSearchQuery {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  intersects?: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  collections?: string[];
  datetime?: string; // e.g. "2026-01-01T00:00:00Z/2026-09-20T23:59:59Z"
  limit?: number;
  maxCloudCover?: number;
  signal?: AbortSignal;
}

export interface SatelliteSceneItem {
  id: string;
  collection: string;
  satellite: 'Sentinel-2' | 'Sentinel-1' | 'Landsat' | 'Unknown';
  platform: string;
  datetime: string;
  cloudCover: number | null;
  sunElevation?: number;
  bbox: [number, number, number, number];
  thumbnailUrl?: string;
  visualUrl?: string;
  assets: Record<string, { href: string; type?: string; title?: string; isCloudOptimizedGeoTiff?: boolean; cogStatus?: 'DECLARED' | 'NOT_DECLARED'; roles?: string[] }>;
  provenance: DataProvenance;
}

export interface STACSearchResult {
  success: boolean;
  totalFound: number;
  totalMatched?: number;
  scenes: SatelliteSceneItem[];
  provider: string;
  endpointUrl: string;
  queryTimeMs: number;
  message?: string;
}

function validateSearchGeometry(geometry: NonNullable<STACSearchQuery['intersects']>): void {
  const position = (p: any) => Array.isArray(p) && p.length >= 2 && p.every((n: any) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  const ring = (r: any) => Array.isArray(r) && r.length >= 4 && r.every(position) && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];
  const polygon = (p: any) => Array.isArray(p) && p.length > 0 && p.every(ring);
  const valid = geometry.type === 'Point' ? position(geometry.coordinates)
    : geometry.type === 'Polygon' ? polygon(geometry.coordinates)
    : geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(polygon);
  if (!valid) throw new Error('Geometri wilayah STAC tidak valid atau koordinatnya di luar rentang.');
}
function declaresCog(mediaType: unknown): boolean {
  if (typeof mediaType !== 'string') return false;
  const [mime, ...parameters] = mediaType.toLowerCase().split(';').map(s => s.trim());
  return mime === 'image/tiff' && parameters.some(p => /^profile\s*=\s*["']?cloud-optimized["']?$/.test(p));
}

const PUBLIC_STAC_ENDPOINTS = [
  {
    name: 'Earth Search by Element84 (AWS Open Data)',
    url: 'https://earth-search.aws.element84.com/v1/search',
    collections: ['sentinel-2-l2a', 'sentinel-1-grd', 'landsat-c2-l2'],
    attribution: 'Copernicus Sentinel & Landsat data / Element84 Earth Search STAC',
  },
  {
    name: 'Microsoft Planetary Computer STAC',
    url: 'https://planetarycomputer.microsoft.com/api/stac/v1/search',
    collections: ['sentinel-2-l2a', 'landsat-c2-l2'],
    attribution: 'Copernicus Sentinel & Landsat data / Microsoft Planetary Computer',
  },
];

class STACService {
  /**
   * Search real STAC catalog for Earth observation scenes
   */
  public async searchSatelliteScenes(query: STACSearchQuery): Promise<STACSearchResult> {
    if (query.signal?.aborted) throw new DOMException('Pencarian dibatalkan', 'AbortError');
    const startTime = Date.now();
    const limit = query.limit || 8;
    const collections = query.collections || ['sentinel-2-l2a'];

    if (query.bbox && query.intersects) throw new Error('Pilih bbox atau geometri STAC, bukan keduanya.');
    if (query.intersects) validateSearchGeometry(query.intersects);
    const bbox = query.bbox ?? (query.intersects ? undefined : [112.5, -7.5, 113.0, -7.0] as [number, number, number, number]);

    if (bbox && (bbox.length !== 4 || bbox.some(v => !Number.isFinite(v)) || bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90 || bbox[0] >= bbox[2] || bbox[1] >= bbox[3])) throw new Error('Batas wilayah STAC tidak valid; wilayah lintas garis tanggal perlu dipecah.');
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
      if (query.signal?.aborted) throw new DOMException('Pencarian dibatalkan', 'AbortError');
      const controller = new AbortController();
      const abort = () => controller.abort();
      query.signal?.addEventListener('abort', abort, { once: true });
      const timeoutId = setTimeout(abort, 8000);
      try {

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/geo+json, application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          continue;
        }

        const data = await res.json();
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Respons katalog STAC tidak valid.');
        const features = data.features;
        if (features.some((f: any) => !f?.id || !collections.includes(f?.collection) || !Number.isFinite(Date.parse(f?.properties?.datetime)) || !Array.isArray(f?.bbox) || f.bbox.length !== 4 || f.bbox.some((v: any) => typeof v !== 'number' || !Number.isFinite(v)) || f.bbox[0] < -180 || f.bbox[2] > 180 || f.bbox[1] < -90 || f.bbox[3] > 90 || f.bbox[0] > f.bbox[2] || f.bbox[1] > f.bbox[3] || !f?.assets || typeof f.assets !== 'object')) throw new Error('Metadata scene STAC tidak lengkap.');

        const scenes: SatelliteSceneItem[] = features.map((f: any) => {
          const props = f.properties || {};
          const isS1 = f.collection?.includes('sentinel-1') || f.id?.startsWith('S1');
          const isS2 = f.collection?.includes('sentinel-2') || f.id?.startsWith('S2');
          const satellite = isS1 ? 'Sentinel-1' : isS2 ? 'Sentinel-2' : f.collection?.includes('landsat') ? 'Landsat' : 'Unknown';
          const cloud = props['eo:cloud_cover'];
          const cloudCover = typeof cloud === 'number' && Number.isFinite(cloud) && cloud >= 0 && cloud <= 100 ? cloud : null;

          const assets: Record<string, any> = {};
          if (f.assets) {
            Object.entries(f.assets).forEach(([k, v]: [string, any]) => {
              if (typeof v?.href === 'string' && (/^https?:\/\//.test(v.href) || /^s3:\/\//.test(v.href))) {
                const keyLower = k.toLowerCase();
                const isNonRaster = ['thumbnail', 'rendered_preview', 'overview', 'metadata'].includes(keyLower);
                const isCog = !isNonRaster && declaresCog(v.type);
                assets[k] = {
                  href: v.href,
                  type: v.type,
                  title: v.title,
                  isCloudOptimizedGeoTiff: isCog,
                  cogStatus: isCog ? 'DECLARED' : 'NOT_DECLARED',
                  roles: Array.isArray(v.roles) ? v.roles : undefined,
                  scheme: v.href.startsWith('s3://') ? 's3' : 'https',
                };
              }
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
            agency: isS1 || isS2 ? 'European Space Agency (ESA) & Copernicus' : undefined,
            dataset: f.collection || 'sentinel-2-l2a',
            endpointOrAsset: endpoint.url,
            sourceItemIds: [f.id],
            acquisitionTime: props.datetime,
            processingTime: new Date().toISOString(),
            dataStatus: 'ARCHIVED',
            license: props.license || 'Periksa ketentuan penggunaan koleksi sumber',
            crs: 'EPSG:4326',
            spatialResolution: typeof props.gsd === 'number' && Number.isFinite(props.gsd) && props.gsd > 0 ? `${props.gsd} m (metadata scene)` : 'Tidak tersedia pada metadata scene',
            quality: cloudCover !== null ? `Tutupan awan scene: ${cloudCover.toFixed(1)}%` : isS1 ? 'Scene radar; tutupan awan tidak berlaku sebagai penyaring optik' : 'Tutupan awan tidak tersedia',
            assumptions: ['Hanya metadata katalog halaman saat ini; aset raster dan piksel AOI belum dibaca atau divalidasi secara fisik.'],
            attribution: endpoint.attribution,
          };

          return {
            id: f.id,
            collection: f.collection,
            satellite,
            platform: typeof props.platform === 'string' ? props.platform : 'Tidak tersedia',
            datetime: props.datetime,
            cloudCover,
            sunElevation: props['view:sun_elevation'],
            bbox: f.bbox,
            thumbnailUrl,
            visualUrl: f.assets?.visual?.href,
            assets,
            provenance,
          };
        });

        // Filter by cloud cover if requested (exclude null cloudCover from explicit optical cloud filtering)
        const filteredScenes = query.maxCloudCover !== undefined
          ? scenes.filter((s) => s.cloudCover !== null && s.cloudCover <= query.maxCloudCover!)
          : scenes;

        const totalMatched = typeof data.numberMatched === 'number' && Number.isFinite(data.numberMatched)
          ? data.numberMatched
          : filteredScenes.length;

        return {
          success: true,
          totalFound: filteredScenes.length,
          totalMatched,
          scenes: filteredScenes,
          provider: endpoint.name,
          endpointUrl: endpoint.url,
          queryTimeMs: Date.now() - startTime,
        };
      } catch {
        if (query.signal?.aborted) throw new DOMException('Pencarian dibatalkan', 'AbortError');
        // A failed provider may be retried through another configured catalog.
      } finally {
        clearTimeout(timeoutId);
        query.signal?.removeEventListener('abort', abort);
      }
    }

    return {
      success: false,
      totalFound: 0,
      scenes: [],
      provider: 'STAC Catalog Endpoint',
      endpointUrl: PUBLIC_STAC_ENDPOINTS[0].url,
      queryTimeMs: Date.now() - startTime,
      message: 'Tidak ada respons katalog STAC yang valid. Ini berbeda dari pencarian berhasil dengan nol scene.',
    };
  }

  /**
   * Public SAS token signer for Microsoft Planetary Computer STAC assets
   */
  public async signAssetUrl(assetHref: string, signal?: AbortSignal): Promise<string> {
    if (!assetHref || typeof assetHref !== 'string') return assetHref;
    if (signal?.aborted) {
      throw new DOMException('Permintaan penandatanganan aset dibatalkan', 'AbortError');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(assetHref);
    } catch {
      return assetHref;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const isPlanetary = host.endsWith('.blob.core.windows.net') || host.endsWith('planetarycomputer.microsoft.com');
    if (!isPlanetary) {
      return assetHref;
    }

    try {
      const signUrl = `https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(assetHref)}`;
      const res = await fetch(signUrl, { signal: signal || AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`SIGNING_FAILED: Planetary Computer SAS signing gagal (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (typeof data?.href === 'string' && data.href.startsWith('https://')) {
        return data.href;
      }
      throw new Error('SIGNING_FAILED: Respons signer Planetary Computer tidak memuat URL aset bertoken yang valid.');
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : 'Kesalahan jaringan';
      if (msg.includes('SIGNING_FAILED')) {
        throw err;
      }
      throw new Error(`SIGNING_FAILED: Gagal menandatangani aset raster: ${msg}`);
    }
  }

  /**
   * Resolves a scene asset URL for browser/operational streaming.
   * If the asset href is an s3:// URL (e.g. from Earth Search Landsat),
   * hydrates the exact same scene ID from Planetary Computer to obtain signed HTTPS access.
   */
  public async resolveSceneAssetUrl(
    sceneId: string,
    assetKey: string,
    currentHref: string,
    collection = 'landsat-c2-l2',
    signal?: AbortSignal
  ): Promise<{ href: string; resolvedProvider: string; isSigned: boolean }> {
    if (typeof currentHref !== 'string' || !currentHref) {
      throw new Error('ASSET_RESOLUTION_FAILED: URL aset STAC kosong atau tidak valid.');
    }

    if (currentHref.startsWith('https://') || currentHref.startsWith('http://')) {
      const signed = await this.signAssetUrl(currentHref, signal);
      return { href: signed, resolvedProvider: 'direct_stac_asset', isSigned: signed !== currentHref };
    }

    if (currentHref.startsWith('s3://')) {
      try {
        const itemUrl = `https://planetarycomputer.microsoft.com/api/stac/v1/collections/${encodeURIComponent(collection)}/items/${encodeURIComponent(sceneId)}`;
        const res = await fetch(itemUrl, { signal: signal || AbortSignal.timeout(8000) });
        if (res.ok) {
          const item = await res.json();
          if (item?.id && item.id !== sceneId) {
            throw new Error(`ASSET_RESOLUTION_FAILED: ID item yang diterima (${item.id}) tidak sesuai dengan scene yang diminta (${sceneId}).`);
          }
          const assets = item?.assets || {};
          let targetAsset = assets[assetKey];
          if (!targetAsset) {
            const keyLower = assetKey.toLowerCase();
            if (keyLower.includes('thermal') || keyLower.includes('lwir') || keyLower.includes('b10')) {
              targetAsset = assets.lwir11 || assets.st_b10 || assets.thermal;
            } else if (keyLower.includes('qa')) {
              targetAsset = assets.qa_pixel || assets['qa:pixel'] || assets.qa;
            }
          }

          if (typeof targetAsset?.href === 'string' && /^https?:\/\//.test(targetAsset.href)) {
            const signed = await this.signAssetUrl(targetAsset.href, signal);
            return {
              href: signed,
              resolvedProvider: 'Microsoft Planetary Computer (hydrated from Earth Search scene ID)',
              isSigned: signed !== targetAsset.href,
            };
          }
          throw new Error(`ASSET_NOT_FOUND: Band ${assetKey} tidak ditemukan pada scene Planetary Computer ${sceneId}.`);
        }
        throw new Error(`ASSET_RESOLUTION_FAILED: Planetary Computer merespons HTTP ${res.status} untuk scene ${sceneId}.`);
      } catch (err: any) {
        if (signal?.aborted) throw err;
        throw new Error(`ASSET_RESOLUTION_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new Error(`ASSET_RESOLUTION_FAILED: Skema URL aset ${currentHref} tidak didukung.`);
  }
}

export const stacService = new STACService();
