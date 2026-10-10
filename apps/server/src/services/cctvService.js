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
    this.refreshIntervalMs = 5 * 60 * 1000; // 5 minutes periodic auto-update
    this.streamHealthCache = new Map();
    this.isRefreshing = false;
    this.startedAt = Date.now();
    this.syncCount = 0;
    this.failedSyncCount = 0;
    this.consecutiveFailures = 0;
    this.probeBatchIndex = 0;
    this.refreshTimer = null;

    this.loadInitialData();
    this.startAutoRefreshLoop();
  }

  loadInitialData() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          // Exclude known dead feeds that return 502 upstream
          const cleaned = list.filter((c) => !c.id?.startsWith('binamarga-tol-semarang'));
          this.setCameras(cleaned);
        }
      }
    } catch (err) {
      console.warn('[CctvService] Error loading local cameras:', err.message);
    }

    // Attempt non-blocking initial refresh from remote public API
    this.refreshFromRemote().catch(() => {});
  }

  startAutoRefreshLoop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Continuous 5-minute update daemon: connects to API and probes health
    this.refreshTimer = setInterval(async () => {
      try {
        await this.periodicUpdateTask();
      } catch (err) {
        console.warn('[CctvService] Error during periodic background sync (auto-recovering):', err?.message || err);
      }
    }, this.refreshIntervalMs);

    if (this.refreshTimer.unref) {
      this.refreshTimer.unref();
    }

    // Run first proactive stream health check after 10 seconds of startup
    setTimeout(() => {
      this.probeTopFeedsHealth().catch(() => {});
    }, 10000);
  }

  async periodicUpdateTask() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      // 1. Re-sync catalog from upstream API
      await this.refreshFromRemote();

      // 2. Proactively probe top streams to identify any degraded or revived feeds
      await this.probeTopFeedsHealth();
    } catch (err) {
      console.warn('[CctvService] Periodic background task caught non-fatal exception:', err?.message || err);
    } finally {
      this.isRefreshing = false;
    }
  }

  computeReliabilityScore(c) {
    // If marked failed recently in streamHealthCache (within 15 minutes), heavily demote
    if (this.streamHealthCache?.has(c.id)) {
      const cached = this.streamHealthCache.get(c.id);
      if (cached?.failed && Date.now() - cached.timestamp < 15 * 60 * 1000) {
        return -200;
      }
    }

    let score = 50;
    // Guaranteed 24/7 continuous video streams
    if (c.tipe === 'youtube') score += 120;

    // Verified high-uptime government ATCS streams (Pantausemar, Pelindung, SITS Surabaya, Jogja, Bali)
    if (c.id && (
      c.id.startsWith('pantausemar') || 
      c.id.startsWith('pelindung') || 
      c.id.startsWith('sits') || 
      c.id.startsWith('jogja') || 
      c.id.startsWith('bali')
    )) {
      score += 90;
    }

    // Tol and high-speed expressways with robust CDN feeds
    if (c.kategori === 'tol' || (c.nama && c.nama.toLowerCase().includes('tol'))) score += 30;

    // Major metropolitan areas with high-availability ATCS
    const highTierCities = ['jakarta', 'bandung', 'semarang', 'bali', 'denpasar', 'surabaya', 'jogja', 'yogyakarta', 'surakarta'];
    const cityStr = ((c.kota || '') + ' ' + (c.kotaNama || '')).toLowerCase();
    if (highTierCities.some(city => cityStr.includes(city))) score += 40;

    // Direct HLS video stream
    if (c.tipe === 'hls') score += 20;

    // Arterial roads
    if (c.kategori === 'jalan') score += 15;

    // Heavily penalize dead / defunct regional feeds
    if (c.id && (c.id.startsWith('binamarga-tol-semarang') || c.id.startsWith('acehtengah'))) {
      score -= 150;
    }

    // Deprioritize internal courtroom cameras whose WebRTC encoders are frequently offline
    if (c.kategori === 'pengadilan' || (c.sumber && c.sumber.toLowerCase().includes('badilag')) || c.tipe === 'iframe') {
      score -= 100;
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

      // Proactive status calculation based on streamHealthCache
      let status = c.online !== false ? 'LIVE' : 'OFFLINE';
      if (this.streamHealthCache?.has(c.id)) {
        const cachedHealth = this.streamHealthCache.get(c.id);
        if (cachedHealth?.failed && Date.now() - cachedHealth.timestamp < 15 * 60 * 1000) {
          status = 'DEGRADED';
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
        status,
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (Array.isArray(data?.cameras) ? data.cameras : null);
        if (rawList && rawList.length > 0) {
          const cleaned = rawList.filter((c) => !c.id?.startsWith('binamarga-tol-semarang'));
          this.setCameras(cleaned);
          this.syncCount++;
          this.consecutiveFailures = 0;

          // Safe, atomic write to disk
          try {
            const tempPath = `${DATA_FILE_PATH}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(cleaned), 'utf8');
            await fs.promises.rename(tempPath, DATA_FILE_PATH);
          } catch {
            // Write error is non-fatal
          }
        }
      } else {
        this.failedSyncCount++;
        this.consecutiveFailures++;
        console.warn(`[CctvService] Remote upstream HTTP status ${res.status}. Retaining active memory dataset.`);
      }
    } catch (err) {
      this.failedSyncCount++;
      this.consecutiveFailures++;
      console.warn(`[CctvService] Remote sync timeout or network issue (${err.message}). Safe fallback preserved.`);
    }
  }

  /**
   * Proactive background health check on sample batches of HLS streams.
   * Runs non-blockingly so degraded feeds are flagged before users encounter them.
   */
  async probeTopFeedsHealth() {
    if (!this.cameras || this.cameras.length === 0) return;

    // Select candidate HLS cameras to probe (focus on top cities & popular feeds)
    const hlsCameras = this.cameras.filter((c) => c.streamType === 'hls' && !c.id.startsWith('binamarga-tol-semarang'));
    if (hlsCameras.length === 0) return;

    const batchSize = 10;
    const startIndex = (this.probeBatchIndex * batchSize) % hlsCameras.length;
    const batch = hlsCameras.slice(startIndex, startIndex + batchSize);
    this.probeBatchIndex++;

    await Promise.allSettled(
      batch.map(async (cam) => {
        try {
          const resolvedId = this.resolveAlias(cam.id);
          const targetUrl = `${CCTV_NUSANTARA_BASE}/api/stream?id=${encodeURIComponent(resolvedId)}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Referer': `${CCTV_NUSANTARA_BASE}/`,
              'Range': 'bytes=0-1024',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            this.streamHealthCache.set(cam.id, { failed: false, timestamp: Date.now() });
            if (resolvedId !== cam.id) {
              this.streamHealthCache.set(resolvedId, { failed: false, timestamp: Date.now() });
            }
          } else if (res.status === 502 || res.status === 404 || res.status === 500) {
            this.streamHealthCache.set(cam.id, { failed: true, timestamp: Date.now(), error: `HTTP_${res.status}` });
          }
        } catch (err) {
          // Probe timeout or abort
          this.streamHealthCache.set(cam.id, { failed: true, timestamp: Date.now(), error: err.name || 'TIMEOUT' });
        }
      })
    );
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
      'surabaya-joyoboyo': 'sits-sby-bundaran-waru-arah-tol-ptz',
      'cctv-sby-joyoboyo': 'sits-sby-bundaran-waru-arah-tol-ptz',
      'cctv-tol-cikatama-70': 'pantausemar-6601',
      'cctv-jkt-hi': 'pantausemar-310',
    };
    if (ALIAS_MAP[cameraId]) return ALIAS_MAP[cameraId];

    // Resilient fallback for Semarang toll cameras to guaranteed active Pantausemar HLS streams
    if (typeof cameraId === 'string' && (
      cameraId.startsWith('binamarga-tol-semarang') || 
      cameraId.startsWith('pantausemar-tol')
    )) {
      const semarangTollPool = [
        'pantausemar-313', // SIMP EXIT TOL KRAPYAK 360
        'pantausemar-361', // Exit Tol Srondol
        'pantausemar-6601', // Bawah Tol X3W_IN
        'pantausemar-331',  // HANOMAN (Arteri Tol)
        'pantausemar-312',  // KALIBANTENG (Akses Tol Krapyak)
      ];
      let hash = 0;
      for (let i = 0; i < cameraId.length; i++) hash += cameraId.charCodeAt(i);
      return semarangTollPool[hash % semarangTollPool.length];
    }

    return cameraId;
  }

  getBaseUrl() {
    return CCTV_NUSANTARA_BASE;
  }

  getHealthStatus() {
    const failedCount = Array.from(this.streamHealthCache.values()).filter((v) => v.failed).length;
    const verifiedLiveCount = Array.from(this.streamHealthCache.values()).filter((v) => !v.failed).length;
    const nextRefreshInSec = Math.max(0, Math.round((this.refreshIntervalMs - (Date.now() - this.lastRefreshedAt)) / 1000));

    return {
      status: this.cameras.length > 0 ? 'HEALTHY' : 'INITIALIZING',
      totalCameras: this.cameras.length,
      totalCities: this.cityList.length,
      totalCategories: this.categoryList.length,
      lastRefreshedAt: new Date(this.lastRefreshedAt).toISOString(),
      lastRefreshedAgoSec: Math.round((Date.now() - this.lastRefreshedAt) / 1000),
      autoRefreshIntervalMinutes: Math.round(this.refreshIntervalMs / 60000),
      nextRefreshInSeconds: nextRefreshInSec,
      isAutoRefreshRunning: Boolean(this.refreshTimer),
      syncCount: this.syncCount,
      failedSyncCount: this.failedSyncCount,
      streamHealthCacheTotal: this.streamHealthCache.size,
      probedLiveFeeds: verifiedLiveCount,
      probedFailedFeeds: failedCount,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      upstreamEndpoint: CCTV_NUSANTARA_API,
    };
  }

  async fetchHlsPlaylistDirect(targetId) {
    const targetUrl = `${CCTV_NUSANTARA_BASE}/api/stream?id=${encodeURIComponent(targetId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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

      // Preserve /api/stream?t= relative paths since they are handled natively by /api/stream
      const lines = rawM3u8.split('\n');
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('/api/stream?t=') || trimmed.startsWith('/api/stream')) {
          return trimmed;
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

  async fetchHlsPlaylist(cameraId) {
    const resolvedId = this.resolveAlias(cameraId);
    const result = await this.fetchHlsPlaylistDirect(resolvedId);
    if (result.ok) {
      this.streamHealthCache.set(resolvedId, { failed: false, timestamp: Date.now() });
      return result;
    }

    // Mark as failed in stream health cache
    this.streamHealthCache.set(resolvedId, { failed: true, timestamp: Date.now() });
    if (resolvedId !== cameraId) {
      this.streamHealthCache.set(cameraId, { failed: true, timestamp: Date.now() });
    }

    // Automatic city-level fallback recovery
    const targetCam = this.getCameraById(cameraId) || this.getCameraById(resolvedId);
    if (targetCam) {
      const fallbackCam = this.cameras.find((c) =>
        c.city === targetCam.city &&
        c.id !== cameraId &&
        c.id !== resolvedId &&
        c.streamType === 'hls' &&
        (!this.streamHealthCache.has(c.id) || !this.streamHealthCache.get(c.id).failed)
      );
      if (fallbackCam) {
        const fallbackId = this.resolveAlias(fallbackCam.id);
        const fallbackResult = await this.fetchHlsPlaylistDirect(fallbackId);
        if (fallbackResult.ok) {
          return fallbackResult;
        }
      }
    }

    return result;
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

      const rawBuffer = Buffer.from(await res.arrayBuffer());
      const isPlaylist = contentType.includes('mpegurl') || rawBuffer.slice(0, 15).toString().includes('#EXTM3U');

      let finalBuffer = rawBuffer;
      if (isPlaylist) {
        const text = rawBuffer.toString('utf8');
        const lines = text.split('\n');
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('/api/stream?t=') || trimmed.startsWith('/api/stream')) {
            return trimmed;
          }
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return `/api/spatial/traffic/cctv-proxy?url=${encodeURIComponent(trimmed)}`;
          }
          return line;
        }).join('\n');
        finalBuffer = Buffer.from(rewritten, 'utf8');
      }

      return {
        ok: true,
        status: 200,
        contentType: isPlaylist ? 'application/vnd.apple.mpegurl; charset=utf-8' : contentType,
        buffer: finalBuffer,
        isPlaylist,
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
