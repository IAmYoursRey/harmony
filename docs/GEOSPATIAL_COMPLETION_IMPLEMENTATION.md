# Dokumentasi Implementasi Sistem Geospasial Harmony

Dokumen ini mendokumentasikan arsitektur teknis, sumber data, formulasi matematis, dan alur operasional end-to-end yang telah diimplementasikan dan diverifikasi pada `D:\vscode\Harmony` berdasarkan temuan audit **2 Oktober 2026** pada `HARMONY_Antigravity_Prompt_Perbaikan_Lanjutan.md`.

---

## 1. Arsitektur Sistem dan Rantai Integrasi

Harmony menerapkan rantai koneksi operasional utuh:
$$\text{Input Pengguna} \longrightarrow \text{Geospatial Service} \longrightarrow \text{Backend Gateway} \longrightarrow \text{Layer Peta / OpenLayers} \longrightarrow \text{Statistik AOI} \longrightarrow \text{Ekspor Terstandarisasi}$$

### Komponen Utama:
1. **Frontend UI & Visualisasi (`apps/web`):**
   - `/app/maps` & `MapsView.tsx`: Peta interaktif OpenLayers dengan manajemen layer, gambar poligon AOI, buffer titik, rendering vektor, serta integrasi callback `onApplyFeaturesToMap` untuk langsung menampilkan fitur hasil analisis ke layer peta.
   - `GeospatialWeatherModal.tsx`: Studio Geospasial terpadu dengan 15 domain fungsional termasuk 4 modul baru: Hotspot Karhutla, Aksesibilitas Jaringan & Kota 15 Menit, Emisi Transportasi, dan Rencana Pengembangan SWOT Produk.
   - Hook Reaktif AOI (`useActiveAOI` pada `aoiService.ts`): Menyediakan langganan state React reaktif terhadap perubahan poligon aktif pengguna tanpa snapshot usang.
   - Tab Studio Khusus:
     - `GeospatialRemoteSensingTab.tsx`: Spektral optik (NDVI, NDBI), termal satelit (LST), dan radar (SAR VV, VH, Cross-Polarization Ratio). Mode demonstrasi diberi label tegas dan terpisah dari kueri live.
     - `GeospatialHydrologyTab.tsx`: Tutupan lahan ESA WorldCover 2021 v200 dinamis dan hidrologi terikat DEM terukur.
     - `GeospatialHotspotsTab.tsx`: Pemantau Karhutla berbasis NASA FIRMS (VIIRS/MODIS) dan rujukan SiPongi+ KLHK. Mulai dalam keadaan kosong pada mode live (tanpa contoh CSV otomatis), menyediakan tombol eksplisit *Muat Dataset Demonstrasi* berlabel DEMO, unggah file CSV mandiri, serta tombol *Tampilkan di Peta*.
     - `GeospatialAccessibilityTab.tsx`: Analisis jangkauan waktu tempuh (isokron 5/10/15 menit), penyortiran sekolah Dapodik terdekat berbasis jarak riil, pelabelan kandidat fasilitas `[RENCANA / USULAN]`, dan tombol *Tampilkan di Peta*.
     - `GeospatialEmissionsTab.tsx`: Kalkulator emisi berbasis faktor emisi terverifikasi UK DESNZ 2026 dan ESDM RI 2025 dengan aturan idling spesifik jenis kendaraan.
     - `GeospatialProductSwotTab.tsx`: Workspace strategi produk mandiri (Strengths, Weaknesses, Opportunities, Threats) yang didekopol dari satelit geofisika SWOT NASA, dengan penyimpanan terisolasi per akun pengguna (`harmony_swot_${ownerId}`) dan status bukti awal `draft`/`unverified`.

2. **Backend Gateway & Job API (`apps/server`):**
   - `apps/server/src/routes/spatialRoutes.js`: Routing Express untuk kueri spasial, PostGIS, STAC search proxy, dan job engine.
   - `apps/server/src/controllers/spatialController.js`:
     - `POST /api/spatial/analysis/jobs`: Manajemen antrian analisis spasial (`spectral`, `lst`, `landcover`, `accessibility`, `coverage`). Memvalidasi parameter secara ketat dan menolak input tidak valid atau kosong dengan HTTP 400 Bad Request.
     - `GET /api/spatial/analysis/jobs/:id`: Pengecekan status job, hasil, provenance, dan pengecekan otorisasi pemilik (`x-user-id`).
     - `DELETE /api/spatial/analysis/jobs/:id`: Pembatalan job pengguna terotorisasi.
     - `GET /api/spatial/analysis/:id/export`: Ekspor terstandarisasi GeoJSON, CSV, atau JSON ber-provenance. Menghapus koordinat cadangan Monas pada ekspor tanpa geometri.
     - `GET /api/spatial/hotspots`: Proxy NASA FIRMS Area API dengan status `NOT_CONFIGURED` yang aman dan rujukan resmi SiPongi KLHK.
     - `POST /api/spatial/network/isochrones`: Adaptor isokron jaringan jalan dengan fallback topologi berkecepatan riil.
     - `POST /api/spatial/network/accessibility`: Evaluator kesenjangan layanan fasilitas dan pemenuhan Kota 15 Menit.
     - `POST /api/spatial/transport/emissions`: Mesin kalkulasi emisi jejak karbon perjalanan berbasis faktor registri tunggal terakreditasi.
   - `apps/server/src/repositories/repository.js`:
     - Menyimpan job spasial pada tabel PostgreSQL `spatial_jobs` (`id VARCHAR PRIMARY KEY`, `data JSONB`, `created_at TIMESTAMP`), in-memory Map cache, dan fallback file database lokal.

---

## 2. Rincian Modul, Formula, dan Sumber Data

### 2.1 Modul Penginderaan Jauh (NDVI, NDBI, SAR)
- **NDVI (Normalized Difference Vegetation Index):**
  $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$$
- **NDBI (Normalized Difference Built-up Index):**
  $$\text{NDBI} = \frac{\text{SWIR}_1 - \text{NIR}}{\text{SWIR}_1 + \text{NIR}}$$
- **SAR Cross-Polarization Ratio:**
  - Pada skala daya linier: $\text{Ratio} = \frac{\text{VV}}{\text{VH}}$
  - Pada skala desibel (dB): $\text{Ratio}_{\text{dB}} = \text{VV}_{\text{dB}} - \text{VH}_{\text{dB}}$
- **Prinsip Zero-Fabrication:** Jika band tidak numerik atau tidak ada, job ditolak dengan 400 Bad Request. Jika denominator bernilai nol ($|\text{denom}| < 10^{-7}$), sistem menghasilkan nilai `null` dan reason `ZERO_DENOMINATOR`, bukan nilai rata-rata sintetis `0.0`.

### 2.2 Modul LST (Land Surface Temperature) Satelit
- **Sumber:** USGS Landsat Collection 2 Level-2 Surface Temperature (ST_B10).
- **Formulasi USGS Standard:**
  $$T_{\text{Kelvin}} = \text{DN} \times 0.00341802 + 149.0$$
  $$T_{\text{Celsius}} = T_{\text{Kelvin}} - 273.15$$
- **Validasi Ketat:**
  - Nilai $\text{DN} \le 0$ merupakan *fill / nodata* dan ditolak dengan HTTP 400 Bad Request; sistem tidak lagi mengonversi DN=0 menjadi $-124.15\ ^\circ\text{C}$.
  - Secara tegas memisahkan LST satelit dari temperatur udara 2 meter model NWP maupun suhu permukaan laut (SST).

### 2.3 Modul Tutupan Lahan & Hidrologi
- **Sumber Tutupan Lahan:** ESA WorldCover 2021 v200.
  - Kode kelas: 10 (Tree cover), 20 (Shrubland), 30 (Grassland), 40 (Cropland), 50 (Built-up), 60 (Bare), 70 (Snow/ice), 80 (Permanent water), 90 (Wetland), 95 (Mangroves), 100 (Moss/lichen).
  - Luas dihitung secara dinamis dari piksel poligon AOI aktual. Job dengan `parameters={}` ditolak dengan HTTP 400 Bad Request (menghapus estimasi kotak Jakarta/Surabaya dan persentase tetap).
- **Hidrologi:** Beda elevasi sungai dievaluasi dari pasangan DEM terukur; jika data elevasi sungai tidak tersedia, sistem menampilkan `null`.

### 2.4 Modul Hotspot / Karhutla (NASA FIRMS & SiPongi)
- **NASA FIRMS Area API:**
  - Endpoint pola: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{BBOX}/{DAY_RANGE}`
  - Sensor: VIIRS (S-NPP, NOAA-20, NOAA-21) dan MODIS (Terra/Aqua).
  - Ketika `FIRMS_MAP_KEY` belum terpasang, sistem merespons secara jujur dengan kode `NOT_CONFIGURED` dan data kosong `[]`, tanpa mengarang titik api palsu.
  - Nilai sensor yang hilang (misal brightness, scan, track, FRP) disimpan sebagai `null`, bukan angka buatan 300 K atau 0.375 km.
  - Mode live dimulai dengan daftar kosong. Mode demonstrasi diakses lewat tombol khusus dan diberi label tegas `DEMO`.
- **SiPongi+ KLHK:** Disediakan link rujukan resmi ke portal SiPongi Kementerian Lingkungan Hidup dan Kehutanan RI (`https://sipongi.menlhk.go.id/`).

### 2.5 Modul Isokron Jaringan & Akses Fasilitas (15-Minute City)
- **Isokron Jaringan:**
  - Adaptor OpenRouteService `/v2/isochrones` (interval 5, 10, 15 menit).
  - Fallback topologi lokal mengaplikasikan faktor belitan jalan riil (0.72) dan kecepatan rata-rata per moda (jalan kaki: 4.5 km/jam, sepeda: 14 km/jam, mobil: 28 km/jam).
- **Aksesibilitas Fasilitas:**
  - Fasilitas sekolah diambil dari data Dapodik nyata dan diurutkan berdasarkan jarak Haversine terdekat dari titik origin.
  - Fasilitas buatan dengan offset koordinat dan label instansi fiktif telah dihapus seluruhnya.
  - Fasilitas kandidat skenario diberi label `[RENCANA / USULAN]`.
  - Matriks jarak jaringan dan estimasi waktu tempuh origin $\to$ fasilitas per kategori (`sekolah`, `kesehatan`, `evakuasi`, `pasar`, `transportasi`).
  - Tombol *Tampilkan di Peta* langsung memproyeksikan isokron dan fasilitas ke layer peta OpenLayers.

### 2.6 Registri Tunggal Faktor Emisi Transportasi
Registri terpadu digunakan seragam pada frontend (`transportEmissionService.ts`) dan backend (`spatialController.js`):

| ID Kategori Kendaraan | Nilai Faktor | Satuan Basis | Sumber Primer & Keterangan | Laju Idling (kg/menit) |
|---|---|---|---|---|
| `car_petrol_avg` | 164.5 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Passenger Cars Petrol, Average) | 0.020 (1.2 kg/jam) |
| `car_gasoline_medium` | 170.5 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Passenger Cars Petrol, 1.4–2.0L) | 0.020 (1.2 kg/jam) |
| `car_diesel_avg` / `medium` | 168.2 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Passenger Cars Diesel) | 0.020 (1.2 kg/jam) |
| `car_hybrid_avg` | 112.4 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Hybrid Petrol, Average) | 0.010 (mesin mati ~50%) |
| `car_electric_bev` / `bev_id` | 117.0 | g $\text{CO}_2\text{e}$ / vkm | ESDM RI 2025 / Grid Jamali $0.78\ \text{kg}/\text{kWh} \times 0.15\ \text{kWh}/\text{km}$ | 0.0 (knalpot nihil) |
| `car_bev_id_mini` | 78.6 | g $\text{CO}_2\text{e}$ / vkm | ESDM RI 2025 / Grid Jamali $0.785\ \text{kg}/\text{kWh} \times 0.10\ \text{kWh}/\text{km}$ (Wuling Air EV) | 0.0 (knalpot nihil) |
| `motorcycle_small` | 82.8 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Motorcycle <125cc) | 0.005 (0.3 kg/jam) |
| `motorcycle_avg` / `gasoline` | 103.1 | g $\text{CO}_2\text{e}$ / vkm | UK DESNZ 2026 (Motorcycle Average) | 0.005 (0.3 kg/jam) |
| `bus_city_passenger` | 96.5 | g $\text{CO}_2\text{e}$ / pkm | UK DESNZ 2026 (Local bus, average) | 0.0 (per pkm) |
| `bus_brt_passenger` / `urban` | 28.4 | g $\text{CO}_2\text{e}$ / pkm | UK DESNZ 2026 (Coach / BRT TransJakarta) | 0.0 (per pkm) |
| `train_commuter` / `krl` | 35.1 | g $\text{CO}_2\text{e}$ / pkm | KRL Commuterline / UK DESNZ 2026 (National rail) | 0.0 (per pkm) |
| `train_light_rail` | 28.6 | g $\text{CO}_2\text{e}$ / pkm | UK DESNZ 2026 (Light rail & tram) | 0.0 (per pkm) |
| `walking` / `bicycle` | 0.0 | g $\text{CO}_2\text{e}$ / km | Zero direct tailpipe emissions | 0.0 |

- Kategori tidak dikenal ditolak dengan HTTP 400 Bad Request.
- Basis vehicle-km dibagi okupansi penumpang; basis passenger-km tidak dibagi lagi.

### 2.7 Modul Kualitas Udara & ISPU (Permen LHK No. P.14/2020)
- **Periode Perataan Resmi:**
  - $\text{PM}_{2.5}$ dan $\text{PM}_{10}$: Rata-rata bergerak 24 jam (*24-hour rolling average*).
  - $\text{O}_3$ dan $\text{CO}$: Rata-rata bergerak 8 jam (*8-hour rolling average*).
  - $\text{NO}_2$: Rata-rata bergerak 1 jam (*1-hour average*).
- **Aturan Kelengkapan Data:**
  - Perataan memerlukan minimal $\ge 75\%$ sampel valid (minimal 18 dari 24 sampel per jam).
  - Jika kelengkapan sampel $< 75\%$, parameter dilaporkan `null` dan statusnya `Tidak Tersedia`. Fallback sintetis `?? 18.5` telah dihapus sepenuhnya.
- **Interpolasi Linear Resmi:**
  $$I = \frac{I_b - I_a}{X_b - X_a} (X - X_a) + I_a$$
  Konsentrasi negatif, NaN, atau non-finite ditolak dan menghasilkan status `Tidak Tersedia`.

### 2.8 Strategic Product SWOT Workspace
- Terisolasi penuh per akun pengguna via namespace `harmony_swot_${ownerId}`.
- Seluruh item contoh bawaan diturunkan dari `verified` menjadi status jujur `draft` atau `unverified`.
- Clone data menggunakan *deep copy* untuk mencegah mutasi silang antar workspace pengguna.
