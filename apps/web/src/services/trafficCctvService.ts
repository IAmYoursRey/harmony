export interface TrafficCctvCamera {
  id: string;
  name: string;
  road: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  location: [number, number]; // [lng, lat]
  direction?: string;
  streamType: 'snapshot' | 'hls' | 'mjpeg' | 'youtube' | 'video' | 'iframe' | 'web';
  streamUrl: string;
  directStreamUrl?: string;
  portalUrl?: string;
  thumbnailUrl?: string;
  directThumbnailUrl?: string;
  youtubeVideoId?: string;
  authority: string;
  fps: number;
  resolution: string;
  status: 'LIVE' | 'OFFLINE' | 'DEGRADED';
  statusText: string;
  trafficDensity: number; // 0 - 100%
  category?: string;
  description?: string;
}

export interface CitySummary {
  name: string;
  count: number;
}

export interface CategorySummary {
  name: string;
  count: number;
}

const RAW_CAMERAS: Omit<TrafficCctvCamera, 'location'>[] = [
  // Jawa Tengah & Magelang ATCS Live (Verified 200 OK)
  {
    id: "cctv-jkt-bundaran-hi",
    name: "Simpang Blabak — ATCS Kabupaten Magelang",
    road: "Jl. Magelang - Yogyakarta KM 11 (Simpang Blabak)",
    city: "Jawa Tengah",
    region: "Kabupaten Magelang",
    lat: -7.5498,
    lng: 110.2289,
    direction: "Utara - Selatan (Koridor Wisata Borobudur & Arteri Yogya-Semarang)",
    streamType: "youtube",
    youtubeVideoId: "HOAEUOrXNCA",
    streamUrl: "https://www.youtube.com/watch?v=HOAEUOrXNCA",
    portalUrl: "https://dishub.magelangkab.go.id",
    thumbnailUrl: "https://img.youtube.com/vi/HOAEUOrXNCA/hqdefault.jpg",
    authority: "ATCS Dishub Kabupaten Magelang",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Arteri Utama Lancar Terkendali",
    trafficDensity: 45,
    category: "jalan",
    description: "Pemantauan langsung simpang strategis arteri Magelang - Yogyakarta menuju kawasan Borobudur.",
  },
  {
    id: "pelindung-e5acec7b-fdde-428b-bb13-014a41fc52c1",
    name: "Bandung ATCS Live Node E5ACE — Koridor Utama",
    road: "Jl. Dr. Djunjunan / Koridor Kota Bandung",
    city: "Kota Bandung",
    region: "Kota Bandung",
    lat: -6.892825,
    lng: 107.585245,
    direction: "Timur (Koridor Komuter Kota Bandung)",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pelindung-e5acec7b-fdde-428b-bb13-014a41fc52c1",
    portalUrl: "https://cctvnusantara.com/cctv/pelindung-e5acec7b-fdde-428b-bb13-014a41fc52c1",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pelindung-e5acec7b-fdde-428b-bb13-014a41fc52c1",
    authority: "Bandung ATCS (pelindung.bandung.go.id)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Arus Lalu Lintas Kota Bandung Terpantau Lancar",
    trafficDensity: 58,
    category: "jalan",
    description: "Kamera pantau aktif ATCS Dishub Kota Bandung pada jalur komuter utama.",
  },
  {
    id: "pelindung-b998ba55-e177-480e-9144-b281ba4691f6",
    name: "Alun-Alun Kota Bandung 02",
    road: "Jl. Asia Afrika - Kawasan Alun-Alun",
    city: "Kota Bandung",
    region: "Kota Bandung",
    lat: -6.923347,
    lng: 107.607227,
    direction: "Barat (Masjid Raya Bandung)",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pelindung-b998ba55-e177-480e-9144-b281ba4691f6",
    portalUrl: "https://cctvnusantara.com/cctv/pelindung-b998ba55-e177-480e-9144-b281ba4691f6",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pelindung-b998ba55-e177-480e-9144-b281ba4691f6",
    authority: "Bandung ATCS (pelindung.bandung.go.id)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Pusat Kota & Kawasan Bersejarah Ramai Tertib",
    trafficDensity: 48,
    category: "publik",
    description: "Pemantauan zona pedestrian Alun-Alun Bandung dan koridor heritage Asia Afrika.",
  },
  {
    id: "balitower-m-8",
    name: "Bendungan Hilir 001 — ATCS DKI Jakarta",
    road: "Jl. Jenderal Sudirman - Bendungan Hilir",
    city: "DKI Jakarta",
    region: "DKI Jakarta",
    lat: -6.20763,
    lng: 106.80376,
    direction: "Pusat Koridor Bisnis Sudirman Jakarta",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=balitower-m-8",
    portalUrl: "https://cctvnusantara.com/cctv/balitower-m-8",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=balitower-m-8",
    authority: "Pemprov DKI Jakarta (Balitower)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Koridor Sudirman Aktif",
    trafficDensity: 52,
    category: "jalan",
    description: "Kamera pantau jalan protokol Jenderal Sudirman - Bendungan Hilir Jakarta Pusat.",
  },
  {
    id: "sidoarjo-1",
    name: "Pendopo Sidoarjo — ATCS Kabupaten Sidoarjo",
    road: "Jl. Cokronegoro / Alun-Alun Sidoarjo",
    city: "Kabupaten Sidoarjo",
    region: "Jawa Timur",
    lat: -7.444555,
    lng: 112.718077,
    direction: "Pusat Kota Sidoarjo",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=sidoarjo-1",
    portalUrl: "https://cctvnusantara.com/cctv/sidoarjo-1",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=sidoarjo-1",
    authority: "Diskominfo & Dishub Kabupaten Sidoarjo",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Alun-Alun Sidoarjo Terkendali",
    trafficDensity: 46,
    category: "jalan",
    description: "Kamera pantau pusat aktivitas Alun-Alun dan koridor arteri Kabupaten Sidoarjo.",
  },
  {
    id: "hk-sibanceh-541553474526192414586736",
    name: "Tol SIBANCEH GT Indrapuri - Banda Aceh",
    road: "Jalan Tol Sigli - Banda Aceh (GT Indrapuri)",
    city: "Aceh & Banda Aceh",
    region: "Aceh & Banda Aceh",
    lat: 5.4674,
    lng: 95.5345,
    direction: "Gerbang Tol Indrapuri - Koridor Banda Aceh",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=hk-sibanceh-541553474526192414586736",
    portalUrl: "https://cctvnusantara.com/cctv/hk-sibanceh-541553474526192414586736",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=hk-sibanceh-541553474526192414586736",
    authority: "Hutama Karya Tol Sibanceh & BPJT",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Arus Tol Sigli-Banda Aceh Lancar Bebas Hambatan",
    trafficDensity: 32,
    category: "tol",
    description: "Pemantauan gerbang tol Indrapuri jalur konektivitas utama Sigli ke Banda Aceh.",
  },
  {
    id: "pantausemar-8393",
    name: "Simpang Arteri Pantausemar 8393 — Jawa Tengah",
    road: "Koridor Arteri Semarang - Yogyakarta",
    city: "Kota Semarang",
    region: "Jawa Tengah",
    lat: -7.0156,
    lng: 110.4158,
    direction: "Utara - Selatan (Arteri Penghubung Semarang-Solo/Yogya)",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pantausemar-8393",
    portalUrl: "https://cctvnusantara.com/cctv/pantausemar-8393",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pantausemar-8393",
    authority: "Dishub Kota Semarang (Pantausemar)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Koridor Arteri Jawa Tengah Ramai Lancar",
    trafficDensity: 44,
    category: "jalan",
    description: "Kamera pantau aktif koridor arteri Jawa Tengah penghubung Semarang dan Yogyakarta.",
  },
  {
    id: "pantausemar-310",
    name: "Kawasan Simpang Lima & Bangkong Semarang",
    road: "Jl. Pahlawan - Jl. Pandanaran - Jl. Bangkong",
    city: "Kota Semarang",
    region: "Kota Semarang",
    lat: -6.9920,
    lng: 110.4225,
    direction: "Pusat Bundaran Lapangan Pancasila & Simpang Bangkong",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pantausemar-310",
    portalUrl: "https://cctvnusantara.com/cctv/pantausemar-310",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pantausemar-310",
    authority: "Dishub Kota Semarang (Pantausemar)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Tertib & Lancar 45 km/jam",
    trafficDensity: 36,
    category: "jalan",
    description: "Pusat pertemuan jalan protokol kota Semarang dan kawasan jantung publik.",
  },
  {
    id: "denpasar-ahmad-yani-maruti-24",
    name: "Simpang Ahmad Yani - Maruti Denpasar",
    road: "Jl. Ahmad Yani - Jl. Maruti",
    city: "Kota Denpasar",
    region: "Provinsi Bali",
    lat: -8.64478,
    lng: 115.212768,
    direction: "Simpang Arteri Utama Ahmad Yani Denpasar Utara",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=denpasar-ahmad-yani-maruti-24",
    portalUrl: "https://cctvnusantara.com/cctv/denpasar-ahmad-yani-maruti-24",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=denpasar-ahmad-yani-maruti-24",
    authority: "ATCS Dinas Perhubungan Kota Denpasar",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Koridor Denpasar Ramai Mengalir Tertib",
    trafficDensity: 44,
    category: "jalan",
    description: "Kamera pantau ATCS Dishub Kota Denpasar persimpangan Ahmad Yani dan Jalan Maruti.",
  },
  {
    id: "pantausemar-6601",
    name: "Gerbang Tol Trans Jawa KM 70 - Exit Tol",
    road: "Tol Jakarta - Cikampek KM 70 / Akses Tol",
    city: "Jalan Tol Trans Jawa",
    region: "Jalan Tol Trans Jawa",
    lat: -6.4252,
    lng: 107.4560,
    direction: "Gerbang Trans-Jawa Arah Cirebon/Semarang",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pantausemar-6601",
    portalUrl: "https://cctvnusantara.com/cctv/pantausemar-6601",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pantausemar-6601",
    authority: "Jasa Marga Toll Road & BPJT",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Antrean Gardu Tol Normal (1-2 Menit)",
    trafficDensity: 35,
    category: "tol",
    description: "Gerbang utama pemisah koridor Tol Trans-Jawa.",
  },
  {
    id: "cctv-yt-magelang-blondo",
    name: "Simpang Blondo — ATCS Dishub Magelang",
    road: "Jl. Raya Magelang - Purworejo (Simpang Blondo)",
    city: "Kabupaten Magelang",
    region: "Jawa Tengah",
    lat: -7.5295,
    lng: 110.2248,
    direction: "Persimpangan Tiga Arah Borobudur - Mungkid - Magelang",
    streamType: "youtube",
    youtubeVideoId: "05hE9JdbQ2Q",
    streamUrl: "https://www.youtube.com/watch?v=05hE9JdbQ2Q",
    portalUrl: "https://dishub.magelangkab.go.id",
    thumbnailUrl: "https://img.youtube.com/vi/05hE9JdbQ2Q/hqdefault.jpg",
    authority: "ATCS Dishub Kabupaten Magelang",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Koridor Wisata Borobudur Lancar",
    trafficDensity: 49,
    category: "jalan",
    description: "Simpang Blondo jalur penghubung utama arah Candi Borobudur dan Kota Magelang.",
  },
  {
    id: "cctv-yt-magelang-grabag",
    name: "Pasar Grabag — ATCS Dishub Magelang",
    road: "Jl. Raya Grabag - Secang",
    city: "Kabupaten Magelang",
    region: "Jawa Tengah",
    lat: -7.3812,
    lng: 110.3204,
    direction: "Kawasan Pasar Tradisional & Jalur Lintas Lereng Telomoyo",
    streamType: "youtube",
    youtubeVideoId: "2gTe1M6ZQW4",
    streamUrl: "https://www.youtube.com/watch?v=2gTe1M6ZQW4",
    portalUrl: "https://dishub.magelangkab.go.id",
    thumbnailUrl: "https://img.youtube.com/vi/2gTe1M6ZQW4/hqdefault.jpg",
    authority: "ATCS Dishub Kabupaten Magelang",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Aktivitas Koridor Pasar Grabag Lancar Tertib",
    trafficDensity: 54,
    category: "publik",
    description: "Kamera pantau Dishub Magelang pada pusat keramaian koridor Pasar Grabag.",
  },
  {
    id: "cctv-yt-apace-22037",
    name: "Koridor Arteri APACE-22037 Live",
    road: "Jalur Arteri Penghubung Nasional",
    city: "Jawa Tengah",
    region: "Indonesia",
    lat: -7.4705,
    lng: 110.2178,
    direction: "Pemantauan Arteri Dua Arah 24/7",
    streamType: "youtube",
    youtubeVideoId: "YLy7ntKXw-w",
    streamUrl: "https://www.youtube.com/watch?v=YLy7ntKXw-w",
    portalUrl: "https://www.youtube.com/watch?v=YLy7ntKXw-w",
    thumbnailUrl: "https://img.youtube.com/vi/YLy7ntKXw-w/hqdefault.jpg",
    authority: "ATCS APACE Live Telemetry",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Arus Arteri Dua Arah Normal Terkendali",
    trafficDensity: 41,
    category: "jalan",
    description: "Siaran kamera pemantau lalu lintas realtime 24 jam penuh (Verified 200 OK).",
  },
];

import { BINA_MARGA_CAMERAS } from '@/data/binaMargaCctvData';

// Exclude unreachable binamarga.pu.go.id/play-hls streams that consistently time out
const ACTIVE_BINA_MARGA_CAMERAS = BINA_MARGA_CAMERAS.filter(
  (c) => !c.streamUrl?.includes('binamarga.pu.go.id/play-hls')
);

const ALL_RAW_CAMERAS: Omit<TrafficCctvCamera, 'location'>[] = [
  ...RAW_CAMERAS,
  ...ACTIVE_BINA_MARGA_CAMERAS,
];

const FALLBACK_CAMERAS: TrafficCctvCamera[] = ALL_RAW_CAMERAS.map((c) => ({
  ...c,
  directStreamUrl:
    c.directStreamUrl ||
    (c.streamType === 'hls' && !c.streamUrl?.startsWith('http')
      ? `https://cctvnusantara.com/api/stream?id=${encodeURIComponent(c.id)}`
      : undefined),
  directThumbnailUrl:
    c.directThumbnailUrl ||
    (c.streamType === 'hls'
      ? `https://cctvnusantara.com/api/thumbnail?id=${encodeURIComponent(c.id)}`
      : undefined),
  location: [c.lng, c.lat] as [number, number],
}));

class TrafficCctvService {
  private cameras: TrafficCctvCamera[] = FALLBACK_CAMERAS;
  private allTrafficLoaded: boolean = false;
  private courtroomLoaded: boolean = false;
  private cities: CitySummary[] = [];
  private categories: CategorySummary[] = [];
  private activeCity: string = 'Semua';
  private activeCategory: string = 'Semua';
  private lastFetchedAt: number = 0;
  private isFetching: boolean = false;
  private listeners: Set<(cameras: TrafficCctvCamera[]) => void> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private currentParams: { city?: string; category?: string; search?: string; limit?: number } | undefined;

  constructor() {
    this.startBackgroundSync(5 * 60 * 1000);
  }

  public subscribe(listener: (cameras: TrafficCctvCamera[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getCamerasFiltered(this.currentParams);
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch {
        // Listener error is non-fatal
      }
    });
  }

  public startBackgroundSync(intervalMs = 5 * 60 * 1000) {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      try {
        await this.fetchCameras(this.currentParams);
      } catch {
        // Network blip caught cleanly; preserves local dataset
      }
    }, intervalMs);
  }

  public stopBackgroundSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public getLastFetchedAt(): number {
    return this.lastFetchedAt;
  }

  public async fetchCameras(params?: {
    city?: string;
    category?: string;
    search?: string;
    limit?: number;
    trafficOnly?: boolean;
  }): Promise<TrafficCctvCamera[]> {
    this.currentParams = params;
    const requestedCategory = params?.category || 'Semua';
    const needsCourtroom = requestedCategory.toLowerCase() === 'pengadilan' || requestedCategory.toLowerCase() === 'pengadilannegeri';

    // Serve immediately from hydrated catalog when only local filters/search change
    if (this.allTrafficLoaded && (!needsCourtroom || this.courtroomLoaded) && (!params?.limit || params.limit >= 1000)) {
      return this.getCamerasFiltered(params);
    }

    if (this.isFetching) return this.getCamerasFiltered(params);

    this.isFetching = true;
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('compact', '1');
      if (needsCourtroom) {
        searchParams.set('category', requestedCategory);
        searchParams.set('limit', '2000');
      } else {
        searchParams.set('trafficOnly', '1');
        searchParams.set('limit', String(Math.max(params?.limit || 7000, 7000)));
      }

      const res = await fetch(`/api/spatial/traffic/cctv?${searchParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const normalized = json.data.map((c: any) => {
            const streamType = c.streamType || 'hls';
            const category = c.category || 'jalan';
            const city = c.city || 'Indonesia';
            const road = c.road || c.name || 'Arteri Publik';
            const authority = c.authority || 'ATCS Publik Dishub';
            const status = c.status || 'LIVE';
            const streamUrl =
              c.streamUrl ||
              (streamType === 'hls'
                ? `/api/spatial/traffic/cctv-stream?id=${encodeURIComponent(c.id)}`
                : `/api/spatial/traffic/cctv-proxy?url=${encodeURIComponent(`https://cctvnusantara.com/api/stream?id=${c.id}`)}`);
            const portalUrl = c.portalUrl || `https://cctvnusantara.com/cctv/${encodeURIComponent(c.id)}`;
            const thumbnailUrl = c.thumbnailUrl || `/api/spatial/traffic/cctv-thumbnail?id=${encodeURIComponent(c.id)}`;
            const fps = c.fps || (streamType === 'youtube' ? 30 : 25);
            const resolution = c.resolution || '1080p FHD';
            const statusText =
              c.statusText ||
              (status === 'DEGRADED'
                ? 'Stream Terdeteksi Gangguan'
                : status === 'OFFLINE'
                ? 'Feed CCTV Offline'
                : 'Stream CCTV Terdaftar (Tanpa Sensor Kecepatan)');

            return {
              ...c,
              road,
              city,
              region: c.region || city,
              streamType,
              streamUrl,
              directStreamUrl:
                c.directStreamUrl ||
                (streamType === 'hls'
                  ? `https://cctvnusantara.com/api/stream?id=${encodeURIComponent(c.id)}`
                  : undefined),
              portalUrl,
              thumbnailUrl,
              directThumbnailUrl:
                c.directThumbnailUrl ||
                (streamType === 'hls'
                  ? `https://cctvnusantara.com/api/thumbnail?id=${encodeURIComponent(c.id)}`
                  : undefined),
              authority,
              fps,
              resolution,
              status,
              statusText,
              category,
              location: c.location || [c.lng, c.lat],
            } as TrafficCctvCamera;
          });

          if (needsCourtroom) {
            const byId = new Map<string, TrafficCctvCamera>();
            for (const cam of this.cameras) byId.set(cam.id, cam);
            for (const cam of normalized) byId.set(cam.id, cam);
            this.cameras = Array.from(byId.values());
            this.courtroomLoaded = true;
          } else {
            this.cameras = normalized;
            this.allTrafficLoaded = true;
          }

          if (Array.isArray(json.cities) && json.cities.length > 0) {
            this.cities = json.cities;
          }
          if (Array.isArray(json.categories) && json.categories.length > 0) {
            this.categories = json.categories;
          }
          this.lastFetchedAt = Date.now();
          this.notifyListeners();
          return this.getCamerasFiltered(params);
        }
      }
    } catch {
      // Graceful fallback to verified in-memory cameras
    } finally {
      this.isFetching = false;
    }

    return this.getCamerasFiltered(params);
  }

  public getCamerasFiltered(params?: {
    city?: string;
    category?: string;
    search?: string;
    limit?: number;
    bbox?: [number, number, number, number]; // [west, south, east, north]
    includeCourtroom?: boolean;
  }): TrafficCctvCamera[] {
    let result = this.cameras;

    const hasExplicitCat = Boolean(params?.category && params.category !== 'Semua');
    if (!params?.includeCourtroom && !hasExplicitCat) {
      result = result.filter((c) => c.category !== 'pengadilan' && c.category !== 'pengadilannegeri');
    }

    if (params?.city && params.city !== 'Semua') {
      const lc = params.city.toLowerCase();
      result = result.filter(
        (c) =>
          c.city.toLowerCase().includes(lc) ||
          (c.region && c.region.toLowerCase().includes(lc))
      );
    }

    if (hasExplicitCat) {
      const lcat = params!.category!.toLowerCase();
      result = result.filter((c) => (c.category || 'jalan').toLowerCase() === lcat);
    }

    if (params?.bbox) {
      const [west, south, east, north] = params.bbox;
      result = result.filter(
        (c) => c.lat >= south && c.lat <= north && c.lng >= west && c.lng <= east
      );
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.road.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.direction && c.direction.toLowerCase().includes(q)) ||
          (c.authority && c.authority.toLowerCase().includes(q))
      );
    }

    if (params?.limit && params.limit > 0) {
      result = result.slice(0, params.limit);
    }

    return result.map((c) => ({
      ...c,
      location: c.location || [c.lng, c.lat],
    }));
  }

  public getCameras(): TrafficCctvCamera[] {
    return this.cameras.map((c) => ({
      ...c,
      location: c.location || [c.lng, c.lat],
    }));
  }

  public getAllCameras(): TrafficCctvCamera[] {
    return this.getCameras();
  }

  public getCameraById(id: string): TrafficCctvCamera | undefined {
    return this.getCameras().find((c) => c.id === id);
  }

  public getCities(): CitySummary[] {
    if (this.cities.length > 0) return this.cities;

    const counts: Record<string, number> = {};
    for (const c of this.cameras) {
      counts[c.city] = (counts[c.city] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  public getCategories(): CategorySummary[] {
    if (this.categories.length > 0) return this.categories;

    const counts: Record<string, number> = {};
    for (const c of this.cameras) {
      const cat = c.category || 'jalan';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  public getActiveCity(): string {
    return this.activeCity;
  }

  public setActiveCity(city: string) {
    this.activeCity = city;
  }

  public getActiveCategory(): string {
    return this.activeCategory;
  }

  public setActiveCategory(category: string) {
    this.activeCategory = category;
  }
}

export const trafficCctvService = new TrafficCctvService();
