import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, '../apps/server/src/data/osm_traffic_signals_id.json');

const QLEVER_ENDPOINT = 'https://qlever.cs.uni-freiburg.de/api/osm-planet';

// Clean Indonesian landmass filter excluding Singapore, Peninsular Malaysia, East Malaysia (Sarawak/Sabah), Brunei, Timor-Leste, and PNG
const INDONESIA_LAND_BOXES = [
  // Aceh & Northern Sumatera (west of Malacca Strait shipping lane diagonal)
  [1.0, 95.0, 6.0, 99.95],
  // Central Sumatera (Riau mainland, Jambi, West Sumatera)
  [-2.5, 98.5, 1.15, 103.35],
  // Dumai / Bengkalis / Siak coastal belt (east up to 102.95E, north up to 2.2N, strictly west of Peninsular Malaysia)
  [1.15, 99.95, 2.2, 102.95],
  // Batam, Bintan, Karimun, Lingga (south of Singapore Strait 1.16N)
  [-0.9, 103.2, 1.155, 105.0],
  // Southern Sumatera (Palembang, Lampung, Bengkulu) & Bangka-Belitung
  [-6.1, 101.0, -2.0, 108.5],
  // Java + Madura
  [-8.9, 105.0, -5.8, 114.7],
  // Bali + NTB + NTT (excluding Timor-Leste exclaves)
  [-10.6, 114.4, -8.0, 125.0],
  // Kalimantan Selatan/Tengah/Barat/Timur (south of Sarawak/Sabah border ~0.85N west of 115.2E, ~4.1N east of 115.2E)
  [-4.2, 108.7, 0.85, 115.2],
  [-4.2, 115.2, 4.10, 118.9],
  // Sulawesi
  [-6.0, 118.5, 2.0, 125.5],
  // Maluku & Indonesian Papua (west of 141.02E border)
  [-9.2, 125.5, 2.5, 141.0],
];

function isInIndonesiaLandBounds(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Exclude East Timor / Timor-Leste (Oecusse & mainland)
  if (lat >= -9.6 && lat <= -8.1 && lng >= 124.95 && lng <= 127.4) return false;
  if (lat >= -9.55 && lat <= -9.1 && lng >= 124.1 && lng <= 124.55) return false;
  return INDONESIA_LAND_BOXES.some(([s, w, n, e]) => lat >= s && lat <= n && lng >= w && lng <= e);
}

// Comprehensive Indonesian administrative center coordinates for accurate city/regency attribution
const ID_CITIES = [
  { name: 'DKI Jakarta', lat: -6.1862, lng: 106.8286 },
  { name: 'Jakarta Pusat', lat: -6.1805, lng: 106.8284 },
  { name: 'Jakarta Selatan', lat: -6.2615, lng: 106.8106 },
  { name: 'Jakarta Timur', lat: -6.2250, lng: 106.9004 },
  { name: 'Jakarta Barat', lat: -6.1674, lng: 106.7637 },
  { name: 'Jakarta Utara', lat: -6.1384, lng: 106.8639 },
  { name: 'Kota Bogor', lat: -6.5971, lng: 106.8060 },
  { name: 'Kota Depok', lat: -6.4025, lng: 106.7942 },
  { name: 'Kota Tangerang', lat: -6.1702, lng: 106.6403 },
  { name: 'Tangerang Selatan', lat: -6.2886, lng: 106.7179 },
  { name: 'Kota Bekasi', lat: -6.2383, lng: 106.9756 },
  { name: 'Cikarang (Bekasi)', lat: -6.2607, lng: 107.1526 },
  { name: 'Kota Serang', lat: -6.1200, lng: 106.1503 },
  { name: 'Kota Cilegon', lat: -6.0023, lng: 106.0111 },
  { name: 'Karawang', lat: -6.3227, lng: 107.3376 },
  { name: 'Purwakarta', lat: -6.5569, lng: 107.4433 },
  { name: 'Kota Bandung', lat: -6.9175, lng: 107.6191 },
  { name: 'Kota Cimahi', lat: -6.8722, lng: 107.5425 },
  { name: 'Sumedang', lat: -6.8586, lng: 107.9195 },
  { name: 'Garut', lat: -7.2279, lng: 107.9087 },
  { name: 'Kota Tasikmalaya', lat: -7.3274, lng: 108.2207 },
  { name: 'Kota Cirebon', lat: -6.7320, lng: 108.5523 },
  { name: 'Sukabumi', lat: -6.9277, lng: 106.9300 },
  { name: 'Subang', lat: -6.5715, lng: 107.7587 },
  { name: 'Indramayu', lat: -6.3273, lng: 108.3249 },
  { name: 'Kuningan', lat: -6.9765, lng: 108.4841 },
  { name: 'Banjar', lat: -7.3700, lng: 108.5320 },
  { name: 'Kota Semarang', lat: -6.9932, lng: 110.4203 },
  { name: 'Salatiga', lat: -7.3305, lng: 110.5084 },
  { name: 'Kota Pekalongan', lat: -6.8898, lng: 109.6746 },
  { name: 'Kota Tegal', lat: -6.8694, lng: 109.1402 },
  { name: 'Brebes', lat: -6.8705, lng: 109.0422 },
  { name: 'Purwokerto (Banyumas)', lat: -7.4243, lng: 109.2396 },
  { name: 'Cilacap', lat: -7.7279, lng: 109.0059 },
  { name: 'Kebumen', lat: -7.6695, lng: 109.6524 },
  { name: 'Kota Magelang', lat: -7.4797, lng: 110.2177 },
  { name: 'Kota Surakarta (Solo)', lat: -7.5755, lng: 110.8243 },
  { name: 'Klaten', lat: -7.7058, lng: 110.6064 },
  { name: 'Boyolali', lat: -7.5318, lng: 110.5965 },
  { name: 'Sukoharjo', lat: -7.6815, lng: 110.8294 },
  { name: 'Sragen', lat: -7.4267, lng: 111.0221 },
  { name: 'Kudus', lat: -6.8048, lng: 110.8405 },
  { name: 'Demak', lat: -6.8946, lng: 110.6383 },
  { name: 'Pati', lat: -6.7559, lng: 111.0380 },
  { name: 'Jepara', lat: -6.5887, lng: 110.6684 },
  { name: 'Kota Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { name: 'Sleman', lat: -7.7161, lng: 110.3556 },
  { name: 'Bantul', lat: -7.8895, lng: 110.3289 },
  { name: 'Ngoro (Kab. Mojokerto)', lat: -7.5520, lng: 112.6250 },
  { name: 'Kota Mojokerto', lat: -7.4705, lng: 112.4401 },
  { name: 'Mojosari (Kab. Mojokerto)', lat: -7.5186, lng: 112.5567 },
  { name: 'Jombang', lat: -7.5458, lng: 112.2331 },
  { name: 'Kota Surabaya', lat: -7.2575, lng: 112.7521 },
  { name: 'Sidoarjo', lat: -7.4478, lng: 112.7183 },
  { name: 'Gresik', lat: -7.1539, lng: 112.6561 },
  { name: 'Pasuruan', lat: -7.6453, lng: 112.9075 },
  { name: 'Probolinggo', lat: -7.7543, lng: 113.2159 },
  { name: 'Kota Malang', lat: -7.9666, lng: 112.6326 },
  { name: 'Kota Batu', lat: -7.8700, lng: 112.5283 },
  { name: 'Nganjuk', lat: -7.6051, lng: 111.9035 },
  { name: 'Kota Kediri', lat: -7.8480, lng: 112.0178 },
  { name: 'Kota Blitar', lat: -8.0955, lng: 112.1609 },
  { name: 'Tulungagung', lat: -8.0657, lng: 111.9025 },
  { name: 'Kota Madiun', lat: -7.6298, lng: 111.5239 },
  { name: 'Ngawi', lat: -7.4044, lng: 111.4461 },
  { name: 'Ponorogo', lat: -7.8686, lng: 111.4620 },
  { name: 'Bojonegoro', lat: -7.1502, lng: 111.8817 },
  { name: 'Tuban', lat: -6.8976, lng: 112.0649 },
  { name: 'Lamongan', lat: -7.1197, lng: 112.4167 },
  { name: 'Jember', lat: -8.1724, lng: 113.7007 },
  { name: 'Banyuwangi', lat: -8.2192, lng: 114.3691 },
  { name: 'Lumajang', lat: -8.1335, lng: 113.2248 },
  { name: 'Situbondo', lat: -7.7062, lng: 114.0098 },
  { name: 'Bangkalan', lat: -7.0455, lng: 112.7351 },
  { name: 'Kota Denpasar', lat: -8.6705, lng: 115.2126 },
  { name: 'Badung (Kuta-Mengwi)', lat: -8.7224, lng: 115.1767 },
  { name: 'Gianyar', lat: -8.5446, lng: 115.3255 },
  { name: 'Tabanan', lat: -8.5413, lng: 115.1252 },
  { name: 'Singaraja (Buleleng)', lat: -8.1120, lng: 115.0882 },
  { name: 'Mataram', lat: -8.5833, lng: 116.1167 },
  { name: 'Kupang', lat: -10.1772, lng: 123.6070 },
  { name: 'Banda Aceh', lat: 5.5483, lng: 95.3238 },
  { name: 'Kota Medan', lat: 3.5952, lng: 98.6722 },
  { name: 'Binjai', lat: 3.6001, lng: 98.4854 },
  { name: 'Pematangsiantar', lat: 2.9595, lng: 99.0687 },
  { name: 'Kota Padang', lat: -0.9471, lng: 100.4172 },
  { name: 'Bukittinggi', lat: -0.3055, lng: 100.3692 },
  { name: 'Pekanbaru', lat: 0.5071, lng: 101.4478 },
  { name: 'Batam', lat: 1.0456, lng: 104.0305 },
  { name: 'Tanjungpinang', lat: 0.9186, lng: 104.4557 },
  { name: 'Kota Jambi', lat: -1.6101, lng: 103.6131 },
  { name: 'Palembang', lat: -2.9761, lng: 104.7754 },
  { name: 'Bengkulu', lat: -3.7928, lng: 102.2608 },
  { name: 'Bandar Lampung', lat: -5.4292, lng: 105.2610 },
  { name: 'Pangkalpinang', lat: -2.1316, lng: 106.1169 },
  { name: 'Pontianak', lat: -0.0263, lng: 109.3425 },
  { name: 'Singkawang', lat: 0.9092, lng: 108.9846 },
  { name: 'Palangka Raya', lat: -2.2136, lng: 113.9108 },
  { name: 'Banjarmasin', lat: -3.3186, lng: 114.5944 },
  { name: 'Banjarbaru', lat: -3.4404, lng: 114.8322 },
  { name: 'Balikpapan', lat: -1.2379, lng: 116.8529 },
  { name: 'Samarinda', lat: -0.5022, lng: 117.1536 },
  { name: 'Bontang', lat: 0.1324, lng: 117.4841 },
  { name: 'Tarakan', lat: 3.3003, lng: 117.6333 },
  { name: 'Kota Makassar', lat: -5.1477, lng: 119.4327 },
  { name: 'Parepare', lat: -4.0167, lng: 119.6236 },
  { name: 'Palu', lat: -0.8917, lng: 119.8707 },
  { name: 'Kendari', lat: -3.9985, lng: 122.5130 },
  { name: 'Manado', lat: 1.4748, lng: 124.8421 },
  { name: 'Gorontalo', lat: 0.5435, lng: 123.0568 },
  { name: 'Ambon', lat: -3.6954, lng: 128.1814 },
  { name: 'Jayapura', lat: -2.5916, lng: 140.6690 },
  { name: 'Sorong', lat: -0.8762, lng: 131.2558 },
];

function nearestCityName(lat, lng) {
  let best = 'Indonesia';
  let bestD2 = Infinity;
  for (const c of ID_CITIES) {
    const dLat = lat - c.lat;
    const dLng = lng - c.lng;
    const d2 = dLat * dLat + dLng * dLng;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = c.name;
    }
  }
  return best;
}

async function fetchAllIndonesiaSignalsViaQLever() {
  const sparql = `
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT ?osm_id ?geom ?name WHERE {
  ?osm_id osmkey:highway "traffic_signals" .
  ?osm_id geo:hasGeometry/geo:asWKT ?geom .
  OPTIONAL { ?osm_id osmkey:name ?name . }
  FILTER(geof:latitude(?geom) >= -11.2 && geof:latitude(?geom) <= 6.2 && geof:longitude(?geom) >= 94.5 && geof:longitude(?geom) <= 141.1)
}
LIMIT 60000
`;
  const res = await fetch(QLEVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'HarmonySpatialSignalsBuilder/1.0',
    },
    body: new URLSearchParams({ query: sparql }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    throw new Error(`QLever HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const bindings = data?.results?.bindings || [];
  const rawNodes = [];
  for (const row of bindings) {
    const wkt = row.geom?.value || '';
    const m = wkt.match(/^POINT\(([-\d.]+)\s+([-\d.]+)\)$/i);
    if (!m) continue;
    const lng = Number(m[1]);
    const lat = Number(m[2]);
    if (!isInIndonesiaLandBounds(lat, lng)) continue;
    const uri = row.osm_id?.value || '';
    const idMatch = uri.match(/\/(\d+)$/);
    const osmId = idMatch ? idMatch[1] : `${lat.toFixed(5)}_${lng.toFixed(5)}`;
    const rawName = row.name?.value ? String(row.name.value).trim() : '';
    const cycle = lat < -5.8 && lat > -8.9 && lng >= 105 && lng <= 115 ? [38, 4, 44] : [35, 4, 40];
    rawNodes.push({
      id: osmId,
      lat,
      lng,
      rawName,
      cycle,
    });
  }
  return rawNodes;
}

// Spatial grid hash deduplication (~38m radius) to merge multi-lane stop-line OSM nodes per junction
function clusterIntersectionNodes(rawNodes) {
  const CELL_DEG = 0.00038; // ~42m
  const grid = new Map();
  const clusters = [];

  for (const node of rawNodes) {
    if (!isInIndonesiaLandBounds(node.lat, node.lng)) continue;
    const gx = Math.floor(node.lng / CELL_DEG);
    const gy = Math.floor(node.lat / CELL_DEG);

    let matched = null;
    for (let dx = -1; dx <= 1 && !matched; dx++) {
      for (let dy = -1; dy <= 1 && !matched; dy++) {
        const bucket = grid.get(`${gx + dx}:${gy + dy}`);
        if (!bucket) continue;
        for (const c of bucket) {
          const dLat = c.lat - node.lat;
          const dLng = c.lng - node.lng;
          if (dLat * dLat + dLng * dLng <= 0.00035 * 0.00035) {
            matched = c;
            break;
          }
        }
      }
    }

    if (matched) {
      matched.sumLat += node.lat;
      matched.sumLng += node.lng;
      matched.count += 1;
      matched.lat = matched.sumLat / matched.count;
      matched.lng = matched.sumLng / matched.count;
      if (!matched.rawName && node.rawName) matched.rawName = node.rawName;
    } else {
      const cluster = {
        osmId: node.id,
        lat: node.lat,
        lng: node.lng,
        sumLat: node.lat,
        sumLng: node.lng,
        count: 1,
        rawName: node.rawName || '',
        cycle: node.cycle,
      };
      clusters.push(cluster);
      const key = `${gx}:${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(cluster);
    }
  }
  return clusters;
}

async function main() {
  console.log('Querying QLever OSM Planet for all Indonesia highway=traffic_signals...');
  const allRaw = await fetchAllIndonesiaSignalsViaQLever();
  console.log(`Fetched ${allRaw.length} raw OSM traffic signal nodes inside Indonesia landmass bounds.`);

  const clustered = clusterIntersectionNodes(allRaw);
  const cityIndexCounters = new Map();

  const finalList = clustered.map((c) => {
    const city = nearestCityName(c.lat, c.lng);
    const n = (cityIndexCounters.get(city) || 0) + 1;
    cityIndexCounters.set(city, n);

    let cleanName = c.rawName;
    if (!cleanName || /^traffic[_\s-]?signals?$/i.test(cleanName)) {
      cleanName = `Simpang APILL ${city} #${n}`;
    } else if (!cleanName.toLowerCase().includes('simpang') && !cleanName.toLowerCase().includes('perempatan') && !cleanName.toLowerCase().includes('pertigaan') && !cleanName.toLowerCase().includes('bundaran') && !cleanName.toLowerCase().includes('apill')) {
      cleanName = `Simpang ${cleanName}`;
    }

    return {
      id: `osm-sig-${c.osmId}`,
      name: cleanName.slice(0, 96),
      city,
      lat: Number(c.lat.toFixed(6)),
      lng: Number(c.lng.toFixed(6)),
      cycle: c.cycle,
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalList), 'utf8');
  const sizeKb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`\nSaved ${finalList.length} clustered intersections (${allRaw.length} raw OSM nodes) to ${OUTPUT_PATH} (${sizeKb} KB)`);

  const topCities = Array.from(cityIndexCounters.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('Top 15 cities:', topCities);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
