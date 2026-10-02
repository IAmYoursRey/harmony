import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

export interface CRSDefinition {
  epsgCode: string;
  name: string;
  proj4def: string;
  type: 'GEOGRAPHIC' | 'PROJECTED';
  indonesiaUsage: string;
  datum: string;
  units: 'degrees' | 'm';
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

const INDONESIA_CRS_DEFINITIONS: CRSDefinition[] = [
  {
    epsgCode: 'EPSG:4326',
    name: 'WGS 84 (Geodetic Longitude / Latitude)',
    proj4def: '+proj=longlat +datum=WGS84 +no_defs',
    type: 'GEOGRAPHIC',
    indonesiaUsage: 'Standar GPS global, pertukaran data GeoJSON, BMKG, dan sensor nasional',
    datum: 'World Geodetic System 1984',
    units: 'degrees',
    bounds: [-180, -90, 180, 90],
  },
  {
    epsgCode: 'EPSG:3857',
    name: 'WGS 84 / Pseudo-Mercator (Web Mercator)',
    proj4def: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Tile basemap web (OpenStreetMap, Esri, Google Maps, Bing)',
    datum: 'WGS 84 (Spherical)',
    units: 'm',
    bounds: [-180, -85.06, 180, 85.06],
  },
  // Indonesia Southern UTM Zones (WGS 84 / UTM zone 46S - 54S)
  {
    epsgCode: 'EPSG:32746',
    name: 'WGS 84 / UTM zone 46S',
    proj4def: '+proj=utm +zone=46 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Sumatera Bagian Barat (Simeulue, Nias, Mentawai Barat)',
    datum: 'WGS 84',
    units: 'm',
    bounds: [90, -80, 96, 0],
  },
  {
    epsgCode: 'EPSG:32747',
    name: 'WGS 84 / UTM zone 47S',
    proj4def: '+proj=utm +zone=47 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Sumatera Tengah & Selatan (Sumbar, Bengkulu, Lampung Barat)',
    datum: 'WGS 84',
    units: 'm',
    bounds: [96, -80, 102, 0],
  },
  {
    epsgCode: 'EPSG:32748',
    name: 'WGS 84 / UTM zone 48S',
    proj4def: '+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Jawa Barat, Banten, DKI Jakarta, Lampung Timur, Palembang',
    datum: 'WGS 84',
    units: 'm',
    bounds: [102, -80, 108, 0],
  },
  {
    epsgCode: 'EPSG:32749',
    name: 'WGS 84 / UTM zone 49S',
    proj4def: '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Jawa Tengah, DI Yogyakarta, Jawa Timur Barat, Kalimantan Tengah',
    datum: 'WGS 84',
    units: 'm',
    bounds: [108, -80, 114, 0],
  },
  {
    epsgCode: 'EPSG:32750',
    name: 'WGS 84 / UTM zone 50S',
    proj4def: '+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Jawa Timur Timur, Madura, Bali, Lombok, Kalimantan Timur',
    datum: 'WGS 84',
    units: 'm',
    bounds: [114, -80, 120, 0],
  },
  {
    epsgCode: 'EPSG:32751',
    name: 'WGS 84 / UTM zone 51S',
    proj4def: '+proj=utm +zone=51 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Sumbawa, Flores, Sumba, Sulawesi Selatan, Sulawesi Tenggara',
    datum: 'WGS 84',
    units: 'm',
    bounds: [120, -80, 126, 0],
  },
  {
    epsgCode: 'EPSG:32752',
    name: 'WGS 84 / UTM zone 52S',
    proj4def: '+proj=utm +zone=52 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Timor, Rote, Alor, Maluku Tenggara, Kepulauan Aru',
    datum: 'WGS 84',
    units: 'm',
    bounds: [126, -80, 132, 0],
  },
  {
    epsgCode: 'EPSG:32753',
    name: 'WGS 84 / UTM zone 53S',
    proj4def: '+proj=utm +zone=53 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Papua Barat, Fakfak, Kaimana, Mimika',
    datum: 'WGS 84',
    units: 'm',
    bounds: [132, -80, 138, 0],
  },
  {
    epsgCode: 'EPSG:32754',
    name: 'WGS 84 / UTM zone 54S',
    proj4def: '+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Papua Bagian Timur, Merauke, Jayawijaya, Asmat',
    datum: 'WGS 84',
    units: 'm',
    bounds: [138, -80, 144, 0],
  },
  // Indonesia Northern UTM Zones (UTM zone 46N - 52N)
  {
    epsgCode: 'EPSG:32646',
    name: 'WGS 84 / UTM zone 46N',
    proj4def: '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Aceh Bagian Barat & Sabang',
    datum: 'WGS 84',
    units: 'm',
    bounds: [90, 0, 96, 84],
  },
  {
    epsgCode: 'EPSG:32647',
    name: 'WGS 84 / UTM zone 47N',
    proj4def: '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Sumatera Utara, Riau Utara, Selat Malaka',
    datum: 'WGS 84',
    units: 'm',
    bounds: [96, 0, 102, 84],
  },
  {
    epsgCode: 'EPSG:32648',
    name: 'WGS 84 / UTM zone 48N',
    proj4def: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Kepulauan Riau, Natuna, Anambas, Batam',
    datum: 'WGS 84',
    units: 'm',
    bounds: [102, 0, 108, 84],
  },
  {
    epsgCode: 'EPSG:32649',
    name: 'WGS 84 / UTM zone 49N',
    proj4def: '+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Kalimantan Barat Utara & Sarawak Border',
    datum: 'WGS 84',
    units: 'm',
    bounds: [108, 0, 114, 84],
  },
  {
    epsgCode: 'EPSG:32650',
    name: 'WGS 84 / UTM zone 50N',
    proj4def: '+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Kalimantan Utara, Nunukan, Tarakan',
    datum: 'WGS 84',
    units: 'm',
    bounds: [114, 0, 120, 84],
  },
  {
    epsgCode: 'EPSG:32651',
    name: 'WGS 84 / UTM zone 51N',
    proj4def: '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Sulawesi Utara, Gorontalo, Kepulauan Sangihe Talaud',
    datum: 'WGS 84',
    units: 'm',
    bounds: [120, 0, 126, 84],
  },
  {
    epsgCode: 'EPSG:32652',
    name: 'WGS 84 / UTM zone 52N',
    proj4def: '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs',
    type: 'PROJECTED',
    indonesiaUsage: 'Maluku Utara Bagian Utara (Morotai, Halmahera Utara)',
    datum: 'WGS 84',
    units: 'm',
    bounds: [126, 0, 132, 84],
  },
];

class CRSEngine {
  private initialized = false;

  constructor() {
    this.initializeProj4();
  }

  private initializeProj4() {
    if (this.initialized) return;

    INDONESIA_CRS_DEFINITIONS.forEach((def) => {
      proj4.defs(def.epsgCode, def.proj4def);
    });

    try {
      register(proj4);
    } catch {
      // In non-browser/test environments, ol/proj/proj4 register may be a no-op
    }

    this.initialized = true;
  }

  public getSupportedCRSList(): CRSDefinition[] {
    return INDONESIA_CRS_DEFINITIONS;
  }

  public getCRS(epsgCode: string): CRSDefinition | undefined {
    const normalized = epsgCode.toUpperCase().startsWith('EPSG:') ? epsgCode.toUpperCase() : `EPSG:${epsgCode}`;
    return INDONESIA_CRS_DEFINITIONS.find((c) => c.epsgCode === normalized);
  }

  /**
   * Determine authoritative UTM zone for an Indonesian or global coordinate
   */
  public determineUTMZone(lat: number, lng: number): CRSDefinition {
    let normalizedLng = ((lng + 180) % 360) - 180;
    const zoneNumber = Math.floor((normalizedLng + 180) / 6) + 1;
    const isSouth = lat < 0;
    const epsgCode = `EPSG:${isSouth ? 32700 + zoneNumber : 32600 + zoneNumber}`;

    const existing = this.getCRS(epsgCode);
    if (existing) return existing;

    const dynamicDef: CRSDefinition = {
      epsgCode,
      name: `WGS 84 / UTM zone ${zoneNumber}${isSouth ? 'S' : 'N'}`,
      proj4def: `+proj=utm +zone=${zoneNumber} ${isSouth ? '+south ' : ''}+datum=WGS84 +units=m +no_defs`,
      type: 'PROJECTED',
      indonesiaUsage: `UTM Zona ${zoneNumber} (${isSouth ? 'Belahan Selatan' : 'Belahan Utara'})`,
      datum: 'WGS 84',
      units: 'm',
      bounds: [(zoneNumber - 1) * 6 - 180, isSouth ? -80 : 0, zoneNumber * 6 - 180, isSouth ? 0 : 84],
    };

    proj4.defs(epsgCode, dynamicDef.proj4def);
    return dynamicDef;
  }

  /**
   * Authoritative coordinate transformation between registered projections
   */
  public transform(
    coordinates: [number, number],
    fromCRS: string,
    toCRS: string
  ): [number, number] {
    this.initializeProj4();

    const fromNormalized = fromCRS.toUpperCase().startsWith('EPSG:') ? fromCRS.toUpperCase() : `EPSG:${fromCRS}`;
    const toNormalized = toCRS.toUpperCase().startsWith('EPSG:') ? toCRS.toUpperCase() : `EPSG:${toCRS}`;

    if (fromNormalized === toNormalized) return [coordinates[0], coordinates[1]];

    const [x, y] = proj4(fromNormalized, toNormalized, coordinates);
    return [x, y];
  }

  /**
   * Helper to convert WGS84 [lng, lat] to UTM with exact zone metadata
   */
  public toAuthoritativeUTM(
    lng: number,
    lat: number,
    targetZoneCode?: string
  ): { x: number; y: number; utmZone: string; epsgCode: string; crsName: string } {
    const utmCRS = targetZoneCode ? this.getCRS(targetZoneCode) || this.determineUTMZone(lat, lng) : this.determineUTMZone(lat, lng);
    const [x, y] = this.transform([lng, lat], 'EPSG:4326', utmCRS.epsgCode);

    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      utmZone: utmCRS.name,
      epsgCode: utmCRS.epsgCode,
      crsName: utmCRS.name,
    };
  }

  /**
   * Helper to convert WGS84 [lat, lng] to EPSG:3857 (Spherical Mercator)
   */
  public toEPSG3857(lat: number, lng: number): { x: number; y: number } {
    const [x, y] = this.transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Helper to convert EPSG:3857 [x, y] to WGS84 [lng, lat]
   */
  public toEPSG4326(x: number, y: number): { lat: number; lng: number } {
    const [lng, lat] = this.transform([x, y], 'EPSG:3857', 'EPSG:4326');
    return { lat, lng };
  }

  /**
   * Validate coordinate within realistic bounds
   */
  public isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
}

export const crsEngine = new CRSEngine();
