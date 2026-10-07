# Prompt Gemini — audit ulang dan perbaikan data/API Harmony

Tanggal pemeriksaan: 3 Oktober 2026. Proyek: `D:\vscode\Harmony`.

## Instruksi utama untuk Gemini

Anda akan memperbaiki web Harmony berdasarkan audit berikut. Baca kode terbaru terlebih dahulu, buat rencana perbaikan per kelompok masalah, kemudian implementasikan dan uji. Fokus pekerjaan adalah aliran data, koneksi API, kejujuran status, perhitungan, dan konsistensi peta. PPT dan esai berada di luar pekerjaan ini.

Audit ini dibuat melalui pembacaan kode, pengujian yang sudah tersedia, enam reproduksi dengan respons buatan untuk pengujian, pemeriksaan situs publik, dan pengecekan dokumentasi sumber. Kode aplikasi tidak diperbaiki dalam audit ini. Jangan menganggap hasil pengujian dengan fixture sebagai bukti API dunia nyata berhasil.

### Aturan menjaga proyek

1. Pertahankan perubahan pengguna yang belum di-commit. Jangan melakukan reset, mengembalikan seluruh direktori, menghapus backup, atau menulis ulang aplikasi dari awal.
2. Pertahankan seluruh menu, navigasi, autentikasi, GPS, rute, pengaturan lapisan, mode 2D, Three.js, dan Cesium. Kode lokal memuat domain `weather`, `bmkg`, `remote_sensing`, `terrain`, `positioning`, `hydrology`, `field_survey`, `analytics`, `charts`, `fusion`, `catalog`, `hotspots`, `accessibility`, `emissions`, dan `swot`.
3. Semua akses alat tetap berada pada panel pengaturan/Alat & Analisis yang sudah ada. Jangan menambahkan deretan tombol mengambang duplikat. Nama antarmuka tetap **Peta Cuaca**.
4. Pertahankan sumber yang sudah dipakai. Jika adapter rusak, perbaiki adapter, parameter, kontrak respons, atau jalur backend. Pengganti boleh ditambahkan dengan alasan dan provenance; adapter lama tetap tercatat dengan status yang sebenarnya. Jangan menghapus sumber supaya audit terlihat hijau.
5. Pertahankan sembilan model cuaca yang dikonfigurasi dan empat produk FIRMS pada pilihan ALL. Bedakan jumlah dikonfigurasi, diminta, diterima valid, dan benar-benar dipakai. Banyak nama sumber tidak otomatis menghasilkan prakiraan lebih akurat.
6. Jangan mengganti data gagal dengan angka contoh, nol, daftar kejadian buatan, waktu sekarang, atau badge sukses. Mode demonstrasi yang sudah ada boleh tetap tersedia, tetapi data dan ekspornya harus jelas terpisah.
7. Jangan melemahkan validator atau mengubah pengujian agar perilaku salah dianggap benar. Tambahkan pengujian untuk kegagalan nyata yang dijelaskan di bawah.
8. Jangan mencetak nilai `.env`, JWT, MAP_KEY, API key, SAS signature, atau URL yang mengandung kredensial. Laporkan hanya nama konfigurasi, ada/tidak ada, kelas kegagalan, dan endpoint yang sudah disanitasi.
9. Jangan mengubah tampilan secara besar-besaran saat memperbaiki koneksi. Siapkan hasil lokal dan laporan perubahan; publikasi/deployment dilakukan hanya jika memang diminta pengguna.

## 1. Hasil audit dan batas pembuktiannya

### Pengujian lokal yang sudah dijalankan

- `node tests/monitoringSnapshot.test.mjs`: 9 kelompok lolos.
- `node tests/weatherDataIntegrity.test.mjs`: 16 kelompok lolos.
- `node tests/recoveryFollowup.test.mjs`: 12 kelompok lolos.
- `node tests/geminiReviewIntegrity.test.mjs`: 12 kelompok lolos.
- `npm run typecheck`: lolos.

Total 49 kelompok lolos. Ini belum membuktikan akurasi ilmiah atau semua menu berfungsi end-to-end. Pengujian snapshot baru belum memeriksa waktu asli data STALE, perubahan status EMPTY ketika cache dibaca, penguraian source dengan underscore, atau validasi seluruh baris BMKG. Mock pada tes pembatalan juga tidak mematuhi AbortSignal; perkuat agar benar-benar menangkap pembatalan yang salah.

Saat audit, tidak ditemukan listener pada port lokal 3001/5173/5174/4173. Permintaan ke backend lokal gagal koneksi. **Jangan menulis bahwa API lokal expired atau provider mati berdasarkan keadaan ini.** Backend lokal belum dapat diuji langsung ketika prosesnya tidak berjalan. Jalankan server sesuai konfigurasi proyek ketika mengimplementasikan, tanpa mematikan proses pengguna yang mungkin sudah berjalan kemudian.

### Situs publik yang diperiksa

Situs: `https://harmony-nine-tau.vercel.app/app/maps`.

| Pemeriksaan | Hasil saat audit | Kesimpulan yang diperbolehkan |
|---|---|---|
| Halaman peta publik | Terbuka; tidak ada exception JavaScript pada pembukaan singkat | Halaman awal bisa dimuat, belum bukti semua interaksi lolos |
| Label Studio publik | Masih menampilkan `11-Domain` | Ada perbedaan dengan kode lokal yang memuat tambahan domain; pastikan versi deploy |
| `/api/spatial/weather/current?lat=-7.25&lng=112.75` | HTTP 200 JSON, `success:true` | Jalur ini tersedia; payload tetap perlu divalidasi lengkap |
| `/api/bmkg/gempa/terkini` | HTTP 200 JSON, `success:true` | Jalur tersedia; bukan bukti seluruh produk BMKG terhubung |
| `/api/spatial/traffic/flow?lat=-6.2&lng=106.816` | HTTP 404 HTML | Jalur publik belum tersedia pada pengujian ini, bukan bukti key TomTom expired |
| `/api/spatial/hotspots?bbox=100,-2,101,-1&source=VIIRS_SNPP_NRT&dayRange=1` | HTTP 404 HTML | Jalur publik belum tersedia pada pengujian ini, bukan bukti key NASA expired |
| USGS `2.5_day.geojson` | HTTP 200 JSON, 36 fitur | Feed dapat dijangkau dari lingkungan audit pada waktu tersebut |
| Open-Meteo contoh Indonesia dan London | Keduanya HTTP 200, nilai suhu dan waktu tersedia | Dua koordinat diuji; seluruh dunia belum diuji |
| RainViewer weather-maps JSON | HTTP 200, 13 frame radar; properti infrared berupa array | Keberadaan array tidak membuktikan array berisi frame valid atau cakupan Indonesia |

Bukti tersimpan di `D:\Blender\test 1\harmony-web-check\2026-10-03-data-audit-prompt\current-data-audit.json` dan `public-and-provider-audit.json`. Skrip reproduksi berada di direktori yang sama. Jika file itu tidak ikut dikirim, informasi dan skenario dalam prompt ini tetap cukup untuk mengulang pengujian.

## 2. Temuan prioritas dan perbaikan yang diperlukan

Nomor baris adalah petunjuk pada versi saat audit; cari nama fungsi lagi jika baris bergeser.

### P0-01 — Baris BMKG seluruhnya invalid masih disebut sumber berhasil

**Lokasi:** `apps/web/src/services/geospatial/earthquakeSnapshotService.ts`, `executeFetch`, sekitar baris 253–305 dan penyusunan `sourceAttempts`.

**Masalah:** `success:true` dan `data` berupa array langsung menetapkan `bmkgSuccess=true`. Koordinat invalid kemudian dibuang tanpa mengubah keberhasilan sumber. Reproduksi: USGS valid kosong + BMKG berisi satu baris `lat:999` menghasilkan snapshot `EMPTY`, BMKG `SUCCESS`, `receivedCount:1`, `validCount:0`. Ini contoh pengambilan yang tampak berhasil walaupun data yang diterima tidak dapat digunakan.

**Perbaikan:** validasi setiap rekaman sebelum menentukan status sumber. Periksa koordinat, identitas kejadian, waktu kalender/timezone, dan field wajib sesuai kontrak. Semua baris invalid = kegagalan validasi, bukan nol kejadian terverifikasi. Sebagian invalid = PARTIAL dengan jumlah dan alasan penolakan. Array valid kosong = EMPTY untuk cakupan sumber itu. Jika USGS berhasil kosong dan BMKG gagal, hasil gabungan harus menyatakan cakupan sebagian, bukan kedua sumber sukses.

**Uji:** semua invalid; satu valid satu invalid; array kosong sah; waktu tidak valid; magnitudo null jika memang diizinkan sumber. Validator USGS juga harus memeriksa FeatureCollection dan waktu yang masuk akal tanpa melarang nilai optional yang sah menurut kontraknya.

### P0-02 — Data gempa lama memperoleh waktu pengambilan baru setelah refresh gagal

**Lokasi:** service gempa yang sama, sekitar baris 365–406.

**Masalah:** records lama dipertahankan sebagai STALE, tetapi `fetchedAt=Date.now()` tetap dipakai. Reproduksi memperlihatkan waktu berubah 180 detik walaupun tidak ada data baru. Ini mengaburkan umur data dan dapat mempengaruhi keputusan cache/refresh.

**Perbaikan:** bedakan `lastAttemptAt`, `lastSuccessfulFetchAt`, dan waktu kejadian/provider. Ketika gagal, pertahankan waktu pengambilan sukses terakhir serta data lama; hanya waktu percobaan dan error terbaru yang berubah. Bila ada `requestId` percobaan baru, tetap simpan `dataSnapshotId` asal data lama. Age dihitung dari waktu yang sesuai, bukan waktu percobaan gagal. Snapshot PARTIAL juga harus mempertahankan umur masing-masing sumber jika menampilkan hasil lama dan baru bersama.

**Uji:** sukses → gagal → gagal; waktu asal dan records tidak berubah, status tetap STALE, percobaan baru tercatat. Snapshot kosong valid juga perlu kebijakan cache yang membedakannya dari hasil tidak tersedia.

### P0-03 — Pembaruan hotspot saat kembali ke tab salah memilih produk

**Lokasi:** `apps/web/src/services/hotspotFireService.ts`, `fetchHotspotSnapshotByKey`, baris 166–172.

**Masalah:** key memakai `${bbox}_${source}_${dayRange}`, kemudian dipecah dengan `split('_')`. Source `VIIRS_SNPP_NRT` menjadi `VIIRS`; hari juga dapat berubah menjadi 1. Reproduksi visibility refresh meminta `source=VIIRS`, padahal subscriber memilih `VIIRS_SNPP_NRT`. Hasil dapat masuk key lain dan subscriber awal tidak menerima pembaruan yang semestinya.

**Perbaikan:** simpan objek query terstruktur bersama key kanonis. Jangan membangun kembali options dengan delimiter yang juga terdapat dalam nilai. Refresh memakai bbox, source, rentang hari, dan filter asli persis. Pada service gempa, visibility handler juga harus mempertahankan `includeBmkg:false`; saat ini hanya feed yang dikembalikan lalu default memasukkan BMKG.

**Uji:** resume tab untuk semua empat produk FIRMS, ALL, dan rentang 7 hari; queryKey sebelum/sesudah sama. Uji subscriber gempa tanpa BMKG tidak berubah menjadi query gabungan.

### P0-04 — EMPTY dan STALE berbeda arti antara snapshot, getter, dan renderer

**Lokasi:** `hotspotFireService.ts`, baris 181–187, 408–435; `GlobeView3D.tsx`, sekitar 824–837; `MapsView.tsx`, daftar layer sekitar 1590–1750; `CesiumGlobe3D.tsx`, props dan detail entitas.

**Masalah:** hotspot kosong sah awalnya memberi getter `AVAILABLE`, tetapi pembacaan cache yang sama mengubah getter menjadi `FAILED`. Snapshot STALE dipetakan ke legacy `PARTIAL`. Three.js memetakan UNAVAILABLE ke STALE walau belum ada data lama. Daftar layer 2D memakai sejumlah `sourceStatus:'LIVE'` tetap, termasuk gempa, traffic, radar, dan katalog sensor. Cesium menerima arrays tanpa status/timestamp/attempts snapshot sehingga tidak bisa menjelaskan umur atau kegagalan sumber.

**Perbaikan:** status dikirim bersama data sebagai snapshot scoped. Hindari getter status global setelah await. Semua renderer mempertahankan perbedaan EMPTY/PARTIAL/STALE/UNAVAILABLE; label UI bisa sederhana: “Tidak ada deteksi pada cakupan ini”, “Data sebagian”, “Data lama”, “Belum tersedia”. Jangan menjadikan render READY sebagai keberhasilan data. Pass metadata snapshot ke Cesium dan popup 2D/3D. Jumlah valid dan jumlah yang benar-benar digambar dihitung terpisah per renderer.

**Uji:** EMPTY cache tetap EMPTY; tidak ada histori + gagal = UNAVAILABLE; ada histori + gagal = STALE; tiga renderer menampilkan sumber/waktu/status yang konsisten untuk query sama.

### P0-05 — Riwayat pengambilan FIRMS hilang pada frontend

**Lokasi:** `hotspotFireService.ts`, baris 378–404; backend `apps/server/src/services/firmsIntegrity.js`.

**Masalah dari kode:** backend sudah menyediakan `sourceAttempts` per produk/bbox/window, `receivedCount`, `rejectedCount`, dan `acceptedCount`. Frontend menggantinya dengan satu attempt `FIRMS_ALL` atau `FIRMS_${source}`, dan `totalReceived` menjadi panjang data yang sudah tersaring. Pengguna tidak dapat mengetahui produk mana gagal. Parser frontend masih menggunakan `parseFloat`, yang dapat menerima `12junk` sebagai 12; tanggal/waktu tidak divalidasi secara lengkap di boundary ini.

**Perbaikan:** pertahankan attempts backend beserta HTTP/error/retry state setelah sanitasi. Pisahkan raw received, invalid, di luar window/AOI, duplikat, valid, dan rendered. Untuk cache, jangan menyatakan request NASA baru terjadi. Salin `source`, acquisitionTime, produk, sensor, dan parameter kualitas setiap rekaman. Gunakan parsing numerik ketat dan validasi tanggal/bbox/window. Nilai MODIS confidence 0–100 berbeda dari kategori VIIRS; jangan otomatis mengubah confidence menjadi probabilitas kebakaran.

**Pertahankan:** empat produk pada ALL, pembagian jendela maksimum lima hari, batas waktu total, pemisahan antimeridian, penolakan CSV HTML, deduplikasi, dan waktu cache asli yang sudah ada di backend. Jangan merusak perbaikan tersebut.

### P1-06 — Pembatalan, batas waktu, dan siklus subscriber belum lengkap

**Lokasi:** kedua snapshot service; `weatherDataIntegrity.ts` fungsi `fetchCheckedJson`; `apiClient.ts`; `apiHealthService.ts`; timeout pada `terrainService.ts` dan `atmosphericNwpAiService.ts`.

**Temuan:**

- Caller yang AbortSignal-nya sudah aborted tetap dapat memulai fetch pada entry point service snapshot; satu permintaan tercatat dalam reproduksi gempa.
- Listener caller tidak dibersihkan setelah snapshot request selesai. Listener request lama dapat mengubah consumerCount entry baru dengan key sama. Lindungi entry menggunakan identitas request dan hapus listener saat selesai.
- Unsubscribe menghapus timer tetapi belum melepas kepentingan konsumen dari pekerjaan yang sedang berjalan. Timer memakai options konsumen pertama, termasuk signal miliknya.
- Gempa tidak mempunyai deadline sendiri; satu sumber/body yang menggantung dapat menahan seluruh gabungan.
- `fetchCheckedJson` menimpa `options.signal` dengan controller sendiri tanpa meneruskan pembatalan caller.
- `apiClient.get` berbagi promise yang menggunakan signal caller pertama; caller itu dapat membatalkan konsumen lain. AbortError dibungkus menjadi error 500.
- Beberapa timeout dibersihkan segera setelah headers fetch diterima, sebelum pembacaan body selesai. APIHealth perlu cleanup `finally`, single-flight, dan proteksi respons lama.

**Perbaikan:** deadline end-to-end meliputi koneksi dan body; komposisi signal caller dan timeout; cancellation konsumen terpisah dari cancellation shared network request; berhenti ketika tidak ada konsumen/subscriber. Response request lama tidak boleh menimpa query baru. Caller abort bukan kesalahan provider dan bukan alasan menulis audit OFFLINE. Bounded cache dan cleanup visibility listener juga diperlukan.

**Uji:** abort sebelum fetch; dua konsumen satu batal; keduanya batal; subscriber pertama pergi dan kedua tetap; abort lama setelah request baru dimulai; body lambat setelah HTTP 200; lokasi A lambat lalu B cepat; unmount dan buka/tutup mode berulang tanpa timer bertambah.

### P0-07 — Status gunung api dan sebagian katalog masih tampak seperti telemetri langsung

**Lokasi:** `apps/web/src/services/volcanoService.ts`, `ACTIVE_MONITORING_BASELINE`, `fetchEnrichedVolcanoes`; `MapsView.tsx` sourceStatus; `apps/server/src/routes/bmkgRoutes.js` `/radar`.

**Masalah:** level, radius bahaya, narasi aktivitas, dan `lastUpdate:'Realtime PVMBG Feed'` pada volcanoService berasal dari array statis; fungsi bernama fetch hanya memetakan array, tanpa request upstream. `/radar` sudah memiliki catatan inventaris, tetapi status tiap stasiun masih literal `OPERASIONAL` tanpa telemetry. Katalog stasiun/sensor tidak boleh dihitung sebagai pengamatan yang telah diterima.

**Perbaikan:** pisahkan identitas/lokasi inventaris dari bulletin terkini, level resmi, waktu publikasi, waktu fetch, dan sumber bulletin. Cari akses resmi PVMBG/MAGMA yang benar-benar tersedia. Selama belum tersambung, tampilkan katalog dengan status operasional belum terverifikasi; jangan memakai level/radius statis sebagai kondisi hari ini. Pertahankan titik gunung/stasiun dan menu. Aktif secara geologi berbeda dari level peringatan; Level I tidak berarti gunung menjadi tidak aktif.

**Uji:** tanpa jaringan, array baseline tidak menghasilkan status LIVE atau “terkini”; kegagalan bulletin tidak mengubah tanggalnya; inventaris radar tetap dapat dibuka tanpa menyatakan seluruh stasiun online.

### P0-08 — Rata-rata polutan mencampur seluruh jam prakiraan

**Lokasi:** `GeospatialWeatherModal.tsx`, sekitar 1807–1823; `apps/web/src/services/geospatial/ispuCalculatorService.ts`, `calculateRollingAverage`, sekitar 99–123.

**Masalah:** modal mengirim seluruh `data.hourly` ke fungsi rata-rata. Fungsi menghitung semua nilai valid, tidak memilih window waktu dan tidak membatasi jumlah sampel ke targetHours. Contoh 48 nilai, 24 bernilai 10 lalu 24 bernilai 100, menghasilkan rata-rata 55 dan coverage 100% untuk target 24 jam. Ini bukan rata-rata jendela 24 jam yang ditentukan. Deret cuaca juga dapat mencakup jam masa depan.

**Perbaikan:** input berupa pasangan timestamp–nilai. Pilih window 24/8 jam berdasarkan waktu akhir yang dinyatakan; pisahkan estimasi prakiraan ke depan dari rata-rata historis. Ambil history/past hours kualitas udara yang benar jika diperlukan. Periksa cadence, duplikat, gap, timezone, unit, dan coverage durasi yang benar; jangan menganggap 24 titik sembarang adalah 24 jam lengkap. Coverage rendah = tidak cukup data, bukan indeks nol. CAMS tetap model, bukan stasiun ukur. Verifikasi periode rata-rata dan breakpoint setiap polutan terhadap dokumen resmi sebelum mengklaim standar.

**Uji:** jam masa depan tidak masuk rata-rata historis; 48 jam dibatasi ke window terpilih; gap, duplikat, nilai 0, null, waktu setengah jam, dan coverage minimum. Cantumkan start/end/cadence/valid coverage pada UI dan ekspor.

### P1-09 — Metadata katalog STAC dan hasil raster belum konsisten

**Lokasi:** `apps/server/src/controllers/spatialController.js`, `searchSTACProxy` sekitar 260–287; frontend `geospatial/stacService.ts`; `geospatial/lstService.ts`; `GeospatialRemoteSensingTab.tsx`; job analisis pada controller.

**Masalah:** backend proxy memberi `dataStatus:'LIVE'` dan acquisitionTime waktu sekarang pada JSON katalog tanpa validasi scene lengkap. Frontend telah memberi status ARCHIVED pada scene, tetapi `totalFound` adalah jumlah halaman tersaring, tidak mengikutkan pagination. Filter awan masih meloloskan nilai cloudCover null; tampilkan unknown tersendiri. LSTService menerima metadata MODIS/Landsat 7 tetapi tetap memakai konstanta konversi Landsat C2 yang sama tanpa kontrak produk. Piksel invalid mempunyai angka sample 0, dan parameter AOI digunakan pada hash tetapi tidak melakukan clipping piksel di fungsi ini. Hasil yang disebut UHI berasal dari persentase kelas panas, belum selisih urban–rural.

**Perbaikan:**

1. STAC success hanya berarti pencarian metadata berhasil. Waktu akuisisi berasal dari scene, bukan waktu HTTP. Simpan attempt setiap katalog dan alasan fallback.
2. Verifikasi collection per provider; collection yang ada pada satu katalog belum tentu ada pada katalog lain. Dukung pagination dengan batas jelas, dedup item, dan pisahkan jumlah halaman dari total resmi.
3. Metadata DECLARED COG tetap DECLARED sampai header/struktur/range-read benar-benar diperiksa. Preview RGB bukan raster termal.
4. Signed URL Planetary Computer perlu SAS yang belum expired; simpan URL asset asli, expiry, dan hasil signing secara terpisah. Refresh signature dengan mekanisme resmi, tanpa mengubah ID scene atau tanggal akuisisi.
5. Pembacaan piksel membutuhkan worker/job: transform CRS, grid alignment, scale/offset produk, NoData, QA awan/bayangan/saturasi, polygon dan hole mask, statistik area valid. Semua piksel invalid menghasilkan data tidak tersedia.
6. LST hanya dihitung dari produk termal yang kompatibel. MODIS menggunakan adapter/scale/QA produk MODIS tersendiri. Jangan menerapkan konstanta Landsat secara universal. Sampel invalid memakai null dan quality flag.
7. Suhu udara, LST, suhu kecerahan FIRMS, dan efek warna thermal 3D adalah empat hal berbeda. Jangan saling menggantikan.
8. DEMO dari band contoh tetap DEMO pada hasil, penyimpanan job, dan ekspor. Backend job perlu mengetahui asal input; nilai manual/demo tidak boleh berubah menjadi produk satelit terukur hanya karena rumus selesai.
9. Coverage AOI berbasis luas piksel/grid yang relevan; jumlah vertex atau jumlah titik bukan persentase luas. Label UHI memerlukan pembanding urban–rural; jika belum ada, jelaskan sebagai indeks panas ilustratif.

**Uji:** signature expired; collection unsupported; HTML 200; scene arsip; metadata tanpa QA; AOI dengan hole; semua cloudy; NoData; input MODIS pada konverter Landsat ditolak; pagination dan total; ekspor tidak mempromosikan demo.

### P0-10 — Rute belum dapat dinyatakan “Sangat Aman” dari input yang tidak ada

**Lokasi:** `apps/web/src/services/routingService.ts`, `calculateRoute`, `evaluateHazards`, fallback; `spatialController.js` fungsi `getIsochrones`, `getFacilityAccessibility`, dan job accessibility.

**Masalah:** hujan default 0 dan angin default 10 dapat membuat analisis tampak mempunyai data. OSRM tidak memiliki timeout/validasi schema lengkap, tetapi routeNote memakai “terverifikasi”. Skor keamanan berasal dari heuristik dan inventaris gunung statis. ORS failure diam-diam beralih ke estimasi, tetapi assumptions masih menyatakan key tidak dikonfigurasi walaupun key ada namun ditolak. Backend kategori fasilitas kosong menghasilkan `hasAccess15Min:false`, berbeda dari frontend yang sudah mengenal INSUFFICIENT_DATA. Waktu tempuh estimasi radial/Haversine bukan routing graph sebenarnya.

**Perbaikan:** missing weather tetap null/unknown. Rute jalan sah berbeda dari keselamatan rute tervalidasi. Validasi OSRM code/geometry/distance/duration, koordinat dan HTTP; tangani NoRoute, timeout, dan provider coverage. Garis geodesik tetap referensi, tanpa ETA/kecepatan jalan buatan. Perhitungan risiko membutuhkan data bahaya yang tepat lokasi/waktu sepanjang rute, bukan jaminan evakuasi aman. Pertahankan ORS; jika gagal, catat attempt/error asli dan mode ESTIMATED yang jelas. Fasilitas tidak diketahui berbeda dari fasilitas yang terbukti tidak terjangkau. Samakan kontrak backend/frontend/job dan metrik persentase objek versus cakupan area.

**Uji:** tidak ada cuaca; jalan tertutup; rute tidak ditemukan; tidak ada fasilitas; ORS 403/429; perbedaan profil jalan kaki/sepeda/mobil; zero speed sah; garis langsung tidak disebut jaringan jalan.

### P1-11 — Terrain, GNSS, emisi, dan fusi perlu provenance yang sesuai

**Terrain:** `geospatial/terrainService.ts` sekitar 44–85 dan 151–174. Input koordinat belum divalidasi sebelum membuat grid; dekat kutub grid dapat melewati 90° dan cos(latitude) mendekati nol. Timeout selesai sebelum JSON. Provenance menyebut SRTM dan akurasi vertikal tetap meski dokumentasi endpoint yang diperiksa menyatakan Copernicus DEM 2021 GLO-90. Slope/aspect adalah hasil turunan DEM statis, bukan observasi real-time. Skor longsor bobot 55/45 tidak boleh disebut penerapan standar SNI tanpa rujukan algoritma yang cocok. Validasi elevasi negatif, grid tepat, antimeridian, batas polar, dan metadata sumber; hasil heuristik tetap ESTIMATED dengan asumsi.

**GNSS:** `GeospatialPositioningTab.tsx`, inisialisasi sekitar 34–45, rekaman sekitar 70–92, badge sekitar 186. Accuracy 4.8 m dan “3D RTK Ready” adalah nilai tetap; jalur/speed dibuat dengan Math.random. Hubungkan mode rekam nyata ke `navigator.geolocation.watchPosition`, timestamp dan accuracy dari perangkat, termasuk permission denied dan unavailable. Perubahan titik peta bukan GNSS fix. Pertahankan simulasi sebagai mode tersendiri dan ekspor berlabel; browser geolocation tidak membuktikan RTK.

**Emisi:** `geospatial/transportEmissionService.ts` registry dan `calculateTripEmission` sekitar 376–439; endpoint emisi backend. Ada sumber URL resmi, tetapi tiap angka masih perlu dicocokkan dengan tabel/sheet/row/version dan unitnya. Faktor UK tidak otomatis faktor Indonesia. Bedakan vehicle-km/passenger-km/liter/kWh, occupancy dan scope; default `frequencyPerWeek || 5` mengubah 0 menjadi 5. Validasi input negatif/NaN dan nol yang sah. Cocokkan hasil frontend/backend, round trip, idle, hasil per penumpang dan hasil total. Jangan menyebut equivalensi pohon sebagai kompensasi karbon terverifikasi.

**Fusi:** `dataFusionAndUncertaintyEngine.ts` sekitar 380–450 sudah menyatakan DEMONSTRATION dan accuracyValidated:false, tetapi masih mempunyai suhu default 29.5, hujan 4.2, proporsi observed 72/38/8%, confidence 88/67/44%, dan uncertainty tetap. `GeospatialFusionIntelligenceTab.tsx` sekitar 179 masih menyatakan integrasi BMKG/Himawari/DEMNAS tanpa data nyata yang sesuai. Pertahankan demo, ubah klaim UI sesuai mode, dan pisahkan jalur operasional yang harus menggunakan input nyata. Jangan menjadikan kedekatan dengan lokasi radar inventaris sebagai bukti observasi radar telah diterima. AI penjelas bukan solver NWP atau validasi akurasi.

## 3. Kontrak aliran data yang harus berlaku di seluruh fitur

Alur yang diharapkan:

`query lokasi/AOI/waktu → adapter sumber → response HTTP/body → validasi produk → normalisasi unit/CRS/waktu → seleksi cakupan dan kualitas → snapshot immutable → analisis yang kompatibel → renderer/ekspor → audit yang berasal dari kejadian sebenarnya`.

Setiap tahap memiliki hasil dan kegagalan sendiri. HTTP berhasil tidak sama dengan payload valid; payload valid tidak sama dengan analisis siap; analisis selesai tidak sama dengan akurasi teruji.

### Snapshot dan registry

Gunakan arsitektur snapshot bersama yang **sudah ada**. Jangan membangun service duplikat karena prompt lama menyatakan belum ada shared snapshot.

- Query kanonis memuat provider/product, bbox atau hash geometri lengkap, rentang waktu, variabel, sensor/model, filter, unit, dan versi algoritma. `getLatestSnapshot` harus menerima query lengkap, bukan fallback ke query dengan sumber berbeda.
- Pisahkan status transport, validation, data availability/freshness, dan processing. Contoh `EMPTY` bisa merupakan validasi berhasil; `UNAVAILABLE` bisa merupakan proses gagal; `ARCHIVED/STATIC` bisa berupa data valid; `DEMO` tidak pernah observation.
- Waktu: requestedAt, completedAt, lastSuccessfulFetchAt, providerGeneratedAt/modelRunAt bila tersedia, acquisition/valid time, expiry signature. Nilai yang tidak tersedia tetap null.
- Counts: diterima upstream, invalid, tersaring AOI/window, duplicate, valid, dipakai analisis, marker benar-benar dirender. Jangan menduplikasi event yang sama sebagai jumlah kejadian baru hanya karena dilaporkan BMKG dan USGS; simpan laporan sumber dan event association dengan toleransi yang terdokumentasi.
- `sourceAttempts` menyimpan setiap sumber yang benar-benar dicoba, HTTP, error code, latency, cache hit, retry, jumlah rekaman, dan alasan partial. Sumber yang tidak dicoba tetap NOT_REQUESTED/NOT_CONNECTED.
- Cache bounded, key terpisah, single-flight, cleanup, TTL mengikuti produk, backoff, visibility. Jangan melakukan semua query global besar tiap membuka peta 2D atau setiap pergantian renderer.
- Data valid terakhir boleh tetap terlihat ketika gagal dengan umur asli. Ketika subset lama dan baru digabung, cantumkan status/umur masing-masing sumber.
- Peta 2D, Three.js, Cesium, Studio dan ekspor membaca snapshot yang sesuai. Batas LOD 40/60 adalah jumlah marker pilihan, bukan jumlah total data. Jika clustering, laporkan jumlah cluster dan anggota terpisah.

### Panel audit dan kesehatan sumber

`apiHealthService.ts` hanya memeriksa empat target dan root katalog; endpoint debug hidup bukan bukti produk data terhubung. Lengkapi registry kemampuan sumber dan status per produk yang digunakan. `geospatialDataTelemetryService.ts` telah memperbaiki banyak validator; pertahankan perbaikan itu.

- Bedakan pemeriksaan manual endpoint dari ingestion aktual. Ping tidak boleh menimpa ingestion PARTIAL/FAILED menjadi data sukses.
- Audit saat ini masih memakai beberapa URL contoh tetap: bbox FIRMS Indonesia, lokasi TomTom Jakarta, model Surabaya. Bentuk URL dari query pengguna atau labeli jelas sebagai pemeriksaan referensi; jangan disebut kondisi lokasi pengguna.
- Samakan adapter elevasi audit dengan sumber terrain aktual, atau jelaskan keduanya sebagai sumber berbeda. Tampilkan waktu ISO lengkap dan timezone, bukan jam tanpa tanggal.
- Bekukan/detach laporan audit, proteksi response lama, dan sanitasi kredensial. Log “selesai memeriksa” berbeda dari “semua sumber berhasil”.

## 4. Penanganan API expired dan error — jangan salah diagnosis

Audit belum membuktikan key NASA/TomTom/Cesium expired. Perbaiki klasifikasi dan mekanismenya, lalu uji dengan respons nyata yang aman. Jangan menulis “sudah diperpanjang” bila hanya mengganti status.

| Kondisi | Cara kerja yang diharapkan |
|---|---|
| Key belum dipasang | NOT_CONFIGURED, kebutuhan nama environment, menu tetap ada; tidak ada data dummy |
| Provider 401/403 | AUTH_FAILED/FORBIDDEN sesuai kontrak; bedakan key salah, izin produk, quota/plan, dan expiry yang benar-benar disebut provider |
| Signed URL expired | Deteksi expiry SAS; minta token/signature resmi baru, ulang maksimal sesuai batas; tidak mengganti scene/date |
| User JWT expired | Tangani pada autentikasi Harmony; gunakan refresh hanya jika proyek memiliki mekanismenya. Kegagalan API provider tidak boleh mengeluarkan pengguna dari akun Harmony |
| 429 / quota | RATE_LIMITED, patuhi Retry-After bila tersedia, exponential backoff dengan jitter dan batas retry; jangan polling cepat |
| Timeout / 5xx | Bounded retry untuk request idempotent; STALE jika ada data valid lama, UNAVAILABLE jika tidak |
| 404 | Periksa route frontend/backend/deploy, endpoint versi, collection dan coverage. Jangan langsung menyebut key expired |
| CORS / fetch TypeError | Bedakan jaringan dan pembatasan browser; gunakan proxy backend untuk kebutuhan yang sesuai, jangan disable keamanan browser |
| HTTP 200 HTML | Tolak sebagai respons data JSON/CSV yang invalid; HTML SPA fallback bukan sukses ingestion |
| HTTP 200 `success:false` | Tetap failure/NOT_CONFIGURED sesuai reason. Jangan dicache sebagai data berhasil selama lima menit |
| JSON valid tapi seluruh rekaman invalid | INVALID_UPSTREAM_PAYLOAD, jumlah ditolak tetap terlihat |
| Respons kosong valid | EMPTY pada query/window/coverage yang diperiksa; bukan kegagalan dan bukan pernyataan bebas bencana |
| Data lama atau jam provider di masa depan | Gunakan freshness produk dan toleransi clock yang wajar; pisahkan waktu prakiraan yang memang di masa depan dari waktu “current” |

Kunci provider berbayar/berizin disimpan pada backend. Cesium token publik bila memang digunakan frontend harus mengikuti pembatasan origin dan scope provider. Token baru tidak bisa diciptakan oleh Gemini jika akun pemilik perlu menerbitkannya; siapkan perubahan kode, sebut konfigurasi yang dibutuhkan, dan nyatakan pengujian live yang belum dapat dilakukan.

FIRMS pertahankan kompatibilitas `FIRMS_MAP_KEY` dan fallback `MAP_KEY`. Jangan memasukkan key ke log URL path. TomTom gunakan `TOMTOM_API_KEY`; ORS `ORS_API_KEY`; verifikasi nama konfigurasi Cesium dari kode. Jangan menerapkan refresh generik kepada key yang tidak mendukung refresh.

## 5. Kelengkapan data bumi dan prakiraan yang diharapkan

Harmony saat ini meminta cuaca untuk koordinat pilihan melalui Open-Meteo; asal lembaga model bukan berarti data semua negara sedang diunduh. Tampilkan cakupan sebenarnya. Jangan membuat narasi “seluruh dunia berhasil dikumpulkan” dari sembilan nama model.

1. Buat matriks sumber: cakupan geografis, jenis data observation/forecast/model/static, variabel dan unit, resolusi, model run, cadence, latency, horizon, lisensi, dan kebutuhan key.
2. Jika pemantauan global diperlukan, rancang ingestion backend bertahap berdasarkan grid/tile dan produk yang menyediakan medan global, dengan pagination, penyimpanan, scheduler, concurrency/rate budget, dan status coverage. Jangan mengunduh semua negara berulang dari browser. Detail lokal memakai query wilayah/point yang relevan.
3. Perbandingan model menyelaraskan valid time, forecast lead time, grid/elevasi, dan unit. Jangan mencampur suhu jam berbeda atau mereplikasi model gagal agar jumlah lengkap.
4. Arah angin adalah data melingkar; rata-rata vektor, pisahkan calm dan direction null. Kecepatan/komponen u-v harus mengikuti konvensi sumber. Animasi partikel hanya menjadi representasi medan angin jika benar-benar memakai medan tersebut.
5. Cloud cover, citra awan IR/visible, cloud-top temperature dan probabilitas hujan bukan variabel yang saling menggantikan. Hujan akumulasi per interval bukan otomatis intensitas mm/jam.
6. Pertahankan diagnostik lokal Coriolis/kerapatan yang sudah jujur. NWP operasional/assimilation memerlukan medan atmosfer, kondisi awal/batas dan solver atau produk penyedia yang sesuai. Tujuh nama persamaan atau respons AI tidak membuktikan solver bekerja.
7. Ukur accuracy terhadap pengamatan independen yang cocok lokasi/waktu: MAE/RMSE suhu, evaluasi angin yang sesuai, dan Brier/reliability untuk probabilitas bila data mendukung; hindari leakage. Laporkan dataset/periode/sample size dan coverage. Jangan menaikkan confidence karena menambahkan logo/lembaga.
8. Kebakaran: FIRMS adalah deteksi anomali termal dengan waktu overpass/latency, bukan pemantauan kontinu semua hutan. Deteksi tidak otomatis kebakaran terkonfirmasi; nol deteksi tidak berarti semua wilayah sudah teramati. Simpan confidence, FRP, sensor, acquisitionTime dan keterbatasan awan/coverage.
9. Enam route BMKG lokal yang belum tersambung tetap jujur: `/weather/warnings`, `/climate/indicators`, `/air-quality`, `/geophysics/potential`, `/time-sun`, `/seismology/microzonation`. Teliti akses resmi tiap produk; jangan mengembalikan angka katalog sebagai live. Untuk negara lain gunakan provider resmi yang cocok dan jelaskan batas cakupannya.
10. RainViewer dan Windy adalah jalur berbeda. Pembacaan RainViewer pada MapsView saat ini hanya sekali di mount; telusuri apakah path benar-benar dipakai renderer sebelum mengubahnya. Bila dipakai, validasi host/path/time, array kosong, cadence refresh, coverage dan tile failure. Label radar tidak boleh menyebut BMKG jika sumber nyata berbeda. Iframe terlihat bukan data numerik yang telah digunakan dalam konsensus.

## 6. Konsistensi lokal dan deployment

Periksa `vercel.json`, `api/index.js`, `apps/server/src/server.js`, `spatialRoutes.js`, konfigurasi API base URL dan build frontend. Saat audit, route traffic/hotspot tersedia di kode lokal tetapi 404 di publik. Label 11-Domain publik juga menunjukkan kemungkinan versi lebih lama; **ini indikasi ketidaksinkronan, bukan bukti penyebab tunggal**.

- Identifikasi commit/artifact frontend dan backend yang sedang dipakai. Tambahkan identitas versi yang dapat dibaca pada diagnostics tanpa data rahasia.
- API route tidak boleh jatuh ke halaman HTML SPA. Error API harus JSON terstruktur dan status HTTP sesuai kontrak.
- Uji path yang sama melalui backend lokal, proxy dev, preview produksi, dan publik setelah deployment yang diizinkan.
- Pastikan konfigurasi provider tersedia pada environment server yang tepat; konfigurasi lokal tidak otomatis ada di Vercel.
- Pertimbangkan deadline fungsi hosting saat FIRMS membutuhkan banyak sumber/window. Gunakan cached snapshot atau pekerjaan background yang benar jika diperlukan; jangan melaporkan sukses sebelum job selesai.

## 7. Urutan pelaksanaan untuk Gemini

### Tahap A — inventaris dan baseline

Baca kondisi terbaru dan instruksi proyek. Catat menu, adapter, query, caller, renderer dan export. Jalankan baseline test/typecheck. Buat rencana singkat berisi masalah, file, perubahan, risiko regresi dan tesnya. Jangan berhenti setelah menulis rencana; lanjutkan implementasi per tahap yang telah diotorisasi.

### Tahap B — hentikan status dan angka yang menyesatkan

Perbaiki P0-01 sampai P0-05, label LIVE tetap, volcano baseline, ISPU window, GNSS palsu dan klaim keamanan rute. Pertahankan fitur melalui state tidak tersedia/katalog/demo yang benar, bukan menghapus menu.

### Tahap C — transport, cache dan API recovery

Perbaiki timeout/body, signal, single-flight, subscriber lifecycle, expiry, rate limit, error envelope dan query isolation. Hubungkan audit langsung ke attempts adapter. Pastikan tidak ada failure yang berubah menjadi success melalui cache/getter/renderer.

### Tahap D — adapter dan perhitungan nyata

Selesaikan adapter yang rusak, sumber resmi yang dapat diakses, backend/frontend consistency, raster/QA/AOI, traffic, routing dan metadata. Kerjakan fitur kompleks sebagai potongan end-to-end yang diuji. Bila akses sumber atau kredensial benar-benar belum tersedia, dokumentasikan batas spesifik dan kode yang sudah siap; jangan mengklaim pekerjaan selesai hanya karena menu bisa dibuka.

### Tahap E — verifikasi, laporan dan persiapan deployment

Jalankan tes yang relevan, typecheck dan build. Uji browser serta failure injection. Periksa diff untuk memastikan menu/sumber tidak berkurang. Siapkan laporan serta kebutuhan environment; jangan mempublikasikan tanpa instruksi.

## 8. Uji penerimaan wajib

Gunakan mock untuk failure yang sulit dipicu, dan pengujian live terpisah untuk sumber yang tersedia. Labeli keduanya.

1. Enam reproduksi audit di atas gagal pada versi bermasalah dan lolos setelah diperbaiki: BMKG all-invalid, waktu STALE, query visibility FIRMS, EMPTY cache, caller sudah aborted, rata-rata seluruh deret.
2. Per provider: key missing, auth rejected, quota, timeout, 5xx, HTML 200, malformed JSON/CSV, schema invalid, partial, empty sah, stale. Uji body lambat juga.
3. Pilihan wilayah: Indonesia, Eropa, Amerika, Afrika, Australia, laut, lintang tinggi dan antimeridian; koordinat 0/0 sah, angka di luar rentang dan numeric junk ditolak. Sampel wilayah tidak boleh dilaporkan sebagai audit seluruh dunia.
4. Query yang sama berbagi pekerjaan; query berbeda tidak saling mengubah status. Response lama tidak menimpa lokasi/filter baru. Buka/tutup renderer dan tab tidak menambah polling.
5. Jumlah source requested/valid/used dan received/rejected/filtered/rendered konsisten dengan trace. PARTIAL tidak boleh tampil sebagai semua sumber ONLINE.
6. Semua 15 domain lokal dibuka tanpa crash, panel tidak duplikat, tool terkait dapat dijalankan dengan input yang cocok. Opening-only test tidak cukup untuk menyatakan perhitungan/export berfungsi.
7. GPS nyata, permission failure, simulasi terpisah; rute, geodesic fallback, traffic real/simulation, no facility vs unreachable, DEM/thermal/QA dan ISPU window memiliki tes khusus.
8. Ekspor JSON/CSV/GeoJSON menyertakan sumber, unit, CRS, window, status, input origin, versi algoritma dan jumlah yang sesuai; data demo tidak berubah menjadi live ketika diekspor.
9. Semua test baseline di bagian 1 tetap lolos. Lengkapi tes snapshot yang lemah, jangan hanya menambah pemeriksaan string kode. Jalankan test tambahan dalam `npm test`/CI melalui integrasi yang sesuai supaya tidak terlupakan.
10. Sumber yang butuh key diuji live hanya jika key tersedia. Jika tidak, tulis “belum diuji live: konfigurasi X diperlukan”; jangan audit palsu. 404 publik diperiksa kembali hanya setelah versi backend yang benar diterapkan.

## 9. Laporan akhir yang harus diberikan Gemini

- Daftar masalah yang dibuktikan, penyebab, file/fungsi, dan perubahan yang dilakukan.
- Tabel setiap provider/product: konfigurasi, koneksi, payload, freshness, coverage, actual used, dan bukti uji.
- Daftar penambahan, penggantian dan penghapusan. Setiap penghapusan harus merupakan kode rusak/duplikat dengan pengganti yang disebut, bukan mengurangi sumber atau fitur penting.
- Hasil tes dengan perintah, jumlah, pass/fail, jenis mock/live, dan yang belum diuji.
- Screenshot alur utama/panel status jika tersedia, tanpa secrets.
- Keterbatasan yang masih nyata, terutama kredensial, provider coverage, raster belum terhubung dan akurasi yang belum tervalidasi.
- Perbedaan lokal/publik dan langkah deployment yang diperlukan. Jangan menyatakan situs publik berubah jika hanya file lokal yang berubah.

## 10. Dokumentasi resmi untuk verifikasi kontrak

Gunakan dokumentasi yang sesuai produk dan periksa lagi jika berubah. Jangan mengambil contoh tanggal/URL lama dalam dokumentasi sebagai data live.

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): parameter cuaca, model, waktu, satuan dan cakupan produk.
- [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api): Copernicus DEM 2021 GLO-90, resolusi 90 m dan schema elevasi; metadata terrain harus mengikuti sumber aktual.
- [NASA FIRMS Area API](https://firms2.modaps.eosdis.nasa.gov/api/area/): pilihan produk, bbox/world, query maksimum lima hari per request, tanggal, MAP_KEY dan batas transaksi. NRT tidak berarti pemantauan terus-menerus.
- [TomTom Flow Segment Data](https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/traffic-flow/flow-segment-data): schema kecepatan/waktu/confidence/closure, koordinat dan arti 403/429.
- [Planetary Computer SAS](https://planetarycomputer.microsoft.com/docs/concepts/sas/): `msft:expiry`, token dan signing; pencarian STAC dan pembacaan asset adalah tahap berbeda.
- [RainViewer Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html): host/path/frame time, batas tile zoom yang didokumentasikan dan coverage. Saat diperiksa, dokumentasi menyebut maksimum zoom tile 7; konfirmasi lagi pada implementasi.
- [USGS Landsat C2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature): produk termal dan batas penggunaan, bukan sumber suhu Sentinel-2 RGB.
- [Faktor emisi pemerintah UK 2026](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026): verifikasi angka terhadap berkas/tabel aslinya sebelum memberi label verified.
- [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view): rujukan arsitektur/visual yang pernah diminta. Baca modul dan lisensinya sebelum mengadaptasi. README menyebut traffic simulasi di atas jalan nyata dan efek FLIR/thermal berupa shader; jangan menganggap semua tampilan sebagai pengukuran fisik real-time. Tampilan fotorealistik juga memerlukan provider/akses yang sesuai.

**Tujuan akhir:** pengguna dapat membedakan data yang benar-benar berhasil diambil, data sebagian, data lama, katalog, demonstrasi, dan sumber yang belum tersedia. Lengkapi kemampuan melalui adapter dan perhitungan nyata, sambil mempertahankan menu serta sumber penting dan menyediakan bukti yang dapat diperiksa.
