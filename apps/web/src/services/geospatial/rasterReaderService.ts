import pako from 'pako';
import proj4 from 'proj4';

// Register common projected coordinate reference systems
if (typeof proj4.defs === 'function') {
  // WGS 84 / UTM zone 49N (Java / Indonesia region)
  proj4.defs('EPSG:32649', '+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs');
  // WGS 84 / UTM zone 48S & 49S
  proj4.defs('EPSG:32748', '+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs');
  proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs');
  proj4.defs('EPSG:32750', '+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs');
  proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
}

export interface GeoTiffMetadata {
  width: number;
  height: number;
  bitsPerSample: number;
  compression: number;
  predictor?: number;
  isLittleEndian: boolean;
  hasGeoreference: boolean;
  tiepoint: { i: number; j: number; k: number; x: number; y: number; z: number } | null;
  pixelScale: { dx: number; dy: number; dz: number } | null;
  stripOffsets: number[];
  stripByteCounts: number[];
  rowsPerStrip: number;
  isTiled?: boolean;
  tileWidth?: number;
  tileLength?: number;
  tileOffsets?: number[];
  tileByteCounts?: number[];
  tilesAcross?: number;
  tilesDown?: number;
  crs: string | null;
  noDataValue: number | null;
  sampleFormat?: number;
  _blockCache?: Map<string | number, any>;
}

export interface DecodedRasterPixel {
  lat: number;
  lng: number;
  rawDN: number;
  isRawDnValid?: boolean;
  qaPixel?: number;
  isQaValid?: boolean;
  sourceCol?: number;
  sourceRow?: number;
  pixelKey?: string;
}

export function sanitizeAssetUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

const PREVIEW_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function isPreviewAsset(key: string, asset: any): boolean {
  const k = key.toLowerCase();
  if (k.includes('thumb') || k.includes('preview') || k.includes('overview') || k.includes('rendered')) return true;
  const href = String(asset?.href || '').toLowerCase().split('?')[0];
  if (PREVIEW_EXTENSIONS.some(ext => href.endsWith(ext))) return true;
  if (Array.isArray(asset?.roles)) {
    if (asset.roles.some((r: string) => ['thumbnail', 'overview'].includes(r.toLowerCase()))) return true;
  }
  return false;
}

export function findThermalAsset(assets?: Record<string, any>): { key: string; href: string } | null {
  if (!assets || typeof assets !== 'object') return null;

  // Strict semantic priority for Surface Temperature Level-2 data products
  // Reject Level-1 raw radiance ('b10', 'b6'), uncertainty/QA bands ('st_qa', 'st_emis', 'st_trad', etc.), and previews
  const allowedKeys = ['lwir11', 'st_b10', 'st_b6'];

  for (const preferred of allowedKeys) {
    for (const [key, asset] of Object.entries(assets)) {
      const k = key.toLowerCase();
      if ((k === preferred || k === `band_${preferred}`) && !isPreviewAsset(key, asset)) {
        if (asset?.href && typeof asset.href === 'string') {
          return { key, href: asset.href };
        }
      }
    }
  }

  return null;
}

export function findQaAsset(assets?: Record<string, any>): { key: string; href: string } | null {
  if (!assets || typeof assets !== 'object') return null;

  // Strict priority: QA_PIXEL / PIXEL_QA only
  // Generic 'qa', 'qa_radsat', 'st_qa' must not override or substitute QA_PIXEL
  const allowedKeys = ['qa_pixel', 'pixel_qa'];

  for (const preferred of allowedKeys) {
    for (const [key, asset] of Object.entries(assets)) {
      const k = key.toLowerCase();
      if (k === preferred && !isPreviewAsset(key, asset)) {
        if (asset?.href && typeof asset.href === 'string') {
          return { key, href: asset.href };
        }
      }
    }
  }

  return null;
}

const TIFF_TYPE_SIZES: Record<number, number> = {
  1: 1,  // BYTE
  2: 1,  // ASCII
  3: 2,  // SHORT
  4: 4,  // LONG
  5: 8,  // RATIONAL
  6: 1,  // SBYTE
  7: 1,  // UNDEFINED
  8: 2,  // SSHORT
  9: 4,  // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

export class GeoTiffParser {
  /**
   * Parse a GeoTIFF ArrayBuffer and extract metadata, CRS, tiepoints, pixel scale, and compression
   */
  public static parseMetadata(buffer: ArrayBuffer): GeoTiffMetadata {
    if (!buffer || buffer.byteLength < 8) {
      throw new Error('Buffer GeoTIFF terlalu kecil atau tidak valid.');
    }
    const view = new DataView(buffer);
    const byteOrder = view.getUint16(0, false);
    const isLittleEndian = byteOrder === 0x4949; // 'II'
    if (!isLittleEndian && byteOrder !== 0x4D4D) { // 'MM'
      throw new Error('Header byte-order TIFF tidak dikenali.');
    }

    const magic = view.getUint16(2, isLittleEndian);
    if (magic !== 42) {
      throw new Error(`Magic number TIFF tidak valid (${magic}); diharapkan 42.`);
    }

    const firstIfdOffset = view.getUint32(4, isLittleEndian);
    if (firstIfdOffset >= buffer.byteLength) {
      throw new Error('Offset IFD berada di luar batas file.');
    }

    const entryCount = view.getUint16(firstIfdOffset, isLittleEndian);
    let offset = firstIfdOffset + 2;

    let width = 0;
    let height = 0;
    let bitsPerSample = 16;
    let compression = 1;
    let predictor = 1;
    let rowsPerStrip = 0;
    let stripOffsets: number[] = [];
    let stripByteCounts: number[] = [];
    let tileWidth = 0;
    let tileLength = 0;
    let tileOffsets: number[] = [];
    let tileByteCounts: number[] = [];
    let tiepoint: { i: number; j: number; k: number; x: number; y: number; z: number } | null = null;
    let pixelScale: { dx: number; dy: number; dz: number } | null = null;
    let crs: string | null = null;
    let noDataValue: number | null = null;
    let hasGeoreference = false;
    let geoKeysRaw: number[] | null = null;

    const readValue = (type: number, count: number, valOffset: number): any => {
      const sz = TIFF_TYPE_SIZES[type] || 1;
      const totalBytes = count * sz;
      const ptr = totalBytes <= 4 ? valOffset : view.getUint32(valOffset, isLittleEndian);

      if (type === 3 && count === 1) return view.getUint16(ptr, isLittleEndian);
      if (type === 4 && count === 1) return view.getUint32(ptr, isLittleEndian);
      if (type === 2) {
        let str = '';
        for (let i = 0; i < count; i++) {
          const c = view.getUint8(ptr + i);
          if (c === 0) break;
          str += String.fromCharCode(c);
        }
        return str.trim();
      }
      if (type === 12) {
        if (count === 1) return view.getFloat64(ptr, isLittleEndian);
        const res: number[] = [];
        for (let i = 0; i < count; i++) res.push(view.getFloat64(ptr + i * 8, isLittleEndian));
        return res;
      }
      if ((type === 3 || type === 4) && count > 1) {
        const res: number[] = [];
        for (let i = 0; i < count; i++) {
          res.push(type === 3 ? view.getUint16(ptr + i * sz, isLittleEndian) : view.getUint32(ptr + i * sz, isLittleEndian));
        }
        return res;
      }
      return view.getUint32(ptr, isLittleEndian);
    };

    for (let e = 0; e < entryCount; e++) {
      if (offset + 12 > buffer.byteLength) break;
      const tag = view.getUint16(offset, isLittleEndian);
      const type = view.getUint16(offset + 2, isLittleEndian);
      const count = view.getUint32(offset + 4, isLittleEndian);
      const valOffset = offset + 8;

      if (tag === 256) width = readValue(type, count, valOffset);
      else if (tag === 257) height = readValue(type, count, valOffset);
      else if (tag === 258) {
        const bps = readValue(type, count, valOffset);
        bitsPerSample = Array.isArray(bps) ? bps[0] : bps;
      } else if (tag === 259) compression = readValue(type, count, valOffset);
      else if (tag === 273) {
        const o = count === 1 ? [readValue(type, count, valOffset)] : readValue(type, count, valOffset);
        stripOffsets = Array.isArray(o) ? o : [o];
      } else if (tag === 278) rowsPerStrip = readValue(type, count, valOffset);
      else if (tag === 279) {
        const c = count === 1 ? [readValue(type, count, valOffset)] : readValue(type, count, valOffset);
        stripByteCounts = Array.isArray(c) ? c : [c];
      } else if (tag === 317) predictor = readValue(type, count, valOffset);
      else if (tag === 322) tileWidth = readValue(type, count, valOffset);
      else if (tag === 323) tileLength = readValue(type, count, valOffset);
      else if (tag === 324) {
        const to = count === 1 ? [readValue(type, count, valOffset)] : readValue(type, count, valOffset);
        tileOffsets = Array.isArray(to) ? to : [to];
      } else if (tag === 325) {
        const tc = count === 1 ? [readValue(type, count, valOffset)] : readValue(type, count, valOffset);
        tileByteCounts = Array.isArray(tc) ? tc : [tc];
      } else if (tag === 33550) {
        const s = readValue(type, count, valOffset);
        if (Array.isArray(s) && s.length >= 2) {
          pixelScale = { dx: Math.abs(s[0]), dy: Math.abs(s[1]), dz: s[2] || 0 };
          hasGeoreference = true;
        }
      } else if (tag === 33922) {
        const t = readValue(type, count, valOffset);
        if (Array.isArray(t) && t.length >= 6) {
          tiepoint = { i: t[0], j: t[1], k: t[2], x: t[3], y: t[4], z: t[5] };
          hasGeoreference = true;
        }
      } else if (tag === 34735) {
        geoKeysRaw = readValue(type, count, valOffset);
      } else if (tag === 42113) {
        const ndStr = readValue(type, count, valOffset);
        if (typeof ndStr === 'string' && ndStr.length > 0) {
          const parsed = Number(ndStr);
          if (!isNaN(parsed)) noDataValue = parsed;
        }
      }
      offset += 12;
    }

    const isTiled = Boolean(tileOffsets.length > 0 && tileWidth > 0 && tileLength > 0);
    const tilesAcross = isTiled ? Math.ceil(width / tileWidth) : 0;
    const tilesDown = isTiled ? Math.ceil(height / tileLength) : 0;

    // Parse GeoKeys with strict priority:
    // 3072: ProjectedCSTypeGeoKey (e.g. EPSG:32649)
    // 2048: GeographicTypeGeoKey (e.g. EPSG:4269)
    // Do NOT invent EPSG:4326 if no CRS GeoKey is specified
    const geoKeyMap = new Map<number, number>();
    if (geoKeysRaw && Array.isArray(geoKeysRaw) && geoKeysRaw.length >= 4) {
      const numKeys = geoKeysRaw[3];
      for (let k = 0; k < numKeys; k++) {
        const kOffset = 4 + k * 4;
        if (kOffset + 4 <= geoKeysRaw.length) {
          const keyId = geoKeysRaw[kOffset];
          const tiffTagLocation = geoKeysRaw[kOffset + 1];
          const val = geoKeysRaw[kOffset + 3];
          if (tiffTagLocation === 0 && val !== undefined) {
            geoKeyMap.set(keyId, val);
          }
        }
      }
    }

    if (geoKeyMap.has(3072) && geoKeyMap.get(3072)! > 0) {
      crs = `EPSG:${geoKeyMap.get(3072)}`;
    } else if (geoKeyMap.has(2048) && geoKeyMap.get(2048)! > 0) {
      crs = `EPSG:${geoKeyMap.get(2048)}`;
    }

    if (rowsPerStrip === 0) rowsPerStrip = height;

    return {
      width,
      height,
      bitsPerSample,
      compression,
      predictor,
      isLittleEndian,
      hasGeoreference,
      tiepoint,
      pixelScale,
      stripOffsets,
      stripByteCounts,
      rowsPerStrip,
      isTiled,
      tileWidth: isTiled ? tileWidth : undefined,
      tileLength: isTiled ? tileLength : undefined,
      tileOffsets: isTiled ? tileOffsets : undefined,
      tileByteCounts: isTiled ? tileByteCounts : undefined,
      tilesAcross: isTiled ? tilesAcross : undefined,
      tilesDown: isTiled ? tilesDown : undefined,
      crs: crs || null,
      noDataValue,
    };
  }

  /**
   * Read raw pixel value at (col, row). Returns null if outside raster bounds or matching NoData.
   * Supports stripped and tiled images, Deflate and raw, horizontal differencing Predictor 2,
   * and caches decoded blocks to prevent redundant decompression.
   */
  public static readPixelAt(
    buffer: ArrayBuffer,
    meta: GeoTiffMetadata,
    col: number,
    row: number
  ): number | null {
    if (col < 0 || col >= meta.width || row < 0 || row >= meta.height) {
      return null;
    }

    if (!meta._blockCache) {
      meta._blockCache = new Map();
    }

    const isTiled = Boolean(meta.isTiled && meta.tileWidth && meta.tileLength && meta.tileOffsets && meta.tileOffsets.length > 0);
    const blockKey = isTiled
      ? `tile_${Math.floor(row / meta.tileLength!) * (meta.tilesAcross || 1) + Math.floor(col / meta.tileWidth!)}`
      : `strip_${Math.floor(row / meta.rowsPerStrip)}`;

    let blockSamples: Uint16Array | Uint8Array | Uint32Array | null = meta._blockCache.get(blockKey) || null;

    if (!blockSamples) {
      let blockOffset: number;
      let blockByteCount: number;
      let blockWidth: number;
      let blockHeight: number;

      if (isTiled) {
        const tileCol = Math.floor(col / meta.tileWidth!);
        const tileRow = Math.floor(row / meta.tileLength!);
        const tileIdx = tileRow * (meta.tilesAcross || 1) + tileCol;
        blockOffset = meta.tileOffsets![tileIdx];
        blockByteCount = meta.tileByteCounts![tileIdx];
        blockWidth = meta.tileWidth!;
        blockHeight = meta.tileLength!;
      } else {
        const stripIdx = Math.floor(row / meta.rowsPerStrip);
        blockOffset = meta.stripOffsets[stripIdx];
        blockByteCount = meta.stripByteCounts[stripIdx];
        blockWidth = meta.width;
        blockHeight = Math.min(meta.rowsPerStrip, meta.height - stripIdx * meta.rowsPerStrip);
      }

      if (blockOffset === undefined || blockByteCount === undefined) {
        return null;
      }

      let decompressedBytes: Uint8Array;
      if (meta.compression === 8) {
        try {
          const compressed = new Uint8Array(buffer, blockOffset, blockByteCount);
          decompressedBytes = pako.inflate(compressed);
        } catch (err) {
          throw new Error(`Gagal mendekompresi blok Deflate: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (meta.compression === 1) {
        decompressedBytes = new Uint8Array(buffer, blockOffset, blockByteCount);
      } else {
        throw new Error(`UNSUPPORTED_RASTER_FORMAT: Format kompresi TIFF (${meta.compression}) belum didukung.`);
      }

      const bytesPerSample = meta.bitsPerSample / 8;
      const expectedBytes = blockWidth * blockHeight * bytesPerSample;
      if (decompressedBytes.byteLength < expectedBytes) {
        throw new Error('MALFORMED_TIFF_STRIP: Ukuran data strip/tile tidak mencukupi untuk seluruh piksel blok.');
      }
      const isPredictor2 = meta.predictor === 2;

      if (bytesPerSample === 2) {
        const view = new DataView(decompressedBytes.buffer, decompressedBytes.byteOffset, decompressedBytes.byteLength);
        const totalPixels = blockWidth * blockHeight;
        const samples = new Uint16Array(totalPixels);
        for (let r = 0; r < blockHeight; r++) {
          const rowOffset = r * blockWidth;
          let prev = 0;
          for (let c = 0; c < blockWidth; c++) {
            const pixelIdx = rowOffset + c;
            const bytePos = pixelIdx * 2;
            if (bytePos + 2 <= decompressedBytes.byteLength) {
              const raw = view.getUint16(bytePos, meta.isLittleEndian);
              const restored = isPredictor2 ? (c === 0 ? raw : (raw + prev) & 0xffff) : raw;
              samples[pixelIdx] = restored;
              prev = restored;
            }
          }
        }
        blockSamples = samples;
      } else if (bytesPerSample === 1) {
        const totalPixels = blockWidth * blockHeight;
        const samples = new Uint8Array(totalPixels);
        for (let r = 0; r < blockHeight; r++) {
          const rowOffset = r * blockWidth;
          let prev = 0;
          for (let c = 0; c < blockWidth; c++) {
            const pixelIdx = rowOffset + c;
            if (pixelIdx < decompressedBytes.byteLength) {
              const raw = decompressedBytes[pixelIdx];
              const restored = isPredictor2 ? (c === 0 ? raw : (raw + prev) & 0xff) : raw;
              samples[pixelIdx] = restored;
              prev = restored;
            }
          }
        }
        blockSamples = samples;
      } else if (bytesPerSample === 4) {
        const view = new DataView(decompressedBytes.buffer, decompressedBytes.byteOffset, decompressedBytes.byteLength);
        const totalPixels = blockWidth * blockHeight;
        const samples = new Uint32Array(totalPixels);
        for (let r = 0; r < blockHeight; r++) {
          const rowOffset = r * blockWidth;
          let prev = 0;
          for (let c = 0; c < blockWidth; c++) {
            const pixelIdx = rowOffset + c;
            const bytePos = pixelIdx * 4;
            if (bytePos + 4 <= decompressedBytes.byteLength) {
              const raw = view.getUint32(bytePos, meta.isLittleEndian);
              const restored = isPredictor2 ? (c === 0 ? raw : (raw + prev) >>> 0) : raw;
              samples[pixelIdx] = restored;
              prev = restored;
            }
          }
        }
        blockSamples = samples;
      } else {
        throw new Error(`UNSUPPORTED_RASTER_FORMAT: BitsPerSample ${meta.bitsPerSample} belum didukung.`);
      }

      meta._blockCache.set(blockKey, blockSamples);
    }

    let colInBlock: number;
    let rowInBlock: number;
    let blockWidth: number;

    if (isTiled) {
      colInBlock = col % meta.tileWidth!;
      rowInBlock = row % meta.tileLength!;
      blockWidth = meta.tileWidth!;
    } else {
      colInBlock = col;
      rowInBlock = row % meta.rowsPerStrip;
      blockWidth = meta.width;
    }

    const idx = rowInBlock * blockWidth + colInBlock;
    if (idx < 0 || idx >= blockSamples.length) {
      return null;
    }

    const val = blockSamples[idx];
    if (meta.noDataValue !== null && val === meta.noDataValue) {
      return null;
    }

    return val;
  }

  /**
   * Sample pixels within an AOI bbox or polygon with coordinate transformation
   */
  public static sampleWindow(
    thermalBuffer: ArrayBuffer,
    thermalMeta: GeoTiffMetadata,
    qaBuffer: ArrayBuffer | null,
    qaMeta: GeoTiffMetadata | null,
    bounds: [number, number, number, number],
    gridSteps = 6
  ): DecodedRasterPixel[] {
    if (!thermalMeta.hasGeoreference || !thermalMeta.tiepoint || !thermalMeta.pixelScale) {
      throw new Error('Raster thermal tidak memiliki georeferensi atau affine transform yang valid.');
    }
    if (!thermalMeta.crs) {
      throw new Error('MISSING_CRS: Raster tidak memiliki informasi CRS yang valid.');
    }
    if (qaMeta && !qaMeta.crs) {
      throw new Error('MISSING_CRS: Raster QA tidak memiliki informasi CRS yang valid.');
    }
    const [minLng, minLat, maxLng, maxLat] = bounds;
    const stepLat = (maxLat - minLat) / gridSteps;
    const stepLng = (maxLng - minLng) / gridSteps;
    const pixels: DecodedRasterPixel[] = [];

    const tCrs = thermalMeta.crs;
    const qCrs = qaMeta?.crs;

    // Register UTM zone dynamically if proj4 doesn't have it defined
    if (tCrs && (tCrs.startsWith('EPSG:326') || tCrs.startsWith('EPSG:327'))) {
      const code = parseInt(tCrs.replace('EPSG:', ''), 10);
      if (code >= 32601 && code <= 32660) {
        const zone = code - 32600;
        proj4.defs(tCrs, `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`);
      } else if (code >= 32701 && code <= 32760) {
        const zone = code - 32700;
        proj4.defs(tCrs, `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`);
      }
    }

    for (let r = 0; r <= gridSteps; r++) {
      for (let c = 0; c <= gridSteps; c++) {
        const pLat = minLat + r * stepLat;
        const pLng = minLng + c * stepLng;

        // Project coordinate to thermal raster CRS if needed
        let tCoords = [pLng, pLat];
        if (tCrs && tCrs !== 'EPSG:4326') {
          tCoords = proj4('EPSG:4326', tCrs, [pLng, pLat]);
        }

        // Use Math.floor for PixelIsArea affine mapping: [0, 1) cell domain maps to row 0, col 0
        const tCol = Math.floor(thermalMeta.tiepoint.i + (tCoords[0] - thermalMeta.tiepoint.x) / thermalMeta.pixelScale.dx);
        const tRow = Math.floor(thermalMeta.tiepoint.j + (thermalMeta.tiepoint.y - tCoords[1]) / thermalMeta.pixelScale.dy);

        const rawDN = GeoTiffParser.readPixelAt(thermalBuffer, thermalMeta, tCol, tRow);

        let qaPixel: number | undefined = undefined;
        let isQaValid = false;
        if (qaBuffer && qaMeta) {
          if (qaMeta.hasGeoreference && qaMeta.tiepoint && qaMeta.pixelScale) {
            let qCoords = [pLng, pLat];
            if (qCrs && qCrs !== 'EPSG:4326') {
              qCoords = proj4('EPSG:4326', qCrs, [pLng, pLat]);
            }
            const qCol = Math.floor(qaMeta.tiepoint.i + (qCoords[0] - qaMeta.tiepoint.x) / qaMeta.pixelScale.dx);
            const qRow = Math.floor(qaMeta.tiepoint.j + (qaMeta.tiepoint.y - qCoords[1]) / qaMeta.pixelScale.dy);
            const qVal = GeoTiffParser.readPixelAt(qaBuffer, qaMeta, qCol, qRow);
            if (qVal !== null) {
              qaPixel = qVal;
              isQaValid = true;
            }
          }
        }

        pixels.push({
          lat: Number(pLat.toFixed(5)),
          lng: Number(pLng.toFixed(5)),
          rawDN: rawDN !== null ? rawDN : 0,
          isRawDnValid: rawDN !== null,
          qaPixel,
          isQaValid,
          sourceCol: tCol,
          sourceRow: tRow,
          pixelKey: `${tCol}_${tRow}`,
        });
      }
    }

    return pixels;
  }

  /**
   * Generates a valid in-memory uncompressed GeoTIFF binary buffer for testing
   */
  public static createTestGeoTiffBuffer(params: {
    width: number;
    height: number;
    bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    data: Uint16Array;
  }): ArrayBuffer {
    const { width, height, bbox, data } = params;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const dx = (maxLng - minLng) / width;
    const dy = (maxLat - minLat) / height;

    // Header (8 bytes) + Data (width * height * 2 bytes) + IFD
    const dataBytes = width * height * 2;
    const dataOffset = 8;
    const ifdOffset = dataOffset + dataBytes;
    const entryCount = 9;
    const ifdSize = 2 + entryCount * 12 + 4;
    // Doubles storage for tiepoint (6 * 8 = 48 bytes) and pixelScale (3 * 8 = 24 bytes)
    const extraOffset = ifdOffset + ifdSize;
    const totalBytes = extraOffset + 48 + 24;

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);

    // Header
    view.setUint16(0, 0x4949, true); // Little endian 'II'
    view.setUint16(2, 42, true);     // TIFF Magic 42
    view.setUint32(4, ifdOffset, true); // Offset to IFD

    // Write raster data
    const u16Data = new Uint16Array(buffer, dataOffset, width * height);
    u16Data.set(data);

    // Write extra double arrays
    const tiepointOffset = extraOffset;
    const tiepoints = [0, 0, 0, minLng, maxLat, 0];
    for (let i = 0; i < 6; i++) {
      view.setFloat64(tiepointOffset + i * 8, tiepoints[i], true);
    }

    const scaleOffset = tiepointOffset + 48;
    const scales = [dx, dy, 0];
    for (let i = 0; i < 3; i++) {
      view.setFloat64(scaleOffset + i * 8, scales[i], true);
    }

    // Write IFD
    view.setUint16(ifdOffset, entryCount, true);
    let curEntry = ifdOffset + 2;

    const writeEntry = (tag: number, type: number, count: number, valOrPtr: number) => {
      view.setUint16(curEntry, tag, true);
      view.setUint16(curEntry + 2, type, true);
      view.setUint32(curEntry + 4, count, true);
      view.setUint32(curEntry + 8, valOrPtr, true);
      curEntry += 12;
    };

    writeEntry(256, 4, 1, width);                     // ImageWidth
    writeEntry(257, 4, 1, height);                    // ImageLength
    writeEntry(258, 3, 1, 16);                        // BitsPerSample
    writeEntry(259, 3, 1, 1);                         // Compression (1=None)
    writeEntry(273, 4, 1, dataOffset);                // StripOffsets
    writeEntry(278, 4, 1, height);                    // RowsPerStrip
    writeEntry(279, 4, 1, dataBytes);                 // StripByteCounts
    writeEntry(33550, 12, 3, scaleOffset);            // ModelPixelScaleTag
    writeEntry(33922, 12, 6, tiepointOffset);         // ModelTiepointTag

    view.setUint32(curEntry, 0, true); // Next IFD = 0 (End)

    return buffer;
  }
}
