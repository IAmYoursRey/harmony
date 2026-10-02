/**
 * Harmony Geospatial Core - Data Status & Provenance Model
 * Standards-compliant geospatial types adhering to ISO 19115 and OGC standards.
 */

export type DataStatus =
  | 'LIVE'
  | 'CACHED'
  | 'STATIC'
  | 'DERIVED'
  | 'ESTIMATED'
  | 'SIMULATED'
  | 'UNAVAILABLE';

export interface DataProvenance {
  sourceType: 'SENSOR_OBSERVATION' | 'SATELLITE_RASTER' | 'DEM_ELEVATION' | 'VECTOR_MAP' | 'MODEL_ASSIMILATION' | 'DERIVED_COMPUTATION';
  provider: string;
  agency?: string;
  dataset: string;
  endpointOrAsset?: string;
  acquisitionTime?: string;
  observationTime?: string;
  processingTime?: string;
  dataStatus: DataStatus;
  license?: string;
  crs: string;
  spatialResolution?: string;
  temporalResolution?: string;
  quality?: string;
  uncertainty?: string | number;
  confidenceScore?: number;
  attribution: string;
  lineageSteps?: string[];
}

export type ProviderHealthState =
  | 'ONLINE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface ProviderHealthReport {
  providerId: string;
  name: string;
  state: ProviderHealthState;
  lastCheckedAt: string;
  lastSuccessfulRequest?: string;
  latencyMs?: number;
  httpStatus?: number;
  errorMessage?: string;
  endpointUrl: string;
}

export interface AreaOfInterest {
  id: string;
  name: string;
  sourceType: 'ADMINISTRATIVE' | 'DRAWN_POLYGON' | 'UPLOADED_FILE' | 'POINT_BUFFER' | 'MAP_EXTENT';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  crs: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  areaKm2: number;
  perimeterKm: number;
  centroid: [number, number]; // [lng, lat]
  createdAt: string;
  provenance: DataProvenance;
}
