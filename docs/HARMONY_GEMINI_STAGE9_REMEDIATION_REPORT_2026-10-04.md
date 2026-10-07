# Harmony — Laporan Remediasi dan Verifikasi Tahap 9

Tanggal verifikasi: **4 Oktober 2026, WIB**.

---

## 1. Ringkasan Eksekutif

Remediasi tahap 9 telah diselesaikan dengan fokus utama pada pemulihan integritas data, penghapusan angka buatan pada cuaca cadangan (fallback), isolasi kegagalan model cuaca dinamis, evaluasi tile radar dan satelit berbasis viewport aktif, serta penyelarasan kontrak sumber data dengan bukti faktual.

Seluruh target perbaikan tahap 9 telah diimplementasikan, divalidasi dengan pengujian berbasis bukti (20 kasus uji tahap 9 lulus 100%), seluruh 12 suite uji regresi (85 uji terarah) lulus 100%, TypeScript typecheck lulus tanpa error, dan bundle produksi aplikasi web berhasil dikompilasi secara bersih.

---

## 2. Berkas yang Diubah dan Rationale Perubahan

| Berkas | Tujuan dan Rationale Perubahan |
|---|---|
| `apps/web/src/services/metNorwayService.ts` | - Validasi geometri wajib: koordinat harus tipe `Point`, numerik hingga 2 desimal, dan berjarak $\le 0.5^\circ$ dari target permintaan.<br>- Validasi satuan tegas: menolak `fahrenheit` atau kecepatan angin `km/h` yang tidak sesuai spesifikasi.<br>- Validasi `updated_at`: menolak string `'not-a-date'` dan data usang (> 48 jam).<br>- Telemetri percobaan faktual: mengukur `latencyMs`, `payloadBytes` aktual, `httpStatus` asli, dan sanitasi pesan error.<br>- Variabel cuaca nullable: presipitasi, hembusan angin, dan simbol cuaca bernilai `null` jika tidak dikirim penyedia; tidak dipaksa menjadi 0 atau `'cloudy'`. |
| `apps/web/src/services/weatherAggregatorService.ts` | - Kontrak `WeatherCurrentData` nullable: jika titik waktu saat ini tidak ada (`met.current === null`), blok `current` bernilai `null` secara eksplisit.<br>- Menghapus seluruh nilai buatan/hardcoded (`?? 28`, `?? 60`, `?? 1012`, `?? 10`, `conditionCode: 1`, dsb.).<br>- Mempertahankan perbandingan model dan kualitas udara CAMS ketika cuaca utama gagal.<br>- Pemulihan kegagalan model cuaca dinamis: mendeteksi model gagal spesifik (CMA, BoM, dsb.) dari pesan kesalahan penyedia dan mengisolasi model yang rusak daripada selalu menghapus BoM.<br>- Validasi koordinat ketat pada percobaan ulang model: menolak respons dengan koordinat yang tidak sesuai query (mis. London untuk permintaan Indonesia).<br>- Label jam prakiraan (`hourly.label`) diformat dari timestamp waktu penyedia sebenarnya, bukan dari indeks array statis. |
| `apps/web/src/services/weatherDataIntegrity.ts` | - Menjaga payload error upstream ketika `!response.ok` (HTTP 400/429/500) agar detail kesalahan (mis. model tidak tersedia) dapat diparsing oleh mekanisme isolasi model.<br>- Pengukuran `payloadBytes` aktual pada seluruh respons (sukses maupun gagal).<br>- Mendukung pengembalian status `PARTIAL` terstruktur (`{ partial: true, message: string }`) tanpa melempar kegagalan jaringan fatal. |
| `apps/web/src/services/geospatial/apiHealthService.ts` | - Validasi kalender BMKG: memvalidasi komponen tanggal kalender lokal (mendeteksi tanggal mustahil seperti 30 Februari) sebelum konversi timezone, sehingga tanggal lokal sah dengan offset `+07:00` lintas hari tidak tertolak secara keliru.<br>- Pemeriksaan batasan geografis koordinat, magnitudo numerik, dan kedalaman. |
| `apps/web/src/services/geospatialDataTelemetryService.ts` | - Registrasi endpoint model regional individu: `open_meteo_model_bom`, `open_meteo_model_cma`, `open_meteo_model_jma`, dan `met_norway_fallback`.<br>- Parser BMKG ketat: menolak koordinat `999,999`, magnitudo `abc`, dan kedalaman `nonsense`.<br>- Validator FIRMS ketat: mewajibkan tanggal dan jam akuisisi valid atau canonical timestamp; menolak `'not-a-date'` dan `'9999'`; mencatat rekor campuran sebagai `DEGRADED`/`PARTIAL` dengan jumlah rekor ditolak. |
| `apps/web/src/components/common/DataSourceProvenanceModal.tsx` | - Integritas hitungan stream online: `liveConnectedCount = verifiedOnlineCount`. Jika 0 endpoint online, tetap ditampilkan 0 (tidak kembali ke angka deskriptor statis 7).<br>- Pemetaan kartu model individu ke endpoint masing-masing (BoM ke endpoint BoM, CMA ke CMA, JMA ke JMA). |
| `apps/web/src/services/geospatial/stacService.ts` | - Validasi identitas scene: memastikan `item.id === sceneId` pada `resolveSceneAssetUrl` (menolak scene ID yang tidak cocok).<br>- Status `isSigned` dinamis berdasarkan perbandingan URL sebelum dan sesudah operasi signing. |
| `apps/web/src/components/dashboard/views/spatial/MapsView.tsx` | - Evaluasi status radar berbasis tile aktif viewport: menghitung `activeRequested`, `activeLoaded`, `activeError` per viewport generasi aktif.<br>- Menghapus aturan heuristik `error > loaded` yang sebelumnya mendistorsi status parsial.<br>- Penanganan metadata NASA GIBS dari kemampuan resmi WMTS; menampilkan `PARSIAL CITRA` dengan warna amber dan `MEMUAT CITRA` dengan warna biru.<br>- Penanganan aman terhadap nilai kecepatan dan arah angin yang nullable. |
| `apps/web/src/services/atmosphericNwpAiService.ts` | - Kontrak `NwpVerifyPayload` nullable untuk parameter cuaca permukaan.<br>- Type narrowing tegas yang memastikan variabel atmosfer lengkap dan bernilai numerik terhingga sebelum komputasi diagnostik lokal dijalankan. |
| `apps/web/src/services/dataFusionAndUncertaintyEngine.ts` | - Penanganan aman optional chaining pada `weatherData?.current` untuk mencegah runtime error saat `current` bernilai `null`. |
| `apps/web/src/components/dashboard/views/spatial/charts/HarmonyChartEngine.tsx` | - Penanganan aman variabel cuaca dan polutan PM2.5 nullable pada grafik dan gauge AQI. |
| `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx` | - Penanganan aman variabel cuaca nullable pada kartu intisari, banner KPI, dan grafik 24 jam.<br>- Menampilkan `'—'` atau `'Tidak tersedia'` secara jujur alih-alih angka 0 atau default buatan. |
| `package.json` | - Menambahkan `tests/stage9IntegrityVerification.test.mjs` ke skrip `test` root. |
| `tests/stage9IntegrityVerification.test.mjs` | - Suite pengujian otomatis berbasis `node:test` untuk memverifikasi 20 temuan review tahap 9. |
| `tests/evidence-stage9-verified.json` | - Bukti JSON hasil eksekusi verifikasi tahap 9. |

---

## 3. Matriks Status Sumber: Permintaan, Keberhasilan, dan Penggunaan Data

| Domain / Sumber | Produk yang Diminta | Status Permintaan | Status Validasi | Freshness / Waktu | Cakupan & Penggunaan Nyata |
|---|---|---|---|---|---|
| **MET Norway** (`met_norway_fallback`) | Locationforecast 2.0 Compact (suhu, kelembapan, angin, tekanan permukaan laut) | Berhasil (HTTP 200) | Valid jika format & koordinat sesuai; ditolak jika unit salah / geometry hilang | Mengikuti header `updated_at` penyedia; forecast ke depan | Digunakan sebagai fallback cuaca saat cuaca utama gagal. `current` bernilai `null` jika tidak ada titik waktu saat ini. |
| **Open-Meteo Current** (`open_meteo_weather`) | Suhu 2m, kelembapan, angin, presipitasi, tekanan permukaan | Berhasil (HTTP 200) | Valid sesuai rentang fisik | < 3 jam dari waktu sistem | Sumber utama observasi/prakiraan cuaca saat ini. |
| **Open-Meteo Models** (`open_meteo_models`) | Ensemble 9 Model Global (ECMWF, GFS, ICON, JMA, BoM, CMA, MeteoFrance, UKMO, GEM) | Berhasil / Terisolasi saat gagal | Valid per array suhu model pada jam yang sama | Sesuai epoch model yang diselaraskan | Digunakan untuk grafik perbandingan model (Bot Consensus Calculator). Model gagal diisolasi secara mandiri. |
| **Copernicus CAMS** (`open_meteo_air`) | Partikulat PM2.5, PM10, Ozon | Berhasil (HTTP 200) | Valid jika koordinat cocok & waktu $\le$ 24 jam | 1 jam cadence | Digunakan untuk pemantauan partikulat dan perhitungan ISPU indikatif (bukan AQMS resmi). |
| **BMKG InaTEWS** (`bmkg_tews`) | Autogempa & Gempaterkini | Berhasil (HTTP 200) | Valid jika koordinat fisik, kalender sah (termasuk offset WIB +07:00), magnitudo $\le$ 10, kedalaman $\le$ 1000 km | Waktu kejadian gempa faktual | Digunakan untuk peta gempa dan sistem peringatan dini gempa bumi. |
| **NASA FIRMS** (`nasa_firms`) | Deteksi Hotspot VIIRS / MODIS | Tergantung konfigurasi kunci server | Valid jika koordinat fisik dan tanggal+jam akuisisi terverifikasi | Waktu satelit SNPP/NOAA | Digunakan untuk pemantauan hotspot kebakaran hutan. Rekor tidak valid disaring mandiri. |
| **TomTom Traffic** (`tomtom_traffic`) | Flow Segment Data | Tergantung konfigurasi kunci server | Valid jika koordinat ruas jalan dan data closure lengkap | Real-time flow | Digunakan untuk pemantauan kecepatan lalu lintas. Mengembalikan `NOT_CONFIGURED` jika kunci belum ada. |
| **RainViewer Radar** | Radar mosaic 256px | Berhasil (HTTP 200) | Valid jika metadata frame < 2 jam | Frame 10 menit | Ditampilkan pada peta cuaca native OpenLayers dengan status tile aktif viewport. |
| **NASA GIBS** | Himawari-9 AHI Band 13 Clean IR | Berhasil (WMTS Capabilities) | Valid jika layer dan frame terdaftar di GetCapabilities | Cadence 10 menit (~25-30 menit latensi) | Visualisasi citra satelit inframerah; dilabeli visualisasi (bukan LST numerik). |
| **USGS / Planetary Computer** (`stacService`) | STAC Scene & Landsat Assets | Berhasil (STAC Query) | Valid jika returned scene ID identik dengan query | Waktu akuisisi scene Landsat | Digunakan untuk analisis LST Landsat Collection 2 Level-2 Surface Temperature. |

---

## 4. Status Lokal vs Produksi

### Lingkungan Lokal
- Rute Express backend `/api/spatial/hotspots` dan `/api/spatial/traffic/flow` terpasang secara benar pada `apps/server/src/routes/spatialRoutes.js` dan dimuat melalui `apps/server/src/server.js`.
- Pengujian langsung pada server Express lokal mengembalikan HTTP 200 dengan format JSON terstruktur `{ success: false, reason: { code: 'NOT_CONFIGURED', message: '...' } }`.
- Frontend menangani status ini secara aman tanpa membuat kegagalan jaringan atau memalsukan data.

### Lingkungan Produksi (Vercel)
- URL publik `https://harmony-nine-tau.vercel.app/api/bmkg/gempa/autogempa` mengembalikan HTTP 200 JSON (rute backend aktif).
- URL publik `https://harmony-nine-tau.vercel.app/api/spatial/hotspots` dan `/api/spatial/traffic/flow` mengembalikan HTTP 404 HTML.
- **Penyebab faktual**: Commit deployment produksi saat ini belum memuat bundle rute `spatialRoutes.js` terbaru, bukan karena API key kedaluwarsa. Begitu deployment diperbarui dengan branch terkini, rute ini akan mengembalikan respons backend terstruktur.

---

## 5. Ringkasan Pengujian

### A. Verifikasi Tahap 9 (`tests/stage9IntegrityVerification.test.mjs` & `scripts/verify-stage9-remediation.mjs`)
- Total kasus uji: **20 kasus**
- Lulus: **20/20 (100%)**
- Gagal: **0**

### B. Suite Regresi Penuh (12 Suite, 85 Uji)
1. `tests/stage9IntegrityVerification.test.mjs`: 8 uji (LULUS)
2. `tests/auditRemediationReproductions.test.mjs`: 10 uji (LULUS)
3. `tests/monitoringSnapshot.test.mjs`: 9 kelompok uji (LULUS)
4. `tests/recoveryFollowup.test.mjs`: 12 kelompok uji (LULUS)
5. `tests/geminiReviewIntegrity.test.mjs`: 12 kelompok uji (LULUS)
6. `tests/weatherDataIntegrity.test.mjs`: 16 kelompok uji (LULUS)
7. `tests/evidenceStage6.test.mjs`: 19 uji (LULUS)
8. `tests/evidence14Reproductions.test.mjs`: 14 uji (LULUS)
9. `tests/evidenceCurrent14.test.mjs`: 14 uji (LULUS)
10. `tests/evidenceStage3.test.mjs`: 11 uji (LULUS)
11. `tests/evidenceStage4.test.mjs`: 13 uji (LULUS)
12. `tests/evidenceStage5.test.mjs`: 14 uji (LULUS)

**Hasil akhir**: Exit code 0, 0 gagal.

### C. Build & Typecheck Gate
- `npm run typecheck --prefix apps/web`: **Exit code 0** (0 TypeScript errors)
- `npm run build --prefix apps/web`: **Exit code 0** (Vite v5.4.21 bundle berhasil dikompilasi)

---

## 6. Daftar Masalah Tersisa dan Catatan Akurasi

1. **Akurasi Prakiraan Terhadap Observasi Lapangan (`accuracyValidated: false`)**:
   - Sesuai standar integritas ilmiah, ketersediaan model numerik (ECMWF, GFS, ICON, dsb.) dan cuaca cadangan (MET Norway) adalah prakiraan model, bukan pengamatan lapangan langsung. Bendera `accuracyValidated` tetap dipertahankan `false` sampai ada validasi pengamatan darat langsung.
2. **Kredensial Produksi FIRMS & TomTom**:
   - Memerlukan deployment ulang versi backend terkini ke Vercel agar rute `/api/spatial/*` terdaftar, serta pengisian variabel lingkungan `FIRMS_MAP_KEY` dan `TOMTOM_API_KEY` pada dashboard hosting produksi jika pengguna ingin mengaktifkan data operasional langsung.
