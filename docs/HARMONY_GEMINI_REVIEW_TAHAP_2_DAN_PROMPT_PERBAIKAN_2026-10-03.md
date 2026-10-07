# Harmony — review tahap 2 dan prompt perbaikan untuk Gemini

Tanggal pemeriksaan: 3 Oktober 2026. Reproduksi dan HTTP terakhir sekitar 14.38 WIB.

## Ringkasan hasil pemeriksaan

Pekerjaan terbaru Gemini sudah memperbaiki 14 reproduksi pada review sebelumnya. Enam suite yang dijalankan ulang menghasilkan **73 kelompok lolos**, dan pemeriksaan TypeScript lolos dengan exit code 0. Perbaikan tersebut perlu dipertahankan.

Namun, laporan bahwa radar, LST, GNSS, dan navigasi telah “berfungsi dan diuji penuh” masih terlalu luas. Pengujian fungsi belum membuktikan integrasi tampilan. Ada pekerjaan yang belum tersambung ke panel, serta kondisi kegagalan yang masih menghasilkan status atau kesimpulan salah.

Review ini tidak mengubah kode aplikasi atau melakukan deployment. Outputnya adalah dokumen untuk perbaikan berikutnya oleh Gemini.

### Perbaikan yang sudah terbukti pada kasus uji sebelumnya

- Data prakiraan masa depan tidak lagi masuk rata-rata historis melalui fallback yang sebelumnya dipakai UI.
- Jendela hourly pada anchor yang diuji tidak lagi menerima 25 endpoint; anchor detik sudah dinormalisasi.
- Tanggal mustahil BMKG/FIRMS dan koleksi USGS yang salah ditolak pada kasus uji terkait.
- Count serta metadata attempt FIRMS sudah dikirim dari backend dan dipertahankan frontend pada kontrak normal yang diuji.
- HTML 200 tidak diterima oleh request JSON biasa; envelope `success:false` tidak lagi disimpan sebagai cache sukses pada kasus tersebut.
- Nilai MODIS tidak lagi diberi provenance Landsat pada fixture produk tersebut; QA mandatory 01 tidak lagi otomatis dianggap fill.
- OSRM dengan jarak/durasi negatif ditolak; tanpa cuaca, skor dan rekomendasi kecepatan menjadi null.
- Caller gempa yang dibatalkan tidak lagi menerima hasil milik konsumen lain.
- Kategori fasilitas tanpa inventaris dipisahkan dari kategori yang sudah diuji tetapi tidak terjangkau; kepatuhan belum dapat dinilai menjadi null.
- Snapshot sudah diteruskan ke Cesium. Perekaman GNSS sudah memakai callback perangkat dan berhenti saat sensor error.

### Bukti yang dijalankan ulang

| Suite/pemeriksaan | Hasil |
|---|---|
| Monitoring Snapshot | 9 kelompok lolos |
| Weather Data Integrity | 16 kelompok lolos |
| Recovery Followup | 12 kelompok lolos |
| Gemini Review Integrity | 12 kelompok lolos |
| Audit Remediation Reproductions | 10 kelompok lolos |
| Evidence 14 Reproductions | 14 kelompok lolos |
| TypeScript typecheck | Exit code 0 |

Enam berkas suite dilaporkan Node sebagai enam file test; **73** adalah jumlah kelompok internalnya. Sebagian besar memakai fixture/mock. Ini tidak berarti 73 koneksi provider sungguhan berhasil.

Build produksi dan interaksi browser seluruh menu belum diverifikasi ulang pada review ini. Tidak ada frontend/backend pengguna yang sedang mendengarkan pada port umum yang diperiksa. Klaim build dan “diuji penuh” dalam laporan perlu bukti tersendiri.

### Bukti tambahan pada kode terbaru

Direktori bukti: `D:\Blender\test 1\harmony-web-check\2026-10-03-second-remediation-review`.

- `tests.log`: output enam suite yang dijalankan ulang.
- `reproduce-current.mjs`: skrip pemeriksaan layanan, memakai fixture dan GET publik; tidak mengubah aplikasi/data pengguna.
- `evidence-current.json`: **14 reproduksi tambahan** serta hasil HTTP. Ini kasus lanjutan, berbeda dari 14 kasus sebelumnya yang sudah diperbaiki.
- `ISPU-P14-2020.pdf`: dokumen acuan resmi yang diambil dari peraturan.go.id; tabel pada halaman 10 dan 14 diperiksa secara visual.

### Temuan utama yang masih terbuka

| Area | Bukti saat ini | Dampak |
|---|---|---|
| Radar | Layer XYZ baru dibuat, tetapi effect berikutnya memanggil `setVisible(false)`; viewport OpenLayers juga disembunyikan saat cuaca aktif | Penambahan layer belum menjadikan radar terlihat pada alur pengguna |
| API/cache | Request lama menghapus flight baru; GET lama mengisi cache setelah POST; cache teks dapat dipakai request JSON | Request berulang dan hasil lama/kontrak salah dapat kembali muncul |
| LST | Tidak ditemukan pemanggil `lstService` di aplikasi; piksel di luar AOI ikut statistik pada reproduksi | Perbaikan helper belum menjadi analisis citra wilayah pada panel |
| ISPU | Ozon memakai 8 jam, NO2 1 jam, CO 8 jam walaupun mengklaim P.14/2020 | Periode input tidak sesuai tabel standar yang diklaim |
| Gempa | Satu baris USGS rusak membuang baris valid; pembatalan seluruh caller menulis provider FAILED | Audit count/status tidak mewakili kejadian sebenarnya |
| FIRMS | Envelope dengan attempt FAILED masih dapat menjadi snapshot LIVE | Status hijau dapat bertentangan dengan jejak sumber |
| Rute | Hujan -1 dan angin -10 menghasilkan “Sangat Aman”, skor 95 | Validasi dan dasar penilaian keselamatan masih belum memadai |
| GNSS | Titik pertama memakai Date.now; mode simulasi dipilih otomatis saat mulai tanpa GPS; ekspor kehilangan metadata tiap titik | Rekaman belum sepenuhnya dapat ditelusuri |
| Traffic | Panggilan MapsView tetap simulasi; konektor TomTom belum tersambung ke panel aktif | Label simulasi sudah membaik, integrasi live belum selesai |

HTTP publik saat pemeriksaan: hotspot dan traffic masih **404 HTML**; cuaca **200 JSON success:true**. Penyebab pasti 404 belum dibuktikan lewat metadata deployment. Jangan menganggapnya bukti key kedaluwarsa maupun bukti pasti commit tertentu belum dideploy.

---

# Prompt untuk Gemini — selesaikan integrasi dan sisa masalah

Kerjakan proyek Harmony di `D:\vscode\Harmony`. Review terbaru menunjukkan perbaikan sebelumnya berhasil pada kasus uji tertentu, tetapi integrasi fitur dan integritas data masih belum selesai. Gunakan temuan berikut untuk memperbaiki aplikasi, bukan hanya mengubah laporan atau menambah badge.

## A. Aturan kerja

1. Baca instruksi repositori, status Git, dokumen ini, `evidence-current.json`, dan suite yang relevan. Pertahankan perbaikan yang sudah lolos; jangan mengembalikan masalah lama.
2. Buat rencana per kelompok masalah, file/pemanggil yang terdampak, serta bukti kelulusannya. Kemudian implementasikan secara bertahap.
3. Jangan reset/clean repositori, menghapus backup/data pengguna, mengganti aplikasi dengan versi ringkas, menghapus menu/provider/renderer, atau melakukan commit/push/deploy otomatis.
4. Pertahankan navigasi panel terpadu dan nama **Peta Cuaca**. Jangan menambahkan tombol duplikat di depan peta. Pertahankan OpenLayers, Three.js, Cesium, katalog, dan demonstrasi yang berguna.
5. Perbaiki sumber yang rusak lewat adapter atau migrasi sesuai dokumentasi resmi. Kredensial yang tidak ada harus dilaporkan sebagai NOT_CONFIGURED. Jangan membuat data tiruan sebagai fallback operasional.
6. Bedakan data sensor, model, katalog, demonstrasi, dan hasil turunan. Setiap status berhasil harus berasal dari validasi produk serta penggunaan yang benar pada fitur, bukan sekadar HTTP 200.

## B. Perbaikan yang wajib diselesaikan

### 1. Radar OpenLayers masih tersembunyi dan memakai kontrak API lama

**File:** `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`.

**Lokasi penting:** metadata sekitar baris 3716, layer XYZ sekitar 3741–3799, effect yang mematikan layer sekitar 3831–3836, viewport/iframe sekitar 3970–3995.

**Masalah:**

- Effect layer membuat RainViewer aktif, tetapi effect sesudahnya selalu mengatur `weatherTileLayerRef.current.setVisible(false)` ketika overlay berubah.
- OpenLayers diberi opacity 0 dan pointerEvents none saat overlay cuaca dipilih; iframe Windy menutupi viewport. Layer OpenLayers baru bukan layer yang terlihat pada alur tersebut.
- Metadata hanya diambil sekali saat mount, tanpa refresh berkala, freshness frame, pemeriksaan HTTP/schema, timeout, atau event tile gagal.
- Native maxZoom masih 12, sementara dokumentasi RainViewer menetapkan maksimum 7. Dukungan IR dan nowcast dihentikan dalam transisi 2026. Metadata sungguhan yang diperiksa tidak berisi frame IR.
- Saat pemeriksaan, tile z7 dan z12 sama-sama mengembalikan PNG 200. Itu tidak membatalkan batas kontrak resmi atau membuktikan radar aktif di UI. Jangan melaporkan z12 gagal karena data yang diperiksa tidak menunjukkan kegagalan itu.

**Perbaikan:**

1. Tetapkan mode renderer/provider cuaca yang jelas. Mode radar native harus mempertahankan viewport OpenLayers terlihat dan interaktif. Mode iframe eksternal tetap tersedia dengan label sumber yang sesuai.
2. Ganti effect lama yang mematikan semua layer dengan kontrol visibility berdasarkan mode yang benar. Pastikan cleanup effect lama tidak menghapus layer baru.
3. Gunakan host/path dari metadata tervalidasi, timestamp frame, native maxZoom sesuai dokumentasi, dan overzoom visual bila pengguna memperbesar peta. Jangan meminta produk di luar kontrak lalu menganggapnya terjamin.
4. Refresh metadata sesuai cadence yang wajar, saat kembali dari tab tersembunyi, dan setelah umur frame melewati batas. Simpan umur frame ketika refresh gagal; jangan mengaku data lama sebagai baru.
5. Tangani metadata kosong, produk tidak tersedia, tileloaderror, rate limit, dan coverage. Tile transparan tidak otomatis berarti fetch gagal atau tidak ada bencana.
6. Jangan mengganti menu satelit dengan radar diam-diam. Pertahankan menu, jelaskan produk/provider yang tersedia, dan gunakan sumber pengganti yang sah jika diperlukan. Jangan menamai layer RainViewer seolah observasi radar BMKG langsung tanpa pemetaan sumber.
7. Uji lewat klik menu pada browser: layer terlihat, tile diminta, opacity benar, pan/zoom tersinkron, timestamp tampil, mode eksternal dapat dipilih, dan error tercatat.

Rujukan: [RainViewer Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html), [perubahan layanan 2026](https://www.rainviewer.com/api/transition-faq.html).

### 2. Cache dan request bersama masih memiliki race serta kontrak yang bercampur

**File:** `apps/web/src/services/apiClient.ts`, terutama `get`, `bindCallerToFlight`, `clearCache`, cleanup promise, dan parsing JSON.

**Empat reproduksi:**

1. A dibatalkan, B dimulai, cleanup A menghapus flight B; C memulai request ketiga. Terjadi **3 fetch**, padahal C seharusnya berbagi B sehingga hanya 2.
2. GET lama sedang berjalan → POST memperbarui data dan clearCache → GET lama selesai → cache berisi versi lama lagi. Pembacaan berikutnya masih menerima versi 1 setelah mutasi versi 2.
3. Endpoint pernah diminta sebagai text, kemudian diminta sebagai JSON. Cache key yang sama mengembalikan string tanpa pemeriksaan JSON.
4. AbortError saat membaca body JSON dibungkus menjadi APIError 502 “Gagal membaca format JSON”. Pembatalan menjadi salah klasifikasi.

**Perbaikan:**

- Cleanup map harus memeriksa identitas flight. Request lama tidak boleh menghapus flight/cache milik request baru.
- Gunakan generasi/versi invalidasi cache. Request yang dimulai sebelum mutasi/invalidation tidak boleh menulis ulang cache sesudahnya.
- Key cache/dedup harus mencakup kontrak parsing dan opsi yang mengubah representasi, misalnya header locale/unit bila relevan. Jangan menyimpan kredensial mentah pada log/debug.
- Pastikan TTL/no-cache dan read setelah write mempunyai perilaku jelas. Menghapus cache saja belum menghentikan pending GET yang stale.
- Pertahankan AbortError, bedakan timeout dan gagal format/schema, termasuk saat membaca body. Deadline harus mencakup header dan body.
- Uji pergantian flight, invalidasi saat request pending, mixed expectedType/headers, semua konsumen batal, dan error body. Pertahankan perilaku satu caller batal sementara caller lain tetap aktif.

### 3. LST belum terhubung ke panel dan masih menghitung piksel di luar AOI

**File:** `services/geospatial/lstService.ts`, `components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`, `services/geospatial/stacService.ts`, serta adapter raster yang akan ditambahkan.

**Bukti:**

- Pencarian kode aktif menemukan deklarasi/export `lstService`, tetapi belum menemukan pemanggilnya di UI. Panel masih memakai preset band contoh dan pencarian metadata STAC.
- AOI di Indonesia dengan satu piksel Indonesia dan satu piksel Amerika tetap menghasilkan **2 piksel valid**, rata-rata **36,85 °C**, luas **2 km²**. Hash AOI tidak memotong raster.
- Piksel tanpa QA mendapat qualityValid true dan status DERIVED.
- Piksel clear dengan nilai -28,15 °C ditolak oleh batas tetap; alasan yang ditampilkan malah menyatakan seluruh piksel tertutup awan/fill.

**Perbaikan:**

1. Sambungkan alur nyata: pilihan koleksi/scene → asset band & QA → akses/signing bila perlu → pembacaan window raster → CRS/transform → mask AOI beserta holes/MultiPolygon → skala/nodata/QA → statistik → panel/layer/ekspor.
2. Jangan mengklaim analisis wilayah selesai ketika baru mempunyai thumbnail atau satu nilai preset. Preset tetap menjadi demo terpisah yang dipilih pengguna.
3. Sediakan pilihan produk termal yang benar-benar didukung. Sentinel-2 tidak boleh diperlakukan sebagai band termal LST Landsat/MODIS. Jangan membuat LST dari band optik contoh seolah pengukuran termal.
4. Gunakan adapter berdasarkan collection/product/band, termasuk Landsat 7 vs 8/9, MODIS day/night, transform, skala, fill, dan QA detail. Mandatory QC 01 bukan fill, tetapi bukan alasan mengabaikan indikator kualitas rinci.
5. Luas dan coverage harus berasal dari piksel/mask/CRS yang benar, bukan jumlah piksel × resolusi tebakan dari nama satelit. Provenance CRS harus membedakan grid native dari koordinat output.
6. Jika QA hilang, kualitas cloud belum diverifikasi. Jangan menandai verified-clear tanpa bukti. Pisahkan alasan outside AOI, nodata, cloud, invalid calibration, dan batas tampilan.
7. Jangan memakai -20 °C sebagai batas validitas universal ketika mendukung wilayah global. Gunakan domain produk yang terdokumentasi dan pertahankan nilai fisik yang sah.
8. Uji perubahan AOI ketika pembacaan masih berjalan, piksel di luar poligon, holes, raster beda CRS, QA hilang, QC detail, hasil kosong, URL expired, dan ekspor yang mempertahankan source/time.

**Planetary Computer:** signing publik tersedia melalui API resmi; pengguna tidak harus memiliki akun untuk mendapatkan SAS dasar. Jangan menganggap seluruh pekerjaan signing tertahan oleh ketiadaan secret berbayar. Gunakan allowlist aset resmi, expiry-aware cache dan retry terbatas. SAS rahasia tidak boleh masuk log. [Dokumentasi akses dan signing Microsoft](https://planetarycomputer.microsoft.com/docs/concepts/sas/).

### 4. Rumus ISPU masih mencampur periode dan klaim standar

**File:** `services/geospatial/ispuCalculatorService.ts`, `GeospatialWeatherModal.tsx` sekitar 1810–1905, `weatherAggregatorService.ts`.

**Bukti:** tabel acuan P.14/2020 yang diperiksa pada Lampiran I, halaman 10, memakai periode **24 jam** untuk O3, CO, dan NO2. Kode memakai `o3_8h`, `co_8h`, `no2_1h`; UI menghitung ozon 8 jam sambil memasang badge standar tersebut.

Jendela masa depan yang salah sudah diperbaiki; jangan membukanya kembali. Sisa masalah:

- Dengan deret per menit dan anchor setengah jam, deduplikasi berdasarkan jam kalender masih menghitung 25 bucket dalam 24 jam, coverage **1,04 atau 104%**. Fungsi harus memvalidasi cadence atau menghitung durasi/interval sebenarnya.
- Tidak ada riwayat sekarang menghasilkan seri kosong, tetapi UI masih menulis “Prakiraan Ke Depan” untuk jendela yang tidak dihitung.
- Warna kategori Berbahaya masih ungu, sedangkan tabel kategori Lampiran II memakai hitam.
- Pernyataan “18 jam minimal untuk baku mutu Permen LHK” perlu dasar yang spesifik; jangan menamai kebijakan kelengkapan internal sebagai ketentuan resmi tanpa rujukan.

**Perbaikan:**

1. Pilih dan versikan standar indeks secara eksplisit. Untuk P.14/2020, cocokkan periode, satuan, breakpoint, interpolasi, pembulatan, kategori, dan warna dengan Lampiran I dan II. Jangan menggabungkan periode standar lain.
2. Migrasikan tipe dan seluruh pemanggil periode yang salah. HC tercantum pada standar tersebut; bila belum tersedia, laporkan unavailable/kelengkapan parameter dengan jujur dan jangan mengarang nilainya.
3. Tetapkan cadence/jendela yang benar. Coverage mencerminkan durasi data yang tercakup, bukan count bucket kalender yang bisa melampaui kebutuhan.
4. Label data CAMS sebagai estimasi model. Hasil turunan model bukan publikasi ISPU stasiun resmi. Kelengkapan tidak membuktikan akurasi.
5. Bila riwayat belum tersedia, tampilkan belum tersedia; jika fitur prakiraan indeks dibuat, pisahkan metode, periode ke depan, serta labelnya.
6. Tambahkan uji acuan yang independen dari implementasi: titik batas, interpolasi di antara batas, periode O3/CO/NO2, kategori/warna, cadence tidak teratur, nilai kosong, dan model vs sensor.

Rujukan: [dokumen P.14/2020](https://peraturan.go.id/files/bn774-2020.pdf). Perhitungan ada di **Lampiran I**, kategori di **Lampiran II**. Ini koreksi terhadap kontrak ilmiah yang diklaim aplikasi.

### 5. Gempa: partial, timezone, dan pembatalan masih salah pada beberapa alur

**File:** `services/geospatial/earthquakeSnapshotService.ts`, `weatherDataIntegrity.ts`, subscription/panel audit yang memakainya.

**Reproduksi:**

- Koleksi USGS berisi satu fitur sah dan satu latitude 999 menjadi UNAVAILABLE dengan **receivedCount 0**, padahal ada 2 fitur diterima dan satu dapat dipertahankan.
- Seluruh caller dibatalkan; service tetap menulis snapshot UNAVAILABLE dan attempt provider FAILED ke cache.
- Parser menerima zona tidak dikenal XYZ, menggantinya menjadi UTC. String kalender BMKG tanpa zona juga dianggap UTC; hasil berbeda 7 jam dari WIB eksplisit.

**Perbaikan:**

1. Validasi bentuk koleksi terpisah dari validasi per-rekaman. Koleksi yang topologinya rusak boleh gagal; satu rekaman rusak tidak boleh menghapus semua rekaman sah. Pertahankan received/valid/rejected count dan status PARTIAL.
2. Pembatalan pekerjaan oleh pengguna harus menjadi CANCELLED dan tidak memperburuk kesehatan provider/cache valid. Putuskan apakah request bersama yang tidak dibutuhkan harus dihentikan, tanpa menerbitkan kegagalan sumber palsu.
3. `fetchCheckedJson` juga masih menginisialisasi status FAILED untuk permintaan yang pre-aborted; sinkronkan kontrak cancellation lintas adapter.
4. Parser generik menerima zona yang valid atau menolak zona tak dikenal. Adapter BMKG menentukan WIB untuk format kalender lokal yang memang dinyatakan provider; waktu ISO ber-offset tetap dihormati.
5. Normalisasi waktu rekaman ke epoch/ISO berzona sebelum filter, LOD, tooltip, dan ekspor. Jangan memvalidasi dengan parser ketat lalu menyimpan string ambigu untuk diparse ulang secara longgar.
6. Unsubscribe terakhir harus melepas pekerjaan/listener/timer yang tidak diperlukan. Jangan membawa signal caller pertama yang sudah abort ke polling subscription berikutnya.
7. Uji partial records, GMT/WIB/offset, zona tidak dikenal, semua caller batal, pergantian query, unsubscribe saat fetch pending, dan body timeout.

### 6. FIRMS masih dapat LIVE dengan seluruh attempt FAILED

**File:** `services/hotspotFireService.ts` sekitar 455–508, backend `services/firmsIntegrity.js` dan panel audit.

Reproduksi envelope `success:true`, flag partial false, satu deteksi sah, tetapi attempt HTTP 503 FAILED tetap menghasilkan **snapshot LIVE**. Count/metadata pada kontrak normal sudah diperbaiki; yang belum adalah konsistensi lintas field.

**Perbaikan:** derive status dari validasi payload, sourceAttempts, cakupan request, dan provenance. Tolak atau tandai kontrak kontradiktif dengan reason yang jelas; jangan memberi label LIVE pada data yang tidak dapat dijelaskan asal keberhasilannya. Jika data adalah cache lama, pertahankan identitas/waktu dan label STALE, bukan memperbaruinya dengan waktu attempt gagal.

ValidCount parsing, acceptedCount sesudah filter, duplikat, rejected, outside window, dan outside bbox perlu definisi yang konsisten. Count tidak diketahui tidak boleh otomatis menjadi nol. Simpan sumber serta waktu akuisisi per rekaman, dan pertahankan produk saat query source ALL.

Uji envelope kontradiktif, satu produk gagal, semua produk gagal, valid empty, partial intensity, out-of-scope records, cache stale, dan audit sampai ke panel pengguna.

### 7. Penilaian rute masih menganggap dua angka sebagai bukti keselamatan

**File:** `services/routingService.ts:evaluateHazards`, `RouteNavigatorModal.tsx`.

Reproduksi hujan **-1** dan angin **-10** menghasilkan “Sangat Aman”, skor **95**, dan “tidak ada kendala cuaca ekstrem atau bahaya geologis”. Perbaikan null saat cuaca hilang sudah benar; validasi saat angka ada masih lemah.

**Perbaikan:**

- Validasi domain angka/satuan; cuaca negatif yang tidak sah harus ditolak. Tentukan apakah hujan akumulasi mm atau intensitas mm/jam.
- Gunakan struktur konteks cuaca yang memuat produk, provider, lokasi/sampel koridor, waktu berlaku, umur data, unit, dan status. Dua angka tanpa konteks tidak membuktikan kondisi sepanjang rute.
- Sampai ada metode penilaian yang didukung bukti, tampilkan indikasi lingkungan dan keterbatasan; jangan menyebut skor heuristik sebagai keselamatan tervalidasi.
- Hapus kesimpulan ketiadaan bahaya geologis yang hanya bergantung pada kosongnya daftar advice. Katalog gunung api tidak mengevaluasi seluruh bahaya.
- Pemanggilan UI saat ini tidak memasok cuaca ke `calculateRoute`. Lengkapi alur data yang benar jika fitur cuaca koridor dipertahankan; jangan menggantinya dengan default nol.
- Analisis status vulkanik terverifikasi perlu waktu/cakupan buletin; string VERIFIED_LIVE_FEED saja bukan bukti. Hitung kedekatan terhadap segmen koridor, bukan hanya titik vertex bila menggunakan hasil itu.
- Pertahankan OSRM/geodesi sebagai navigasi perjalanan dengan batasnya. Jangan mengklaim jalur evakuasi resmi atau paling aman.

### 8. GNSS: mode, waktu titik pertama, freshness, dan ekspor

**File:** `studio/GeospatialPositioningTab.tsx` sekitar 99–167, 238–253, 292–307, 496–510; `services/geospatialAnalysisService.ts:exportTrackToGeoJSON`.

**Masalah:**

- `handleStartRecording` langsung memilih SIMULATION bila GPS tidak aktif. Tombol tetap bernama “Mulai Perekaman”, tanpa pilihan simulasi yang eksplisit.
- Titik awal DEVICE diberi Date.now, bukan timestamp fix yang ditampilkan. Fix lama dapat tampak sebagai pengukuran saat mulai.
- State watching/connecting sudah membaik, tetapi belum ada batas umur fix untuk menandainya stale; callback perlu memvalidasi koordinat/timestamp/accuracy.
- Sesudah GPS dimatikan/error, nama ekspor bergantung pada GPS aktif saat ekspor dan bisa menyebut track perangkat sebagai simulasi.
- GeoJSON menyimpan count/mode gabungan tetapi kehilangan timestamp, accuracy, dan source tiap vertex. GPX/GeoJSON harus dapat ditelusuri dengan kualitas yang sama.
- Label “altitude ortometrik” dan “Sensor GPS Asli” perlu mengikuti jenis data aktual; browser geolocation bukan bukti RTK/sensor satelit langsung atau koreksi geoid.

**Perbaikan:** pilih DEVICE atau SIMULATION secara eksplisit; mulailah DEVICE setelah fix valid/fresh tersedia. Gunakan timestamp/accuracy asli, pisahkan sesi/segmen mode, tangani stale/error, dan beri label berdasarkan data track yang disimpan. Pertahankan metadata per titik dalam GeoJSON (misalnya Point features atau array properties yang terdokumentasi) dan GPX; jangan mengubah arti LineString tanpa dokumentasi. Escape nama XML dan validasi koordinat/waktu saat ekspor.

Uji melalui browser dengan geolocation mock yang berlabel: belum ada izin, izin ditolak, fix lama, fix baru, tidak ada fix lanjutan, error saat merekam, matikan sensor sebelum ekspor, dan mode simulasi yang benar-benar dipilih pengguna.

### 9. TomTom belum tersambung ke panel traffic

**File:** `MapsView.tsx` sekitar 686/704, `geospatialDataTelemetryService.ts`, adapter traffic, backend endpoint `/api/spatial/traffic/flow`.

Label simulasi di UI sudah membaik. Namun, kode aktif peta tetap memanggil `simulateRealtimeTraffic`; pemeriksaan endpoint TomTom bukan pemakaian data TomTom pada koridor.

**Perbaikan:** sambungkan pemilihan ruas/koordinat ke proxy, validasi flowSegmentData, tampilkan kecepatan aktual/free flow/closure dan timestamp/cakupan. Pertahankan nol sebagai kecepatan sah. Jika key tidak tersedia, tampilkan NOT_CONFIGURED tanpa angka live. Demonstrasi harus dipilih pengguna dan tetap terpisah dari hasil provider.

Cakupan satu flow segment tidak boleh disebut seluruh jaringan kota/negara. Jika membuat heatmap/warna koridor, jelaskan ruas yang sudah dan belum diperiksa. Uji UI memakai respons proxy yang sebenarnya, gagal auth, rate limit, timeout, lokasi tanpa flow, dan jalan ditutup.

### 10. Health provider, deployment, dan bukti pengujian

**File:** `apiHealthService.ts`, `geospatialDataTelemetryService.ts`, `stacService.ts`, `vercel.json`, `api/index.js`, router backend, `package.json`.

1. Pisahkan health endpoint umum, validitas produk, dan hasil yang benar-benar digunakan fitur. Health service masih empat target; satu endpoint ONLINE tidak membuktikan seluruh domain berhasil. Hindari state health yang bisa dimutasi pemanggil.
2. Selesaikan attempt record, retry terbatas/backoff/Retry-After sesuai provider, klasifikasi credential/timeout/schema/cancelled, signing aset, dan cakupan yang relevan. Jangan mengarang status api expired tanpa bukti provider.
3. `evidence14Reproductions.test.mjs` sudah ada, tetapi belum masuk script npm test yang diperiksa. Integrasikan gate yang diperlukan agar perbaikan itu benar-benar dijaga rutin.
4. Aksesibilitas backend/frontend kini memisahkan unknown dengan benar, tetapi masih memakai Haversine × faktor tetap. Jangan menyebut mode ini sebagai isochrone jaringan jalan teruji. Label estimasi dan keterbatasan tetap diperlukan; mode jaringan memerlukan graph/matrix nyata.
5. Endpoint hotspot/traffic publik masih 404 HTML. Rute lokal yang ada tidak membuktikan versi deployment yang menyebabkan 404. Periksa version/build metadata, konfigurasi base URL/router/rewrite dan log yang tersedia; bila belum ada akses, tulis penyebab belum terkonfirmasi.
6. Kode lokal tidak mengubah situs publik tanpa deploy. Jangan deploy pada tugas ini; sediakan daftar kebutuhan setelah verifikasi lokal.
7. Jangan menulis “build lolos”, “layer aktif”, atau “diuji penuh” berdasarkan transpile fixture/typecheck saja. Catat perintah build produksi, browser action, request/response, status panel/layer, dan batas pengujian.

## C. Alur kerja dan syarat selesai

Urutan implementasi:

1. Tutup masalah cache/request, kontrak audit, dan klaim keselamatan terlebih dahulu.
2. Benahi indeks/produk/waktu dengan acuan yang benar.
3. Hubungkan radar, raster/LST, GNSS, dan traffic ke alur pengguna tanpa menghapus menu/provider.
4. Uji regresi, build, dan interaksi browser dengan lingkungan lokal yang sesuai.
5. Perbarui laporan sesuai hasil sebenarnya, termasuk pekerjaan yang masih tertahan oleh data/credential.

Gunakan fixture untuk reproduksi yang deterministik, tetapi beri label jelas. Selain fixture, periksa request provider yang benar-benar diizinkan dan dapat diakses. Jangan mencampur hasil mock, metadata search, download raster, dan render sukses dalam satu klaim.

Untuk setiap menu, buktikan:

**klik pengguna → lokasi/AOI/waktu → provider/product → HTTP/body → validasi → snapshot/cache → perhitungan → panel/layer/tooltip → ekspor**.

Uji minimal: data tersedia, valid empty, partial, stale sesudah refresh gagal, unavailable, credential belum ada, user cancellation, perubahan lokasi saat pending, serta berpindah 2D/Three.js/Cesium. Jangan mencemari database/data pengguna; suite yang menulis job perlu penyimpanan terisolasi.

Cakupan global tetap dikerjakan melalui strategi produk dan AOI yang jelas. Jangan mengunduh semua titik bumi dari browser setiap klik. Sebaran antar-model bukan ukuran akurasi terhadap observasi; evaluasi akurasi memerlukan pembanding dan periode uji.

## D. Laporan akhir yang wajib diberikan Gemini

- Daftar masalah → perubahan file/fungsi → bukti sebelum/sesudah → uji yang benar-benar dijalankan → batas tersisa.
- Penambahan/penggantian/penghapusan yang spesifik. Penghapusan hanya untuk cabang rusak/klaim tanpa dasar yang sudah diganti, bukan sumber atau fitur penting.
- Matriks provider: configured, attempted, valid payload, downloaded/read, actually used, rendered, freshness/cakupan, reason jika gagal. Kredensial dan URL bertoken tidak boleh masuk laporan.
- Daftar menu yang sudah diuji melalui browser dan menu yang baru diuji helper/mock. Jangan memberi status “diuji penuh” untuk yang belum dilewati pengguna.
- Exit code dan jumlah suite/kelompok aktual; build produksi; evidence browser; hasil request live yang terpisah dari mock.
- Perbedaan lokal/publik dan kebutuhan yang masih belum terpenuhi. Jika belum dapat selesai, jelaskan bagian yang masih terbuka secara spesifik.

Tujuan: menyelesaikan integrasi fitur yang dijanjikan dan memastikan angka, waktu, count, sumber, status berhasil/gagal, serta kesimpulan pada Harmony benar-benar dapat ditelusuri. Perbaikan harus mempertahankan fitur dan sumber yang sudah ada.
