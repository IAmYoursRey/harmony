export type GeometryType = 'POINT' | 'LINESTRING' | 'POLYGON' | 'RASTER_GRID';

export interface SpatialFeatureAttribute {
  id: string;
  name: string;
  geometryType: GeometryType;
  category: 'sensor' | 'facility' | 'disaster_zone' | 'river' | 'road' | 'administrative' | 'raster_layer';
  coordinates: {
    lat: number;
    lng: number;
  };
  attributes: Record<string, any>;
  provenance: {
    agency: string;
    source: string;
    acquisitionTime: string;
    crs: string;
    qualityRating: 'A (Terverifikasi)' | 'B (Model Dinormalisasi)' | 'C (Estimasi Lapangan)';
  };
}

export interface CrsDefinition {
  epsgCode: string;
  name: string;
  type: 'Geographic (GCS)' | 'Projected (PCS)';
  datum: string;
  unit: string;
  indonesiaUsage: string;
}

export interface DatasetMetadataEntry {
  datasetId: string;
  name: string;
  description: string;
  agency: string;
  provider: string;
  publicationTime: string;
  lastUpdated: string;
  spatialResolution: string;
  temporalResolution: string;
  crs: string;
  geometryType: GeometryType;
  format: 'GeoJSON' | 'GeoTIFF' | 'NetCDF' | 'Vector PostGIS' | 'Raster Grid';
  qualityScore: number;
  license: string;
  lineage: string[];
}

export type TsunamiSensorType =
  | 'DONET Seafloor Cable Node'
  | 'S-net Ocean Bottom Observatory'
  | 'DART Tsunami Buoy'
  | 'InaCBT Cable Tsunameter'
  | 'InaBuoy Tsunami Detector'
  | 'IOC Coastal Tide Gauge';

export interface TsunamiSensorNode {
  id: string;
  name: string;
  code: string;
  sensorType: TsunamiSensorType;
  network: string;
  country: 'Jepang' | 'Indonesia' | 'Amerika Serikat' | 'Chile' | 'Internasional';
  flag: string;
  lat: number;
  lng: number;
  depthM: number;
  seaArea: string;
  status: 'ONLINE' | 'MAINTENANCE' | 'ALERT';
  samplingRateHz: number;
  waterPressureMpa: number;
  seaLevelAnomalyM: number;
  tsunamiThresholdM: number;
  sensorComponents: string[];
  significance: string;
  lastPing: string;
}

export interface OperationalSensorNode {
  id: string;
  name: string;
  sensorType: 'Radar Cuaca Doppler' | 'AWS (Automatic Weather Station)' | 'GNSS Geodetik' | 'Tide Gauge' | 'Akselerometer InaTEWS';
  provider: 'BMKG' | 'BIG' | 'PVMBG' | 'BRIN' | 'Komunitas';
  lat: number;
  lng: number;
  altitudeM: number;
  status: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';
  samplingIntervalSec: number;
  measurementTypes: string[];
  installationYear: number;
  lastCalibration: string;
}

export const INDONESIA_CRS_REGISTRY: CrsDefinition[] = [
  {
    epsgCode: 'EPSG:4326',
    name: 'WGS 84 (World Geodetic System 1984)',
    type: 'Geographic (GCS)',
    datum: 'World Geodetic System 1984',
    unit: 'Derajat Desimal (Lat/Lng)',
    indonesiaUsage: 'Standar navigasi GPS global, portal Satu Data Indonesia & pertukaran GeoJSON.',
  },
  {
    epsgCode: 'EPSG:3857',
    name: 'WGS 84 / Pseudo-Mercator (Web Mercator)',
    type: 'Projected (PCS)',
    datum: 'WGS 84',
    unit: 'Meter (Easting/Northing)',
    indonesiaUsage: 'Tampilan visual ubin peta WebGIS interaktif (OpenLayers, Leaflet, Mapbox).',
  },
  {
    epsgCode: 'EPSG:32748',
    name: 'WGS 84 / UTM Zone 48S',
    type: 'Projected (PCS)',
    datum: 'WGS 84',
    unit: 'Meter',
    indonesiaUsage: 'Pemetaan kadaster & ketelitian tinggi wilayah Jawa Barat, Banten, DKI, dan Lampung.',
  },
  {
    epsgCode: 'EPSG:32749',
    name: 'WGS 84 / UTM Zone 49S',
    type: 'Projected (PCS)',
    datum: 'WGS 84',
    unit: 'Meter',
    indonesiaUsage: 'Pemetaan topografi skala besar wilayah Jawa Tengah, DI Yogyakarta, dan Jawa Timur Barat.',
  },
  {
    epsgCode: 'EPSG:32750',
    name: 'WGS 84 / UTM Zone 50S',
    type: 'Projected (PCS)',
    datum: 'WGS 84',
    unit: 'Meter',
    indonesiaUsage: 'Pemetaan ketelitian tinggi Jawa Timur Timur, Surabaya, Madura, Bali, dan Lombok.',
  },
];

export const CORE_SENSOR_NETWORK: OperationalSensorNode[] = [
  {
    id: 'rad_sub',
    name: 'Radar Cuaca Doppler Juanda (SUB)',
    sensorType: 'Radar Cuaca Doppler',
    provider: 'BMKG',
    lat: -7.379,
    lng: 112.787,
    altitudeM: 12,
    status: 'ONLINE',
    samplingIntervalSec: 300,
    measurementTypes: ['Reflektivitas dBZ', 'Kecepatan Radial Doppler', 'Estimasi Curah Hujan QPE'],
    installationYear: 2018,
    lastCalibration: '2025-11-10',
  },
  {
    id: 'rad_cgk',
    name: 'Radar Cuaca C-Band Soekarno-Hatta (CGK)',
    sensorType: 'Radar Cuaca Doppler',
    provider: 'BMKG',
    lat: -6.125,
    lng: 106.655,
    altitudeM: 10,
    status: 'ONLINE',
    samplingIntervalSec: 300,
    measurementTypes: ['Reflektivitas dBZ', 'Hydrometeor Classification', 'Turbulensi Awan'],
    installationYear: 2015,
    lastCalibration: '2026-01-15',
  },
  {
    id: 'aws_sby_tanjungperak',
    name: 'AWS Maritim Tanjung Perak Surabaya',
    sensorType: 'AWS (Automatic Weather Station)',
    provider: 'BMKG',
    lat: -7.202,
    lng: 112.732,
    altitudeM: 4,
    status: 'ONLINE',
    samplingIntervalSec: 60,
    measurementTypes: ['Suhu Udara', 'Kelembapan Relatif', 'Tekanan Barometrik', 'Arah & Kecepatan Angin'],
    installationYear: 2021,
    lastCalibration: '2026-02-20',
  },
  {
    id: 'gnss_big_csby',
    name: 'Stasiun CORS GNSS Geodetik CSBY (Surabaya)',
    sensorType: 'GNSS Geodetik',
    provider: 'BIG',
    lat: -7.282,
    lng: 112.794,
    altitudeM: 28,
    status: 'ONLINE',
    samplingIntervalSec: 1,
    measurementTypes: ['Koordinat Deformasi Kerak Bumi (X,Y,Z)', 'Kandungan Uap Air Troposfer PWV'],
    installationYear: 2016,
    lastCalibration: '2025-08-14',
  },
  {
    id: 'seismo_inatews_tji',
    name: 'Sensor Seismometer InaTEWS Tretes (TJI)',
    sensorType: 'Akselerometer InaTEWS',
    provider: 'BMKG',
    lat: -7.702,
    lng: 112.628,
    altitudeM: 840,
    status: 'ONLINE',
    samplingIntervalSec: 0.01, // 100 Hz
    measurementTypes: ['Percepatan Tanah 3-Komponen (PGA)', 'Gelombang P-Wave & S-Wave'],
    installationYear: 2020,
    lastCalibration: '2025-12-05',
  },
  {
    id: 'tide_perak_big',
    name: 'Stasiun Pasang Surut Pelabuhan Perak',
    sensorType: 'Tide Gauge',
    provider: 'BIG',
    lat: -7.195,
    lng: 112.738,
    altitudeM: 1,
    status: 'ONLINE',
    samplingIntervalSec: 60,
    measurementTypes: ['Ketinggian Muka Air Laut Realtime', 'Anomali Gelombang Pasang'],
    installationYear: 2019,
    lastCalibration: '2026-03-01',
  },
];

export const MASTER_METADATA_CATALOG: DatasetMetadataEntry[] = [
  {
    datasetId: 'ds_himawari9_ir',
    name: 'Citra Satelit Geostasioner Himawari-9 IR Enhanced',
    description: 'Data suhu puncak awan inframerah resolusi 4 km melintasi seluruh benua maritim Indonesia setiap 10 menit.',
    agency: 'BMKG / JMA',
    provider: 'Badan Meteorologi, Klimatologi, dan Geofisika & Japan Meteorological Agency',
    publicationTime: '2026-09-17T03:00:00Z',
    lastUpdated: '2026-09-17T03:10:00Z',
    spatialResolution: '4 km x 4 km',
    temporalResolution: '10 menit',
    crs: 'EPSG:4326',
    geometryType: 'RASTER_GRID',
    format: 'GeoTIFF',
    qualityScore: 96,
    license: 'Data Terbuka BMKG untuk Keselamatan Publik',
    lineage: [
      'Akuisisi radiometer AHI Himawari-9 kanal Band 13 (10.4 µm)',
      'Kalibrasi temperatur kecerahan (Brightness Temperature)',
      'Koreksi geometri & re-proyeksi ke WGS84 khatulistiwa',
      'Masking daratan & overlay pewarnaan gradien BMKG',
    ],
  },
  {
    datasetId: 'ds_demnas_big',
    name: 'DEMNAS (Digital Elevation Model Nasional)',
    description: 'Model elevasi medan digital nasional resolusi tinggi 0.27-arcsecond (sekitar 8 meter) menggabungkan IFSAR, TerrSAR-X, dan ALOS PALSAR.',
    agency: 'BIG',
    provider: 'Badan Informasi Geospasial',
    publicationTime: '2020-01-01T00:00:00Z',
    lastUpdated: '2024-06-15T00:00:00Z',
    spatialResolution: '8.1 meter',
    temporalResolution: 'Statik (Diperbarui berkala)',
    crs: 'EPSG:4326 (Vertikal: EGM2008)',
    geometryType: 'RASTER_GRID',
    format: 'GeoTIFF',
    qualityScore: 98,
    license: 'Kebijakan Satu Peta (KSP) - Geoportal Kebangsaan BIG',
    lineage: [
      'Akuisisi data IFSAR airborne dan satelit radar SAR',
      'Pembersihan vegetasi dan bangunan (DTM extraction)',
      'Penyesuaian undulasi geoid nasional EGM2008',
      'Mosaicking mulus 38 provinsi Indonesia',
    ],
  },
  {
    datasetId: 'ds_ecmwf_ifs',
    name: 'ECMWF IFS High-Resolution Atmospheric Forecast',
    description: 'Model prediksi cuaca numerik global resolusi 0.25 derajat (~28 km) dengan asimilasi 90 instrumen satelit dunia.',
    agency: 'ECMWF',
    provider: 'European Centre for Medium-Range Weather Forecasts',
    publicationTime: '2026-09-17T00:00:00Z',
    lastUpdated: '2026-09-17T03:00:00Z',
    spatialResolution: '0.25° x 0.25° (~28 km)',
    temporalResolution: '1 Jam',
    crs: 'EPSG:4326',
    geometryType: 'RASTER_GRID',
    format: 'NetCDF',
    qualityScore: 94,
    license: 'WMO Open Data Policy / Copernicus Open Access',
    lineage: [
      '4D-Var Data Assimilation dengan observasi permukaan, kapal, pesawat, dan satelit',
      'Penyelesaian 7 persamaan dasar hidrodinamika atmosfer Bjerknes-Richardson',
      'Downscaling lokal Harmony dengan koreksi DEM topografi Indonesia',
    ],
  },
  {
    datasetId: 'ds_sentinel2_l2a',
    name: 'Copernicus Sentinel-2 Surface Reflectance (L2A)',
    description: 'Citra multispektral optik 13 kanal dengan resolusi spasial 10m - 20m untuk ekstraksi indeks NDVI, NDWI, dan tutupan lahan.',
    agency: 'ESA / Copernicus',
    provider: 'European Space Agency & BRIN Indonesia Ground Station',
    publicationTime: '2026-09-15T02:40:00Z',
    lastUpdated: '2026-09-16T12:00:00Z',
    spatialResolution: '10 meter',
    temporalResolution: '5 hari revisit',
    crs: 'EPSG:32749 (UTM 49S)',
    geometryType: 'RASTER_GRID',
    format: 'GeoTIFF',
    qualityScore: 95,
    license: 'CC-BY-4.0 Copernicus Data',
    lineage: [
      'Koreksi radiometrik sensor MSI (Multi-Spectral Instrument)',
      'Koreksi atmosfer Sen2Cor bottom-of-atmosphere (BOA)',
      'Ekstraksi cloud mask & cloud shadow mask',
      'Kalkulasi spectral indices NDVI, NDWI, dan NDBI',
    ],
  },
];

class SpatialDataEngine {
  public convertDecimalToDms(val: number, isLatitude: boolean): string {
    const dir = isLatitude ? (val >= 0 ? 'LU' : 'LS') : (val >= 0 ? 'BT' : 'BB');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}° ${min}' ${sec}" ${dir}`;
  }

  public getUtmZoneInfo(lat: number, lng: number): { zone: string; epsg: string; eastingM: number; northingM: number } {
    const zoneNum = Math.floor((lng + 180) / 6) + 1;
    const isSouth = lat < 0;
    const band = isSouth ? 'S' : 'N';
    const zoneStr = `${zoneNum}${band}`;

    // Simplified projection estimation for coordinate display
    const lon0 = (zoneNum - 1) * 6 - 180 + 3;
    const dLon = ((lng - lon0) * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const approxEasting = Math.round(500000 + 6378137 * dLon * Math.cos(latRad));
    const approxNorthing = Math.round(isSouth ? 10000000 + 6378137 * latRad : 6378137 * latRad);

    const epsg = isSouth ? `EPSG:${32700 + zoneNum}` : `EPSG:${32600 + zoneNum}`;

    return {
      zone: `UTM Zone ${zoneStr}`,
      epsg,
      eastingM: approxEasting,
      northingM: approxNorthing,
    };
  }

  public inspectFeatureAt(lat: number, lng: number, placeName: string, elevationM: number): SpatialFeatureAttribute {
    const dmsLat = this.convertDecimalToDms(lat, true);
    const dmsLng = this.convertDecimalToDms(lng, false);
    const utm = this.getUtmZoneInfo(lat, lng);

    return {
      id: `FEAT-${Math.abs(Math.round(lat * 1000))}-${Math.abs(Math.round(lng * 1000))}`,
      name: placeName,
      geometryType: 'POINT',
      category: 'administrative',
      coordinates: { lat, lng },
      attributes: {
        'Nama Wilayah': placeName,
        'Koordinat Geografis (WGS84)': `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        'Format Derajat Menit Detik (DMS)': `${dmsLat}, ${dmsLng}`,
        'Proyeksi UTM': `${utm.zone} (${utm.epsg})`,
        'Koordinat UTM (X, Y)': `X: ${utm.eastingM.toLocaleString()} m, Y: ${utm.northingM.toLocaleString()} m`,
        'Elevasi Medan (DEMNAS)': `${elevationM} mdpl`,
        'Morfologi Medan': elevationM > 500 ? 'Perbukitan Tinggi' : elevationM > 100 ? 'Dataran Bergelombang' : 'Dataran Rendah / Aluvium Pantai',
        'Jarak ke Garis Pantai Terdekat': lat < -7.0 && lat > -7.4 && lng > 112.6 ? '2.4 km (Selat Madura)' : '18.5 km',
        'Stasiun Sensor Terdekat': lat < -7.0 && lat > -7.4 ? 'Radar Cuaca SUB Juanda (~12 km)' : 'Stasiun Meteorologi Regional',
      },
      provenance: {
        agency: 'Badan Informasi Geospasial (BIG) & BMKG',
        source: 'Satu Peta Geospasial Terpadu Harmony',
        acquisitionTime: new Date().toISOString(),
        crs: `${utm.epsg} / EPSG:4326`,
        qualityRating: 'A (Terverifikasi)',
      },
    };
  }

  public getTsunamiSensors(): TsunamiSensorNode[] {
    return TSUNAMI_EARTH_SENSOR_NETWORK;
  }
}

export const TSUNAMI_EARTH_SENSOR_NETWORK: TsunamiSensorNode[] = [
  // 1. JAPAN S-NET (Off-Tohoku, Hokkaido, Sanriku & Japan Trench Megathrust)
  {
    id: 'snet_s3n01',
    name: 'S-net Observatorium Dasar Laut S3N01',
    code: 'S-net S3N01 (Miyagi Central)',
    sensorType: 'S-net Ocean Bottom Observatory',
    network: 'NIED / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 38.35,
    lng: 143.48,
    depthM: 5200,
    seaArea: 'Palung Jepang Tengah (Episentrum Tohoku 2011)',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 52.4,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Broadband Ocean-Bottom Seismometer', 'Quartz Water Pressure Gauge (Tsunameter)', 'Fiber Optic Telemetry Node'],
    significance: 'Stasiun observasi kabel serat optik bawah laut paling sensitif di Palung Jepang untuk deteksi dini tsunami pesisir Sendai dan Miyagi.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'snet_s1n01',
    name: 'S-net Observatorium Dasar Laut S1N01',
    code: 'S-net S1N01 (Off Kushiro)',
    sensorType: 'S-net Ocean Bottom Observatory',
    network: 'NIED / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 42.15,
    lng: 145.32,
    depthM: 2420,
    seaArea: 'Palung Kuril - Samudra Pasifik Hokkaido',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 24.3,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Quartz Bourdon Pressure Sensor', 'Tri-axial Accelerometer'],
    significance: 'Pemantauan zona subduksi lempeng Pasifik di pesisir utara Hokkaido Jepang.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'snet_s2n01',
    name: 'S-net Observatorium Dasar Laut S2N01',
    code: 'S-net S2N01 (Off Sanriku North)',
    sensorType: 'S-net Ocean Bottom Observatory',
    network: 'NIED / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 40.22,
    lng: 143.85,
    depthM: 4150,
    seaArea: 'Palung Jepang Utara (Off Sanriku)',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 41.8,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Ocean Floor Pressure Transducer', 'Optical Fiber Submarine Repeater'],
    significance: 'Deteksi gelombang pasang tinggi dan gempa dangkal zona subduksi Sanriku.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'snet_s4n01',
    name: 'S-net Observatorium Dasar Laut S4N01',
    code: 'S-net S4N01 (Off Fukushima)',
    sensorType: 'S-net Ocean Bottom Observatory',
    network: 'NIED / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 37.12,
    lng: 142.92,
    depthM: 3650,
    seaArea: 'Zona Megathrust Samudra Pasifik Fukushima',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 36.7,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Bottom Pressure Sensor', 'Seismic Sensor', 'Continuously Powered Seafloor Cable'],
    significance: 'Proteksi infrastruktur pesisir dan sistem peringatan dini tsunami prefektur Fukushima.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'snet_s5n01',
    name: 'S-net Observatorium Dasar Laut S5N01',
    code: 'S-net S5N01 (Off Boso / Tokyo)',
    sensorType: 'S-net Ocean Bottom Observatory',
    network: 'NIED / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 35.85,
    lng: 142.15,
    depthM: 2890,
    seaArea: 'Semenanjung Boso & Celah Teluk Tokyo',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 29.1,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Deep Sea Seismometer', 'Paroscientific Quartz Gauge'],
    significance: 'Pintu gerbang peringatan tsunami tercepat untuk wilayah metropolitan Tokyo (Kanto).',
    lastPing: 'Real-time (Stream 100Hz)',
  },

  // 2. JAPAN DONET (Nankai Trough Megathrust Cable Network)
  {
    id: 'donet_kma01',
    name: 'DONET1 Simpul Bawah Laut KMA01',
    code: 'DONET1-KMA01 (Kumano Basin)',
    sensorType: 'DONET Seafloor Cable Node',
    network: 'JAMSTEC / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 33.98,
    lng: 136.65,
    depthM: 1930,
    seaArea: 'Palung Nankai Timur (Kumano-nada)',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 19.4,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['High-precision Quartz Pressure Sensor', 'Strong-Motion Accelerometer', 'Differential Pressure Gauge'],
    significance: 'Sistem observasi dasar laut padat untuk mendeteksi pergerakan lambat (slow slip event) dan tsunami Palung Nankai.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'donet_kmc01',
    name: 'DONET1 Observatorium Palung Dalam KMC01',
    code: 'DONET1-KMC01 (Kumano Deep)',
    sensorType: 'DONET Seafloor Cable Node',
    network: 'JAMSTEC / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 33.72,
    lng: 136.85,
    depthM: 2540,
    seaArea: 'Zona Subduksi Lempeng Laut Filipina',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 25.6,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Broadband Seismograph', 'Absolute Pressure Gauge'],
    significance: 'Stasiun dasar laut terluar di Palung Nankai, mampu memberikan peringatan tsunami 10-15 menit lebih awal ke daratan.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'donet_mra01',
    name: 'DONET2 Simpul Palung Nankai Barat MRA01',
    code: 'DONET2-MRA01 (Cape Muroto)',
    sensorType: 'DONET Seafloor Cable Node',
    network: 'JAMSTEC / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 32.85,
    lng: 134.45,
    depthM: 3250,
    seaArea: 'Palung Nankai Barat (Tanjung Muroto / Shikoku)',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 32.8,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Ocean Bottom Tsunameter', 'Seismic Node', 'Acoustic Transceiver'],
    significance: 'Pengamatan terfokus pada episentrum gempa megathrust Nankai periode historis Tokaido-Nankaido.',
    lastPing: 'Real-time (Stream 100Hz)',
  },
  {
    id: 'donet_mre01',
    name: 'DONET2 Stasiun Teluk Tosa MRE01',
    code: 'DONET2-MRE01 (Tosa Bay)',
    sensorType: 'DONET Seafloor Cable Node',
    network: 'JAMSTEC / JMA (Jepang)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 33.15,
    lng: 134.02,
    depthM: 1480,
    seaArea: 'Teluk Tosa / Kochi',
    status: 'ONLINE',
    samplingRateHz: 100,
    waterPressureMpa: 14.9,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Hydrostatic Pressure Sensor', 'Temperature Probe'],
    significance: 'Verifikasi propagasi gelombang laut sekunder di cekungan perairan Kochi.',
    lastPing: 'Real-time (Stream 100Hz)',
  },

  // 3. NOAA DART (Deep-ocean Assessment and Reporting of Tsunamis - Global Network)
  {
    id: 'dart_21418',
    name: 'Pelampung Tsunami NOAA DART II Stasiun 21418',
    code: 'DART 21418 (Honshu Trench Outer)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 38.71,
    lng: 148.69,
    depthM: 5500,
    seaArea: 'Samudra Pasifik Barat Laut (Lepas Pantai Honshu)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 55.2,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['BPR (Bottom Pressure Recorder)', 'Surface Moored Telemetry Buoy', 'Iridium Satellite Transceiver'],
    significance: 'Mendeteksi gelombang tsunami Pasifik trans-samudra yang bergerak dari Jepang menuju Hawaii dan pantai barat AS.',
    lastPing: '15 detik yang lalu',
  },
  {
    id: 'dart_21414',
    name: 'Pelampung Tsunami NOAA DART Stasiun 21414',
    code: 'DART 21414 (Kamchatka Subduction)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 48.87,
    lng: 162.51,
    depthM: 5120,
    seaArea: 'Palung Kuril-Kamchatka Utara',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 51.5,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['BPR Quartz Acoustic Sensor', 'Acoustic Modem'],
    significance: 'Memantau zona subduksi Kamchatka dengan potensi gempa berkekuatan M8.5+.',
    lastPing: '30 detik yang lalu',
  },
  {
    id: 'dart_52402',
    name: 'Pelampung Tsunami NOAA DART Stasiun 52402',
    code: 'DART 52402 (Micronesia / Palau Basin)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 11.88,
    lng: 153.98,
    depthM: 4800,
    seaArea: 'Samudra Pasifik Barat Tropis',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 48.2,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['Bottom Pressure Recorder', 'Satellite Buoy'],
    significance: 'Mendeteksi tsunami yang melintasi kepulauan Pasifik Barat menuju wilayah Indonesia Timur.',
    lastPing: '1 menit yang lalu',
  },
  {
    id: 'dart_46404',
    name: 'Pelampung Tsunami NOAA DART Stasiun 46404',
    code: 'DART 46404 (Cascadia Subduction Zone)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 45.86,
    lng: -128.77,
    depthM: 2750,
    seaArea: 'Samudra Pasifik Timur (Lepas Pantai Oregon/Washington)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 27.8,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['Acoustic Coupled BPR', 'Solar Buoy Controller'],
    significance: 'Sistem pertahanan dini utama untuk patahan megathrust Cascadia di Pasifik Barat Laut AS.',
    lastPing: '20 detik yang lalu',
  },
  {
    id: 'dart_46409',
    name: 'Pelampung Tsunami NOAA DART Stasiun 46409',
    code: 'DART 46409 (Aleutian Trench)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 55.30,
    lng: -165.32,
    depthM: 4200,
    seaArea: 'Palung Aleut - Laut Bering Alaska',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 42.4,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['Pressure Recorder', 'Heavy Weather Oceanic Buoy'],
    significance: 'Peringatan dini tsunami Pasifik Utara dari cincin api Alaska.',
    lastPing: '45 detik yang lalu',
  },
  {
    id: 'dart_32411',
    name: 'Pelampung Tsunami NOAA DART Stasiun 32411',
    code: 'DART 32411 (Peru-Chile Trench)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Chile',
    flag: '🇨🇱',
    lat: -17.98,
    lng: -74.92,
    depthM: 4900,
    seaArea: 'Palung Peru-Chile (Subduksi Lempeng Nazca)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 49.3,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['Deep Ocean Tsunameter', 'Direct Satellite Uplink'],
    significance: 'Memantau zona kegempaan dahsyat pantai barat Amerika Selatan.',
    lastPing: '1 menit yang lalu',
  },
  {
    id: 'dart_56003',
    name: 'Pelampung Tsunami NOAA-BMKG DART Stasiun 56003',
    code: 'DART 56003 (South Java Trench)',
    sensorType: 'DART Tsunami Buoy',
    network: 'NOAA NDBC (Global)',
    country: 'Internasional',
    flag: '🌐',
    lat: -10.50,
    lng: 104.20,
    depthM: 5600,
    seaArea: 'Samudra Hindia Timur (Selatan Selat Sunda & Jawa Barat)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 56.4,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.03,
    sensorComponents: ['Bottom Pressure Gauge', 'Mooring Chain & Anchor', 'Satellite Buoy'],
    significance: 'Mendeteksi perambatan gelombang tsunami dari zona megathrust selatan Jawa dan Sumatra ke arah Australia & Samudra Hindia.',
    lastPing: '30 detik yang lalu',
  },

  // 4. INDONESIA INATEWS (InaBuoy, InaCBT & Stasiun Pasang Surut BIG/BMKG)
  {
    id: 'inabuoy_01',
    name: 'InaBuoy BPPT/BRIN Tsunami Buoy 01',
    code: 'InaBuoy-01 (Barat Mentawai)',
    sensorType: 'InaBuoy Tsunami Detector',
    network: 'BRIN / BPPT (InaBuoy)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -1.25,
    lng: 98.45,
    depthM: 3200,
    seaArea: 'Samudra Hindia (Lepas Pantai Barat Kep. Mentawai)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 32.2,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['OBU (Ocean Bottom Unit)', 'Acoustic Modem', 'Surface Buoy GPS & Inmarsat'],
    significance: 'Sistem peringatan tsunami garis depan menghadapi zona Megathrust Siberut-Mentawai.',
    lastPing: '2 menit yang lalu',
  },
  {
    id: 'inabuoy_02',
    name: 'InaBuoy BPPT/BRIN Tsunami Buoy 02',
    code: 'InaBuoy-02 (Selat Sunda)',
    sensorType: 'InaBuoy Tsunami Detector',
    network: 'BRIN / BPPT (InaBuoy)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -6.20,
    lng: 105.02,
    depthM: 1450,
    seaArea: 'Pintu Masuk Selat Sunda (Dekat Kompleks Gunung Anak Krakatau)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 14.6,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Underwater Pressure Gauge', 'Real-time Radio Transmitter', 'Solar Power Array'],
    significance: 'Deteksi cepat tsunami non-seismik akibat longsor lereng gunung berapi bawah laut Krakatau.',
    lastPing: '1 menit yang lalu',
  },
  {
    id: 'inabuoy_03',
    name: 'InaBuoy BPPT/BRIN Tsunami Buoy 03',
    code: 'InaBuoy-03 (Selatan Jawa Timur)',
    sensorType: 'InaBuoy Tsunami Detector',
    network: 'BRIN / BPPT (InaBuoy)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -9.15,
    lng: 112.80,
    depthM: 4100,
    seaArea: 'Samudra Hindia (Selatan Malang & Lumajang)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 41.3,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['High-accuracy BPR', 'Surface Buoy Transmitter'],
    significance: 'Pemantauan zona subduksi lempeng Indo-Australia di bawah lempeng Eurasia di selatan Jawa Timur.',
    lastPing: '3 menit yang lalu',
  },
  {
    id: 'inacbt_01',
    name: 'InaCBT Kabel Bawah Laut Labuan Bajo - Rinca',
    code: 'InaCBT-01 (Laut Flores)',
    sensorType: 'InaCBT Cable Tsunameter',
    network: 'BMKG / BIG (InaTEWS)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -8.55,
    lng: 119.85,
    depthM: 1200,
    seaArea: 'Cekungan Laut Flores & Selat Sape',
    status: 'ONLINE',
    samplingRateHz: 10,
    waterPressureMpa: 12.1,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Submarine Fiber-Optic Cable', 'Piezo-electric Pressure Sensor', 'Seafloor Hydrophone'],
    significance: 'Sensor tsunami kabel bawah laut pertama Indonesia, tahan cuaca ekstrem dan bebas risiko vandalisme.',
    lastPing: 'Real-time (Stream Kabel)',
  },
  {
    id: 'inacbt_02',
    name: 'InaCBT Kabel Bawah Laut Teluk Palu - Donggala',
    code: 'InaCBT-02 (Selat Makassar / Palu)',
    sensorType: 'InaCBT Cable Tsunameter',
    network: 'BMKG / BIG (InaTEWS)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -0.75,
    lng: 119.78,
    depthM: 950,
    seaArea: 'Teluk Palu - Sesar Palu-Koro',
    status: 'ONLINE',
    samplingRateHz: 10,
    waterPressureMpa: 9.6,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.05,
    sensorComponents: ['Submarine Optical Cable', 'Bottom Pressure Sensor Node'],
    significance: 'Dipasang pasca-gempa dan tsunami Palu 2018 untuk mendeteksi tsunami teluk dalam hitungan 60-90 detik.',
    lastPing: 'Real-time (Stream Kabel)',
  },
  {
    id: 'tg_sabang',
    name: 'Stasiun Pasang Surut Tide Gauge Sabang',
    code: 'TG-Sabang (BIG / InaTEWS)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'BMKG / BIG (InaTEWS)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: 5.88,
    lng: 95.32,
    depthM: 12,
    seaArea: 'Samudra Hindia / Laut Andaman (Ujung Barat RI)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.12,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Radar Water Level Sensor', 'Pressure Sensor Bubble Gauge', 'Telemetry GPRS/Sat'],
    significance: 'Deteksi pertama gelombang tsunami yang melintas dari arah patahan Andaman-Nicobar.',
    lastPing: '10 detik yang lalu',
  },
  {
    id: 'tg_padang',
    name: 'Stasiun Pasang Surut Pelabuhan Teluk Bayur',
    code: 'TG-Padang (Teluk Bayur)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'BMKG / BIG (InaTEWS)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -0.99,
    lng: 100.37,
    depthM: 15,
    seaArea: 'Pesisir Barat Sumatra Barat',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.15,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Acoustic Level Gauge', 'Float-well Gauge', 'Backup Solar Battery'],
    significance: 'Pencatatan real-time ketinggian permukaan laut di pelabuhan utama Sumatra Barat.',
    lastPing: '20 detik yang lalu',
  },
  {
    id: 'tg_benoa',
    name: 'Stasiun Pasang Surut Pelabuhan Benoa Bali',
    code: 'TG-Benoa (Bali)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'BMKG / BIG (InaTEWS)',
    country: 'Indonesia',
    flag: '🇮🇩',
    lat: -8.75,
    lng: 115.21,
    depthM: 9,
    seaArea: 'Selat Badung / Pesisir Selatan Bali',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.09,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Radar Sensor Vegapuls', 'Encoder', 'Telemetry'],
    significance: 'Monitoring muka air laut untuk pariwisata maritim dan mitigasi tsunami Bali Selatan.',
    lastPing: '15 detik yang lalu',
  },

  // 5. IOC UNESCO GLOBAL SEA LEVEL STATION MONITORING FACILITY
  {
    id: 'ioc_miyako',
    name: 'Stasiun Pasang Surut Pesisir Miyako (JMA/IOC)',
    code: 'IOC-Miyako (Iwate, Jepang)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'IOC UNESCO (Global)',
    country: 'Jepang',
    flag: '🇯🇵',
    lat: 39.64,
    lng: 141.97,
    depthM: 7,
    seaArea: 'Pesisir Pantai Sanriku (Prefektur Iwate)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.07,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Ultrasonic Tide Gauge', 'Hydraulic Pressure Transducer'],
    significance: 'Stasiun pantai legendaris pencatat puncak limpasan tsunami Sanriku & gempa Tohoku.',
    lastPing: '12 detik yang lalu',
  },
  {
    id: 'ioc_honolulu',
    name: 'Stasiun Pasang Surut Pelabuhan Honolulu (NOAA/IOC)',
    code: 'IOC-Honolulu (Hawaii)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'IOC UNESCO (Global)',
    country: 'Amerika Serikat',
    flag: '🇺🇸',
    lat: 21.31,
    lng: -157.87,
    depthM: 10,
    seaArea: 'Samudra Pasifik Tengah (Kepulauan Hawaii)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.10,
    seaLevelAnomalyM: 0.01,
    tsunamiThresholdM: 0.08,
    sensorComponents: ['Acoustic Sounding Tube', 'Pressure Gauge', 'PTWC Center Link'],
    significance: 'Stasiun acuan Pacific Tsunami Warning Center (PTWC) di jantung Samudra Pasifik.',
    lastPing: '25 detik yang lalu',
  },
  {
    id: 'ioc_valparaiso',
    name: 'Stasiun Pasang Surut Pelabuhan Valparaiso',
    code: 'IOC-Valparaiso (SHOA Chile)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'IOC UNESCO (Global)',
    country: 'Chile',
    flag: '🇨🇱',
    lat: -33.03,
    lng: -71.63,
    depthM: 14,
    seaArea: 'Pesisir Samudra Pasifik Selatan Chile',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.14,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Digital Tide Gauge', 'Direct Inmarsat Link'],
    significance: 'Pusat pantauan tsunami Samudra Pasifik Tenggara yang dikelola oleh Angkatan Laut Chile (SHOA).',
    lastPing: '30 detik yang lalu',
  },
  {
    id: 'ioc_tonga',
    name: 'Stasiun Pasang Surut Pelabuhan Nuku\'alofa',
    code: 'IOC-Nuku\'alofa (Tonga)',
    sensorType: 'IOC Coastal Tide Gauge',
    network: 'IOC UNESCO (Global)',
    country: 'Internasional',
    flag: '🌐',
    lat: -21.13,
    lng: -175.18,
    depthM: 8,
    seaArea: 'Cekungan Pasifik Barat Daya (Dekat Kaldera Hunga Tonga)',
    status: 'ONLINE',
    samplingRateHz: 1,
    waterPressureMpa: 0.08,
    seaLevelAnomalyM: 0.02,
    tsunamiThresholdM: 0.10,
    sensorComponents: ['Radar Sea Level Sensor', 'Barometric Pressure Compensator'],
    significance: 'Stasiun yang mencatat lonjakan gelombang atmosfer dan tsunami global letusan Hunga Tonga 2022.',
    lastPing: '40 detik yang lalu',
  },
];

export const spatialDataEngine = new SpatialDataEngine();
