# HARMONY — Laporan Remediasi Integritas Data Tahap 12 (Gemini)

Tanggal: **4 Oktober 2026, WIB**  
Proyek: `D:/vscode/Harmony`  
Status Remediasi: **SELESAI (18/18 Skenario Audit Terverifikasi & Seluruh Suite Lulus)**  
Integritas Pengamatan Lapangan: `accuracyValidated: false` dipertahankan secara eksplisit di seluruh alur.

---

## 1. Ringkasan Eksekutif

Tahap 12 menuntaskan celah integritas data end-to-end yang ditemukan dalam audit independen, di mana validasi data sebelumnya belum merembet ke titik konsumsi akhir (agregasi, perbandingan model, pembatalan permintaan bersama, UI narasi cuaca, dan rendering radar).

Semua perbaikan dilaksanakan dengan prinsip zero fabricated data: data yang tidak dikirim oleh penyedia tetap berstatus `null` (bukan angka sintetis 0 atau 1013), perbandingan model membersihkan sampel di luar batas fisik, siklus hidup pembatalan (cancellation lifecycle) memiliki model multiplexed subscription per-pemanggil, penghitungan jendela hujan didasarkan pada interval jam kalender riil, dan pembacaan radar OpenLayers 10.10.0 menghormati batas zoom efektif penyedia serta mempertahankan status parsial saat `moveend`.

Hasil uji verifikasi menyeluruh:
- **`scripts/verify-stage12-remediation.mjs`**: **18/18 skenario lulus (100%)**
- **`tests/stage12IntegrityVerification.test.mjs`**: **8/8 test lulus (exit code 0)**
- **`tests/stage11IntegrityVerification.test.mjs`**: **10/10 test lulus (exit code 0)**
- **`tests/stage10IntegrityVerification.test.mjs`**: **12/12 test lulus (exit code 0)**
- **`tests/evidenceStage6.test.mjs`**: **19/19 test lulus (exit code 0)**
- **`tests/weatherDataIntegrity.test.mjs`**: **16 grup lolos (exit code 0)**
- **`npm test`**: **Seluruh test suite terdaftar lulus (exit code 0)**
- **`npm run typecheck`**: **0 error (exit code 0)**
- **`npm run build`**: **Bundle produksi berhasil dikompilasi (exit code 0)**

---

## 2. Tabel Matriks Temuan T1–T8: Sebelum vs Sesudah

| Kode | Temuan Audit | Kondisi Sebelum Remediasi | Solusi & Kondisi Setelah Remediasi | Bukti Verifikasi |
|---|---|---|---|---|
| **T1 [P0]** | Angka buatan pada MET Norway saat field opsional hilang | `wind_speed`, `wind_from_direction`, `cloud_area_fraction`, dan `air_pressure_at_sea_level` yang dihilangkan oleh penyedia digantikan oleh parser menjadi `0 km/h`, `0°`, `0%`, dan `1013 hPa`. Akibatnya UI menampilkan "Langit Cerah Terbuka" dan "Rata-rata awan harian: ~0%". | Kolom opsional diubah menjadi `nullable` murni pada `MetNorwayPoint` dan konsumen. Jika tidak ada di payload, nilai tetap `null`. UI mendeteksi ketiadaan awan dan menampilkan "Data tutupan awan belum tersedia" tanpa mengklaim cerah. Nilai 0 sah dari penyedia tetap dibedakan dari `null`. | `MET-omitted-values-defaulted` (lulus di `stage12-reproductions`), `test T1` di `stage12IntegrityVerification` |
| **T2 [P0]** | Shared validator belum diterapkan pada ingestion model | Agregator cuaca hanya memeriksa keberadaan angka berhingga dalam array model. Nilai suhu ekstrim `999°C` masuk ke `modelComparison` dan merusak `current.tempMin`/`tempMax` menjadi `999`. | `validateOpenMeteoModelPayload` diintegrasikan langsung pada pemanggilan `fetchCheckedJson` jalur utama maupun split retry. Nilai suhu di luar rentang fisik `[-100, 65]` difilter keluar dari `modelComparison`, `hourly.getModel()`, dan min/max. Nilai 999 tidak pernah masuk ke perbandingan atau batas suhu. | `aggregator-invalid-model-temperature` (lulus), `test T2` di `stage12IntegrityVerification` |
| **T3 [P0]** | Validator meloloskan unit tak dikenal, epoch mustahil, dan offset rusak | Array suhu `[28, 999]` diloloskan sebagai ONLINE karena memakai `some`; satuan `bananas` diterima; epoch `1e20` diterima; offset `+99:99` diloloskan oleh regex ISO yang longgar. | Regex ISO diperketat dengan validasi offset `(?:Z\|([+-])(0\d\|1[0-4]):([0-5]\d))` dan rentang finite `Date.parse`. Epoch dibatasi antara 1970–2100. Satuan suhu dibatasi pada allowlist (`°c`, `celsius`, `c`, `degc`). Nilai suhu divalidasi per-sampel. Campuran `[28, 999]` menghasilkan status PARTIAL (`acceptedCount: 1, rejectedCount: 1`). | `model-mixed-out-of-range`, `model-unknown-unit`, `model-epoch-outside-date-range`, `model-invalid-offset` (seluruhnya lulus), `test T3` |
| **T4 [P0]** | Status PARTIAL hilang pada audit manual endpoint | Adapter `pingEndpoint` menyusutkan validator menjadi `valid ? null : error`, membuang status PARTIAL dan counts, sehingga audit manual menandai `met_norway_fallback` sebagai ONLINE meski ada titik kelembapan 999. | `pingEndpoint` mengembalikan objek status terstruktur `{ partial: true, message, acceptedCount, rejectedCount }`. `fetchCheckedJson` menyematkan metrik ini ke `attempt`, dan `applyAttempt` mengubah status endpoint menjadi `DEGRADED` secara konsisten antara audit dan ingestion. | `MET-manual-partial-lost` (lulus; status `DEGRADED`, counts `1/1`), `test T4` |
| **T5 [P1]** | Pembatalan deduplikasi MET merusak request bersama dan memicu unhandled rejection | Pembatalan pemanggil kedua diabaikan (menerima sukses); pembatalan pemanggil pertama membatalkan network bersama dan mematikan pemanggil kedua; `finally()` meninggalkan unhandled rejection. | Arsitektur in-flight dirombak menggunakan multiplexed subscriber (`Set<Subscriber>`). Setiap pemanggil memiliki lifecycle dan AbortSignal mandiri. Pembatalan caller A hanya mencoret A; caller B yang masih aktif tetap menerima data dari network bersama. Network hanya dibatalkan jika seluruh pemanggil telah membatalkan. Rejection cleanup ditangani dengan try-catch tanpa promise liar. | `MET-later-caller-abort` (lulus), `MET-first-caller-abort` (lulus), `MET-unhandled-finally-rejection` (0 unhandled), `test T5` |
| **T6 [P1]** | Jendela hujan dan coverage memakai panjang/indeks array | Dua sampel nol berjarak 23 jam disimpulkan kering sepanjang hari (100% coverage array); titik peluang 70% mewarisi sebutan "Hujan lebat" dari titik 10 mm terpisah; dua titik berjarak 24 jam digabung berdasarkan indeks berdekatan. | Coverage dihitung berdasarkan rentang waktu kalender riil (`spanHours = Math.round((maxEpoch - minEpoch)/3600) + 1`). Jendela hujan dipisahkan secara tegas antara `positiveAmounts` (>0 mm) dan `probOnly` (peluang ≥50% tanpa akumulasi). Pengelompokan jam hujan menggunakan beda epoch (`<= 5400s`), bukan kedekatan indeks array. Tanggal disertakan jika rentang lintas hari. | `rain-sparse-two-zero-points`, `rain-75percent-zero-rest-missing`, `rain-positive-and-probability-only`, `rain-adjacent-index-24hour-gap` (seluruhnya lulus), `test T6` |
| **T7 [P1]** | Pembacaan cache radar OpenLayers membuat tile idle baru dan mereset status | Kode memanggil `source.getTile()` yang membuat objek tile baru dengan state IDLE=0 pada OpenLayers 10.10.0; `moveend` mereset `activeRequested/Loaded` menjadi 0 jika belum semua tile cachedLoaded; zoom peta 13 dikueri ke tile radar yang memiliki `maxZoom: 7`. | Kueri tile grid dibatasi pada zoom efektif penyedia (`Math.min(zoom, providerMaxZoom)` = 7). Inspeksi cache memeriksa renderer dan cache layer tanpa instansiasi sembarang. Status parsial (`activeRequested`, `activeLoaded`, `activeError`) dipertahankan saat `moveend`. Tile in-flight yang dibutuhkan yang selesai pasca-`moveend` berhasil memperbarui status ke `PARSIAL`. | `radar-partial-cache-reset` (status `PARSIAL`, zoom `[7]`), `radar-still-needed-inflight-ignored` (status `PARSIAL`), `test T7` |
| **T8 [P1]** | Endpoint publik `/api/spatial/hotspots` dan `/api/spatial/traffic/flow` menghasilkan 404 HTML | Laporan terdahulu menduga adanya masalah routing serverless tanpa bukti deployment manifes; status lokal NOT_CONFIGURED disalahartikan sebagai ingestion sukses. | Status kedua rute dicatat secara faktual sebagai `ROUTE_UNAVAILABLE` (HTTP 404 HTML dari web publik). Tidak ada spekulasi penyebab spesifik tanpa akses log deployment produksi. Di lingkungan lokal/telemetri, respons 404 dicatat sebagai `OFFLINE` dengan alasan deskriptif dan tidak dilaporkan sebagai keberhasilan data. | `live-provider-probes.json`, `test T8` di `stage12IntegrityVerification` |

---

## 3. Detail Perubahan Kode per Berkas

### A. [apps/web/src/services/metNorwayService.ts](file:///D:/vscode/Harmony/apps/web/src/services/metNorwayService.ts)
- **Perubahan T1**:
  - Mengubah antarmuka `MetNorwayPoint` agar `windSpeedKmh`, `windFromDirectionDeg`, `cloudAreaFractionPct`, dan `airPressureSeaLevelHpa` bertipe `number | null`.
  - Pada pemetaan instan `details`: menghilangkan fallback sintetik `0` dan `1013`. Nilai yang tidak dikirim oleh penyedia kini disetel ke `null`.
- **Perubahan T5**:
  - Mengganti promise deduplikasi sederhana dengan model entri penerbangan (`InFlightEntry`) yang memuat `Set<Subscriber>`, `AbortController` jaringan, dan batas waktu 12 detik.
  - Setiap pemanggil mendaftarkan subscriber unik dengan callback `resolve`, `reject`, dan `signal`.
  - Bila subscriber membatalkan, subscriber tersebut dihapus dan langsung di-reject dengan `AbortError`. Jaringan utama hanya dibatalkan jika `entryRef.subscribers.size === 0`.
  - Penanganan error jaringan membatalkan timer dan meneruskan error ke semua subscriber aktif tanpa memicu unhandled promise rejections.

### B. [apps/web/src/services/weatherDataIntegrity.ts](file:///D:/vscode/Harmony/apps/web/src/services/weatherDataIntegrity.ts)
- **Perubahan T3**:
  - `isValidIsoDateTime`: memperketat ekspresi reguler offset waktu (`(?:Z|([+-])(0\d|1[0-4]):([0-5]\d))`), memastikan offset di atas `+14:00` (seperti `+99:99`) ditolak. Menambahkan verifikasi `Number.isFinite(Date.parse(s))` dan batasan tahun antara 1970 hingga 2100.
  - `validateOpenMeteoModelPayload`:
    - Memeriksa batas epoch agar tidak menerima angka acak di luar batas representasi tanggal (misal `1e20`).
    - Menambahkan allowlist ketat untuk satuan suhu model (`°c`, `celsius`, `c`, `degc`, string kosong), menolak satuan asing seperti `bananas` dan `°f`.
    - Memeriksa setiap nilai suhu individual terhadap rentang fisik `[-100, 65]`. Jika ada nilai yang rusak bersama nilai yang valid, fungsi mengembalikan `{ valid: true, status: 'PARTIAL', acceptedCount, rejectedCount }`.
- **Perubahan T4**:
  - Mengizinkan metadata satuan MET Norway untuk field opsional (tekanan dan kecepatan angin) tidak wajib hadir jika field tersebut tidak dikirim.
  - `fetchCheckedJson`: jika validator mengembalikan objek parsial terstruktur, properti `acceptedCount` dan `rejectedCount` disalin langsung ke `SourceFetchAttempt`.

### C. [apps/web/src/services/geospatialDataTelemetryService.ts](file:///D:/vscode/Harmony/apps/web/src/services/geospatialDataTelemetryService.ts)
- **Perubahan T4**:
  - Memperbarui `pingEndpoint` untuk meneruskan objek parsial dari validator payload (`open_meteo_models`, model individual BoM, CMA, JMA, dan `met_norway_fallback`).
  - Memastikan audit manual endpoint menandai endpoint parsial sebagai `DEGRADED`, bukan membuang metrik dan menandainya `ONLINE`.

### D. [apps/web/src/services/weatherAggregatorService.ts](file:///D:/vscode/Harmony/apps/web/src/services/weatherAggregatorService.ts)
- **Perubahan T1**:
  - Mengubah antarmuka `WeatherHourlyPoint` agar `cloudCover`, `windSpeed`, `windDirection`, `pressure`, dan `seaLevelPressure` bertipe nullable (`number | null`).
- **Perubahan T2**:
  - Menghubungkan fungsi shared validator `validateOpenMeteoModelPayload` ke pemanggilan `fetchCheckedJson('open_meteo_models', ...)` dan split retry `fetchCheckedJson('open_meteo_models_split', ...)`.
  - Pada pembuatan `modelComparison` (jalur primer dan fallback), memfilter suhu dengan `finiteNumber(t) && t >= -100 && t <= 65`, sehingga nilai `999°C` ditolak dan tidak masuk ke komparasi.
  - Pada fungsi `getModel(id)` di deret per jam, menyaring nilai terhadap batas fisik yang sama.
  - Pada kalkulasi `current.tempMin` dan `current.tempMax`, menghitung min/max hanya dari suhu model yang sah; jika seluruh model tidak valid, fallback dengan aman ke suhu primer `c.temperature_2m` (bukan 999).
  - Pada fallback MET, jika model yang tersedia kurang dari jumlah model yang diminta, status attempt model disetel secara konsisten ke `PARTIAL`/`FAILED`.

### E. [apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx](file:///D:/vscode/Harmony/apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx)
- **Perubahan T1**:
  - Pada kartu cuaca, label awan disesuaikan: jika `avgCloud === null`, teks menampilkan `belum tersedia` dan status tutupan awan menampilkan `Data tutupan awan belum tersedia`, mencegah munculnya label keliru "Langit Cerah Terbuka".
- **Perubahan T6**:
  - Menghitung rentang jam yang diharapkan (`spanHours = Math.round((maxEpoch - minEpoch)/3600) + 1`).
  - Jika terdapat sampel 0 namun jam lainnya belum lengkap (misal 2 titik berjarak 23 jam, atau 18 titik 0 dengan 6 titik kosong), teks secara jujur menyatakan jumlah sampel yang tercatat dan menyebutkan sisa interval jam yang belum lengkap.
  - Memisahkan titik `positiveAmounts` (>0 mm) dari titik `probOnly` (peluang ≥50% tanpa angka akumulasi). Titik peluang tidak mewarisi sebutan "Hujan lebat".
  - Mengelompokkan jendela jam hujan berdasarkan selisih waktu (`<= 5400s` = 1.5 jam), bukan kedekatan indeks array, serta menambahkan prefiks tanggal jika rentang mencakup lintas hari.

### F. [apps/web/src/components/dashboard/views/spatial/MapsView.tsx](file:///D:/vscode/Harmony/apps/web/src/components/dashboard/views/spatial/MapsView.tsx)
- **Perubahan T7**:
  - Pada `handleResetActiveViewport`, kueri tile koordinat dibatasi pada zoom maksimum penyedia (`Math.min(zoom, providerMaxZoom)` = 7 untuk RainViewer radar).
  - Melakukan inspeksi tile tanpa membuat tile idle baru melalui integrasi renderer canvas layer dan cache.
  - Mempertahankan jumlah tile aktif (`activeRequested`, `activeLoaded`, `activeError`) saat `moveend`.
  - Menandai tile yang dibutuhkan pada viewport aktif dengan `_viewportGen` baru, sehingga tile in-flight yang selesai setelah `moveend` berhasil menambahkan `activeLoaded` dan mengubah status menjadi `PARSIAL`.

---

## 4. Inventaris Sumber Data, Model, dan Domain Peta

Seluruh 15 domain Studio Geospatial, menu navigasi terpusat **Peta Cuaca**, mode 2D/3D (OpenLayers & Cesium), serta seluruh model dan penyedia cuaca dipertahankan 100% tanpa pengurangan:

| Kategori | Daftar Sumber & Model yang Aktif | Status Operasional Pasca-Remediasi |
|---|---|---|
| **Model Global Top NWP** (9 Model) | ECMWF IFS (`ecmwf_ifs025`), GFS Seamless (`gfs_seamless`), ICON Seamless (`icon_seamless`), JMA Seamless (`jma_seamless`), BoM ACCESS-G (`bom_access_global`), CMA GRAPES (`cma_grapes_global`), Météo-France (`meteofrance_seamless`), UKMO Seamless (`ukmo_seamless`), CMC GEM (`gem_seamless`) | Semua terdaftar; divalidasi dengan shared physical bounds `[-100, 65]°C`. Probe riil CMA (25,8°C) dan JMA (27,6°C) terkonfirmasi sehat (HTTP 200). |
| **Penyedia Cuaca Primer & Fallback** | Open-Meteo Best Match (Primer), MET Norway MEPS/HRES (Fallback operasional) | Primer tervalidasi; fallback MET Norway bebas dari angka sintetik, memiliki deduplikasi dengan lifecycle pembatalan subscriber mandiri. |
| **Atmosfer & Kualitas Udara** | Copernicus CAMS (PM2.5, PM10, O3 melalui Open-Meteo) | Tervalidasi; gap waktu >1 jam ditolak, tidak ada angka 0 sintetik. |
| **Geologi & Kegempaan** | BMKG Gempaterkini & Autogempa, USGS Earthquake Feed | Autogempa live HTTP 200 JSON; koordinat dan kedalaman divalidasi rentang fisik. |
| **Satelit & Kebakaran Hutan** | NASA FIRMS (VIIRS/MODIS hotspot), NASA GIBS (Himawari-9 AHI Band 13 IR) | Deteksi metadata usang (>24 jam) menandai citra STALE; batas koordinat dan waktu akuisisi divalidasi. |
| **Radar Cuaca** | RainViewer Radar Mosaic (256px Slippy Tiles) | Integrasi OpenLayers 10.10.0 dengan zoom efektif 7, pembacaan status PARSIAL terkalibrasi, perlindungan 1 dari 3 tile tidak menjadi LIVE. |
| **Penginderaan Jauh & Raster** | STAC Catalog (Microsoft Planetary Computer / AWS Earth), LST Landsat-8/9 thermal band, Open-Elevation DEM | Parser GeoTIFF/Deflate dan penanganan CRS WGS84/UTM beroperasi normal. |
| **Domain Geospatial Studio** (15 Domain) | Cuaca & Atmosfer, Geologi/Gempa BMKG, Hidrologi, Hotspot FIRMS, Citra Satelit GIBS, Penginderaan Jauh STAC/LST, Elevasi DEM, Analisis Buffer, Kualitas Udara ISPU, Emisi Transportasi, Aksesibilitas Jaringan, Positioning GNSS, Fusi Intelijen Geospatial, SWOT Produk Spasial, Inspektur Sensor | Seluruh 15 tab domain beroperasi normal tanpa perubahan struktur menu. Nama menu tetap **Peta Cuaca**. |

---

## 5. Hasil Verifikasi Pengujian Nyata

### A. Eksekusi Script Verifikasi Tahap 12 (`scripts/verify-stage12-remediation.mjs`)
Hasil eksekusi:
```
{
  "checkedAt": "2026-10-04T01:16:53.693Z",
  "scope": "Stage 12 end-to-end data integrity remediation verification",
  "cases": 18,
  "passed": 18,
  "failed": 0
}
Stage 12 verification result: 18/18 cases passed.
```

### B. Eksekusi Suite Pengujian Otomatis (`node --test`)
| Suite Pengujian | Target Cakupan | Jumlah Test | Hasil | Durasi |
|---|---|---|---|---|
| `tests/stage12IntegrityVerification.test.mjs` | Remediasi T1–T8 Tahap 12 | 8 | **8 Pass, 0 Fail** | 388 ms |
| `tests/stage11IntegrityVerification.test.mjs` | Remediasi Tahap 11 (Baseline & Regresi) | 10 | **10 Pass, 0 Fail** | 378 ms |
| `tests/stage10IntegrityVerification.test.mjs` | Remediasi Tahap 10 (Kontrak MET & Model) | 12 | **12 Pass, 0 Fail** | 370 ms |
| `tests/evidenceStage6.test.mjs` | LST, GeoTIFF, Radar, Gempa, STAC | 19 | **19 Pass, 0 Fail** | 524 ms |
| `tests/weatherDataIntegrity.test.mjs` | Integritas Cuaca Menyeluruh (16 Grup) | 16 grup | **16 Pass, 0 Fail** | 6318 ms |
| **npm test** (Total Seluruh Suite) | Seluruh test suite aplikasi Harmony | 18 suite | **Semua Pass (exit 0)** | ~25 s |

### C. Pemeriksaan Tipe TypeScript (`npm run typecheck`)
- Command: `tsc --noEmit -p tsconfig.app.json`
- Hasil: **Exit code 0 (0 error)**

### D. Kompilasi Produksi (`npm run build`)
- Command: `vite build`
- Hasil: **Exit code 0 (4593 modul ditransformasi, bundle berhasil dibangun dalam 26.78 detik)**

---

## 6. Diagnosis Deployment dan Batasan yang Belum Terselesaikan

### Status Rute Spasial Publik:
1. `/api/bmkg/gempa/autogempa`: **ONLINE (HTTP 200 JSON)**
   - Mengembalikan data gempa bumi terkini BMKG yang valid dengan koordinat, magnitudo, dan kedalaman numerik sah.
2. `/api/spatial/hotspots`: **ROUTE_UNAVAILABLE (HTTP 404 HTML pada serverless publik)**
3. `/api/spatial/traffic/flow`: **ROUTE_UNAVAILABLE (HTTP 404 HTML pada serverless publik)**

### Diagnosis Objektif Sesuai Fakta:
- Lingkungan pengujian lokal tidak memiliki akses ke manifes fungsi serverless, commit deployment ID publik, atau log runtime server produksi.
- Oleh karena itu, sesuai instruksi review, penyebab kegagalan **tidak dispekulasikan** sebagai "unmapped routing" atau "expired API key".
- Status rute secara jujur dinyatakan sebagai `ROUTE_UNAVAILABLE`.
- Pada lapisan telemetri lokal, kegagalan 404 HTTP dicatat sebagai `OFFLINE` dengan pesan kesalahan deskriptif dan **tidak pernah** dianggap sebagai penyerapan data yang berhasil.

---

## 7. Kesimpulan dan Kriteria Selesai

1. **Data Sah Benar-Benar Dipakai**: Nilai suhu, kelembapan, koordinat, dan waktu yang sah diproses dan disajikan secara utuh.
2. **Tidak Ada Angka Sintetik**: Nilai angin, arah angin, tutupan awan, dan tekanan laut yang hilang dari penyedia tetap `null`. UI tidak menampilkan "Langit Cerah Terbuka" bila data awan tidak ada.
3. **Penyaringan Sampel Rusak**: Nilai `999°C` disaring keluar dari perbandingan model dan batas suhu min/max.
4. **Konsistensi Audit dan Konsumsi**: Status PARTIAL dan hitungan sampel sah/rusak dipertahankan di seluruh rantai (parser → service → audit manual → registry → UI).
5. **Lifecycle Pembatalan Mandiri**: Deduplikasi jaringan mendukung pembatalan per-subscriber tanpa mematikan subscriber lain atau menimbulkan unhandled rejection.
6. **Kepatuhan Waktu & Jendela Hujan**: Jendela hujan dan persentase kelengkapan menghormati interval jam kalender riil, memisahkan peluang dari intensitas akumulasi.
7. **Kesesuaian OpenLayers 10.10.0**: Kueri tile radar dibatasi pada zoom 7 penyedia dan mempertahankan status parsial viewport.
8. **Dokumentasi & Integritas**: Flag `accuracyValidated: false` tetap dipertahankan; tidak ada klaim akurasi berlebihan di luar cakupan data yang diuji.
