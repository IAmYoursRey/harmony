import { createTimeoutSignal } from "@/utils/browserCompat";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface LocalTimeInfo {
  epoch_utc: number;
  iso_utc: string;
  tz_offset_menit: number;
  tz_label: string;
  tahun: number;
  bulan: number;
  tanggal: number;
  jam: number;
  menit: number;
  detik: number;
  jam_teks: string;
  waktu_lengkap: string;
  tanggal_lokal: string;
  periode: "siang" | "malam";
  siang: boolean;
}

export interface DeliveryConfig {
  mode: "terus" | "jadwal";
  interval_detik: number;
  hemat_malam: boolean;
  interval_malam_detik: number;
  diperbarui: string | null;
  mode_efektif: "terus" | "jadwal";
  interval_efektif: number;
  aktif_malam: boolean;
  periode: "siang" | "malam";
}

export interface TelemetryNodeReading {
  id?: number;
  stasiun: string;
  node: number;
  seq: number;
  jenis: "rutin" | "sampel";
  lembap: number | null;
  suhu: number | null;
  baterai: number | null;
  rssi: number | null;
  snr: number | null;
  api?: boolean;
  t_tanah?: number | null;
  diterima: string;
}

export interface TelemetryHistoryPoint {
  stasiun: string;
  node: number;
  jenis: "rutin" | "sampel";
  lembap: number | null;
  suhu: number | null;
  baterai: number | null;
  diterima: string;
}

export interface TelemetryCommand {
  id: number;
  node: number;
  aksi: string;
  status: "menunggu" | "diambil" | "diteruskan" | "selesai" | "kedaluwarsa";
  status_terakhir?: string;
  stasiun?: string | null;
  dibuat: string;
  diambil?: string | null;
  diteruskan?: string | null;
  selesai?: string | null;
  bacaan_id?: number | null;
  lembap?: number | null;
  suhu?: number | null;
  baterai?: number | null;
  rssi?: number | null;
  snr?: number | null;
  waktu_sampel?: string | null;
}

export interface StationNodeStatus {
  node: number;
  aktif: boolean;
  detik_lalu: number | null;
  rssi: number | null;
  snr: number | null;
  mode: "terus" | "jadwal" | null;
  interval_detik: number | null;
  waktu_sah: boolean;
  periode: "siang" | "malam" | null;
  siang: boolean | null;
}

export interface StationStatus {
  nama: string;
  unit: number;
  terakhir: string;
  wifi_rssi: number | null;
  ssid: string | null;
  lora_ok: boolean | null;
  uptime_detik: number | null;
  pengiriman: { mode: string; interval_detik: number } | null;
  waktu: { jam_teks?: string | null; periode?: string | null } | null;
  status_node: StationNodeStatus[];
}

export interface TelemetryDataResponse {
  ok: boolean;
  waktu_server: string;
  waktu: LocalTimeInfo;
  node: TelemetryNodeReading[];
  riwayat: TelemetryHistoryPoint[];
  perintah_aktif: TelemetryCommand[];
  pengiriman: DeliveryConfig;
  batas_detik: number;
  stasiun: StationStatus[];
}

export interface TelemetryLocationMeta {
  adm4: string | null;
  desa: string | null;
  kecamatan: string | null;
  kotkab: string | null;
  provinsi?: string | null;
  lat: number | null;
  lon: number | null;
  sumber: string | null;
  terkalibrasi: boolean;
  gps_perangkat?: boolean;
  pindah_terdeteksi?: boolean;
  perkiraan_dari_rumah?: boolean;
}

export interface TelemetryUnitInfo {
  alat_id: string;
  stasiun: string;
  node: number;
  unit: number;
  tipe: "rumah" | "lapangan";
  label: string;
  wifi_rssi: number | null;
  lora_ok: boolean;
  terakhir_sinkron: string | null;
  lokasi: TelemetryLocationMeta | null;
  sensor_ringkas: {
    lembap: number | null;
    suhu: number | null;
    baterai: number | null;
    rssi: number | null;
    snr: number | null;
    diterima: string | null;
  } | null;
}

export interface BmkgSlot {
  waktu_lokal: string;
  tanggal: string;
  jam: string | null;
  suhu: number | null;
  rh: number | null;
  angin_km_jam: number | null;
  arah_angin: string | null;
  arah_angin_derajat: number | null;
  arah_angin_menuju: string | null;
  hujan_mm: number | null;
  tutupan_awan: number | null;
  cuaca: string;
  ikon_url: string;
}

export interface BmkgDaily {
  tanggal: string;
  suhu_siang: number | null;
  rh_siang: number | null;
  angin_siang: number | null;
  jam_acuan_siang: string | null;
  suhu_min: number | null;
  suhu_maks: number | null;
  prakiraan_hujan_mm: number | null;
  potensi_hujan: boolean;
  cuaca: string;
  ikon_url: string;
}

export interface BmkgSummary {
  sumber_ok: boolean;
  cadangan?: boolean;
  pesan_galat?: string;
  catatan_cache?: string;
  catatan_sumber?: string;
  sumber: string;
  diambil_pada: string;
  lokasi: {
    adm4: string;
    desa: string;
    kecamatan: string;
    kotkab: string;
    provinsi: string;
    lat: number | null;
    lon: number | null;
  };
  saat_ini: BmkgSlot;
  hari_ini: BmkgDaily;
  harian: BmkgDaily[];
  per_3_jam: BmkgSlot[];
}

export interface FireStatus {
  status: "AMAN" | "WASPADA" | "SIAGA" | "BAHAYA" | "OFFLINE";
  nada: "aman" | "waspada" | "siaga" | "bahaya" | "offline";
  interval: string;
  judul: string;
  saran: string;
  kelas_ffmc: string;
}

export interface FfmcProjectionDay {
  tanggal: string;
  ffmc: number;
  status: string;
  suhu_siang: number;
  rh_siang: number;
  angin_siang: number;
  prakiraan_hujan_mm: number;
}

export interface FfmcSummary {
  nilai: number | null;
  ffmc_awal_hari: number;
  tanggal: string;
  masukan: {
    suhu_c: number | null;
    rh_persen: number | null;
    angin_km_jam: number | null;
    jam_acuan: string | null;
    hujan_24jam_mm: number;
    catatan_hujan: string;
  };
  proyeksi: FfmcProjectionDay[];
  status_kebakaran: FireStatus;
}

export interface RainReportEntry {
  id: number;
  tanggal: string;
  waktu: string;
  curah_mm: number;
  catatan?: string;
}

export interface PlantingReadiness {
  indikasi: "INDIKASI SIAP TANAM" | "PANTAU" | "BELUM SIAP";
  nada: "siap" | "pantau" | "belum";
  alasan: string;
  ada_hujan_7hari: boolean;
  total_hujan_7hari_mm: number;
  tanah_cukup: boolean;
  teks_laporan: string;
  catatan_penyuluh: string;
  dasarian: {
    periode: string;
    berjalan: "rendah" | "sedang" | "tinggi";
    berikutnya: "rendah" | "sedang" | "tinggi";
    sumber: string;
    diperbarui: string | null;
  };
}

export interface ModuleCatalogItem {
  id: string;
  kode: string;
  wajib: boolean;
  nama: string;
  fungsi: string;
  pin: string;
  biaya: string;
}

export interface AmbangConfig {
  kering: number;
  cukup: number;
  suhuMin: number;
  suhuMax: number;
}

export interface AzimuthDistance {
  jarak_km: number | null;
  derajat: number;
  kode_id: string;
  nama: string;
}

export interface CompassWindInfo {
  titik_label: string;
  titik_lat: number | null;
  titik_lon: number | null;
  alat_lat: number | null;
  alat_lon: number | null;
  user_lat: number | null;
  user_lon: number | null;
  angin: {
    tenang: boolean;
    dari_derajat: number;
    menuju_derajat: number;
    dari_kode_id: string;
    dari_nama: string;
    menuju_kode_id: string;
    menuju_nama: string;
    kecepatan_km_jam: number | null;
    kode_bmkg: string;
    menuju_bmkg: string;
  };
  jarak_arah_ke_alat: AzimuthDistance | null;
  jarak_arah_ke_cuaca: AzimuthDistance | null;
}

export interface TelemetryWeatherResponse {
  ok: boolean;
  pesan?: string;
  waktu_server: string;
  waktu: LocalTimeInfo;
  alat_aktif: string;
  daftar_alat: TelemetryUnitInfo[];
  peta: {
    rumah: TelemetryUnitInfo | null;
    lapangan: TelemetryUnitInfo[];
    pengguna: TelemetryLocationMeta | null;
    jarak_rumah_lapangan_km: number | null;
  };
  wilayah: {
    adm4: string;
    mode: string;
    sumber_aktif: string;
    lokasi_alat: TelemetryLocationMeta | null;
    lokasi_pengguna: TelemetryLocationMeta | null;
    daftar_desa: { adm4: string; nama: string }[];
  };
  bmkg: BmkgSummary;
  kompas_dan_angin: CompassWindInfo;
  ffmc: FfmcSummary;
  hujan: {
    total_24jam_mm: number;
    sudah_lapor_hari_ini: boolean;
    pengingat_lapor: boolean;
    riwayat: RainReportEntry[];
  };
  waktu_tanam: PlantingReadiness;
  pengaturan: {
    katalog_modul: ModuleCatalogItem[];
    modul_node: Record<string, string[]>;
    ambang_node: Record<string, AmbangConfig>;
    kalibrasi_m4: { kurva: unknown[] };
  };
}

export interface RegionEntry {
  code: string;
  name: string;
}

async function requestJson<T>(url: string, options: RequestInit = {}, timeoutMs = 9500): Promise<T> {
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: timeout.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.pesan || `HTTP ${res.status}`);
    }
    if (!json || json.ok === false) {
      throw new Error(json?.pesan || "Permintaan gagal");
    }
    return json as T;
  } finally {
    timeout.cleanup();
  }
}

export async function fetchTelemetryData(): Promise<TelemetryDataResponse> {
  return requestJson<TelemetryDataResponse>(`${API_BASE}/api/telemetry/data`, { cache: "no-store" });
}

export async function fetchTelemetryWeather(params: {
  adm4?: string;
  lat?: number;
  lon?: number;
  mode?: "otomatis" | "alat" | "pengguna" | "manual";
  alat?: string;
  segar?: boolean;
} = {}): Promise<TelemetryWeatherResponse> {
  const sp = new URLSearchParams();
  if (params.adm4) sp.set("adm4", params.adm4);
  if (typeof params.lat === "number" && Number.isFinite(params.lat)) sp.set("lat", String(params.lat));
  if (typeof params.lon === "number" && Number.isFinite(params.lon)) sp.set("lon", String(params.lon));
  if (params.mode) sp.set("mode", params.mode);
  if (params.alat) sp.set("alat", params.alat);
  if (params.segar) sp.set("segar", "1");
  const qs = sp.toString();
  return requestJson<TelemetryWeatherResponse>(`${API_BASE}/api/telemetry/cuaca${qs ? `?${qs}` : ""}`, {}, 12000);
}

export async function fetchAdminRegions(
  wilayah: "provinsi" | "kabupaten" | "kecamatan" | "desa",
  kode?: string
): Promise<RegionEntry[]> {
  const sp = new URLSearchParams({ wilayah });
  if (kode) sp.set("kode", kode);
  const res = await requestJson<{ ok: boolean; data: RegionEntry[] }>(`${API_BASE}/api/telemetry/cuaca?${sp.toString()}`, {}, 9500);
  return res.data || [];
}

export async function requestSample(node = 1): Promise<{ ok: boolean; perintah: TelemetryCommand }> {
  return requestJson<{ ok: boolean; perintah: TelemetryCommand }>(`${API_BASE}/api/telemetry/perintah`, {
    method: "POST",
    body: JSON.stringify({ node, aksi: "ambil_sampel" }),
  });
}

export async function pollCommandStatus(id: number): Promise<{ ok: boolean; perintah: TelemetryCommand }> {
  return requestJson<{ ok: boolean; perintah: TelemetryCommand }>(`${API_BASE}/api/telemetry/perintah?id=${encodeURIComponent(id)}`);
}

export async function updateDeliveryConfig(payload: {
  mode?: "terus" | "jadwal";
  interval_detik?: number;
  hemat_malam?: boolean;
  interval_malam_detik?: number;
}): Promise<{ ok: boolean; pengiriman: DeliveryConfig; waktu: LocalTimeInfo; batas_detik: number; pesan: string }> {
  return requestJson(`${API_BASE}/api/telemetry/perintah`, {
    method: "POST",
    body: JSON.stringify({ aksi: "atur_pengiriman", ...payload }),
  });
}

export async function postWeatherAction(payload: Record<string, unknown>): Promise<TelemetryWeatherResponse> {
  return requestJson<TelemetryWeatherResponse>(
    `${API_BASE}/api/telemetry/cuaca`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    12000
  );
}

