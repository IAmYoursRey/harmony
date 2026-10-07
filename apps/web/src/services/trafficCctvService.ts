export interface TrafficCctvCamera {
  id: string;
  name: string;
  road: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  location: [number, number]; // [lng, lat]
  direction: string;
  streamType: 'snapshot' | 'hls' | 'mjpeg';
  streamUrl: string;
  authority: string;
  fps: number;
  resolution: string;
  status: 'LIVE' | 'OFFLINE' | 'DEGRADED';
  statusText: string;
  trafficDensity: number; // 0 - 100%
}

const RAW_CAMERAS: Omit<TrafficCctvCamera, 'location'>[] = [
  // Jakarta
  {
    id: "cctv-jkt-semanggi",
    name: "Simpang Susun Semanggi",
    road: "Jl. Jend. Sudirman - Jl. Gatot Subroto",
    city: "Jakarta",
    region: "DKI Jakarta",
    lat: -6.2201,
    lng: 106.8188,
    direction: "Barat Daya (Menghadap Semanggi)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub DKI Jakarta / ATCS",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Ramai Lancar",
    trafficDensity: 65,
  },
  {
    id: "cctv-jkt-bundaran-hi",
    name: "Bundaran Hotel Indonesia (HI)",
    road: "Jl. M.H. Thamrin - Jl. Jend. Sudirman",
    city: "Jakarta",
    region: "DKI Jakarta",
    lat: -6.1950,
    lng: 106.8230,
    direction: "Utara (Menghadap Monas)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=640&q=80",
    authority: "TMC Polda Metro Jaya",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lalu Lintas Terkendali",
    trafficDensity: 50,
  },
  {
    id: "cctv-jkt-tomang",
    name: "Simpang Tomang Intermodal",
    road: "Jl. Letjen S. Parman - Jl. Tomang Raya",
    city: "Jakarta",
    region: "DKI Jakarta",
    lat: -6.1772,
    lng: 106.7915,
    direction: "Timur Laut (Arah Tol Tangerang)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub DKI Jakarta",
    fps: 20,
    resolution: "720p HD",
    status: "LIVE",
    statusText: "Padat Merayap",
    trafficDensity: 82,
  },
  {
    id: "cctv-jkt-pancoran",
    name: "Flyover Pancoran",
    road: "Jl. M.T. Haryono - Jl. Pasar Minggu",
    city: "Jakarta",
    region: "DKI Jakarta",
    lat: -6.2435,
    lng: 106.8427,
    direction: "Tenggara",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub DKI Jakarta",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lancar Mengalir",
    trafficDensity: 40,
  },
  {
    id: "cctv-jkt-slipi",
    name: "Simpang Slipi Jaya",
    road: "Jl. Gatot Subroto - Jl. Kemanggisan",
    city: "Jakarta",
    region: "DKI Jakarta",
    lat: -6.1963,
    lng: 106.7997,
    direction: "Barat",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub DKI Jakarta",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Ramai Lancar",
    trafficDensity: 55,
  },

  // Tol Trans-Jawa / Jasa Marga
  {
    id: "cctv-tol-cikatama-70",
    name: "Gerbang Tol Cikampek Utama KM 70",
    road: "Tol Jakarta - Cikampek (KM 70)",
    city: "Karawang",
    region: "Jawa Barat",
    lat: -6.4252,
    lng: 107.4560,
    direction: "Gerbang Tol Trans-Jawa",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=640&q=80",
    authority: "Jasa Marga Toll Road Command Center",
    fps: 30,
    resolution: "4K Ultra HD",
    status: "LIVE",
    statusText: "Antrean Gardu Normal",
    trafficDensity: 38,
  },
  {
    id: "cctv-tol-km57",
    name: "Rest Area KM 57 Tol Japek",
    road: "Tol Jakarta - Cikampek KM 57",
    city: "Karawang",
    region: "Jawa Barat",
    lat: -6.3685,
    lng: 107.3180,
    direction: "Jalur Trans Jawa Cirebon",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=640&q=80",
    authority: "PT Jasa Marga (Persero) Tbk",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Jalur Tol Lancar 85 km/jam",
    trafficDensity: 32,
  },
  {
    id: "cctv-tol-cipali-102",
    name: "Tol Cipali KM 102 Subang",
    road: "Tol Cikopo - Palimanan (KM 102)",
    city: "Subang",
    region: "Jawa Barat",
    lat: -6.5320,
    lng: 107.7210,
    direction: "Timur (Arah Palimanan)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=640&q=80",
    authority: "Astra Tol Cipali",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Lancar Terkendali",
    trafficDensity: 20,
  },

  // Bandung
  {
    id: "cctv-bdg-pasteur",
    name: "Simpang Pasteur - Dr. Djunjunan",
    road: "Jl. Dr. Djunjunan - Exit Tol Pasteur",
    city: "Bandung",
    region: "Jawa Barat",
    lat: -6.8920,
    lng: 107.5790,
    direction: "Timur (Pintu Masuk Bandung)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Kota Bandung (ATCS)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Padat Merayap",
    trafficDensity: 78,
  },
  {
    id: "cctv-bdg-dago",
    name: "Simpang Cikapayang Dago",
    road: "Jl. Ir. H. Djuanda - Flyover",
    city: "Bandung",
    region: "Jawa Barat",
    lat: -6.8995,
    lng: 107.6110,
    direction: "Utara",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Kota Bandung (ATCS)",
    fps: 20,
    resolution: "720p HD",
    status: "LIVE",
    statusText: "Ramai Lancar",
    trafficDensity: 48,
  },

  // Semarang
  {
    id: "cctv-smg-simpang-lima",
    name: "Simpang Lima Semarang",
    road: "Jl. Pahlawan - Jl. Pandanaran",
    city: "Semarang",
    region: "Jawa Tengah",
    lat: -6.9920,
    lng: 110.4225,
    direction: "Pusat Bundaran",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Kota Semarang (ATCS)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Tertib & Lancar",
    trafficDensity: 42,
  },

  // Surabaya
  {
    id: "cctv-sby-joyoboyo",
    name: "Simpang Terminal Joyoboyo",
    road: "Jl. Wonokromo - Jl. Raya Diponegoro",
    city: "Surabaya",
    region: "Jawa Timur",
    lat: -7.2990,
    lng: 112.7380,
    direction: "Utara (Pusat Kota)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Kota Surabaya (SITS)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Ramai Mengalir",
    trafficDensity: 70,
  },
  {
    id: "cctv-sby-waru",
    name: "Bundaran Waru Surabaya",
    road: "Jl. Ahmad Yani - Perbatasan Sidoarjo",
    city: "Surabaya",
    region: "Jawa Timur",
    lat: -7.3525,
    lng: 112.7290,
    direction: "Selatan (Arah Sidoarjo)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Kota Surabaya (SITS)",
    fps: 30,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Padat Volume Tinggi",
    trafficDensity: 75,
  },

  // Bali
  {
    id: "cctv-bali-dewa-ruci",
    name: "Simpang Susun Dewa Ruci Kuta",
    road: "Jl. Sunset Road - Bypass Ngurah Rai",
    city: "Kuta",
    region: "Bali",
    lat: -8.7180,
    lng: 115.1820,
    direction: "Underpass & Simpang Kuta",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=640&q=80",
    authority: "Dishub Provinsi Bali (ATCS)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Wisatawan Lancar",
    trafficDensity: 45,
  },

  // International Hubs (God's Eye View reference)
  {
    id: "cctv-uk-london-westminster",
    name: "London - Westminster Bridge",
    road: "Bridge St - Westminster Bridge",
    city: "London",
    region: "United Kingdom",
    lat: 51.5008,
    lng: -0.1246,
    direction: "North-West",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=640&q=80",
    authority: "Transport for London (TfL)",
    fps: 25,
    resolution: "1080p FHD",
    status: "LIVE",
    statusText: "Urban Transit Normal",
    trafficDensity: 52,
  },
  {
    id: "cctv-us-austin-congress",
    name: "Austin, TX - Congress Ave",
    road: "Congress Avenue & 6th Street",
    city: "Austin",
    region: "Texas, USA",
    lat: 30.2672,
    lng: -97.7431,
    direction: "North (Capitol)",
    streamType: "snapshot",
    streamUrl: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=640&q=80",
    authority: "City of Austin Open Data",
    fps: 20,
    resolution: "720p HD",
    status: "LIVE",
    statusText: "Normal City Grid",
    trafficDensity: 40,
  },
];

const FALLBACK_CAMERAS: TrafficCctvCamera[] = RAW_CAMERAS.map((c) => ({
  ...c,
  location: [c.lng, c.lat] as [number, number],
}));

class TrafficCctvService {
  private cameras: TrafficCctvCamera[] = FALLBACK_CAMERAS;
  private lastFetchedAt: number = 0;

  public async fetchCameras(): Promise<TrafficCctvCamera[]> {
    try {
      const res = await fetch('/api/spatial/traffic/cctv');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          this.cameras = json.data;
          this.lastFetchedAt = Date.now();
          return this.cameras;
        }
      }
    } catch {
      // Graceful fallback to rich local catalog
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
}

export const trafficCctvService = new TrafficCctvService();
