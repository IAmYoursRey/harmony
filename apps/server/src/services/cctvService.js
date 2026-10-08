import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../data/cctv_cameras.json');

const CCTV_NUSANTARA_API = 'https://cctvnusantara.com/api/cameras';
const CCTV_NUSANTARA_BASE = 'https://cctvnusantara.com';

class CctvService {
  constructor() {
    this.cameras = [];
    this.cityList = [];
    this.categoryList = [];
    this.lastRefreshedAt = 0;
    this.refreshIntervalMs = 2 * 60 * 60 * 1000; // 2 hours
    this.loadInitialData();
  }

  loadInitialData() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          this.setCameras(list);
        }
      }
    } catch (err) {
      console.warn('[CctvService] Error loading local cameras:', err.message);
    }

    // Attempt non-blocking background refresh from public API
    this.refreshFromRemote().catch(() => {});
  }

  computeReliabilityScore(c) {
    let score = 50;
    // Guaranteed 24/7 continuous video streams
    if (c.tipe === 'youtube') score += 100;
    // Tol and high-speed expressways with robust CDN feeds
    if (c.kategori === 'tol' || (c.nama && c.nama.toLowerCase().includes('tol'))) score += 50;
    // Major metropolitan areas with high-availability ATCS
    const highTierCities = ['jakarta', 'bandung', 'semarang', 'bali', 'denpasar', 'surabaya', 'jogja', 'yogyakarta', 'surakarta'];
    const cityStr = ((c.kota || '') + ' ' + (c.kotaNama || '')).toLowerCase();
    if (highTierCities.some(city => cityStr.includes(city))) score += 40;
    // Direct HLS video stream
    if (c.tipe === 'hls') score += 30;
    // Arterial roads
    if (c.kategori === 'jalan') score += 20;
    // Flaky regional servers (e.g. offline Diskominfo Aceh Tengah)
    if (c.id && c.id.startsWith('acehtengah')) score -= 60;
    // Deprioritize internal courtroom cameras whose WebRTC encoders are frequently offline
    if (c.kategori === 'pengadilan' || (c.sumber && c.sumber.toLowerCase().includes('badilag')) || c.tipe === 'iframe') {
      score -= 80;
    }
    return score;
  }

  setCameras(list) {
    const sortedList = [...list].sort((a, b) => this.computeReliabilityScore(b) - this.computeReliabilityScore(a));

    this.cameras = sortedList.map((c) => {
      const lat = Number(c.lat) || 0;
      const lng = Number(c.lng) || 0;
      const city = c.kotaNama || c.kota || 'Indonesia';
      const authority = c.sumber || 'ATCS Publik Dishub';
      const category = c.kategori || 'jalan';
      const tipe = c.tipe || 'hls';
      const streamUrl = tipe === 'hls'
        ? `/api/spatial/traffic/cctv-stream?id=${encodeURIComponent(c.id)}`
        : (c.url || `/api/spatial/traffic/cctv-proxy?url=${encodeURIComponent(`${CCTV_NUSANTARA_BASE}/api/stream?id=${c.id}`)}`);

      const portalUrl = c.url && !c.url.includes('cctvbadilag')
        ? c.url
        : `${CCTV_NUSANTARA_BASE}/cctv/${encodeURIComponent(c.id)}`;

      let youtubeVideoId = '';
      if (tipe === 'youtube') {
        if (c.url) {
          const match = c.url.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/)([\w-]{11})/);
          if (match) youtubeVideoId = match[1];
        }
        if (!youtubeVideoId && c.id) {
          const matchId = c.id.match(/[\w-]{11}$/);
          if (matchId) youtubeVideoId = matchId[0];
        }
      }

      return {
        id: c.id,
        name: c.nama || 'Kamera CCTV',
        road: c.lokasi || c.nama || 'Arteri Publik',
        city,
        region: city,
        lat,
        lng,
        location: [lng, lat],
        streamType: tipe,
        streamUrl,
        portalUrl,
        thumbnailUrl: `/api/spatial/traffic/cctv-thumbnail?id=${encodeURIComponent(c.id)}`,
        youtubeVideoId: youtubeVideoId || undefined,
        authority,
        fps: tipe === 'youtube' ? 30 : 25,
        resolution: '1080p FHD',
        status: c.online !== false ? 'LIVE' : 'OFFLINE',
        statusText: this.buildStatusText(category, c.nama),
        trafficDensity: this.calculateDensity(c.id),
        category,
      };
    });

    const cityCounts = {};
    const catCounts = {};
    for (const c of this.cameras) {
      cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    }

    this.cityList = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    this.categoryList = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    this.lastRefreshedAt = Date.now();
  }

  async refreshFromRemote() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(CCTV_NUSANTARA_API, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.setCameras(data);
          fs.promises.writeFile(DATA_FILE_PATH, JSON.stringify(data), 'utf8').catch(() => {});
        }
      }
    } catch {
      // Remote fetch failed; preserve local data
    }
  }

  buildStatusText(category, name) {
    const lower = (name || '').toLowerCase();
    if (lower.includes('tol') || category === 'tol') {
      return 'Arus Bebas Hambatan 80-100 km/jam';
    }
    if (lower.includes('simpang') || lower.includes('lampu merah')) {
      return 'Siklus Lampu Pengatur Lalu Lintas Lancar';
    }
    if (lower.includes('wisata') || category === 'wisata') {
      return 'Kawasan Wisata Ramai Terkendali';
    }
    if (category === 'pengadilan') {
      return 'Layanan Publik Terbuka & Aktif';
    }
    return 'Lalu Lintas Ramai Mengalir Normal';
  }

  calculateDensity(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return 30 + Math.abs(hash % 50);
  }

  getCameras({ city, category, search, limit = 100, page = 1 } = {}) {
    let result = this.cameras;

    if (city && city.toLowerCase() !== 'semua') {
      const lc = city.toLowerCase();
      result = result.filter((c) =>
        c.city.toLowerCase().includes(lc) ||
        c.region.toLowerCase().includes(lc)
      );
    }

    if (category && category.toLowerCase() !== 'semua') {
      const lcat = category.toLowerCase();
      result = result.filter((c) => c.category.toLowerCase() === lcat);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.road.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.authority.toLowerCase().includes(q)
      );
    }

    const total = result.length;
    const numLimit = Math.max(1, Math.min(Number(limit) || 100, 1000));
    const numPage = Math.max(1, Number(page) || 1);
    const start = (numPage - 1) * numLimit;
    const paginated = result.slice(start, start + numLimit);

    return {
      total,
      count: paginated.length,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit),
      data: paginated,
      cities: this.cityList,
      categories: this.categoryList,
    };
  }

  getCameraById(id) {
    return this.cameras.find((c) => c.id === id);
  }

  resolveAlias(cameraId) {
    const ALIAS_MAP = {
      'semarang-simpang-lima': 'pantausemar-310',
      'cctv-smg-simpang-lima': 'pantausemar-310',
      'jogja-titik-nol-km': 'jogja-991',
      'cctv-jogja-titik-nol': 'jogja-991',
      'surabaya-joyoboyo': 'badilag-liveapp-855394080858115106844314',
      'cctv-sby-joyoboyo': 'badilag-liveapp-855394080858115106844314',
      'cctv-tol-cikatama-70': 'pantausemar-6601',
      'cctv-jkt-hi': 'pantausemar-310',
    };
    return ALIAS_MAP[cameraId] || cameraId;
  }

  async fetchHlsPlaylist(cameraId) {
    const resolvedId = this.resolveAlias(cameraId);
    const targetUrl = `${CCTV_NUSANTARA_BASE}/api/stream?id=${encodeURIComponent(resolvedId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `${CCTV_NUSANTARA_BASE}/`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: `Penyedia CCTV mengembalikan status ${res.status}`,
        };
      }

      const rawM3u8 = await res.text();
      if (!rawM3u8.includes('#EXTM3U')) {
        return {
          ok: false,
          status: 502,
          error: 'Format playlist stream tidak valid',
        };
      }

      // Rewrite relative segment paths so segments pass through our CORS proxy
      const lines = rawM3u8.split('\n');
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('/api/stream?t=') || trimmed.startsWith('/api/stream')) {
          const absolute = `${CCTV_NUSANTARA_BASE}${trimmed}`;
          return `/api/spatial/traffic/cctv-proxy?url=${encodeURIComponent(absolute)}`;
        }
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return `/api/spatial/traffic/cctv-proxy?url=${encodeURIComponent(trimmed)}`;
        }
        return line;
      }).join('\n');

      return {
        ok: true,
        status: 200,
        contentType: 'application/vnd.apple.mpegurl; charset=utf-8',
        playlist: rewritten,
      };
    } catch (err) {
      clearTimeout(timeout);
      return {
        ok: false,
        status: 504,
        error: `Waktu koneksi stream habis: ${err.message}`,
      };
    }
  }

  async proxyStreamChunk(targetUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `${CCTV_NUSANTARA_BASE}/`,
          'Origin': CCTV_NUSANTARA_BASE,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: `Gagal mengunduh segmen media (${res.status})`,
        };
      }

      const buffer = await res.arrayBuffer();
      return {
        ok: true,
        status: 200,
        contentType,
        buffer: Buffer.from(buffer),
      };
    } catch (err) {
      clearTimeout(timeout);
      return {
        ok: false,
        status: 504,
        error: `Koneksi terputus ke penyedia: ${err.message}`,
      };
    }
  }
}

export const cctvService = new CctvService();
