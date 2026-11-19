import express from "express";

const router = express.Router();

// These former routes contained invented numeric readings and dated warnings.
// Report missing integrations explicitly; never serve templates as official live data.
router.get(['/weather/warnings', '/climate/indicators', '/air-quality', '/geophysics/potential', '/time-sun', '/seismology/microzonation'], (req, res) => {
  return res.status(503).json({ success: false, dataStatus: 'UNAVAILABLE', source: 'not_connected', error: 'Sumber data untuk menu ini belum terhubung. Tidak ada data resmi terbaru yang berhasil diambil.', data: null, stations: [], reason: { code: 'NOT_CONNECTED' } });
});


let cache = {
  autogempa: { data: null, timestamp: 0 },
  gempaterkini: { data: null, timestamp: 0 },
  gempadirasakan: { data: null, timestamp: 0 },
};

const CACHE_TTL_MS = 60 * 1000;

const STRICT_NUMBER_REGEX = /^[-+]?\d+(\.\d+)?$/;

function parseStrictNumber(val) {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'string' && STRICT_NUMBER_REGEX.test(val.trim())) {
    const num = parseFloat(val.trim());
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function isValidEarthquakeDateTime(dt) {
  if (typeof dt !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(dt);
  if (!parts || !Number.isFinite(Date.parse(dt))) return false;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDay && hour <= 23 && minute <= 59 && second <= 59;
}

function parseCoordinatesString(coordsStr) {
  if (typeof coordsStr !== 'string') return null;
  const parts = coordsStr.split(',');
  if (parts.length !== 2) return null;
  const lat = parseStrictNumber(parts[0]);
  const lng = parseStrictNumber(parts[1]);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseDepthKm(depthStr) {
  if (typeof depthStr === 'number' && Number.isFinite(depthStr) && depthStr >= 0) return depthStr;
  if (typeof depthStr === 'string') {
    const cleaned = depthStr.replace(/km/i, '').trim();
    if (STRICT_NUMBER_REGEX.test(cleaned)) {
      const num = parseFloat(cleaned);
      if (Number.isFinite(num) && num >= 0) return num;
    }
  }
  return null;
}

function parseMagnitude(magVal) {
  const mag = parseStrictNumber(magVal);
  if (mag !== null && mag >= 0 && mag <= 10) return mag;
  return null;
}

async function fetchBmkgJson(url, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Harmony-Earth-Intelligence/2.0",
          "Referer": "https://www.bmkg.go.id/",
          "Accept": "application/json, text/plain, */*",
        },
      });
      if (!res.ok) {
        throw new Error(`BMKG responded with status ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastErr;
}

router.get(["/gempa/autogempa", "/autogempa"], async (req, res) => {
  const now = Date.now();
  if (cache.autogempa.data && now - cache.autogempa.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: "cache",
      fetchedAt: new Date(cache.autogempa.timestamp).toISOString(),
      data: cache.autogempa.data,
    });
  }

  try {
    const raw = await fetchBmkgJson("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
    const info = raw?.Infogempa?.gempa;
    const coords = parseCoordinatesString(info?.Coordinates);
    const mag = parseMagnitude(info?.Magnitude);
    const validDate = isValidEarthquakeDateTime(info?.DateTime);

    if (info && coords && mag !== null && validDate) {
      const parsed = {
        date: info.Tanggal,
        time: info.Jam,
        datetime: info.DateTime,
        coordinates: info.Coordinates,
        lat: coords.lat,
        lng: coords.lng,
        magnitude: mag,
        depth: info.Kedalaman,
        depthKm: parseDepthKm(info.Kedalaman),
        location: info.Wilayah,
        potential: info.Potensi,
        shakemapUrl: info.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${info.Shakemap}` : null,
        felt: info.Dirasakan || null,
        attribution: "BMKG - InaTEWS (Indonesia Tsunami Early Warning System)",
      };
      cache.autogempa = { data: parsed, timestamp: now };
      return res.json({
        success: true,
        source: "live",
        fetchedAt: new Date(now).toISOString(),
        data: parsed,
      });
    }
  } catch (error) {
    console.warn("BMKG autogempa live fetch failed; no new data:", error.message);
  }

  if (cache.autogempa.data) {
    return res.json({
      success: true,
      source: "stale_cache",
      dataStatus: "CACHED",
      fetchedAt: new Date(cache.autogempa.timestamp).toISOString(),
      data: cache.autogempa.data,
      warning: "Server BMKG sedang sibuk, menyajikan data cache terverifikasi.",
    });
  }

  return res.status(502).json({
    success: false,
    source: 'unavailable',
    dataStatus: 'UNAVAILABLE',
    fetchedAt: null,
    error: 'Pengambilan terbaru dari BMKG gagal. Tidak ada data baru yang berhasil diambil.',
    data: null,
  });
});

router.get(["/gempa/terkini", "/gempaterkini"], async (req, res) => {
  const now = Date.now();
  if (cache.gempaterkini.data && now - cache.gempaterkini.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: "cache",
      fetchedAt: new Date(cache.gempaterkini.timestamp).toISOString(),
      count: cache.gempaterkini.data.length,
      data: cache.gempaterkini.data,
    });
  }

  try {
    const raw = await fetchBmkgJson("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json");
    const list = raw?.Infogempa?.gempa;
    if (!Array.isArray(list) || list.length === 0) throw new Error('Invalid earthquake list payload');

    const parsedList = [];
    for (const g of list) {
      const coords = parseCoordinatesString(g?.Coordinates);
      const mag = parseMagnitude(g?.Magnitude);
      const validDate = isValidEarthquakeDateTime(g?.DateTime);
      if (!coords || mag === null || !validDate) {
        throw new Error('Invalid earthquake list payload');
      }
      parsedList.push({
        date: g.Tanggal,
        time: g.Jam,
        datetime: g.DateTime,
        lat: coords.lat,
        lng: coords.lng,
        magnitude: mag,
        depth: g.Kedalaman,
        depthKm: parseDepthKm(g.Kedalaman),
        location: g.Wilayah,
        potential: g.Potensi,
      });
    }

    cache.gempaterkini = { data: parsedList, timestamp: now };
    return res.json({
      success: true,
      source: "live",
      fetchedAt: new Date(now).toISOString(),
      count: parsedList.length,
      data: parsedList,
    });
  } catch (error) {
    console.warn("BMKG gempaterkini fetch failed; no new data:", error.message);
  }

  if (cache.gempaterkini.data) {
    return res.json({
      success: true,
      source: "stale_cache",
      dataStatus: "CACHED",
      fetchedAt: new Date(cache.gempaterkini.timestamp).toISOString(),
      count: cache.gempaterkini.data.length,
      data: cache.gempaterkini.data,
      warning: "Server BMKG sedang sibuk, menyajikan data cache terverifikasi.",
    });
  }

  return res.status(502).json({
    success: false,
    source: 'unavailable',
    dataStatus: 'UNAVAILABLE',
    fetchedAt: null,
    error: 'Pengambilan terbaru dari BMKG gagal. Tidak ada data baru yang berhasil diambil.',
    data: null,
  });
});

router.get(["/gempa/dirasakan", "/gempadirasakan"], async (req, res) => {
  const now = Date.now();
  if (cache.gempadirasakan.data && now - cache.gempadirasakan.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: "cache",
      fetchedAt: new Date(cache.gempadirasakan.timestamp).toISOString(),
      count: cache.gempadirasakan.data.length,
      data: cache.gempadirasakan.data,
    });
  }

  try {
    const raw = await fetchBmkgJson("https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json");
    const list = raw?.Infogempa?.gempa;
    if (!Array.isArray(list) || list.length === 0) throw new Error('Invalid earthquake list payload');

    const parsedList = [];
    for (const g of list) {
      const coords = parseCoordinatesString(g?.Coordinates);
      const mag = parseMagnitude(g?.Magnitude);
      const validDate = isValidEarthquakeDateTime(g?.DateTime);
      if (!coords || mag === null || !validDate) {
        throw new Error('Invalid earthquake list payload');
      }
      parsedList.push({
        date: g.Tanggal,
        time: g.Jam,
        datetime: g.DateTime,
        lat: coords.lat,
        lng: coords.lng,
        magnitude: mag,
        depth: g.Kedalaman,
        location: g.Wilayah,
        felt: g.Dirasakan,
      });
    }

    cache.gempadirasakan = { data: parsedList, timestamp: now };
    return res.json({
      success: true,
      source: "live",
      fetchedAt: new Date(now).toISOString(),
      count: parsedList.length,
      data: parsedList,
    });
  } catch (error) {
    console.warn("BMKG gempadirasakan fetch failed; no new data:", error.message);
  }

  if (cache.gempadirasakan.data) {
    return res.json({
      success: true,
      source: "stale_cache",
      dataStatus: "CACHED",
      fetchedAt: new Date(cache.gempadirasakan.timestamp).toISOString(),
      count: cache.gempadirasakan.data.length,
      data: cache.gempadirasakan.data,
      warning: "Server BMKG sedang sibuk, menyajikan data cache terverifikasi.",
    });
  }

  return res.status(502).json({
    success: false,
    source: 'unavailable',
    dataStatus: 'UNAVAILABLE',
    fetchedAt: null,
    error: 'Pengambilan terbaru dari BMKG gagal. Tidak ada data baru yang berhasil diambil.',
    data: null,
  });
});

const SATELLITE_IMAGE_MAP = {
  ir_enhanced: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_EH_Indonesia.png",
  natural_color: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_NC_Indonesia.png",
  water_vapor: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_WE_Indonesia.png",
  rainfall_potential: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_RP_Indonesia.png",
  geohotspot: "https://inderaja.bmkg.go.id/IMAGE/GEOHOTSPOT/H08_GH_Asean.png",
  visible: "https://inderaja.bmkg.go.id/IMAGE/MTS/VS/MTS_VS_Indonesia.png",
};

router.get("/satellite/image", async (req, res) => {
  const { product, id } = req.query;
  const key = (product || id || "ir_enhanced").toString().toLowerCase();
  const upstreamUrl = SATELLITE_IMAGE_MAP[key] || SATELLITE_IMAGE_MAP.ir_enhanced;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const upstreamRes = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bmkg.go.id/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    }).finally(() => clearTimeout(timeoutId));

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Gagal mengambil citra dari server satelit BMKG');
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await upstreamRes.arrayBuffer());

    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=600, stale-while-revalidate=300",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Access-Control-Allow-Origin": "*",
    });
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send("Gagal menyambung ke server satelit BMKG");
  }
});

router.get("/satellite/products", (req, res) => {
  const products = [
    {
      id: "ir_enhanced",
      name: "Himawari-9 IR Enhanced",
      spectralBand: "Infrared 10.4 μm (Band 13)",
      resolution: "2 km Spatial Resolution",
      refreshInterval: "10 Menit",
      purpose: "Mendeteksi suhu puncak awan (Cloud Top Temperature) dan mengidentifikasi pertumbuhan signifikan awan konvektif Cumulonimbus (Cb).",
      colorInterpretation: "Warna merah-kehitaman menunjukkan puncak awan sangat dingin (<-65°C) dengan potensi cuaca ekstrem, petir, dan turbulensi hebat.",
      sampleImage: "/api/bmkg/satellite/image?product=ir_enhanced",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_EH_Indonesia.png",
      isDayNight: "Tersedia 24 Jam (Siang & Malam)",
    },
    {
      id: "natural_color",
      name: "Himawari-9 Natural Color RGB",
      spectralBand: "RGB Komposit (Bands 03, 02, 01 / 0.64μm, 0.51μm, 0.47μm)",
      resolution: "1 km Spatial Resolution",
      refreshInterval: "10 Menit",
      purpose: "Visualisasi bentang awan mendekati pandangan mata alami, ketebalan awan, dan mikrofisika partikel es vs air cair.",
      colorInterpretation: "Awan konvektif tebal tampak putih cerah, awan es tampak kebiruan, daratan hijau-kecokelatan, dan lautan biru gelap.",
      sampleImage: "/api/bmkg/satellite/image?product=natural_color",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_NC_Indonesia.png",
      isDayNight: "Hanya Siang Hari (Memerlukan Cahaya Matahari Visible)",
    },
    {
      id: "water_vapor",
      name: "Himawari-9 Water Vapor Enhanced",
      spectralBand: "Mid-level Water Vapor 6.2 μm (Band 08)",
      resolution: "2 km Spatial Resolution",
      refreshInterval: "10 Menit",
      purpose: "Mengamati dinamika kelembapan atmosfer lapisan menengah hingga atas (500-300 hPa) dan jet stream.",
      colorInterpretation: "Warna cerah menunjukkan massa udara sangat basah, warna gelap menunjukkan penetrasi massa udara kering tropis.",
      sampleImage: "/api/bmkg/satellite/image?product=water_vapor",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_WE_Indonesia.png",
      isDayNight: "Tersedia 24 Jam (Sensor Emisi Uap Air)",
    },
    {
      id: "rainfall_potential",
      name: "Himawari-9 Rainfall Potential",
      spectralBand: "Turunan Algoritma Hidrologi Satelit",
      resolution: "2 km Gridded",
      refreshInterval: "10 Menit",
      purpose: "Estimasi potensi intensitas curah hujan berdasarkan korelasi suhu puncak awan infrared.",
      colorInterpretation: "Hijau = Sangat Ringan, Biru = Ringan, Kuning = Sedang, Oranye/Merah = Lebat s.d. Sangat Lebat.",
      sampleImage: "/api/bmkg/satellite/image?product=rainfall_potential",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/HIMA/H08_RP_Indonesia.png",
      isDayNight: "Tersedia 24 Jam",
    },
    {
      id: "geohotspot",
      name: "Himawari-9 Geohotspot & Smoke RGB",
      spectralBand: "Shortwave IR 3.9 μm & Visible",
      resolution: "2 km Realtime Detection",
      refreshInterval: "10 Menit",
      purpose: "Mendeteksi anomali suhu termal tinggi (titik panas/karhutla) dan sebaran partikel asap di atas daratan Indonesia.",
      colorInterpretation: "Titik merah berkedip menandakan anomali termal tinggi > 320 K, poligon abu-abu transparan menunjukkan sebaran asap.",
      sampleImage: "/api/bmkg/satellite/image?product=geohotspot",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/GEOHOTSPOT/H08_GH_Asean.png",
      isDayNight: "Sensitif 24 Jam (Paling Akurat Malam Hari)",
    },
    {
      id: "visible",
      name: "Himawari-9 Visible 0.65 μm",
      spectralBand: "Visible Red 0.64 μm (Band 03)",
      resolution: "0.5 km (High Resolution)",
      refreshInterval: "10 Menit",
      purpose: "Mendeteksi detail tekstur struktur awan, kabut asap, dan awan rendah dengan resolusi tertinggi.",
      colorInterpretation: "Reflektivitas albedo matahari murni, menunjukkan bayangan dan batas awan kumuliform secara presisi.",
      sampleImage: "/api/bmkg/satellite/image?product=visible",
      directUrl: "https://inderaja.bmkg.go.id/IMAGE/MTS/VS/MTS_VS_Indonesia.png",
      isDayNight: "Hanya Siang Hari",
    },
  ];

  res.json({
    success: true,
    satellite: "Himawari-9 (JMA & BMKG Geosynchronous Meteorological Satellite)",
    orbitalSlot: "140.7° BT (Cakupan Penuh Indonesia & Pasifik Barat)",
    attribution: "BMKG Pusat Penelitian dan Pengembangan / Kedeputian Meteorologi",
    products,
  });
});

router.get("/radar", (req, res) => {
  const intensityLegend = [
    { code: "SR", label: "Sangat Ringan", rangeMmH: "0.1 - 1.0 mm/jam", dbz: "< 20 dBZ", color: "#6ee7b7" },
    { code: "R", label: "Ringan", rangeMmH: "1.0 - 5.0 mm/jam", dbz: "20 - 30 dBZ", color: "#38bdf8" },
    { code: "S", label: "Sedang", rangeMmH: "5.0 - 10.0 mm/jam", dbz: "30 - 40 dBZ", color: "#fbbf24" },
    { code: "L", label: "Lebat", rangeMmH: "10.0 - 20.0 mm/jam", dbz: "40 - 50 dBZ", color: "#f97316" },
    { code: "SL", label: "Sangat Lebat", rangeMmH: "> 20.0 mm/jam", dbz: "> 50 dBZ (Potensi Hujan Es/Cb)", color: "#ef4444" },
  ];

  const radarStations = [
    { code: "CGK", name: "Radar Soekarno-Hatta (Cengkareng)", lat: -6.125, lng: 106.655, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "SUB", name: "Radar Juanda (Surabaya)", lat: -7.379, lng: 112.787, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "KNO", name: "Radar Kualanamu (Medan)", lat: 3.642, lng: 98.885, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "DPS", name: "Radar Ngurah Rai (Denpasar)", lat: -8.748, lng: 115.167, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "UPG", name: "Radar Sultan Hasanuddin (Makassar)", lat: -5.061, lng: 119.553, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "BPN", name: "Radar Sepinggan (Balikpapan)", lat: -1.268, lng: 116.894, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
    { code: "DJJ", name: "Radar Sentani (Jayapura)", lat: -2.576, lng: 140.516, radiusKm: 240, status: "TERDAFTAR (BELUM TERVERIFIKASI)", operationalStatus: "INVENTORY_UNVERIFIED" },
  ];

  res.json({
    success: true,
    attribution: "BMKG (Wajib menyertakan atribusi BMKG sesuai ketentuan Satu Peta MKG)",
    technology: "Doppler C-Band & X-Band Dual Polarization Radar Network",
    inventoryType: "INVENTORY_STATIONS",
    operationalNote: "Daftar mencerminkan inventaris stasiun radar utama terdaftar; jangkauan merupakan radius geometris nominal (240 km) dan belum memperhitungkan attenuasi topografi atau telemetri aktif live.",
    intensityLegend,
    stationsCount: radarStations.length,
    stations: radarStations,
  });
});

let noaaCache = {
  metar: new Map(),
  kpIndex: { data: null, timestamp: 0 },
  ensoOni: { data: null, timestamp: 0 },
};

const NOAA_CACHE_TTL_MS = 10 * 60 * 1000;

export function __resetBmkgNoaaCacheForTest() {
  noaaCache.metar.clear();
  noaaCache.kpIndex = { data: null, timestamp: 0 };
  noaaCache.ensoOni = { data: null, timestamp: 0 };
}

router.get("/aviation/metar", async (req, res) => {
  const rawIds = typeof req.query.ids === "string" && req.query.ids.trim() ? req.query.ids.trim() : "WARR,WIII,WADD";
  const safeIdsList = rawIds
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9]{4}$/.test(s))
    .slice(0, 12);

  if (safeIdsList.length === 0) {
    return res.status(400).json({
      success: false,
      dataStatus: "ERROR",
      data: [],
      error: "Parameter ICAO stasiun METAR tidak valid.",
    });
  }

  const cacheKey = safeIdsList.join(",");
  const force = req.query.force === "true";
  const now = Date.now();
  const cached = !force ? noaaCache.metar.get(cacheKey) : null;
  if (cached && now - cached.timestamp < NOAA_CACHE_TTL_MS) {
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: true,
      provider: "NOAA Aviation Weather Center (Official ICAO METAR)",
      fetchedAt: new Date(cached.timestamp).toISOString(),
      count: cached.data.length,
      data: cached.data,
    });
  }

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(cacheKey)}&format=json`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "HarmonyGeospatialApp/2.0 (Educational)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }
    const rawList = await response.json();
    if (!Array.isArray(rawList)) {
      throw new Error("INVALID_METAR_JSON_ARRAY");
    }

    const parsed = rawList
      .filter((item) => item && typeof item.icaoId === "string" && typeof item.rawOb === "string")
      .map((item) => ({
        icaoId: item.icaoId,
        name: item.name || item.icaoId,
        reportTime: item.reportTime || item.receiptTime || null,
        obsTime: typeof item.obsTime === "number" ? new Date(item.obsTime * 1000).toISOString() : null,
        rawOb: item.rawOb,
        tempC: typeof item.temp === "number" && Number.isFinite(item.temp) ? item.temp : null,
        dewpointC: typeof item.dewp === "number" && Number.isFinite(item.dewp) ? item.dewp : null,
        windDirDeg: typeof item.wdir === "number" && Number.isFinite(item.wdir) ? item.wdir : null,
        windSpeedKt: typeof item.wspd === "number" && Number.isFinite(item.wspd) ? item.wspd : null,
        visibility: item.visib != null ? String(item.visib) : null,
        altimeterHpa: typeof item.altim === "number" && Number.isFinite(item.altim) ? item.altim : null,
        flightCategory: item.fltCat || null,
        clouds: Array.isArray(item.clouds) ? item.clouds : [],
        lat: typeof item.lat === "number" ? item.lat : null,
        lng: typeof item.lon === "number" ? item.lon : null,
      }));

    if (parsed.length === 0) {
      throw new Error("NO_VALID_METAR_RECORDS");
    }

    noaaCache.metar.set(cacheKey, { timestamp: now, data: parsed });
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: false,
      provider: "NOAA Aviation Weather Center (Official ICAO METAR)",
      fetchedAt: new Date(now).toISOString(),
      count: parsed.length,
      data: parsed,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      dataStatus: "ERROR",
      provider: "NOAA Aviation Weather Center (Official ICAO METAR)",
      fetchedAt: null,
      count: 0,
      data: [],
      error: `Gagal mengambil data METAR live (${err?.message || "Fetch error"}).`,
    });
  }
});

router.get("/geophysics/kp-index", async (req, res) => {
  const force = req.query.force === "true";
  const now = Date.now();
  if (!force && noaaCache.kpIndex.data && now - noaaCache.kpIndex.timestamp < NOAA_CACHE_TTL_MS) {
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: true,
      provider: "NOAA Space Weather Prediction Center (SWPC)",
      fetchedAt: new Date(noaaCache.kpIndex.timestamp).toISOString(),
      data: noaaCache.kpIndex.data,
    });
  }

  const url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "HarmonyGeospatialApp/2.0 (Educational)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }
    const raw = await response.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("EMPTY_KP_RESPONSE");
    }

    let latest = null;
    for (let i = raw.length - 1; i >= 0; i--) {
      const row = raw[i];
      if (row && !Array.isArray(row) && typeof row === "object") {
        const kp = Number(row.Kp ?? row.kp);
        const aRunning = row.a_running != null ? Number(row.a_running) : null;
        const stationCount = row.station_count != null ? Number(row.station_count) : null;
        if (row.time_tag && Number.isFinite(kp)) {
          latest = {
            timeTag: String(row.time_tag),
            kpIndex: kp,
            aRunning: Number.isFinite(aRunning) ? aRunning : null,
            stationCount: Number.isFinite(stationCount) ? stationCount : null,
          };
          break;
        }
      } else if (Array.isArray(row) && row.length >= 2 && row[0] !== "time_tag") {
        const kp = Number(row[1]);
        const aRunning = row[2] != null ? Number(row[2]) : null;
        const stationCount = row[3] != null ? Number(row[3]) : null;
        if (Number.isFinite(kp)) {
          latest = {
            timeTag: String(row[0]),
            kpIndex: kp,
            aRunning: Number.isFinite(aRunning) ? aRunning : null,
            stationCount: Number.isFinite(stationCount) ? stationCount : null,
          };
          break;
        }
      }
    }

    if (!latest) {
      throw new Error("INVALID_KP_RECORDS");
    }

    let stormScale = "G0";
    let statusText = "Tenang (Tidak ada badai geomagnetik)";
    if (latest.kpIndex >= 9) {
      stormScale = "G5";
      statusText = "Badai Geomagnetik Ekstrem";
    } else if (latest.kpIndex >= 8) {
      stormScale = "G4";
      statusText = "Badai Geomagnetik Parah";
    } else if (latest.kpIndex >= 7) {
      stormScale = "G3";
      statusText = "Badai Geomagnetik Kuat";
    } else if (latest.kpIndex >= 6) {
      stormScale = "G2";
      statusText = "Badai Geomagnetik Sedang";
    } else if (latest.kpIndex >= 5) {
      stormScale = "G1";
      statusText = "Badai Geomagnetik Ringan";
    } else if (latest.kpIndex >= 4) {
      stormScale = "G0-Active";
      statusText = "Aktif (Belum mencapai ambang badai G1)";
    }

    const result = {
      ...latest,
      stormScale,
      statusText,
    };

    noaaCache.kpIndex = { data: result, timestamp: now };
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: false,
      provider: "NOAA Space Weather Prediction Center (SWPC)",
      fetchedAt: new Date(now).toISOString(),
      data: result,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      dataStatus: "ERROR",
      provider: "NOAA Space Weather Prediction Center (SWPC)",
      fetchedAt: null,
      data: null,
      error: `Gagal mengambil data Planetary Kp-Index live (${err?.message || "Fetch error"}).`,
    });
  }
});

router.get("/climate/enso-oni", async (req, res) => {
  const force = req.query.force === "true";
  const now = Date.now();
  if (!force && noaaCache.ensoOni.data && now - noaaCache.ensoOni.timestamp < NOAA_CACHE_TTL_MS) {
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: true,
      provider: "NOAA Climate Prediction Center (CPC Niño 3.4 ONI)",
      fetchedAt: new Date(noaaCache.ensoOni.timestamp).toISOString(),
      data: noaaCache.ensoOni.data,
    });
  }

  const url = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "HarmonyGeospatialApp/2.0 (Educational)",
        "Accept": "text/plain",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    const rows = [];
    for (const line of lines) {
      const m = line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)$/);
      if (m) {
        const year = parseInt(m[2], 10);
        const totalSstC = parseFloat(m[3]);
        const anomalyOni = parseFloat(m[4]);
        if (Number.isFinite(year) && Number.isFinite(totalSstC) && Number.isFinite(anomalyOni)) {
          rows.push({ season: m[1], year, totalSstC, anomalyOni });
        }
      }
    }

    if (rows.length === 0) {
      throw new Error("INVALID_ONI_ASCII_FORMAT");
    }

    const latest = rows[rows.length - 1];
    let phase = "Netral";
    if (latest.anomalyOni >= 2.0) phase = "El Niño Sangat Kuat";
    else if (latest.anomalyOni >= 1.5) phase = "El Niño Kuat";
    else if (latest.anomalyOni >= 1.0) phase = "El Niño Moderat";
    else if (latest.anomalyOni >= 0.5) phase = "El Niño Lemah";
    else if (latest.anomalyOni <= -2.0) phase = "La Niña Sangat Kuat";
    else if (latest.anomalyOni <= -1.5) phase = "La Niña Kuat";
    else if (latest.anomalyOni <= -1.0) phase = "La Niña Moderat";
    else if (latest.anomalyOni <= -0.5) phase = "La Niña Lemah";

    const result = {
      season: latest.season,
      year: latest.year,
      totalSstC: latest.totalSstC,
      anomalyOni: latest.anomalyOni,
      phase,
      recentSeries: rows.slice(-6),
    };

    noaaCache.ensoOni = { data: result, timestamp: now };
    return res.json({
      success: true,
      dataStatus: "LIVE",
      cached: false,
      provider: "NOAA Climate Prediction Center (CPC Niño 3.4 ONI)",
      fetchedAt: new Date(now).toISOString(),
      data: result,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      dataStatus: "ERROR",
      provider: "NOAA Climate Prediction Center (CPC Niño 3.4 ONI)",
      fetchedAt: null,
      data: null,
      error: `Gagal mengambil data ENSO ONI live (${err?.message || "Fetch error"}).`,
    });
  }
});

export default router;
