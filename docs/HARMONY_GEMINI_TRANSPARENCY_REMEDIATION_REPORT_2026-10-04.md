# Laporan Remediasi: Transparansi Data, Adapter Fallback, dan Pipeline Prakiraan AI Harmony
**Tanggal**: 4 Oktober 2026  
**Repositori**: `D:/vscode/Harmony`  
**Cakupan**: Modal Transparansi Data, Adapter MET Norway, Orkestrasi Siklus Asinkron, Validasi & Diagnostik Parsial NWP, Paritas Kontrak AI, Integrasi Penyimpanan Multi-Presisi.

---

## 1. Penyebab Utama yang Ditemukan dan Bukti Sebelum/Sesudah

Berdasarkan hasil investigasi mendalam terhadap kode dan reproduksi terkontrol (`reproductions.json`), ditemukan 6 akar penyebab utama:

### A. Format Respons MET Norway pada Ingestion & Hilangnya Data Matriks
* **Penyebab**: Cabang fallback MET Norway di `weatherAggregatorService.ts` memanggil `recordRawIngestion` dengan objek sintetis `{ fallback: 'met_norway', modelComparisonResponse: ... }` tanpa menyertakan payload asli MET Norway. Akibatnya, `geospatialDataTelemetryService.ts` yang mengasumsikan struktur Open-Meteo (`weatherRes.current`) tidak menemukan data temperatur, kelembapan, maupun angin. Matriks mentah menampilkan 0 baris dan `rawTemperature` bernilai `null`, meskipun data cuaca di kartu UI menampilkan 22°C.
* **Perbaikan**: 
  1. `metNorwayService.ts` menyimpan respons mentah asli pada properti `rawPayload`.
  2. `weatherAggregatorService.ts` mengirimkan payload lengkap dan metadata fallback ke telemetri.
  3. `geospatialDataTelemetryService.ts` dilengkapi adapter khusus MET Norway yang mengekstrak deret parameter, mempertahankan payload asli, memasukkan baris model regional ke matriks, dan strictly memisahkan *sea-level pressure* dari *surface pressure* (surface pressure tetap `null` karena MET tidak menyediakannya).
* **Bukti Sebelum vs Sesudah**:
  - *Sebelum*: `rawTemperature = null`, `matrixRows = 0`, `hasOriginalMetPoints = false`.
  - *Sesudah*: `rawTemperature = 22°C`, `matrixRows = 2` (Primary Open-Meteo FAILED + MET Norway Fallback ACTIVE), `hasOriginalMetPoints = true`.

### B. Kegagalan Input AI NWP Akibat Data Fallback yang Hilang
* **Penyebab**: Audit `pingEndpoint('ai_nwp')` mengambil suhu dari `snapshot.rawParameters.rawTemperature`. Ketika fallback aktif dan `rawTemperature` adalah `null`, pengujian AI mengirim `temperature = null` dan mencatat status `OFFLINE`.
* **Perbaikan**: Adapter MET Norway mengisi `rawTemperature` terverifikasi ke dalam snapshot yang dinormalisasi. Telemetri kini membaca suhu tervalidasi snapshot dan meneruskannya ke request DTO AI.
* **Bukti Sebelum vs Sesudah**:
  - *Sebelum*: Request AI mengirim `{ temperature: null }`, verifikasi ditolak.
  - *Sesudah*: Request AI mengirim `{ temperature: 22 }`, verifikasi berhasil diproses.

### C. Penolakan Klien atas Respon AI yang Sah dengan `calibratedRainProb: null`
* **Penyebab**: Tipe antarmuka `AiNwpVerificationResult` di klien mengizinkan `calibratedRainProb: number | null`. Namun fungsi validasi di `atmosphericNwpAiService.ts` menolak respons jika `typeof result.calibratedRainProb !== 'number'`. Akibatnya, respons backend valid yang tidak memaksakan probabilitas hujan sintetis justru ditolak klien dan jatuh ke fallback diagnostik darurat.
* **Perbaikan**: Kontrak penerimaan klien diselaraskan untuk mengizinkan `null`. Nilai `NaN`, `Infinity`, atau angka di luar rentang `[0, 100]` tetap ditolak secara ketat.
* **Bukti Sebelum vs Sesudah**:
  - *Sebelum*: Klien melempar error dan `clientAiSucceeded = false`.
  - *Sesudah*: Klien menerima respons valid (`clientAiSucceeded = true`, `clientModel = 'gemini-3.6-flash'` atau fallback yang sah).

### D. Diagnostik Parsial Atmosfer yang Melempar Eksepsi saat Tekanan Hilang
* **Penyebab**: Pada `atmosphericNwpAiService.ts` dan `weatherIntegrity.js`, ketiadaan `current.pressure` langsung melempar `Data untuk diagnostik atmosfer tidak lengkap.`. Hal ini menggugurkan seluruh indikator, termasuk persamaan parameter Coriolis yang hanya memerlukan lintang geografis.
* **Perbaikan**: Diagnostik diubah menjadi parsial (`status: 'WARNING'`). Parameter Coriolis tetap dihitung secara deterministik dari lintang; persamaan gas ideal ditandai tidak dapat dihitung dan `airDensityKgM3` diatur ke `null` tanpa menggagalkan proses.
* **Bukti Sebelum vs Sesudah**:
  - *Sebelum*: Fungsi melempar exception, komputasi terhenti total.
  - *Sesudah*: Perhitungan berjalan lancar tanpa throw; parameter Coriolis terisi, kerapatan udara `null` dengan status transparan `WARNING: Tekanan permukaan tidak tersedia atau tidak valid`.

### E. Audit AI Mengirim Model Kosong (`modelComparison: []`)
* **Penyebab**: `pingEndpoint('ai_nwp')` secara statis mengirimkan array kosong `modelComparison: []`, mengabaikan model NWP yang telah di-fetch pada snapshot.
* **Perbaikan**: `pingEndpoint('ai_nwp')` membaca model terverifikasi langsung dari `latestSnapshot.modelComparison` dan mengirimkannya lengkap dengan nama model, suhu, dan timestamp horizon.
* **Bukti Sebelum vs Sesudah**:
  - *Sebelum*: `sentToAi = 0` model.
  - *Sesudah*: `sentToAi = 9` model (seluruh model valid dari snapshot diteruskan ke AI).

### F. Ketidaksesuaian Kontrak Audit Kualitas Udara & URL Model
* **Penyebab**: URL registry audit `open_meteo_air` hanya meminta parameter `current`, sementara validator `validateAirQuality` mewajibkan ketersediaan array `hourly` (`pm10`, `pm2_5`, `ozone`). Akibatnya endpoint selalu dinilai `PARTIAL`. Selain itu, URL model individual (`bom`, `cma`, `jma`) tidak menyertakan `timeformat=unixtime` dan `timezone=auto`.
* **Perbaikan**: URL audit `open_meteo_air` ditambahkan parameter `&hourly=pm10,pm2_5,ozone`. URL model individual dilengkapi format epoch UTC dan timezone eksplisit.

### G. Inkonsistensi Kunci Lokasi & Query Riwayat PostgreSQL
* **Penyebab**: Server menyimpan data AI dengan presisi 3 desimal (`-7.250,112.750`), tetapi endpoint pembacaan menggunakan presisi 2 desimal (`-7.25,112.75`). Selain itu, query database Postgres melakukan `LIMIT 10` global sebelum pemfilteran lokasi di memori JavaScript, sehingga riwayat lokasi aktif tertimpa oleh data lokasi lain.
* **Perbaikan**: Fungsi `normalizeKeyVariants` ditambahkan di `repository.js` untuk mencocokkan format `[v3, v2]`. Query SQL PostgreSQL diperbaiki untuk memfilter `WHERE (data->>'locationKey') = ANY($1)` **sebelum** `ORDER BY created_at DESC LIMIT $2`.

---

## 2. File yang Diubah dan Tujuannya

| Berkas | Tujuan Perbaikan |
|---|---|
| `apps/web/src/services/metNorwayService.ts` | Menyimpan `rawPayload` asli dari MET Norway untuk transparansi audit dan downstream consumer. |
| `apps/web/src/services/weatherAggregatorService.ts` | Mengalirkan metadata penyedia, payload mentah MET, dan model comparison ke telemetri pada jalur fallback. |
| `apps/web/src/services/atmosphericNwpAiService.ts` | Mengizinkan diagnostik parsial (Coriolis tanpa tekanan), memperbolehkan `calibratedRainProb: null` pada kontrak penerimaan AI, serta validasi batas nilai fisik yang ketat. |
| `apps/server/src/services/weatherIntegrity.js` | Menyelaraskan diagnostik parsial di sisi server agar konsisten dengan klien saat tekanan permukaan tidak tersedia. |
| `apps/server/src/routes/ai.js` | Membaca konfigurasi `.env.local` dan `.env` secara dinamis, melaporkan status konfigurasi sesungguhnya pada `/health`, mendukung kunci lokasi 2 dan 3 desimal, serta memisahkan status penjelasan AI dari status penyimpanan database. |
| `apps/server/src/repositories/repository.js` | Menambahkan normalisasi multi-presisi koordinat dan memperbaiki klausul SQL agar memfilter lokasi sebelum `LIMIT`. |
| `apps/web/src/services/geospatialDataTelemetryService.ts` | Memperkaya `RawTelemetrySnapshot`, menambahkan adapter MET Norway, menyelaraskan URL audit CAMS dan model individual, membaca model dari snapshot pada audit AI, serta mengikat ekspor JSON ke koordinat aktif. |
| `apps/web/src/components/dashboard/views/spatial/GeospatialDataTransparencyModal.tsx` | Mengubah siklus simulasi menjadi asinkron dengan Promise chaining (`await onRefreshWeather` lalu `await onReverifyAi`), mencegah race condition / double-click, mengikat tampilan ke koordinat kueri aktif, dan memperbarui label transparansi. |
| `tests/transparencyDataIntegrity.test.mjs` | Suite tes integrasi regresi untuk menguji R1–R6 secara otomatis. |

*Catatan Sumber*: Seluruh 15 domain studio, sumber data cuaca primer, fallback MET Norway, CAMS Air Quality, BMKG TEWS, USGS Earthquakes, Open-Elevation, FIRMS Fire Alerts, dan TomTom Traffic tetap dipertahankan. Tidak ada sumber yang dihapus dari registri.

---

## 3. Hasil Pengujian, Pemeriksaan Tipe, Build, dan Probe Aktual

### A. Uji Reproduksi Cacat Awal (`reproduce.mjs`)
Dijalankan menggunakan skrip review audit (`reproduce.mjs`):
```text
=== REPRODUCING CASE 1: Fallback MET Norway matrix & raw ingestion ===
  -> Fallback handled. Displayed: 22, rawTemperature: 22, matrixRows: 2, hasOriginalMetPoints: true
  [PASS] Case 1 fixed!

=== REPRODUCING CASE 2: AI input after fallback ===
  -> AI input after fallback: temperatureSent = 22
  [PASS] Case 2 fixed!

=== REPRODUCING CASE 3: Valid AI response with null calibratedRainProb ===
  -> AI client accepted response: true, model: fixture-ai
  [PASS] Case 3 fixed!

=== REPRODUCING CASE 4: Missing pressure in atmospheric diagnostic ===
  -> Diagnostic without pressure executed smoothly without throwing.
  [PASS] Case 4 fixed!

=== REPRODUCING CASE 5: Discarding model comparison in AI audit ===
  -> Models sent to AI endpoint in audit: 9
  [PASS] Case 5 fixed!
```
**Hasil**: 5 dari 5 kasus reproduksi dinyatakan **LULUS (FIXED)**.

### B. Uji Suite Regresi Baru (`tests/transparencyDataIntegrity.test.mjs`)
Dijalankan via Node test runner:
- `✔ R1: MET Norway fallback preserves raw payload, matrix rows, separates sea-level pressure, and passes temperature to AI`
- `✔ R2: Partial diagnostic runs Coriolis without throwing when surface pressure is null`
- `✔ R3: AI response with calibratedRainProb: null is accepted, while invalid probabilities are rejected`
- `✔ R4: Snapshot model comparison is fully transmitted to AI endpoint audit`
- `✔ R5: Air quality audit URL includes hourly parameters matching validator contract`
- `✔ R6: Server repository filters by locationKey before LIMIT`
**Hasil**: 6/6 tes lolos.

### C. Uji Keseluruhan Proyek (`npm test`)
Dijalankan pada seluruh 15 suite pengujian proyek Harmony:
- Stage 5 Remediation Suite: 14 pass
- Stage 6 Remediation Suite: 19 pass
- Stage 9–12 Verification Suites: 45 pass
- Core Data Integrity Suites: 15 pass
**Hasil Total**: **93 passed, 0 failed, 0 skipped**.

### D. Pemeriksaan Tipe (`npm run typecheck`)
Dijalankan via TypeScript compiler (`tsc --noEmit`):
- `apps/web`: 0 errors.
- `apps/server`: 0 errors.

### E. Build Produksi (`npm run build`)
Dijalankan via Vite:
- Transformasi: 4595 modules transformed.
- Bundle output: `dist/index.html`, bundle chunks untuk Cesium, MapsView, dan modals berhasil dibuat tanpa error dalam waktu 26.69s.

### F. Status Probe Live Lapangan (4 Oktober 2026)
1. **Open-Meteo Weather**: Online (HTTP 200), parameter lengkap.
2. **Open-Meteo Air Quality (CAMS)**: Online & Valid (HTTP 200), audit URL kini cocok dengan parameter hourly `pm10,pm2_5,ozone`.
3. **MET Norway**: Online (HTTP 200), respons mentah tersimpan dan sea-level pressure terpisah secara transparan.
4. **Individual Models (BoM, CMA, JMA)**: BoM menghasilkan nilai null untuk lokasi tropis Surabaya (dilaporkan apa adanya sebagai NO_COVERAGE/PARTIAL tanpa mengisi nilai sintetis); JMA dan CMA valid untuk horizon masing-masing.
5. **BMKG TEWS & USGS**: Online (HTTP 200), GeoJSON tervalidasi.
6. **FIRMS & TomTom**:
   - Lokal: HTTP 200 dengan `success: false, reasonCode: 'NOT_CONFIGURED'` (kunci API belum dikonfigurasi di server).
   - Produksi publik Vercel: Rute belum ter-deploy pada rewrite serverless function (HTTP 404 HTML). Dilaporkan transparan sebagai `ROUTE_NOT_FOUND`.
7. **Gemini AI NWP**:
   - Backend `/api/ai/health` melaporkan secara jujur: `configured: true`, `weatherConfigured: true` (fallback key aktif), model: `gemini-3.6-flash`.
   - Diagnostik lokal deterministik beroperasi independen saat panggilan inference AI mengalami timeout atau offline.

---

## 4. Alur Kerja Data End-to-End

```
Pengguna Memilih Lokasi (lat, lng)
               │
               ▼
   Pembuatan Identity & QueryKey
(runId, snapshotId, lat.toFixed(3), lng.toFixed(3))
               │
               ▼
Pengambilan Sumber Primer & Fallback
├── [1] Primer: Open-Meteo Forecast
│        └── Validasi: WMO code, unit °C, physical range, freshness
├── [2] Fallback (jika primer gagal): MET Norway Locationforecast
│        └── Adapter: Simpan rawPayload, extract timeseries, 
│            set rawSurfacePressure = null, rawSeaLevelPressure = value
├── [3] Kualitas Udara: Open-Meteo CAMS (current + hourly)
└── [4] Multi-Model NWP: 9 model (ECMWF, GFS, ICON, GEM, JMA, dll.)
               │
               ▼
   Validasi Kontrak & Integritas Data
├── Tolak nilai 999, NaN, Infinity, unit tidak sesuai
├── Horizon masking: jangan isi deret null dengan angka karangan
└── Tandai status per sumber: ONLINE, PARTIAL, DEGRADED, atau OFFLINE
               │
               ▼
  Penyusunan Snapshot Normalisasi (Immutable)
├── Disimpan per queryKey di DataTelemetryService
└── Memuat rawParameters, regionalModelEntries, sourceAttempts
               │
               ▼
   Diagnostik Atmosfer Deterministik (Parsial)
├── Parameter Coriolis dihitung dari lintang (f = 2Ω sin φ)
├── Gas ideal dihitung HANYA jika suhu mutlak DAN tekanan permukaan valid
└── Jika tekanan null -> airDensityKgM3: null, status: WARNING
               │
               ▼
    Verifikasi / Penjelasan Prakiraan AI
├── DTO dibangun dari snapshot normalisasi yang sama
├── Model NWP valid dari snapshot diteruskan ke prompt AI
├── AI mengevaluasi konsensus model, awan, angin, dan dinamika
└── Kontrak respons: terima calibratedRainProb null, tolak probabilitas di luar 0–100
               │
               ▼
      Penyimpanan & Tampilan Transparansi
├── Penyimpanan DB: filter locationKey sebelum LIMIT
├── UI Modal: menampilkan matriks mentah, status sumber transparan,
│   dan alasan kegagalan yang dapat ditindaklanjuti
└── Ekspor JSON: memuat snapshot dan telemetri yang terikat pada lokasi aktif
```

---

## 5. Matriks Status Sumber dan Kebutuhan Konfigurasi

| Kode Sumber | Nama Penyedia | Status Operasional | Cakupan / Scope | Kebutuhan Konfigurasi / Catatan Lingkungan |
|---|---|---|---|---|
| `open_meteo` | Open-Meteo Seamless | **ONLINE** | Global | Tanpa API key untuk tier standar. Parameter current, hourly, daily. |
| `met_norway` | MET Norway Locationforecast | **ONLINE (Fallback)** | Global | Wajib User-Agent unik. Hanya menyediakan sea-level pressure. |
| `open_meteo_air` | CAMS European Air Quality | **ONLINE** | Global | Memerlukan sinkronisasi parameter current + hourly pada kueri audit. |
| `open_meteo_models` | Open-Meteo 9 NWP Ensemble | **ONLINE / PARTIAL** | Model Dependen | BoM terbatas pada koordinat tropis tertentu; JMA, ECMWF, GFS penuh. |
| `bmkg_tews` | BMKG Indonesia TEWS | **ONLINE** | Indonesia | Terbuka publik, update gempa NRT. |
| `usgs_earthquake`| USGS Earthquake API | **ONLINE** | Global | Terbuka publik. Kejadian nol dilaporkan sebagai EMPTY_VALID. |
| `open_elevation` | Open-Elevation SRTM | **ONLINE** | Global | Terbuka publik. Digunakan untuk estimasi profil elevasi. |
| `nasa_firms` | NASA FIRMS Active Fire | **NOT_CONFIGURED** | Global (MODIS/VIIRS) | Memerlukan `FIRMS_MAP_KEY` di server `.env`. Di Vercel perlu perbaikan rute serverless. |
| `tomtom_traffic` | TomTom Flow & Incidents | **NOT_CONFIGURED** | Koridor Jalan | Memerlukan `TOMTOM_API_KEY` di server `.env`. Di Vercel perlu perbaikan rute serverless. |
| `ai_nwp` | Gemini NWP Atmospheric AI | **CONFIGURED / FALLBACK** | Global Analisis | Menggunakan `GEMINI_API_KEY`. Fallback lokal aktif jika kuota habis/timeout. |

*Catatan Keamanan*: Nilai kunci API dan token autentikasi dirahasiakan di server. Telemetri hanya melaporkan `configured: true/false` dan `reasonCode` yang telah disanitasi.

---

## 6. Keterbatasan Hasil Prakiraan dan Status Pengujian Terhadap Pengamatan

1. **Bukan Solver NWP 3D Mandiri**: Fitur analisis AI di Harmony berfungsi sebagai *interpreter saintifik dan synthesizer konsensus multi-model*, bukan model numerik fluida atmosfer independen. Indikator fisik (Coriolis, estimasi gas ideal) dihitung secara deterministik dengan batasan asumsi udara kering.
2. **Ketiadaan Sensor Observasi Pembanding**: Harmony saat ini tidak terhubung langsung dengan stasiun cuaca permukaan in-situ (seperti AWS BMKG real-time). Oleh karena itu, metrik verifikasi MAE/RMSE dan Brier score secara jujur **belum dapat dihitung**. Perbedaan antarmodel dicatat sebagai divergensi model, bukan galat akurasi.
3. **Probabilitas Hujan**: Tanpa radar Doppler atau ensemble kalibrasi lokal, model cuaca tidak mengarang persentase probabilitas hujan. Jika penyedia tidak menyediakannya, nilai dipertahankan `null` dan dijelaskan melalui tutupan awan serta kelembapan relatif.
4. **Konteks Bahaya Lingkungan**: Data satelit FIRMS dan gempa bumi USGS/BMKG disajikan murni sebagai *konteks geospasial risiko bencana*, dan tidak diinjeksikan secara keliru ke dalam persamaan cuaca permukaan.

---

## 7. Pembaruan Tab Uji & Verifikasi Akurasi serta Penanganan Horizon Model

Menindaklanjuti audit tampilan modal transparansi data:
1. **Pembuatan Scorecard Akurasi Otomatis (Tab 4 & Ringkasan Card 4)**:
   - Sebelumnya, fungsi `getAccuracyScorecard()` mengembalikan nilai `null` sehingga Tab 4 kosong dan Card 4 menampilkan "Belum diuji".
   - Kini, saat proses `recordRawIngestion`, telemetri secara otomatis membangkitkan `AccuracyScorecard` lengkap:
     - **6 Uji Fisika Deterministik**: Verifikasi sebaran ensemble multi-model, hubungan titik embun terhadap suhu permukaan ($T_d \le T$), batas tekanan atmosfer fisik ($870 \sim 1085$ hPa), batas kelembapan relatif ($0 \sim 100\%$), presipitasi non-negatif ($\ge 0$ mm), serta kepatuhan kode cuaca standar WMO.
     - **Tabel Audit 5 Parameter**: Mengevaluasi konsensus ensemble temperatur, dispersi deviasi standar ($\sigma$), kelembapan, presipitasi, dan tekanan atmosfer.
     - **Skor Keyakinan Global**: Dihitung dari rasio pengujian lolos dan kelengkapan model ensemble untuk memberikan gambaran transparan kepada pengguna.
2. **Penanganan Horizon Model (CAMS, JMA, CMA, BoM)**:
   - Validator `validateAirQuality` diperbarui agar menerima batas alami horizon prakiraan Copernicus CAMS (5 hari) dalam kueri 7 hari, tanpa menolak nilai null di akhir sebagai data rusak.
   - Kueri audit untuk model regional JMA GSM dan CMA GRAPES disesuaikan dengan horizon validnya (`forecast_days=7`), mencegah error penolakan di luar rentang fisik.
   - Model BoM ACCESS-G untuk wilayah lintang tropis Indonesia secara tepat diklasifikasikan sebagai `NO_COVERAGE`, bukan galat suhu fisik.
3. **Penyempurnaan Label dan Status Endpoint (Tab 1 & Card 1)**:
   - Status kartu endpoint kini membedakan dengan jelas antara sumber yang memerlukan kunci konfigurasi server (`Perlu Kunci Server`), model di luar cakupan geografis (`Di Luar Cakupan Wilayah`), tampilan iframe visual Windy (`Tampilan Aktif`), dan data terverifikasi (`Data valid HTTP 200`).
   - Summary Card 1 menyajikan rincian informatif: `{online} Online • {degraded} Parsial/Cakupan • {notConfigured} Perlu Kunci`.
4. **Tahapan Transformasi AI (Tab 3)**:
   - Menghasilkan 5 tahapan delta pemrosesan data (Harmonisasi Satuan WMO, Interpolasi Grid Waktu UTC, Konsensus Ensemble Multi-Model, Koreksi Anomali & Deteksi Gerimis, serta Diagnostik Dinamika Fluida NWP) dengan penjelasan rasional ilmiah saintifik.

