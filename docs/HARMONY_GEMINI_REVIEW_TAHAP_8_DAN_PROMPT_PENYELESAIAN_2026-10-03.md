# Laporan Remediasi dan Verifikasi Tahap 8: Menyelesaikan Alur yang Dipakai Pengguna

**Tanggal Pemeriksaan:** 3 Oktober 2026, 19.45–20.00 WIB  
**Repositori Target:** `D:/vscode/Harmony`  
**Status Akhir:** **14 / 14 Kasus Reproduksi Tahap 8 LULUS (100%)**, **15 / 15 Suite `npm test` LULUS (100%)**, **TypeScript Typecheck 0 Error**, **Vite Production Build Sukses**.

---

## 1. Ringkasan Eksekutif Perbaikan Tahap 8

Tahap 8 difokuskan untuk menyelesaikan kesenjangan antara pengujian modul/helper terpisah dan alur operasional nyata yang dipicu langsung oleh tombol pengguna, handler antarmuka, router, dan audit data. Seluruh masalah prioritas P0 dan P1 yang dilaporkan dalam review tahap 8 telah diselesaikan secara tuntas tanpa menggunakan angka ambang tiruan atau manipulasi nilai observasi.

| Area | Prioritas | Masalah Awal (Stage 8 Review) | Solusi yang Diimplementasikan | Hasil Verifikasi |
|---|---|---|---|---|
| **LST Context Switch Reset** | **P0** | Loading UI macet di *"Memproses Raster..."* ketika pengguna berpindah koleksi/AOI/koordinat saat request sedang berlangsung. | `useEffect` dependensi konteks dan fungsi cleanup secara eksplisit mereset `setIsProcessingLST(false)` dengan aman dan membatalkan request lama via generation controller tanpa menimpa state request baru. | **LULUS** (`lst-after-collection-switch` bebas macet; request baru dapat dieksekusi tanpa reload). |
| **STAC S3 Resolver Binding** | **P0** | Handler `handleRunLSTAnalysis` memanggil resolver 0 kali dan mencoba fetch skema `s3://` langsung di browser, berakhir `ASSET_ACCESS_FAILED`. | Mengintegrasikan `stacService.resolveSceneAssetUrl` langsung pada handler untuk band termal (`lwir11`) dan QA (`qa_pixel`) sebelum fetch; menolak skema `s3://` mentah dan mengalirkan URL HTTPS hasil hidrasi Planetary Computer. | **LULUS** (`actual-LST-handler-S3-path`: resolver dipanggil 2x, skema fetch adalah HTTPS). |
| **Validasi Metadata Wajib** | **P0** | Data kualitas udara tanpa lokasi, elevasi tanpa lokasi, gempa BMKG tanggal saja tanpa parameter gempa, tanggal 30 Februari, dan FIRMS tanpa waktu akuisisi masih berstatus `ONLINE`. | Memperketat `geospatialDataTelemetryService.ts` dan `apiHealthService.ts`: validasi koordinat geografis finite, deteksi tanggal kalender Gregorian tidak sah, validasi parameter gempa wajib (`Coordinates`, `Magnitude`, `Kedalaman`), serta validasi `acq_date`/`acq_time` FIRMS. | **LULUS** (Semua 5 payload tidak lengkap ditolak ke `OFFLINE`/`UNAVAILABLE`). |
| **Klaim Live / Configured Registry** | **P0** | Chip modal sumber mengklaim stream live terkoneksi dan kredensial terkonfigurasi murni berdasarkan descriptor statis boolean. | Menghubungkan `DataSourceProvenanceModal.tsx` secara reaktif ke `geospatialDataTelemetryService`. Status kartu kini mencerminkan hasil runtime terverifikasi (`Stream Terverifikasi Online`, `Sedang Memeriksa...`, `Stream Parsial`, `Gagal Mengambil Data`, `Belum Diperiksa`, atau `Katalog & Referensi`). | **LULUS** (Status dinamis berdasarkan telemetry runtime dan status API key nyata). |
| **MET Norway Fallback Integration** | **P1** | Service MET Norway berada di frontend dan dipanggil 0 kali oleh aggregator cuaca ketika primer gagal; menerima data usang/tidak fisik. | Mengintegrasikan fallback ke `weatherAggregatorService.ts` saat primer gagal, memvalidasi deviasi koordinat (`<= 0.5°`), batas fisik variabel cuaca (RH 0..100, wind >= 0, cloud 0..100, pressure 300..1200 hPa), menolak data usang > 2 hari, dan tidak mengarang `updatedAt`. | **LULUS** (`actual-weather-fallback`: MET dipanggil saat primer outage; 3 kasus payload cacat ditolak dengan aman). |
| **Isolasi Kegagalan Model BoM** | **P1** | Permintaan gabungan 9 model cuaca gagal total (0 model recovered) jika BoM gagal (HTTP 400). | Menerapkan *split retry recovery*: saat kueri gabungan 9 model gagal, sistem otomatis melakukan retry terarah untuk 8 model valid lainnya tanpa `bom_access_global`, mencatat kegagalan BoM secara transparan. | **LULUS** (`one-model-breaks-combined-request`: 8 model berhasil dipulihkan dengan record kegagalan BoM tetap tersimpan). |
| **Evaluasi Tile Radar Viewport Aktif** | **P1** | Penentuan status radar menggunakan ambang angka kumulatif arbitrer (`requested >= 20 && error >= 10 && loaded <= error`). | Menghapus angka ambang tiruan; mengadopsi rasio keberhasilan tile aktif: jika error > loaded pada viewport aktif -> `UNAVAILABLE`; jika terdapat loaded dan error bersamaan -> `PARSIAL`; jika semua tile aktif berhasil -> `LIVE RADAR`. | **LULUS** (3 skenario viewport aktif reviewer berhasil dievaluasi dengan benar). |
| **Waktu Dinamis Citra Satelit GIBS** | **P1** | Layer GIBS mengunci waktu statis `2026-10-03T10:30:00Z` dan ekstensi `.jpg`. | Menghitung slot waktu dinamis berbasis interval 10 menit (frame 30 menit ke belakang yang dibulatkan) dan beralih ke template resmi `.png` sesuai kapabilitas NASA GIBS. | **LULUS** (URL tile dinamis dan mengikuti standar GoogleMapsCompatible_Level6). |

---

## 2. Inventaris Berkas dan Perubahan Kode

| Berkas | Fungsi / Komponen | Perubahan Kunci |
|---|---|---|
| [`GeospatialRemoteSensingTab.tsx`](file:///d:/vscode/Harmony/apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx) | `useEffect`, `handleRunLSTAnalysis` | - Memanggil `setIsProcessingLST(false)` pada transisi konteks (ganti AOI, lokasi, atau koleksi).<br>- Menghubungkan `stacService.resolveSceneAssetUrl` untuk aset termal dan QA sebelum pengunduhan.<br>- Menolak skema `s3://` sebelum `fetch()`, mencegah kegagalan browser `ASSET_ACCESS_FAILED`.<br>- Memetakan kode kegagalan `SIGNING_FAILED` dan `ASSET_RESOLUTION_FAILED` secara eksplisit. |
| [`stacService.ts`](file:///d:/vscode/Harmony/apps/web/src/services/geospatial/stacService.ts) | `resolveSceneAssetUrl`, `signAssetUrl` | - Memperbaiki pencocokan band termal (`lwir11`, `st_b10`) dan QA (`qa_pixel`) tanpa fallback buta.<br>- Melemparkan exception eksplisit `SIGNING_FAILED` jika API SAS Planetary Computer merespons error (misal HTTP 503). |
| [`geospatialDataTelemetryService.ts`](file:///d:/vscode/Harmony/apps/web/src/services/geospatialDataTelemetryService.ts) | `pingEndpoint` | - Menolak data kualitas udara tanpa `latitude` / `longitude` valid.<br>- Menolak elevasi DEM tanpa koordinat geografis.<br>- Menolak gempa BMKG dengan tanggal mustahil (seperti 30 Februari) via kalender Gregorian dan tanpa parameter wajib (`Coordinates`, `Magnitude`, `Kedalaman`).<br>- Menolak deteksi FIRMS tanpa waktu akuisisi (`acq_date` / `acq_time`). |
| [`apiHealthService.ts`](file:///d:/vscode/Harmony/apps/web/src/services/geospatial/apiHealthService.ts) | `checkBmkgTewsHealth` | Sinkronisasi validasi kalender Gregorian dan parameter gempa wajib BMKG. |
| [`metNorwayService.ts`](file:///d:/vscode/Harmony/apps/web/src/services/metNorwayService.ts) | `fetchForecast` | - Menolak deviasi koordinat respon > 0.5° dari koordinat permintaan.<br>- Memfilter titik data dengan nilai fisik tidak masuk akal (RH 0..100, wind >= 0, cloud 0..100, pressure 300..1200 hPa).<br>- Menolak data usang masa lalu (> 2 hari).<br>- Mencocokkan titik `current` hanya jika berada dalam jendela 3 jam dari waktu sekarang (tidak ada fallback sembarang ke `points[0]`).<br>- Mengembalikan `updatedAt: null` jika provider tidak menyediakannya (tidak mengarang waktu saat ini).<br>- Memperbarui User-Agent dengan kontak resmi `support@harmony.ac.id`. |
| [`weatherAggregatorService.ts`](file:///d:/vscode/Harmony/apps/web/src/services/weatherAggregatorService.ts) | `fetchConsensusWeather` | - Memanggil `metNorwayService.fetchForecast` sebagai fallback resmi ketika penyedia cuaca primer mengalami kegagalan.<br>- Mengisolasi kegagalan model BoM (`bom_access_global`) via *split retry* tanpa BoM untuk menyelamatkan 8 model lainnya. |
| [`MapsView.tsx`](file:///d:/vscode/Harmony/apps/web/src/components/dashboard/views/spatial/MapsView.tsx) | `weatherStatusText`, GIBS URL | - Menghapus ambang batas statis `requested >= 20 && error >= 10`.<br>- Mengevaluasi status tile aktif (`error > loaded` -> `UNAVAILABLE`; `loaded > 0 && error > 0` -> `PARSIAL`).<br>- Mengganti timestamp tetap GIBS dengan interval 10 menit dinamis dan ekstensi `.png`. |
| [`DataSourceProvenanceModal.tsx`](file:///d:/vscode/Harmony/apps/web/src/components/common/DataSourceProvenanceModal.tsx) | Render kartu sumber | Berlangganan langsung ke status telemetry runtime untuk menampilkan status koneksi dan status API key yang terbukti di lapangan. |

---

## 3. Matriks Status Sumber Data

| Identitas Sumber | Domain Studio | Status Descriptor | Status Runtime Nyata | Kredensial / Endpoint | Bukti Validasi |
|---|---|---|---|---|---|
| `open-meteo-weather` | `weather` | Tersedia (Multi-model) | `ONLINE` / `PARTIAL` | Publik (No API Key) | 8 model cuaca aktif, BoM terisolasi saat gagal, fallback MET Norway aktif. |
| `met-norway` | `weather` (fallback) | Terhubung | `ONLINE` (Fallback) | User-Agent Resmi | Jendela 3 jam, validasi koordinat <=0.5°, batas fisik divalidasi. |
| `bmkg-gempa-dirasakan` | `bmkg` | Terhubung | `ONLINE` | Publik Auto-Gempa | Deteksi kalender 30 Feb berhasil ditolak; parameter wajib lengkap. |
| `nasa-firms-noaa` | `hotspots` | Terkonfigurasi | `CONFIGURED` / `ONLINE` | MAP_KEY (Server-side) | Record tanpa `acq_date`/`acq_time` ditolak; envelope kosong valid diterima. |
| `usgs-earthquakes` | `bmkg` / `analytics` | Terhubung | `ONLINE` | Publik USGS GeoJSON | Koordinat 0,0 diterima, baris campuran diproses dengan status `PARTIAL`. |
| `tomtom-traffic` | `positioning` / `accessibility` | Terkonfigurasi | `CONFIGURED` (Local Route) | API Key Server-side | Geometri tanpa koordinat atau bernilai `[[999, -777]]` ditolak. |
| `open-meteo-elevation` | `terrain` | Terhubung | `ONLINE` | Publik Open-Meteo DEM | Respon tanpa koordinat geografis ditolak ke `OFFLINE`. |
| `open-meteo-air-quality` | `emissions` | Terhubung | `ONLINE` | Publik Open-Meteo CAMS | Respon tanpa koordinat geografis ditolak ke `OFFLINE`. |
| `earth-search-landsat` | `catalog` / `remote_sensing` | Terhubung | `ONLINE` (Katalog) | S3 Preserved + PC Signer | Aset S3 dipertahankan dan dihidrasi ke HTTPS via Planetary Computer. |
| `sentinel-hub-copernicus`| `remote_sensing` | Terhubung | `ONLINE` (Katalog) | Planetary Computer STAC | Level-1 dan non-termal ditolak untuk estimasi LST Level-2. |
| `rainviewer-radar` | `weather` / `maps` | Terhubung | `LIVE` / `PARSIAL` | Free Tile API | Evaluasi aktif viewport; tile gagal tidak menipu status kumulatif. |
| `nasa-gibs-himawari` | `weather` / `maps` | Terhubung | `LIVE` | NASA GIBS Public PNG | Waktu dinamis per 10 menit, format PNG standar GoogleMapsCompatible_Level6. |
| `esri-world-imagery` | `maps` | Terhubung | `ONLINE` | ESRI Public Basemap | Rendering 2D/3D Cesium. |
| `google-gemini-ai` | `fusion` / `analytics` | Terkonfigurasi | `CONFIGURED` | Server-side GEMINI_API_KEY | Model routing terisolasi dari kegagalan jaringan. |

---

## 4. Hasil Verifikasi Pengujian

### A. Suite Verifikasi Khusus Tahap 8 (`verify-stage8-remediation.mjs`)
Hasil eksekusi pada 14 kasus reproduksi yang diidentifikasi oleh reviewer:
```text
=== STAGE 8 VERIFICATION RESULTS ===
[PASS] air-without-location
[PASS] elevation-without-location
[PASS] BMKG-impossible-calendar
[PASS] BMKG-date-without-parameters
[PASS] FIRMS-without-acquisition-time
[PASS] radar-old2-success-new3-all-fail
[PASS] radar-active10-good10-failed
[PASS] radar-active15-good15-failed
[PASS] actual-LST-handler-S3-path
[PASS] MET-only-obsolete-point
[PASS] MET-physically-invalid
[PASS] MET-wrong-location-missing-updatedAt
[PASS] actual-weather-fallback
[PASS] one-model-breaks-combined-request
Total: 14 / 14 passed.
```

### B. Suite Pengujian Regresi Lengkap (`npm test`)
Seluruh 15 suite pengujian unit dan integrasi proyek lulus tanpa kegagalan:
1. `tests/spatialCore.test.mjs` — PASS
2. `tests/mapFreshnessEngine.test.mjs` — PASS
3. `tests/gisInteractionManager.test.mjs` — PASS
4. `tests/geospatialCompletion.test.mjs` — PASS
5. `tests/weatherDataIntegrity.test.mjs` — PASS
6. `tests/monitoringSnapshot.test.mjs` — PASS
7. `tests/recoveryFollowup.test.mjs` — PASS
8. `tests/geminiReviewIntegrity.test.mjs` — PASS
9. `tests/auditRemediationReproductions.test.mjs` — PASS
10. `tests/evidence14Reproductions.test.mjs` — PASS
11. `tests/evidenceCurrent14.test.mjs` — PASS
12. `tests/evidenceStage3.test.mjs` — PASS
13. `tests/evidenceStage4.test.mjs` — PASS
14. `tests/evidenceStage5.test.mjs` — PASS
15. `tests/evidenceStage6.test.mjs` — PASS (19/19 tests)

### C. Pemeriksaan Tipe Data & Kompilasi Produksi
- **TypeScript Typecheck (`npm run typecheck -w apps/web`):** Exit Code 0 (0 error).
- **Vite Production Build (`npm run build -w apps/web`):** Exit Code 0 (`✓ built in 25.10s`).

---

## 5. Batasan Operasional dan Diagnosa Lingkungan

1. **Rute Hotspots dan Traffic (Produksi vs Lokal):**
   - Pada lingkungan lokal Express (`apps/server/src/routes/spatialRoutes.js`), endpoint `/api/spatial/traffic` dan `/api/spatial/firms` terpasang secara valid dan memvalidasi payload.
   - Respon 404 pada URL publik disebabkan oleh perbedaan konfigurasi reverse-proxy / gateway pada lingkungan deployment hosting publik yang belum mengarahkan path `/api/spatial/*` ke instance Express server. Hal ini bukan kesalahan kode aplikasi di repositori.
2. **Kredensial dan Ketersediaan Upstream:**
   - Ketika kredensial FIRMS atau TomTom tidak diisi pada `.env`, sistem secara transparan memberikan status `NOT_CONFIGURED` atau `UNAVAILABLE`, dan **tidak** menghasilkan titik api atau arus lalu lintas palsu.
3. **Analisis LST pada Browser:**
   - Analisis operasional membutuhkan scene Landsat Collection 2 Level-2 Surface Temperature valid yang tersedia di Microsoft Planetary Computer dengan token SAS yang aktif. Scene non-termal (Sentinel-2) atau Level-1 (raw radiance) secara otomatis ditolak dengan pesan yang jelas.
