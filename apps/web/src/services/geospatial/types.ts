/**
 * Harmony Geospatial Core - Data Status & Provenance Model
 * Standards-compliant geospatial types adhering to ISO 19115 and OGC standards.
 */

export type DataStatus =
  | 'PARTIAL'
  | 'LIVE'
  | 'CACHED'
  | 'STATIC'
  | 'DERIVED'
  | 'ESTIMATED'
  | 'SIMULATED'
  | 'DEMO'
  | 'IMPORTED'
  | 'ARCHIVED'
  | 'UNAVAILABLE'
  | 'NOT_AVAILABLE';

export interface DataProvenance {
  sourceType:
    | 'SENSOR_OBSERVATION'
    | 'SATELLITE_RASTER'
    | 'SATELLITE_CATALOG'
    | 'DEM_ELEVATION'
    | 'VECTOR_MAP'
    | 'MODEL_ASSIMILATION'
    | 'DERIVED_COMPUTATION'
    | 'DEMONSTRATION'
    | 'USER_SUPPLIED'
    | 'NONE';
  provider: string;
  agency?: string;
  dataset: string;
  endpointOrAsset?: string;
  acquisitionTime?: string;
  observationTime?: string;
  processingTime?: string;
  dataStatus: DataStatus;
  license?: string;
  crs?: string | null;
  spatialResolution?: string;
  temporalResolution?: string;
  quality?: string;
  uncertainty?: string | number;
  confidenceScore?: number;
  attribution: string;
  lineageSteps?: string[];
  productVersion?: string;
  algorithmVersion?: string;
  sourceItemIds?: string[];
  validPixelCount?: number;
  validAreaKm2?: number;
  coverageFraction?: number;
  fetchedAt?: string;
  lastCheckedAt?: string;
  assumptions?: string[];
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

export type ProcessingState =
  | 'idle'
  | 'queued'
  | 'running'
  | 'reading'
  | 'decoding'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type FailureReasonCode =
  | 'NO_SCENE'
  | 'NO_VALID_PIXELS'
  | 'NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'NO_ROUTE'
  | 'PARTIAL_COVERAGE'
  | 'INVALID_AOI'
  | 'TIMEOUT';

export interface StructuredReason {
  code: FailureReasonCode | string;
  message: string;
  retryable: boolean;
}

export interface AnalysisEnvelope<T> {
  requestId: string;
  analysisId?: string;
  processingState: ProcessingState;
  dataStatus: DataStatus;
  data: T | null;
  reason?: StructuredReason;
  aoiId?: string;
  aoiHash?: string;
  parametersHash: string;
  provenance: DataProvenance & {
    productVersion?: string;
    algorithmVersion: string;
    sourceItemIds?: string[];
    validPixelCount?: number;
    validAreaKm2?: number;
    coverageFraction?: number;
    fetchedAt?: string;
    lastCheckedAt?: string;
    assumptions?: string[];
  };
}

