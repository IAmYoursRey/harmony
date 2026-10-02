import { crsEngine } from './crsEngine';

export interface ParsedFeatureResult {
  type: 'Feature';
  id?: string | number;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface ParsedSpatialFile {
  fileName: string;
  format: 'GeoJSON' | 'KML' | 'GPX' | 'CSV';
  featureCount: number;
  geometryTypes: string[];
  features: ParsedFeatureResult[];
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  crs: string;
  errors: string[];
  warnings: string[];
}

export class SpatialFileParser {
  /**
   * Main entry point to detect format and parse file content
   */
  public async parseFile(
    file: File,
    targetCRS = 'EPSG:4326',
    sourceCRS?: string
  ): Promise<ParsedSpatialFile> {
    const text = await file.text();
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.geojson') || lowerName.endsWith('.json')) {
      return this.parseGeoJSON(text, fileName, sourceCRS || 'EPSG:4326', targetCRS);
    } else if (lowerName.endsWith('.kml')) {
      return this.parseKML(text, fileName, targetCRS);
    } else if (lowerName.endsWith('.gpx')) {
      return this.parseGPX(text, fileName, targetCRS);
    } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
      return this.parseCSV(text, fileName, sourceCRS || 'EPSG:4326', targetCRS);
    }

    // Try sniffing content if extension is ambiguous
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return this.parseGeoJSON(text, fileName, sourceCRS || 'EPSG:4326', targetCRS);
    } else if (trimmed.includes('<kml') || trimmed.includes('<Placemark')) {
      return this.parseKML(text, fileName, targetCRS);
    } else if (trimmed.includes('<gpx') || trimmed.includes('<trkpt')) {
      return this.parseGPX(text, fileName, targetCRS);
    }

    return this.parseCSV(text, fileName, sourceCRS || 'EPSG:4326', targetCRS);
  }

  /**
   * Parse GeoJSON with validation and coordinate bounds checking
   */
  public parseGeoJSON(
    text: string,
    fileName: string,
    sourceCRS = 'EPSG:4326',
    targetCRS = 'EPSG:4326'
  ): ParsedSpatialFile {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      return {
        fileName,
        format: 'GeoJSON',
        featureCount: 0,
        geometryTypes: [],
        features: [],
        bbox: [0, 0, 0, 0],
        crs: sourceCRS,
        errors: [`JSON Syntax Error: ${e.message}`],
        warnings: [],
      };
    }

    let rawFeatures: any[] = [];
    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      rawFeatures = parsed.features;
    } else if (parsed.type === 'Feature') {
      rawFeatures = [parsed];
    } else if (Array.isArray(parsed)) {
      rawFeatures = parsed;
    } else if (parsed.type && parsed.coordinates) {
      // Direct geometry
      rawFeatures = [{ type: 'Feature', geometry: parsed, properties: {} }];
    } else {
      errors.push('Struktur berkas tidak mematuhi spesifikasi GeoJSON RFC 7946.');
    }

    const validFeatures: ParsedFeatureResult[] = [];
    const geomTypeSet = new Set<string>();
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const needsReprojection = sourceCRS.toUpperCase() !== targetCRS.toUpperCase();

    rawFeatures.forEach((feat, idx) => {
      if (!feat.geometry || !feat.geometry.type || !feat.geometry.coordinates) {
        warnings.push(`Fitur #${idx + 1} diabaikan karena tidak memiliki geometri yang valid.`);
        return;
      }

      const geomType = feat.geometry.type;
      geomTypeSet.add(geomType);

      // Recursive reprojector / bbox accumulator
      const processCoords = (coord: any): any => {
        if (typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          let [x, y] = coord;
          if (needsReprojection) {
            [x, y] = crsEngine.transform([x, y], sourceCRS, targetCRS);
          }

          if (x < minLng) minLng = x;
          if (y < minLat) minLat = y;
          if (x > maxLng) maxLng = x;
          if (y > maxLat) maxLat = y;

          return [x, y, ...(coord.slice(2) || [])];
        } else if (Array.isArray(coord)) {
          return coord.map(processCoords);
        }
        return coord;
      };

      const transformedGeom = {
        type: geomType,
        coordinates: processCoords(feat.geometry.coordinates),
      };

      validFeatures.push({
        type: 'Feature',
        id: feat.id || `f-${idx + 1}`,
        geometry: transformedGeom,
        properties: feat.properties || {},
      });
    });

    const bbox: [number, number, number, number] =
      validFeatures.length > 0 ? [minLng, minLat, maxLng, maxLat] : [0, 0, 0, 0];

    return {
      fileName,
      format: 'GeoJSON',
      featureCount: validFeatures.length,
      geometryTypes: Array.from(geomTypeSet),
      features: validFeatures,
      bbox,
      crs: targetCRS,
      errors,
      warnings,
    };
  }

  /**
   * Parse KML using DOMParser
   */
  public parseKML(text: string, fileName: string, targetCRS = 'EPSG:4326'): ParsedSpatialFile {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validFeatures: ParsedFeatureResult[] = [];
    const geomTypeSet = new Set<string>();

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const placemarks = xmlDoc.getElementsByTagName('Placemark');
      if (placemarks.length === 0) {
        warnings.push('Tidak ditemukan elemen <Placemark> dalam berkas KML.');
      }

      for (let i = 0; i < placemarks.length; i++) {
        const pm = placemarks[i];
        const nameNode = pm.getElementsByTagName('name')[0];
        const descNode = pm.getElementsByTagName('description')[0];
        const title = nameNode?.textContent?.trim() || `Placemark #${i + 1}`;
        const description = descNode?.textContent?.trim() || '';

        // Check Point
        const pointNode = pm.getElementsByTagName('Point')[0];
        if (pointNode) {
          const coordsText = pointNode.getElementsByTagName('coordinates')[0]?.textContent?.trim();
          if (coordsText) {
            const parts = coordsText.split(',').map((p) => parseFloat(p.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const [lng, lat] = parts;
              if (lng < minLng) minLng = lng;
              if (lat < minLat) minLat = lat;
              if (lng > maxLng) maxLng = lng;
              if (lat > maxLat) maxLat = lat;

              geomTypeSet.add('Point');
              validFeatures.push({
                type: 'Feature',
                id: `kml-pt-${i + 1}`,
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat, parts[2] || 0],
                },
                properties: { name: title, description },
              });
              continue;
            }
          }
        }

        // Check LineString
        const lineNode = pm.getElementsByTagName('LineString')[0];
        if (lineNode) {
          const coordsText = lineNode.getElementsByTagName('coordinates')[0]?.textContent?.trim();
          if (coordsText) {
            const coordTuples = coordsText
              .split(/\s+/)
              .filter(Boolean)
              .map((chunk) => {
                const parts = chunk.split(',').map((p) => parseFloat(p.trim()));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  const [lng, lat] = parts;
                  if (lng < minLng) minLng = lng;
                  if (lat < minLat) minLat = lat;
                  if (lng > maxLng) maxLng = lng;
                  if (lat > maxLat) maxLat = lat;
                  return [lng, lat, parts[2] || 0];
                }
                return null;
              })
              .filter(Boolean) as [number, number, number][];

            if (coordTuples.length >= 2) {
              geomTypeSet.add('LineString');
              validFeatures.push({
                type: 'Feature',
                id: `kml-ln-${i + 1}`,
                geometry: {
                  type: 'LineString',
                  coordinates: coordTuples,
                },
                properties: { name: title, description },
              });
              continue;
            }
          }
        }

        // Check Polygon
        const polyNode = pm.getElementsByTagName('Polygon')[0];
        if (polyNode) {
          const outerRing = polyNode.getElementsByTagName('outerBoundaryIs')[0];
          const coordsText = outerRing?.getElementsByTagName('coordinates')[0]?.textContent?.trim();
          if (coordsText) {
            const ringCoords = coordsText
              .split(/\s+/)
              .filter(Boolean)
              .map((chunk) => {
                const parts = chunk.split(',').map((p) => parseFloat(p.trim()));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  const [lng, lat] = parts;
                  if (lng < minLng) minLng = lng;
                  if (lat < minLat) minLat = lat;
                  if (lng > maxLng) maxLng = lng;
                  if (lat > maxLat) maxLat = lat;
                  return [lng, lat];
                }
                return null;
              })
              .filter(Boolean) as [number, number][];

            if (ringCoords.length >= 3) {
              // Ensure closed ring
              const first = ringCoords[0];
              const last = ringCoords[ringCoords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                ringCoords.push([first[0], first[1]]);
              }

              geomTypeSet.add('Polygon');
              validFeatures.push({
                type: 'Feature',
                id: `kml-pg-${i + 1}`,
                geometry: {
                  type: 'Polygon',
                  coordinates: [ringCoords],
                },
                properties: { name: title, description },
              });
            }
          }
        }
      }
    } catch (err: any) {
      errors.push(`Gagal mem-parsing KML: ${err.message}`);
    }

    const bbox: [number, number, number, number] =
      validFeatures.length > 0 ? [minLng, minLat, maxLng, maxLat] : [0, 0, 0, 0];

    return {
      fileName,
      format: 'KML',
      featureCount: validFeatures.length,
      geometryTypes: Array.from(geomTypeSet),
      features: validFeatures,
      bbox,
      crs: targetCRS,
      errors,
      warnings,
    };
  }

  /**
   * Parse GPX format for tracks, waypoints, routes
   */
  public parseGPX(text: string, fileName: string, targetCRS = 'EPSG:4326'): ParsedSpatialFile {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validFeatures: ParsedFeatureResult[] = [];
    const geomTypeSet = new Set<string>();

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // 1. Waypoints (<wpt lat="..." lon="...">)
      const wpts = xmlDoc.getElementsByTagName('wpt');
      for (let i = 0; i < wpts.length; i++) {
        const wpt = wpts[i];
        const lat = parseFloat(wpt.getAttribute('lat') || '');
        const lon = parseFloat(wpt.getAttribute('lon') || '');
        if (!isNaN(lat) && !isNaN(lon)) {
          const ele = parseFloat(wpt.getElementsByTagName('ele')[0]?.textContent || '0');
          const name = wpt.getElementsByTagName('name')[0]?.textContent || `Waypoint #${i + 1}`;

          if (lon < minLng) minLng = lon;
          if (lat < minLat) minLat = lat;
          if (lon > maxLng) maxLng = lon;
          if (lat > maxLat) maxLat = lat;

          geomTypeSet.add('Point');
          validFeatures.push({
            type: 'Feature',
            id: `gpx-wpt-${i + 1}`,
            geometry: {
              type: 'Point',
              coordinates: [lon, lat, ele],
            },
            properties: { name, elevationM: ele },
          });
        }
      }

      // 2. Tracks (<trk><trkseg><trkpt lat="..." lon="...">)
      const trks = xmlDoc.getElementsByTagName('trk');
      for (let t = 0; t < trks.length; t++) {
        const trk = trks[t];
        const trkName = trk.getElementsByTagName('name')[0]?.textContent || `Track #${t + 1}`;
        const pts = trk.getElementsByTagName('trkpt');
        const coords: [number, number, number][] = [];

        for (let i = 0; i < pts.length; i++) {
          const pt = pts[i];
          const lat = parseFloat(pt.getAttribute('lat') || '');
          const lon = parseFloat(pt.getAttribute('lon') || '');
          const ele = parseFloat(pt.getElementsByTagName('ele')[0]?.textContent || '0');
          if (!isNaN(lat) && !isNaN(lon)) {
            if (lon < minLng) minLng = lon;
            if (lat < minLat) minLat = lat;
            if (lon > maxLng) maxLng = lon;
            if (lat > maxLat) maxLat = lat;
            coords.push([lon, lat, ele]);
          }
        }

        if (coords.length >= 2) {
          geomTypeSet.add('LineString');
          validFeatures.push({
            type: 'Feature',
            id: `gpx-trk-${t + 1}`,
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
            properties: { name: trkName, pointCount: coords.length },
          });
        }
      }
    } catch (err: any) {
      errors.push(`Gagal mem-parsing GPX: ${err.message}`);
    }

    const bbox: [number, number, number, number] =
      validFeatures.length > 0 ? [minLng, minLat, maxLng, maxLat] : [0, 0, 0, 0];

    return {
      fileName,
      format: 'GPX',
      featureCount: validFeatures.length,
      geometryTypes: Array.from(geomTypeSet),
      features: validFeatures,
      bbox,
      crs: targetCRS,
      errors,
      warnings,
    };
  }

  /**
   * Parse CSV with automatic coordinate column detection and optional reprojection
   */
  public parseCSV(
    text: string,
    fileName: string,
    sourceCRS = 'EPSG:4326',
    targetCRS = 'EPSG:4326'
  ): ParsedSpatialFile {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validFeatures: ParsedFeatureResult[] = [];

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        fileName,
        format: 'CSV',
        featureCount: 0,
        geometryTypes: [],
        features: [],
        bbox: [0, 0, 0, 0],
        crs: targetCRS,
        errors: ['Berkas CSV tidak memiliki baris data atau header.'],
        warnings: [],
      };
    }

    // Split headers (handles comma, semicolon, tab)
    const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Detect Lat / Lng columns
    const latRegex = /^(lat|latitude|lintang|y|northing)$/i;
    const lngRegex = /^(lng|lon|longitude|bujur|x|easting)$/i;

    const latIdx = headers.findIndex((h) => latRegex.test(h));
    const lngIdx = headers.findIndex((h) => lngRegex.test(h));

    if (latIdx === -1 || lngIdx === -1) {
      return {
        fileName,
        format: 'CSV',
        featureCount: 0,
        geometryTypes: [],
        features: [],
        bbox: [0, 0, 0, 0],
        crs: targetCRS,
        errors: [
          `Kolom koordinat tidak ditemukan dalam header CSV (${headers.join(', ')}). Harap sertakan kolom lat/latitude dan lng/longitude/easting.`,
        ],
        warnings: [],
      };
    }

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const needsReprojection = sourceCRS.toUpperCase() !== targetCRS.toUpperCase();

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rawLat = parseFloat(cells[latIdx]);
      const rawLng = parseFloat(cells[lngIdx]);

      if (isNaN(rawLat) || isNaN(rawLng)) {
        continue;
      }

      let [lng, lat] = [rawLng, rawLat];
      if (needsReprojection) {
        [lng, lat] = crsEngine.transform([rawLng, rawLat], sourceCRS, targetCRS);
      }

      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;

      const props: Record<string, any> = {};
      headers.forEach((h, hIdx) => {
        if (hIdx !== latIdx && hIdx !== lngIdx && cells[hIdx] !== undefined) {
          props[h] = cells[hIdx];
        }
      });

      validFeatures.push({
        type: 'Feature',
        id: `csv-${i}`,
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: props,
      });
    }

    const bbox: [number, number, number, number] =
      validFeatures.length > 0 ? [minLng, minLat, maxLng, maxLat] : [0, 0, 0, 0];

    return {
      fileName,
      format: 'CSV',
      featureCount: validFeatures.length,
      geometryTypes: ['Point'],
      features: validFeatures,
      bbox,
      crs: targetCRS,
      errors,
      warnings,
    };
  }
}

export const spatialFileParser = new SpatialFileParser();
