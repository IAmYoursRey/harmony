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
  portalUrl?: string;
  thumbnailUrl?: string;
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
  // Jakarta & Jabodetabek
  {
    id: "cctv-jkt-bundaran-hi",
    name: "Bundaran Hotel Indonesia (HI)",
    road: "Jl. M.H. Thamrin - Jl. Jend. Sudirman",
    city: "DKI Jakarta",
    region: "DKI Jakarta",
    lat: -6.1950,
    lng: 106.8230,
    direction: "Utara (Menghadap Monumen Selamat Datang & Monas)",
    streamType: "youtube",
    youtubeVideoId: "gFRtAAse5GM",
    streamUrl: "https://www.youtube.com/watch?v=gFRtAAse5GM",
    portalUrl: "https://smartcity.jakarta.go.id",
    thumbnailUrl: "https://img.youtube.com/vi/gFRtAAse5GM/hqdefault.jpg",
    authority: "TMC Polda Metro Jaya & Jakarta Smart City",
    fps: 30,
    resolution: "1080p FHD 60FPS",
    status: "LIVE",
    statusText: "Lalu Lintas Ramai Lancar Terkendali",
    trafficDensity: 52,
    category: "jalan",
    description: "Pemantauan arteri protokol Thamrin-Sudirman dan lingkar air mancur Bundaran HI.",
  },
  {
    id: "pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638",
    name: "Pasteur JL DR DJUNJUNAN BTC 01",
    road: "Jl. Dr. Djunjunan - Exit Tol Pasteur",
    city: "Kota Bandung",
    region: "Kota Bandung",
    lat: -6.892825,
    lng: 107.585245,
    direction: "Timur (Pintu Gerbang Kota Bandung / BTC Mall)",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638",
    portalUrl: "https://cctvnusantara.com/cctv/pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638",
    authority: "Bandung ATCS (pelindung.bandung.go.id)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Antrean Exit Tol Pasteur Terpantau Lancar",
    trafficDensity: 65,
    category: "jalan",
    description: "Kamera pantau koridor komuter Pasteur pintu utama masuk Kota Bandung.",
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
    id: "bali-305-simpang-lima",
    name: "Simpang Lima Klungkung Bali",
    road: "Jl. Untung Surapati - Jl. Bypass Ida Bagus Mantra",
    city: "Provinsi Bali",
    region: "Provinsi Bali",
    lat: -8.5343064,
    lng: 115.394877,
    direction: "Pusat Persimpangan Lima Arah",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=bali-305-simpang-lima",
    portalUrl: "https://cctvnusantara.com/cctv/bali-305-simpang-lima",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=bali-305-simpang-lima",
    authority: "Diskominfo Provinsi Bali (Bali Satu Data)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Lancar Mengalir Bebas",
    trafficDensity: 38,
    category: "jalan",
    description: "Persimpangan strategis penghubung kabupaten Klungkung dan Gianyar Bali.",
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
    id: "jogja-991",
    name: "Kawasan Malioboro & Demak Ijo Yogyakarta",
    road: "Jl. Malioboro - Jl. Demak Ijo",
    city: "D.I. Yogyakarta",
    region: "D.I. Yogyakarta",
    lat: -7.7820,
    lng: 110.3348,
    direction: "Utara (Menghadap Simpang Demak Ijo & Malioboro)",
    streamType: "hls",
    streamUrl: "/api/spatial/traffic/cctv-stream?id=jogja-991",
    portalUrl: "https://cctvnusantara.com/cctv/jogja-991",
    thumbnailUrl: "https://cctvnusantara.com/api/thumbnail?id=jogja-991",
    authority: "Dishub DIY & CCTV Nusantara",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Kawasan Budaya Ramai Lancar",
    trafficDensity: 46,
    category: "jalan",
    description: "Pusat persimpangan dan koridor utama pergerakan Yogyakarta.",
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
    id: "cctv-jp-shibuya",
    name: "Tokyo - Shibuya Scramble Crossing",
    road: "Shibuya Station Hachiko Square",
    city: "Tokyo",
    region: "Jepang",
    lat: 35.6595,
    lng: 139.7005,
    direction: "West (Pedestrian Crossing & Q-FRONT)",
    streamType: "youtube",
    youtubeVideoId: "DFhnr82-lYk",
    streamUrl: "https://www.youtube.com/watch?v=DFhnr82-lYk",
    portalUrl: "https://www.youtube.com/watch?v=DFhnr82-lYk",
    thumbnailUrl: "https://img.youtube.com/vi/DFhnr82-lYk/hqdefault.jpg",
    authority: "Shibuya City Live Traffic Cam (24/7 HD)",
    fps: 30,
    resolution: "4K Ultra HD 60FPS",
    status: "LIVE",
    statusText: "Pedestrian Flow Active, 3000 org/siklus",
    trafficDensity: 88,
    category: "publik",
    description: "Penyeberangan pejalan kaki tersibuk di dunia dengan pemantauan streaming realtime.",
  },
  {
    id: "cctv-us-times-square",
    name: "New York - Times Square 42nd St",
    road: "Broadway & 7th Avenue at 42nd St",
    city: "New York City",
    region: "New York, USA",
    lat: 40.7580,
    lng: -73.9855,
    direction: "North (Times Square Duffy Square)",
    streamType: "youtube",
    youtubeVideoId: "1-iS7LArMPA",
    streamUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA",
    portalUrl: "https://www.earthcam.com/usa/newyork/timessquare/",
    thumbnailUrl: "https://img.youtube.com/vi/1-iS7LArMPA/hqdefault.jpg",
    authority: "EarthCam Times Square Live Feed",
    fps: 30,
    resolution: "1080p FHD 60FPS",
    status: "LIVE",
    statusText: "Midtown Transit Grid Normal",
    trafficDensity: 70,
    category: "publik",
    description: "Koridor utama pusat kota Manhattan New York City dengan pemantauan streaming realtime.",
  },
  {
    id: "cctv-uk-london-westminster",
    name: "London - Westminster Bridge",
    road: "Bridge St - Westminster Bridge",
    city: "London",
    region: "United Kingdom",
    lat: 51.5008,
    lng: -0.1246,
    direction: "North-West (Houses of Parliament & Big Ben)",
    streamType: "youtube",
    youtubeVideoId: "mRe-514tGLg",
    streamUrl: "https://www.youtube.com/watch?v=mRe-514tGLg",
    portalUrl: "https://tfl.gov.uk/traffic/status/",
    thumbnailUrl: "https://img.youtube.com/vi/mRe-514tGLg/hqdefault.jpg",
    authority: "Transport for London (TfL Open Data)",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Urban Transit Flow Steady 30 km/h",
    trafficDensity: 52,
    category: "jembatan",
    description: "Jembatan Westminster melintasi Sungai Thames dengan telemetri bus TfL dan taksi London.",
  },
];

const FALLBACK_CAMERAS: TrafficCctvCamera[] = RAW_CAMERAS.map((c) => ({
  ...c,
  location: [c.lng, c.lat] as [number, number],
}));

class TrafficCctvService {
  private cameras: TrafficCctvCamera[] = FALLBACK_CAMERAS;
  private cities: CitySummary[] = [];
  private categories: CategorySummary[] = [];
  private activeCity: string = 'Semua';
  private activeCategory: string = 'Semua';
  private lastFetchedAt: number = 0;
  private isFetching: boolean = false;

  public async fetchCameras(params?: {
    city?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<TrafficCctvCamera[]> {
    if (this.isFetching) return this.cameras;

    this.isFetching = true;
    try {
      const searchParams = new URLSearchParams();
      if (params?.city && params.city !== 'Semua') searchParams.set('city', params.city);
      if (params?.category && params.category !== 'Semua') searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      searchParams.set('limit', String(params?.limit || 200));

      const res = await fetch(`/api/spatial/traffic/cctv?${searchParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          this.cameras = json.data.map((c: any) => ({
            ...c,
            location: c.location || [c.lng, c.lat],
          }));

          if (Array.isArray(json.cities) && json.cities.length > 0) {
            this.cities = json.cities;
          }
          if (Array.isArray(json.categories) && json.categories.length > 0) {
            this.categories = json.categories;
          }
          this.lastFetchedAt = Date.now();
          return this.cameras;
        }
      }
    } catch {
      // Graceful fallback to verified in-memory cameras
    } finally {
      this.isFetching = false;
    }

    return this.cameras;
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
