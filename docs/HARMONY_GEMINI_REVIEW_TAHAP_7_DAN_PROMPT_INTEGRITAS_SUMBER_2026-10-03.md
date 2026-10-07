# Harmony — Review tahap 6 dan prompt perbaikan tahap 7

Tanggal pemeriksaan: 3 Oktober 2026, sekitar 18.22–18.31 WIB. Proyek: `D:/vscode/Harmony`.

## 1. Kesimpulan pemeriksaan

**Belum dapat dinyatakan bahwa semua pengambilan data berhasil dan semuanya valid.** Beberapa perbaikan Gemini sudah berfungsi, tetapi masih ada status keberhasilan yang keliru serta sumber yang gagal diakses. Membuat semua indikator hijau bukan penyelesaian yang benar.

Review ini mengikuti permintaan sebelumnya: memeriksa hasil Gemini dan menyiapkan prompt untuk implementasi berikutnya. Kode aplikasi, konfigurasi, kredensial, dan deployment tidak diubah dalam review ini. Bukti baru disimpan di:

`D:/Blender/test 1/harmony-web-check/2026-10-03-seventh-remediation-review/`

### Yang sudah membaik

- Sebelas suite terarah, dengan total **144 kasus/kelompok uji**, lulus. Pemeriksaan TypeScript juga lulus. Ini bukan verifikasi semua layanan produksi dan bukan eksekusi ulang seluruh `npm test`.
- Pembacaan Deflate dengan Predictor 2 sekarang menghasilkan DN **45100** pada piksel referensi yang sebelumnya keliru. Parser mengenali tile dan beberapa GeoKey yang sebelumnya salah.
- Uji browser lokal menghasilkan LST **29,66 °C** dari fixture TIFF independen. Setelah berpindah koleksi ke Sentinel, hasil Landsat yang datang terlambat tidak muncul kembali. Tidak ada kesalahan halaman dalam skenario tersebut.
- Respons HTTP 200 berisi HTML atau `success:false` ditolak oleh helper pengambilan JSON pada skenario yang diperiksa.
- Alur cuaca nyata untuk Surabaya dengan jujur menghasilkan **PARTIAL**, delapan model suhu valid dari sembilan yang diminta. Sumber cuaca utama dan kualitas udara berhasil; BoM tidak menghasilkan nilai pada waktu pembandingan.

Uji fixture membuktikan perilaku program pada input terkontrol. Uji tersebut tidak membuktikan bahwa angka fixture merupakan pengamatan bumi atau bahwa semua penyedia berhasil.

### Masalah yang masih terbukti

| Prioritas | Masalah | Bukti pemeriksaan | Perbaikan yang diperlukan |
|---|---|---|---|
| P0 | Panel pemeriksaan sumber masih menerima data tidak layak sebagai `ONLINE` | Traffic tanpa koordinat, FIRMS dengan koordinat 999/999, gempa dengan `DateTime: not-a-date`, elevasi dari 0/0, serta udara dari 50/20 untuk permintaan -7/112 semuanya ditandai `ONLINE` | Gunakan validator produk yang sama antara panel audit, layanan, dan konsumen peta |
| P0 | Seluruh 16 entri registri dianggap stream aktif secara tetap | `DATA_SOURCES_REGISTRY` berisi `isLiveConnected:true` untuk semua entri; modal menghitungnya dan menampilkan `Stream Aktif` | Pisahkan katalog sumber dari status koneksi runtime; status harus berasal dari upaya pengambilan yang benar-benar terjadi |
| P0 | Scene Landsat nyata ditemukan, tetapi aset hilang dalam normalisasi | Layanan aplikasi mengembalikan `success:true` dari Earth Search untuk scene `LC09_L2SP_118065_20260926_02_T1`, tetapi `assetKeys:[]`, tanpa thermal dan QA | Pertahankan URI asli; sediakan resolver aset atau akses melalui provider lain untuk scene yang sama |
| P0 | CRS kosong masih dapat menghasilkan analisis berhasil | Fixture tanpa CRS menghasilkan 49 sampel yang dianggap valid, status `DERIVED`, lalu provenance mengarang `EPSG:4326` | Tolak transformasi/sampling saat CRS belum diketahui; jangan mengisi CRS bawaan untuk observasi operasional |
| P0 | Blok QA yang tidak lengkap dianggap cerah | TIFF QA dengan satu strip yang hanya mendeklarasikan 2 byte tetap mengembalikan QA=0 pada piksel yang belum terbaca; pipeline menghasilkan `DERIVED` dengan 25 piksel unik valid | Validasi ukuran blok; jangan mengubah byte yang tidak tersedia menjadi nol/clear |
| P1 | Dua API situs publik belum tersedia | `/api/spatial/hotspots` dan `/api/spatial/traffic/flow` mengembalikan HTTP 404; halaman utama dan route BMKG yang diperiksa tersedia | Periksa route/deployment/backend yang benar; 404 ini belum membuktikan NASA atau TomTom berhenti beroperasi |
| P1 | Model BoM mengembalikan respons sukses tetapi angka kosong | Pembandingan di Surabaya, London, New York, dan Quito: delapan model tersedia; BoM kosong. Permintaan BoM terpisah: 168 titik waktu, 0 nilai suhu finite | Diagnosa feed/model, pertahankan status gagal/kosong, perbaiki jalur atau gunakan pengganti yang diuji |
| P1 | Satelit IR RainViewer sudah dihentikan | Feed nyata memiliki 13 frame radar masa lalu, 0 nowcast, 0 infrared; pengumuman penyedia menyebut penghentian IR dan nowcast sejak 1 Januari 2026 | Ganti jalur satelit IR dengan layanan citra yang masih tersedia; pertahankan radar RainViewer yang masih didukung |
| P1 | Radar pada viewport baru masih memakai keberhasilan viewport lama | Skenario 10 tile lama berhasil, 10 tile baru gagal seluruhnya tetap menghasilkan `PARSIAL` | Tentukan cakupan dari tile/frame/viewport aktif; bila viewport aktif seluruhnya gagal, tampilkan tidak tersedia |
| P1 | Satuan cuaca belum divalidasi | Payload numerik dengan satuan °F, Pa, dan m/s diterima oleh `validateCurrentWeather` | Normalisasi atau tolak satuan sebelum nilai dipakai sebagai °C, hPa, dan km/jam |
| P1 | Luas piksel geografis memakai lintang tetap -7° | Pada contoh piksel 0,001° di lintang 60°, luas keluar 0,0122 km²; pendekatan dengan lintang 60° sekitar 0,006154 km² | Hitung footprint pada lokasi sebenarnya; pisahkan luas sampel dari cakupan AOI penuh |

**Catatan tentang klaim “25/25 selesai”:** runner Gemini memberi ekspektasi `PARSIAL` pada kasus viewport baru seluruhnya gagal. Lulus terhadap ekspektasi tersebut tidak menyelesaikan masalah cakupan aktif. Karena itu klaim semua masalah selesai terlalu luas. Ini penilaian terhadap cakupan pengujian, bukan kesimpulan tentang niat pembuat laporan.

## 2. Pemeriksaan langsung penyedia dan aplikasi

Hasil berikut merupakan pemeriksaan sesaat dari komputer ini. Keberhasilan akses server tidak otomatis membuktikan CORS browser, seluruh negara, seluruh parameter, kredensial produksi, atau semua fitur.

| Sumber/jalur | Hasil nyata | Makna dan tindakan |
|---|---|---|
| BMKG AutoGempa | HTTP 200, JSON; waktu event dan koordinat tersedia | Pertahankan; validasi parameter dan waktu event, jangan mengganti waktu event dengan waktu fetch |
| BMKG GempaTerkini | HTTP 200, 15 event | Pertahankan; validasi setiap event dan ketercakupan feed |
| USGS 2.5_week | HTTP 200, FeatureCollection, 323 fitur saat diperiksa | Pertahankan; feed berbatas magnitudo/periode, bukan seluruh gempa global tanpa batas |
| Open-Meteo cuaca | HTTP 200, nilai suhu, kelembapan, awan, angin, tekanan, dan waktu tersedia | Pertahankan; actual aggregator menghasilkan 24 titik per jam dan 14 titik harian pada lokasi yang diuji |
| Open-Meteo kualitas udara | HTTP 200, PM2.5/PM10/ozon dan waktu tersedia | Pertahankan sebagai keluaran model CAMS, bukan pembacaan sensor lapangan |
| Open-Meteo multi-model | HTTP 200; BoM hilang pada empat lokasi uji | Jangan menyatakan sembilan model berhasil. Jangan menyimpulkan semua wilayah bumi sudah diunduh |
| Open-Meteo elevasi | HTTP 200, satu elevasi numerik | Berhasil mengakses data statis elevasi; bukan ketinggian yang diukur realtime |
| Open-Elevation | HTTP 200, koordinat permintaan dan elevasi tersedia | Pertahankan dengan validasi kesesuaian lokasi dan jenis DEM |
| Earth Search katalog Landsat | HTTP 200, scene dengan thermal/QA tersedia pada metadata asli | URI raster berupa `s3://`; normalisasi aplikasi membuangnya. Browser tidak dapat langsung fetch URI S3 |
| Planetary Computer scene yang sama | HTTP 200 pencarian, HTTP 200 signer, HTTP 206 pembacaan header | Jalur akses alternatif terbukti tersedia untuk scene tersebut; jangan menghapus Earth Search |
| Header thermal Planetary Computer | GeoTIFF tiled, Deflate 8, Predictor 1, UInt16, EPSG:32649, grid 30 m; ukuran aset 76.115.261 byte | Hanya 32 KB header diperiksa. Belum analisis seluruh AOI. Mengunduh seluruh thermal + QA ke browser merupakan risiko performa nyata |
| RainViewer metadata | 13 radar past, 0 nowcast, 0 infrared | Pertahankan radar past; jalur IR lama perlu diganti |
| URL MAGMA dalam registri | HTTP 200, HTML; bukan payload JSON laporan | Halaman portal tidak membuktikan stream numerik. Service gunung api sekarang memakai baseline katalog lokal yang belum tervalidasi sebagai status terkini |
| Harmony publik — root | HTTP 200, halaman web | Tidak membuktikan route data yang baru sudah dipublikasikan |
| Harmony publik — BMKG AutoGempa | HTTP 200, JSON | Satu route tersedia; tidak berarti seluruh backend versi terbaru tersedia |
| Harmony publik — hotspots/traffic | HTTP 404, bukan JSON data | Diagnosa routing dan versi yang dipublikasikan lebih dahulu |

### Kandidat pengganti yang diperiksa

1. **MET Norway Locationforecast**: permintaan Surabaya dan London berhasil HTTP 200, masing-masing 90 titik prakiraan serta metadata waktu/satuan. Kandidat ini **belum diintegrasikan**. Dapat menjadi jalur prakiraan alternatif, dengan nama dan asal model sendiri. Di luar Nordik, asal model perlu ditelusuri; jangan menghitungnya sebagai model independen baru apabila memakai garis keturunan ECMWF yang sama. Dokumentasi menyatakan prakiraan untuk koordinat bumi dan menjelaskan kebutuhan User-Agent yang dapat dikenali. [Dokumentasi MET Norway](https://api.met.no/weatherapi/locationforecast/2.0/documentation), [ketentuan akses](https://api.met.no/doc/TermsOfService).
2. **NASA GIBS**: GetCapabilities EPSG:3857 berhasil HTTP 200 dan mencantumkan `Himawari_AHI_Band13_Clean_Infrared`, interval PT10M, matrix set `GoogleMapsCompatible_Level6`. Waktu terakhir yang diiklankan saat diperiksa adalah **2026-10-03T10:30:00Z**. Ini baru bukti metadata ketersediaan, belum bukti tile citra/cakupan Indonesia berhasil. Resolusi, waktu, kualitas, dan ketercakupan harus diuji saat implementasi. GIBS menyediakan visualisasi dengan dimensi waktu; gambar bukan pengganti raster numerik LST. [Dokumentasi NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/).
3. Percobaan Open-Meteo `kma_seamless` dan `ecmwf_aifs025` secara terpisah di Surabaya juga menghasilkan **0 nilai finite dari 168 titik**. Jangan menjadikannya pengganti yang “sudah berhasil” hanya karena HTTP 200.

Penghentian RainViewer IR/nowcast dan batas zoom 7 didukung [pengumuman resmi RainViewer](https://www.rainviewer.com/api/transition-faq.html). Sumber cuaca seperti BoM masih tercantum dalam [dokumentasi Open-Meteo](https://open-meteo.com/en/docs/bom-api); kegagalan nilai pada pemeriksaan ini tidak cukup untuk menyatakan lembaga BoM sudah tidak ada.

## 3. File bukti

Semua berada di folder review tahap 7 di atas:

- `data-integrity-reproductions.json`: respons rusak yang masih lolos, kontrol HTTP200-error/HTML yang ditolak, CRS kosong, QA tidak lengkap, satuan, dan luas.
- `qa-short-declared-strip.tif`: fixture QA rusak independen; bukan data observasi.
- `live-provider-probes.json`: probe publik, termasuk empat lokasi pembandingan model serta route situs publik.
- `live-stac-and-failures.json`: metadata scene nyata, signer, range header, percobaan model, dan MAGMA.
- `live-app-service-results.json`: pemanggilan layanan STAC dan aggregator milik aplikasi dengan data nyata.
- `replacement-met-no.json`: probe calon penyedia prakiraan alternatif.
- `replacement-gibs-capabilities.json`: metadata calon pengganti citra IR.
- `browser-stage7.json` dan `lst-after-collection-switch.png`: bukti browser perbaikan race koleksi; sumber jaringan pada skenario ini disimulasikan.
- `verification-summary.json` dan log suite: 144 kasus/kelompok uji terarah serta TypeScript.
- `source-manifest.json`, `source-integrity.json`: hash sembilan berkas sumber yang diaudit; tidak berubah dalam pemeriksaan.

Folder baseline tahap 6 dan bukti sebelumnya tidak dijalankan ulang dengan runner yang menimpa berkas baseline.

---

# PROMPT UNTUK GEMINI — IMPLEMENTASI PERBAIKAN INTEGRITAS SUMBER

Salin bagian mulai judul ini hingga akhir ke Gemini. Berikan akses proyek lokal dan bukti review tahap 7.

## A. Tujuan dan aturan kerja

Kamu mengerjakan proyek `D:/vscode/Harmony`. Fokus pada web, pengambilan data, kebenaran status, dan pemulihan sumber. Baca review di atas dan bukti asli; verifikasi ulang sebelum mengubah kode.

Tujuan: data yang benar-benar berhasil diambil dan layak dipakai dapat ditampilkan; pengambilan gagal, kosong, parsial, usang, tidak terkonfigurasi, dibatalkan, dan belum diperiksa mempunyai status yang sesuai. Perbaiki sumber yang gagal. Bila produk/jalur layanan telah dihentikan, integrasikan jalur pengganti yang benar-benar diuji, dengan provenance dan nama sumber yang benar.

1. Catat `git status`, perubahan yang sudah ada, inventaris route, sumber, dan menu sebelum mengedit. Proyek sedang memiliki banyak perubahan lokal; jangan melakukan reset, checkout massal, penghapusan, atau menimpa pekerjaan tersebut.
2. Jangan menghapus penyedia yang masih berfungsi, menu, mode 2D/3D, layer, export, atau analisis penting untuk membuat test lulus.
3. Lima belas domain Studio aktual adalah `weather`, `bmkg`, `remote_sensing`, `terrain`, `positioning`, `hydrology`, `field_survey`, `analytics`, `charts`, `fusion`, `catalog`, `hotspots`, `accessibility`, `emissions`, `swot`. Pertahankan fungsi dan jalur navigasinya. Jangan mengarang daftar menu pengganti dalam laporan.
4. Pertahankan semua 16 identitas sumber pada registri awal. Bila ada pengganti, tambahkan relasi `replaces`/`fallbackFor` dan alasan. Sumber lama tetap dapat ditelusuri sebagai katalog/tidak tersedia/dihentikan, bukan dihitung sebagai stream aktif.
5. Jangan membuat angka observasi sintetis, koordinat bawaan, magnitudo/kedalaman pengganti, tanggal pengambilan satelit bawaan, skor akurasi, atau jumlah sumber yang berhasil secara tetap. Mode DEMO boleh dipertahankan dan wajib terpisah dari data operasional.
6. Jangan menyamakan jumlah lembaga, URL, produk, model, negara asal model, dan pengamatan independen. Penambahan sumber tidak otomatis membuktikan peningkatan akurasi.
7. Jangan mengedit PPT atau esai dalam pekerjaan ini. Pertahankan nama pengguna **“Peta Cuaca”** dan susunan menu peta yang sudah disatukan.
8. Kerjakan perubahan bertahap dan tunjukkan file, fungsi, alasan perubahan, serta bukti setiap masalah. Simpan bukti baru di folder baru. Jangan mengubah baseline reviewer untuk mencocokkan kode yang belum benar.

## B. Inventaris sumber sampai konsumen terakhir

Buat tabel untuk **setiap** jalur pengambilan di frontend dan backend, termasuk sumber di katalog yang belum mempunyai adapter operasional. Telusuri `fetch`, `apiClient`, SDK, tile, iframe, WebSocket, dataset lokal, dan generator DEMO.

Kolom wajib: sourceId, produk, penyedia asli, gateway, URL/route yang sudah disanitasi, metode, kebutuhan kredensial, wilayah/jendela waktu, variabel/satuan, konsumen menu/layer/analisis, validator, cache, masa berlaku, retry, fallback, hasil pemeriksaan nyata, dan batas yang belum diuji.

Periksa terutama:

- `apps/web/src/data/dataSourceRegistry.ts`
- `apps/web/src/components/common/DataSourceProvenanceModal.tsx`
- `apps/web/src/services/geospatialDataTelemetryService.ts`
- `apps/web/src/services/geospatial/apiHealthService.ts`
- `apps/web/src/services/weatherDataIntegrity.ts`
- `apps/web/src/services/weatherAggregatorService.ts`
- `apps/web/src/services/bmkgService.ts`
- `apps/server/src/routes/bmkgRoutes.js`
- `apps/web/src/services/geospatial/stacService.ts`
- `apps/web/src/services/geospatial/rasterReaderService.ts`
- `apps/web/src/services/geospatial/lstService.ts`
- `apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`
- `apps/web/src/services/geospatial/earthquakeSnapshotService.ts`
- `apps/web/src/services/geospatial/firmsService.ts`
- `apps/web/src/services/hotspotFireService.ts`
- `apps/server/src/services/firmsIntegrity.js`
- `apps/server/src/services/weatherIntegrity.js`
- `apps/server/src/controllers/spatialController.js`
- `apps/server/src/routes/spatialRoutes.js`
- `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`
- `apps/web/src/services/volcanoService.ts`, `terrainService.ts` di subfolder geospatial, routing, sensor registry, coverage, seasonal intelligence, fusion, dan layanan AI.

Untuk katalog BIG/DEMNAS, InaRISK, Dapodik, GNSS, sensor, dan gunung api, periksa ada tidaknya pengambilan operasional. Jangan menyatakan stream berhasil hanya karena daftar institusi, tautan portal, station catalog, atau nilai lokal tersedia. Jangan menutup masalah integrasi dengan menghapus kategorinya.

## C. Satukan kontrak hasil pengambilan dan pemeriksaan kualitas

Alur wajib:

`request nyata -> respons transport -> parsing -> schema produk -> validasi nilai/lokasi/waktu/satuan -> normalisasi -> penilaian ketercakupan -> commit sesuai request aktif -> UI/analisis/export/audit dari hasil yang sama`

Pisahkan tiga hal:

1. **Kondisi koneksi**: belum diperiksa, sedang mengambil, HTTP berhasil, gagal jaringan, timeout, rate limit, kredensial bermasalah.
2. **Ketersediaan data**: tersedia, kosong valid, sebagian, usang dari cache, tidak tersedia, katalog, simulasi.
3. **Kelayakan untuk tujuan analisis**: kualitas/schema/lokasi/waktu/satuan cocok atau tidak; analisis turunan belum otomatis tervalidasi akurasinya.

Gunakan tipe/discriminated union yang tegas, sesuaikan dengan tipe proyek yang ada. Setiap upaya menyimpan minimal `sourceId`, `requestId`, `queryKey`, produk/model, waktu mulai/selesai, HTTP status, status akhir, reasonCode, jumlah record diterima/valid/ditolak, timestamp sumber, cakupan, provenance, servedFromCache, dan jalur fallback. URL dan header harus disanitasi dari token/kunci.

- HTTP 200 + `success:false`, HTML, JSON salah, schema tidak cocok, atau seluruh nilai wajib null: **bukan data berhasil**.
- Array kosong yang valid untuk query event: `EMPTY`, pengambilan berhasil tetapi tidak ada event dalam cakupan/periode tersebut. Jangan disamakan dengan gagal atau bukti tidak ada bahaya.
- Array prakiraan yang semua null: tidak mempunyai nilai prakiraan yang dapat digunakan. Jangan menandainya model berhasil.
- Beberapa produk/model/window gagal: `PARTIAL`; setiap kegagalan harus tetap terlihat.
- Refresh gagal + cache layak dari query yang sama: `STALE`; waktu fetch gagal dan waktu data lama tetap terpisah. Jangan memperbarui dataTime cache menjadi sekarang.
- Katalog/DEM statis dan metadata scene bukan stream pengamatan realtime. Iframe bukan masukan numerik ke mesin prakiraan.
- Pembatalan pengguna: `CANCELLED`, bukan sukses baru dan bukan gangguan penyedia.
- Pada hasil lama dari lokasi, koleksi, AOI, atau generasi request lain, jangan commit ke panel aktif atau mengubah status generasi baru.

Pakai validator produk yang dapat digunakan ulang. Backend dan frontend boleh mempunyai boundary berbeda, tetapi kontrak dan kasus uji semantik harus sama. Jangan membuat satu pemeriksa longgar untuk audit dan pemeriksa ketat lain untuk peta.

## D. Perbaiki lima celah audit yang direproduksi

Saat ini `geospatialDataTelemetryService.pingEndpoint()` menerima payload berikut sebagai `ONLINE`. Buat reproduksi yang gagal sebelum fix dan lulus setelah fix:

1. **Traffic**: empat angka kecepatan/waktu dan confidence valid, tetapi tanpa koordinat. Wajib ada geometri ruas minimal dua titik, setiap angka finite dalam rentang geografis. Validasi satuan, waktu/masa berlaku, lokasi ruas terhadap lokasi query menggunakan toleransi terdokumentasi. Jangan menerapkan syarat persis sama dengan titik query karena jalan terdekat dapat bergeser.
2. **FIRMS**: `success:true`, `data:[{latitude:999,longitude:999,frp:-10}]`. Wajib validasi tiap deteksi: koordinat, waktu akuisisi, produk/satelit, nilai dan satuan, footprint/cakupan query, kategori confidence sesuai VIIRS/MODIS. Gunakan parser/validator FIRMS yang ada, jangan menganggap panjang array bukti validitas.
3. **BMKG**: `Infogempa.gempa.DateTime='not-a-date'`. Parse kalender/timezone secara ketat; validasi koordinat/magnitudo/kedalaman dan schema produk. Waktu event yang lama tidak otomatis feed gagal; bedakan tanggal kejadian dan freshness pengambilan feed.
4. **Elevasi**: query -7/112, respons titik 0/0 dengan elevasi 400. Wajib lokasi/jumlah titik cocok, elevasi finite, satuan serta dataset/jenis DEM jelas. Elevasi negatif dapat sah.
5. **Udara**: query -7/112, respons 50/20 dengan PM2.5/PM10/ozon numerik dan waktu sekarang. Wajib grid/lokasi cocok dalam toleransi dataset, waktu serta satuan cocok. Jangan hanya memeriksa angka dan umur.

Perbaiki juga validator cuaca yang menerima unit °F/Pa/m/s sebagai angka untuk kolom °C/hPa/km/jam. Bila konversi diterapkan, simpan unit asli, nilai asli, aturan konversi, dan nilai hasil; jika unit tidak didukung, jangan menghasilkan analisis dengan label salah.

Toleransi lokasi mengikuti resolusi dan metode pemilihan grid. Tangani antimeridian, dekat kutub, serta lintang/bujur 0. Jangan memakai angka toleransi longgar universal dua derajat untuk semua produk.

## E. Perbaiki registri dan indikator keberhasilan

Saat ini `DataSourceProvenanceModal` menghitung 16 stream aktif dari boolean tetap. Perbaiki ini sampai kartu, total, log, modal, dan export konsisten.

- Descriptor registri menyimpan identitas, produk, lisensi, dokumentasi, kebutuhan key, dan integrasi yang tersedia; jangan menyimpan “sudah berhasil saat ini” secara tetap.
- Hubungkan kartu ke status runtime adapter/query terakhir dengan cakupan dan waktu pemeriksaan yang jelas.
- Sebelum diperiksa, tampilkan “Belum diperiksa”; untuk tautan/katalog “Katalog”; untuk integrasi belum ada “Belum terhubung”.
- Ganti penghitung “Stream Aktif” dengan penghitung sumber yang benar-benar mempunyai data layak pada cakupan yang ditampilkan. Tampilkan jumlah katalog, kosong valid, parsial, usang, gagal, dan belum diperiksa secara terpisah bila diperlukan.
- NASA FIRMS API memakai MAP_KEY pada adapter server; registri sekarang keliru menandainya tidak perlu kunci. Sesuaikan metadata tanpa membuka nilainya.
- `apiKeyStatus:'ACTIVE'` untuk Gemini tidak membuktikan key valid. Cukup tampilkan keberadaan konfigurasi yang terverifikasi; status aktif perlu respons nyata, tanpa membocorkan key.
- Perbaiki label status per model: jangan menyebut BoM online karena gateway multi-model mengembalikan HTTP 200.
- Kegagalan sumber primer tetap tercatat walau fallback berhasil. Jangan menjadikan hasil pengganti seolah pengambilan primer berhasil.
- Endpoint health test bukan bukti sumber tersebut sudah dipakai dalam analisis atau membuktikan akurasi.

## F. Pulihkan jalur Landsat/STAC sampai raster

Kasus nyata: layanan aplikasi menemukan `LC09_L2SP_118065_20260926_02_T1` dari Earth Search, tetapi aset normalisasinya kosong. Metadata provider asli mencantumkan thermal/QA dengan URI S3; kode `stacService.ts` hanya menyimpan `http(s)` lalu berhenti pada katalog pertama yang dianggap sukses.

1. Simpan URI asli beserta media type, roles, collection, metadata band, dan aksesibilitas; jangan membuang aset hanya karena scheme tidak langsung dapat di-fetch browser.
2. Pisahkan `catalogSearchSuccess` dari `assetAccessSuccess` dan `analysisSuccess`.
3. Buat resolver untuk akses browser/server yang sah. Untuk Landsat ini, lookup/hydrate **scene yang sama** dari Planetary Computer terbukti menyediakan aset HTTPS yang dapat ditandatangani. Cocokkan scene ID, collection, waktu, platform, band, dan wilayah. Jangan diam-diam pindah ke scene lain.
4. Pertahankan Earth Search untuk katalog dan koleksi yang berfungsi. Hindari mengonversi `s3://` menjadi URL publik dengan asumsi bucket/region/permission yang belum diverifikasi. Bila perlu AWS requester-pays, gunakan jalur resmi sesuai konfigurasi, jangan membebankan atau membuka key ke browser.
5. Catat upaya katalog primer, kegagalan akses, provider alternatif, signer, dan akses thermal serta QA secara terpisah. Hasil akhir tidak boleh menghapus alasan akses primer gagal.
6. Terapkan refresh SAS hanya untuk kegagalan expiry yang teridentifikasi, dengan retry terbatas. Bedakan signer gagal, objek tidak tersedia, permission, format tidak didukung, serta data di luar AOI.
7. Thermal nyata yang diuji berukuran sekitar 76 MB sebelum QA. Implementasikan pembacaan COG berbasis window/range pada AOI, dengan byte/time budget dan abort. Periksa `Content-Range`, ukuran file, dan respons server yang mengabaikan Range; jangan tetap mengunduh seluruh file tanpa batas.
8. Parser matang seperti `geotiff.js` dapat digunakan jika lebih tepat. Jika dipakai langsung, deklarasikan dependency langsung dan sesuaikan API versi yang benar. Kalau mempertahankan parser sendiri, buktikan dukungan format produk yang digunakan dan tolak format lain secara tegas.

Header asli berhasil dibaca melalui Planetary Computer: HTTP 206, tiled Deflate, UInt16, EPSG:32649, scale 30 m. Ini bukti jalur akses header, belum analisis produksi seluruh raster. Tambahkan satu bukti operasional nyata AOI kecil dengan thermal dan QA yang cocok; jangan menggantinya dengan fixture saja.

## G. Hilangkan keberhasilan palsu dalam raster dan LST

1. **CRS kosong**: `sampleWindow` saat ini tidak menolak `crs:null`; `createProvenance` lalu mengisinya `EPSG:4326`. Untuk data operasional, CRS thermal dan QA wajib diketahui dan didukung sebelum sampling. Bila berasal dari metadata STAC yang sah, dokumentasikan proses validasi terhadap raster, bukan mengisi default. `DERIVED` dilarang bila georeferensi masih tidak pasti.
2. **Blok QA tidak lengkap**: decoder membuat typed array ukuran penuh dan mengisi byte tersedia saja; sisanya tetap nol. Nol QA dapat berarti clear, sehingga byte yang tidak terbaca menghasilkan kualitas palsu. Validasi expected decoded byte count dengan bits/sample, samples/pixel, ukuran tile/strip, planar configuration, dan edge padding yang memang sesuai spesifikasi. Blok invalid wajib ditolak atau pixel validity eksplisit false. Jangan sekadar menambah peringatan setelah nilainya dipakai.
3. Baca/validasi SampleFormat, Predictor, RasterType, affine/matrix transform, NoData, sample count, dan endianness. Dukungan PixelIsArea dengan `floor` tidak otomatis membuktikan PixelIsPoint/rotated raster benar. Unsupported harus berhenti dengan reason spesifik.
4. QA dan thermal boleh berbeda CRS/grid; lakukan transformasi dan pencocokan yang sah, registrasi CRS untuk keduanya. Pertahankan QA mask sesuai produk/sensor/collection, bukan semua band QA dianggap setara.
5. Jangan menjadikan raw radiance `b10`, uncertainty `st_qa`, emisivitas, atau preview sebagai Surface Temperature Level-2. Pertahankan guard Level-1, asset semantik, serta penolakan optical Sentinel untuk Landsat LST.
6. Luas piksel geografis menggunakan latitude sebenarnya atau footprint geodesik. EPSG:3857 membutuhkan koreksi distorsi untuk luas permukaan bumi. CRS projected lain membutuhkan satuan yang diverifikasi. Jangan memakai -7°, asumsi 30 m, atau bbox AOI sebagai luas polygon berlubang.
7. Pisahkan `sampledValidPixelCount`, `sampledTotalPixelCount`, `sampleValidityFraction`, dan luas/coverage AOI sebenarnya. Kisi 7×7 bukan seluruh raster AOI. Bila hanya sampling, labelkan sebagai statistik sampel; full AOI coverage jangan diisi dari rasio sampel saja.
8. Beri provenance scene, asset/band, provider akses, timestamp, scale/offset/unit, versi algoritma Harmony, dan quality mask yang benar. `USGS L2ST v1.3.0` tidak boleh mengklaim versi algoritma resmi jika sebenarnya versi kode Harmony.
9. Pertahankan perbaikan lifecycle yang terbukti pada browser. Refactor singleton `lstService` request context jika beberapa panel/instance dapat saling membatalkan: request/abort milik consumer, bukan global semua pemakai.

## H. Cuaca: pulihkan sumber tanpa membuat angka pengganti

BoM yang diminta dari Open-Meteo kosong pada empat lokasi uji dan seluruh 168 titik permintaan terpisah. Jangan menulis bahwa kesembilan model berhasil. Jangan membuang delapan model yang sedang berfungsi.

1. Periksa ID model, dokumentasi, endpoint/model feed, horizon, waktu run, latency, schema, serta cakupan. Buat upaya per model, meskipun gateway mengembalikan satu respons gabungan.
2. Bila satu model menyebabkan kegagalan request gabungan, isolasi pemintaan model tersebut dengan concurrency/retry terbatas; layanan lain tetap dapat dipakai sebagai `PARTIAL`.
3. Simpan entry BoM dengan alasan ketidaktersediaan; uji jalur resmi lain bila sesuai. Jangan menyimpulkan BoM tutup hanya dari null atau timeout.
4. Bila data tetap tidak tersedia, integrasikan kandidat pengganti yang berhasil diverifikasi. **MET Norway Locationforecast** berhasil pada probe Surabaya dan London dan dapat menjadi fallback provider cuaca. Implementasikan adapter server, User-Agent sesuai ketentuan, cache berdasarkan HTTP caching/Expires/Last-Modified, deadline, dan provenance. Verifikasi ulang sebelum integrasi.
5. Normalisasi MET: suhu celsius; `wind_speed` m/s -> km/jam ×3,6; `wind_from_direction` arah asal angin; `cloud_area_fraction` persen. `air_pressure_at_sea_level` tidak sama dengan `surface_pressure`; jangan menaruhnya ke kolom tekanan permukaan tanpa transformasi yang valid. Presipitasi `next_1_hours` dan `next_6_hours` punya interval berbeda; jangan menyamakan akumulasinya.
6. MET mungkin tidak menyediakan apparent temperature, gust, UV/probabilitas tertentu. Pertahankan missing sebagai null dan status parsial bila dibutuhkan. Jika menghitung variabel turunan, gunakan fungsi ilmiah terdokumentasi serta label `DERIVED`, bukan mengklaim nilai provider asli.
7. Jangan mengganti label BoM dengan angka MET sambil membiarkan nama BoM. Simpan hubungan fallback, dan deduplikasi model yang memakai asal model sama saat menghitung ensemble.
8. Kandidat KMA seamless dan AIFS yang diuji tidak menghasilkan nilai; jangan mendaftarkannya aktif tanpa bukti baru.
9. Jaga semua field valid yang sudah ada: awan, arah/kecepatan angin, gust, tekanan, kelembapan, hujan, peluang hujan bila tersedia, PM dan waktu. Jangan menyederhanakan alur menjadi suhu saja.
10. Data terambil di lokasi pilihan bukan seluruh wilayah semua negara. Untuk pemantauan global, buat query AOI/window dengan pagination/rate budget dan daftar cakupan yang selesai/gagal. Jangan melakukan unduhan seluruh bumi setiap pengguna memindahkan peta.
11. Konsensus/disagreement model bukan akurasi terhadap kenyataan. Evaluasi terhadap observasi dengan waktu, lead time, variabel, dan wilayah yang sepadan diperlukan sebelum menyebut peningkatan akurasi. Penjelasan AI tidak dapat mengisi data observasi hilang.

## I. RainViewer: radar tetap, satelit IR memakai jalur baru

RainViewer resmi menghentikan nowcast dan satellite IR sejak 1 Januari 2026. Feed publik yang diperiksa sesuai kondisi tersebut. Jangan terus mencoba menghidupkan URL IR yang dihentikan seolah masalahnya API key.

- Pertahankan radar past RainViewer dengan timestamp/frame, atribusi, zoom maksimum yang didukung, caching, dan batas rate sesuai dokumentasi.
- Untuk menu satelit, implementasikan adapter citra yang masih aktif, misalnya NASA GIBS. Capabilities saat diperiksa memuat `Himawari_AHI_Band13_Clean_Infrared` pada matrix set `GoogleMapsCompatible_Level6`.
- Baca GetCapabilities dan dimensi waktu: pilih waktu yang benar-benar tersedia, jangan memakai timestamp sekarang tanpa memeriksa frame. Layer/format/matrix set mengikuti metadata provider, bukan URL contoh yang ditebak.
- Verifikasi tile citra pada AOI Indonesia, format, matriks, transparent/no-coverage tile, time gaps, dan render browser. Jika ketersediaan terakhir sudah lama, tampilkan `STALE`/`ARCHIVED` sesuai umur, jangan `LIVE`.
- Jangan menyebut citra infrared sebagai radar Doppler, suhu udara, atau Landsat LST. Gambar visual tidak otomatis menjadi data numerik untuk cloud thermodynamics.
- Gunakan nama provider yang sebenarnya pada menu dan attribution. Nama fitur tetap “Peta Cuaca”.
- Status radar berdasarkan frame dan viewport aktif. Gunakan key frame/z/x/y serta set tile aktif/cached, bukan counter kumulatif selama hidup source. Hindari duplikasi event hitung; tile cached yang benar-benar dibutuhkan viewport boleh dinilai sukses.
- Viewport baru yang seluruh tile-nya gagal = `UNAVAILABLE`, walaupun viewport lama pernah berhasil. Campuran tile aktif yang berhasil/gagal = `PARTIAL`; bila metadata tidak fresh tetapi frame lama masih terlihat = `STALE` dengan waktu aslinya.
- Tile transparan valid tidak berarti hujan terdeteksi. Ketidakcakupan wilayah bukan bukti tidak ada hujan.
- Tambahkan timeout metadata dan refresh status umur dengan clock yang bekerja walau halaman tidak melakukan render lain.

## J. Hotspots dan traffic: perbaiki route lebih dahulu

Di situs publik, dua endpoint baru masih 404. Di kode lokal, route-nya ada. Periksa entrypoint `api/index.js`, mount Express, konfigurasi `vercel.json`, proxy, versi yang dipublikasikan, dan output serverless. Jangan menganggap ini bukti NASA/TomTom berhenti melayani.

### FIRMS

- Pertahankan sumber VIIRS/MODIS yang sudah digunakan dan adapter integritasnya.
- Bedakan route 404, key belum ada, key invalid, rate limit, parameter query salah, timeout, payload CSV/JSON tidak valid, hasil parsial, dan hasil kosong valid.
- Kredensial wajib berada pada server; periksa keberadaan/validitas tanpa menulis key pada log, client, export, atau bukti.
- Buat sumber/jendela waktu/bbox attempts lengkap. Sumber atau window yang terlewat akibat deadline tetap ditandai tidak terselesaikan, bukan dianggap sukses.
- Validasi setiap deteksi dengan waktu/satelit/instrument/produk, unit brightness temperature dan FRP, confidence kategori, serta koordinat. Dedup berdasarkan identitas deteksi dan sumber, bukan asal menghitung jumlah baris.
- Satu deteksi termal tidak otomatis kebakaran hutan. Waktu akuisisi/latency wajib tampil. Tidak ada deteksi bukan bukti tidak ada kebakaran.
- Jika memakai sumber alternatif, pastikan menghasilkan produk deteksi yang sebanding dan mempunyai akses/lisensi yang sah. Portal SiPongi atau tile gambar saja tidak boleh diganti label menjadi deteksi numerik FIRMS.

### Traffic

- Pertahankan adapter TomTom dan geometri ruas. Jangan mengganti kecepatan nyata dengan random/simulasi jika request gagal.
- Pastikan data contract backend -> frontend -> audit sama: speed KMPH, travel time seconds, confidence, geometry, waktu/status provider, fallback/cache.
- Bila key tidak dikonfigurasi, tampilkan `NOT_CONFIGURED`; bila jaringan gagal, tampilkan alasan jaringan, bukan selalu “key belum ada”. HTTP 403 dapat permission/WAF/credential; jangan otomatis menyebut expired tanpa bukti.
- OSM jalan atau OSRM routing dapat tetap berfungsi, tetapi tidak menggantikan live traffic flow. Jangan mengklaim kecepatan realtime dari geometri jalan.
- Bila mengganti penyedia traffic, pertahankan cakupan produk, waktu, geometri, serta atribusi dan kontrak; buktikan request nyata dan tampilannya.

## K. BMKG, gunung api, sensor, DEM, dan sumber lain

- Route BMKG `/weather/warnings`, `/climate/indicators`, `/air-quality`, `/geophysics/potential`, `/time-sun`, `/seismology/microzonation` sekarang mengembalikan `NOT_CONNECTED`/503. Ini lebih jujur daripada data template lama, tetapi integrasi belum selesai. Inventaris masing-masing, temukan jalur resmi yang sesuai, dan integrasikan hanya produk yang dapat diverifikasi; jangan mengisi data tiruan agar status hijau.
- Katalog satelit/radar BMKG tidak berarti feed citra atau pengukuran stasiun sudah berhasil. Pertahankan katalog, pisahkan data operasional dan dukung keadaan belum terhubung.
- `volcanoService` memiliki baseline lokal dengan level aktivitas, ringkasan, dan radius bahaya yang belum tersambung buletin daring. Jangan memakai baseline itu sebagai level/radius terkini untuk penentuan keselamatan. Pertahankan lokasi/nama sebagai katalog; nilai dinamis yang belum terverifikasi diberi status unknown atau historis bertanggal yang benar.
- URL MAGMA dalam registri mengembalikan HTML. Verifikasi akses resmi laporan dan format sebenarnya; jangan parse portal HTML sebagai JSON sukses. Sumber pengganti tentang sejarah gunung api tidak otomatis dapat menggantikan status peringatan PVMBG Indonesia.
- Katalog GNSS, gravimeter, seismometer, stasiun, serta radius cakupan tidak membuktikan koneksi ke instrumen. Angka terukur hanya tampil jika feed pengukuran tersedia dengan ID sensor, unit, kalibrasi, timestamp, koordinat, dan quality flag.
- Elevasi/DEM statis dan analisis lereng turunan tidak disebut observasi realtime. Data sekolah/dataset lokal ditampilkan dengan asal, versi dan tanggal pembaruan yang benar.
- Routing, aksesibilitas, emisi, hidrologi, seasonal, coverage, fusion, dan AI harus menggunakan upstream envelope yang layak. Jika input gagal, analisis turunannya tidak boleh tetap tampil sebagai hasil terverifikasi.
- Jangan menggabungkan data berbeda waktu/lokasi/jenis sebagai satu snapshot “terkini” tanpa aturan alignment eksplisit. Jangan mengubah sumber resmi peringatan keselamatan menjadi rekomendasi AI yang dianggap otoritatif.

## L. Pemulihan berdasarkan penyebab

| Penyebab | Tindakan yang benar |
|---|---|
| Key belum dikonfigurasi | Tambahkan dukungan konfigurasi server yang aman; laporkan kebutuhan key secara jelas, bukan membuat key fiktif |
| Credential/SAS expired yang terbukti | Refresh/rotasi melalui mekanisme resmi, retry terbatas; jangan membocorkan token |
| HTTP 404 route Harmony | Perbaiki route/mount/proxy/version deployment; jangan menghapus provider |
| HTTP 404 objek/provider | Verifikasi URL, scene/asset, dokumentasi, dan ketersediaan produk; gunakan alternatif yang sesuai bila perlu |
| HTTP 400 | Periksa parameter, model, bbox, time range, produk, dan schema |
| HTTP 429 | Hormati Retry-After/rate limit, cache dan backoff dengan batas; jangan retry massal seluruh sumber |
| Timeout/5xx | Retry terbatas dengan deadline total; fallback yang sesuai; cache lama diberi STALE |
| HTTP 200 tetapi data invalid | Tandai INVALID_PAYLOAD/INVALID_SCHEMA/INVALID_VALUES atau alasan spesifik; jangan hitung sebagai data berhasil |
| Dataset benar tetapi tidak mencakup AOI/waktu | Tampilkan batas cakupan/EMPTY yang sesuai; cari produk lain yang memang mencakup wilayah |
| Produk benar-benar dihentikan | Tambahkan pengganti dengan provenance baru; pertahankan riwayat sumber lama dan buktikan produk pengganti bekerja |

Tidak boleh ada retry tanpa batas, pengunduhan tidak terbatas, silent catch lalu angka bawaan, atau fallback sukses yang menghapus catatan sumber gagal.

## M. Rencana implementasi dan pengujian

Urutan kerja:

1. Dokumentasikan baseline sumber/menu/route dan bukti masalah.
2. Buat kontrak status serta validator bersama; perbaiki false success audit, registri, satuan, dan query scope.
3. Perbaiki CRS dan QA block validity sebelum meningkatkan jumlah analisis raster.
4. Pulihkan Landsat asset resolver dan pembacaan AOI/range; buktikan akses thermal/QA nyata.
5. Diagnosa route produksi hotspots/traffic serta konfigurasi server, kemudian periksa jalur source sebenarnya.
6. Perbaiki BoM/fallback cuaca; integrasikan calon alternatif yang sudah diuji ulang. Pertahankan delapan model valid.
7. Integrasikan pengganti citra IR; perbaiki radar per viewport/frame.
8. Telusuri semua adapter/konsumen lain dan hilangkan label operasional dari katalog/data statis yang tidak terhubung.
9. Jalankan regression suites yang relevan, typecheck, build, browser, serta pemeriksaan layanan nyata terbatas. Buat laporan yang menunjukkan mana yang benar-benar selesai dan mana yang membutuhkan akses penyedia.

Kasus wajib dengan expected behavior yang berasal dari kontrak, bukan dari output kode saat ini:

- Lima payload audit rusak yang direproduksi tidak boleh ONLINE/data tersedia.
- HTTP200 HTML/error JSON, invalid schema, null wajib, angka string/sampah, koordinat di luar batas, nilai 0 yang sah, dan unit tidak cocok.
- Array event kosong valid berbeda dari request gagal dan prakiraan seluruh null.
- Primary gagal + fallback valid menyimpan dua attempt dan nama sumber baru.
- BoM kosong tidak counted successful; request model lain tetap berfungsi.
- Katalog Landsat sukses + aset S3 tidak browser-readable -> resolver scene sama ke jalur sah; catalog success tidak berubah menjadi analysis success sebelum raster/QA berhasil.
- Signing/access gagal, SAS refresh terbatas, Range diabaikan, byte budget/deadline, unsupported compression/samples/transform.
- QA block incomplete tidak menghasilkan QA clear atau DERIVED valid; CRS null berhenti sebelum analisis.
- Piksel geografis lintang 60°, projected dengan satuan berbeda, EPSG:3857, polygon berlubang, AOI parsial dan sampling statistik.
- Hasil lama setelah lokasi/AOI/koleksi berubah tidak masuk ke UI; dua consumer tidak saling membatalkan request yang tidak mereka miliki.
- Radar viewport baru seluruhnya gagal setelah viewport lama berhasil = unavailable; cached tile aktif, perubahan frame, pending, partial, no-coverage, dan metadata usang.
- RainViewer IR discontinued -> sumber pengganti dengan waktu nyata dan label provider benar; empty capabilities/tile gagal tidak LIVE.
- Semua 16 sumber registri mulai belum diperiksa/katalog sesuai kenyataan, bukan langsung stream aktif.
- Kredensial tidak muncul dalam client/export/log/evidence.
- Navigasi kelima belas domain, menu peta terpadu, mode 2D/3D, dan export tetap berjalan.

Bukti layanan nyata dan fixture harus disimpan terpisah. Uji positif wajib ada, tetapi keberhasilan satu AOI/header tidak disebut “semua negara dan semua sumber berhasil”. Jika memerlukan kredensial pengguna, nyatakan bagian yang belum bisa diuji; jangan menulis “100% selesai”.

## N. Laporan akhir yang harus kamu berikan

1. Daftar file/fungsi yang ditambah, diubah, atau dihapus beserta alasan. Untuk penghapusan, buktikan hanya duplikasi/implementasi keliru yang digantikan; fungsi penting tetap tersedia.
2. Matriks seluruh sumber: kondisi sebelum/sesudah, hasil request nyata, waktu/cakupan, parameter valid, reason, fallback, dan sumber yang belum dapat diuji.
3. Bukti API -> validator -> normalisasi -> cache -> UI -> analisis/export. Hasil pemeriksa audit harus cocok dengan hasil pengguna.
4. Sumber lama yang diperbaiki, sumber yang benar-benar dihentikan beserta bukti resmi, serta pengganti yang sudah terintegrasi dan diuji. Kandidat yang belum diuji bukan pengganti berhasil.
5. Hasil fixture/regresi, TypeScript, build, browser, dan endpoint nyata secara terpisah. Cantumkan gagal/skipped, bukan hanya pass.
6. Perbedaan kondisi lokal dan situs publik, termasuk route baru yang belum terbukti tersedia di publik.
7. Batas aktual: produk/cakupan/latency/credential/lisensi/kualitas. Status kegagalan yang jujur adalah syarat, tetapi sumber yang dapat dipulihkan harus benar-benar diperbaiki, bukan sekadar diganti warna indikator.

Kriteria selesai: tiap sumber dan konsumen mempunyai hasil yang dapat ditelusuri; invalid/gagal tidak menjadi sukses; jalur yang dapat dipulihkan telah diperbaiki; pengganti yang diperlukan telah diuji sesuai produknya; fungsi penting tetap tersedia; kekurangan eksternal dijelaskan dengan bukti.
