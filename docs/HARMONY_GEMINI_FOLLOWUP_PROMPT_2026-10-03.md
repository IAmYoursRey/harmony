# PROMPT GEMINI — Perbaikan Lanjutan Harmony Setelah Pemeriksaan 3 Oktober 2026

Kamu bekerja sebagai engineer pemulihan aplikasi Harmony. Kerjakan proyek `D:\vscode\Harmony`. Fokus pada halaman peta dan aliran data. Jangan mengerjakan PPT atau esai. Baca kode dan bukti terbaru sebelum mengubah apa pun.

## 1. Tujuan dan urutan kerja

Pulihkan fungsi yang benar-benar rusak, lengkapi integrasi data yang memungkinkan, dan buat status pengambilan data sesuai kenyataan. Pertahankan semua menu, sumber, model, navigasi, dan hasil pekerjaan pengguna. Tampilan yang menarik harus didukung oleh data yang jelas asal, waktu, cakupan, dan keterbatasannya.

Urutan wajib:

1. Periksa baseline terbaru dan buat inventaris fungsi/sumber.
2. Tulis rencana perubahan dengan file, fungsi, alasan, risiko regresi, dan cara mengujinya.
3. Perbaiki masalah mendasar dalam perubahan kecil.
4. Lengkapi adapter sumber dan sinkronisasi antar tampilan.
5. Kerjakan raster, traffic, dan 3D secara bertahap sesuai akses data nyata.
6. Jalankan pengujian, bandingkan sebelum/sesudah, lalu laporkan hasil beserta bukti.

Jangan berhenti pada rencana bila perbaikannya dapat dikerjakan. Bila konfigurasi atau akses sumber belum tersedia, jelaskan bagian yang terhalang secara spesifik dan kerjakan bagian lain yang independen.

## 2. Kondisi proyek yang sudah diperiksa

- Proyek memiliki banyak perubahan lokal yang belum di-commit dari beberapa sesi. Git HEAD bukan baseline hasil terakhir pengguna. Jangan menjalankan reset, clean, checkout massal, atau menimpa file dengan versi repo lama.
- Halaman publik `https://harmony-nine-tau.vercel.app/app/maps` masih berbeda dari lokal. Saat diperiksa, publik menampilkan 11 menu dan label lama `Peta Cuaca Windy`. Lokal memiliki 15 menu dan panel `Alat & Analisis`.
- Bukti pemeriksaan berada di `D:\Blender\test 1\harmony-web-check\2026-10-03-followup`.
- Baca `docs/HARMONY_FOLLOWUP_AUDIT_2026-10-03.md` dan bukti JSON. Prompt lama `docs/HARMONY_GEMINI_RECOVERY_AND_MONITORING_PROMPT_2026-10-03.md` adalah referensi tambahan; beberapa temuannya sudah diperbaiki.
- Pengujian membuka 15 menu membuktikan menu dapat dibuka, bukan bahwa seluruh subfitur, setiap lokasi dunia, dan ketelitian ilmiahnya sudah teruji.
- Jangan menerbitkan/deploy hanya agar publik tampak sama. Siapkan hasil lokal dan daftar kebutuhan deployment; publikasi mengikuti arahan pengguna.

## 3. Perbaikan terbaru yang wajib dipertahankan

### 3.1 Cesium sudah dapat dimuat

File: `apps/web/src/components/dashboard/views/spatial/CesiumGlobe3D.tsx`, `MapsView.tsx`, `apps/web/vite.config.ts`, `apps/web/package.json`, `package-lock.json`.

- Dependensi Cesium telah dipasang. Loader memakai import nyata yang diproses Vite, bukan `Function('return import(...)')` yang gagal di browser.
- Workers, ThirdParty, Assets, dan Widgets disajikan dan disalin ke direktori `cesium` saat build. Jangan menghapus pengaturan `CESIUM_BASE_URL` dan aset tersebut.
- Renderer dimuat saat dipilih. Tanpa token Ion, renderer dasar menggunakan OSM dan ellipsoid; ini bukan terrain atau 3D gedung fotorealistik.
- Entity dan perpindahan kembali ke 2D sudah memiliki lifecycle. Nilai koordinat nol valid. Magnitudo dan kedalaman yang tidak tersedia tidak boleh diisi dengan angka asumsi.
- Satu uji browser berhasil memuat canvas Cesium dan kembali ke 2D. Jangan menggantinya dengan placeholder yang hanya menyatakan siap.

### 3.2 FIRMS memakai sumber dan jendela yang diminta

File: `apps/server/src/services/firmsIntegrity.js`, `apps/server/src/controllers/spatialController.js`, `apps/web/src/services/hotspotFireService.ts`, `apps/web/src/services/geospatial/firmsService.ts`, `GeospatialHotspotsTab.tsx`.

- `ALL` mencakup VIIRS SNPP, NOAA-20, NOAA-21, dan MODIS; `VIIRS` mencakup ketiga VIIRS; `MODIS` memakai produk MODIS.
- Pilihan tujuh hari tidak boleh dipotong menjadi lima hari. NASA membatasi satu request Area API ke 1–5 hari. Implementasi membagi jendela kalender lalu menyaring ke rentang jam sebenarnya. Rentang tujuh hari berjalan dapat memerlukan delapan tanggal kalender.
- Bbox lintas garis tanggal dibagi. Identitas pengamatan menggunakan sumber, satelit, waktu, dan koordinat; jangan menggabungkan observasi lintas sensor sebagai duplikasi tanpa dasar.
- Header CSV dan setiap baris diperiksa; semua baris invalid menghasilkan kegagalan, bukan sukses dengan nol deteksi. Jumlah baris diterima/ditolak tetap dicatat saat seluruh baris invalid.
- Respons valid tanpa rekaman dibedakan dari sumber yang gagal. Sumber/jendela gagal tetap tercatat pada `sourceAttempts`; hasil sebagian memakai `PARTIAL`.
- Ada timeout per request dan batas keseluruhan 45 detik. Jendela yang tidak sempat diminta tetap dicatat sebagai gagal `REQUEST_BUDGET_EXHAUSTED`. Jangan menghilangkan sumber dari laporan demi melewati timeout.
- Cache mempertahankan waktu pengambilan asli. Pesan galat tidak boleh mengandung MAP_KEY atau URL yang memuat key.
- CSV impor tidak valid ditampilkan sebagai kegagalan dengan nilai kosong, bukan nol berhasil. Platform NOAA-21, UTC, koordinat nol, FRP nol, dan confidence unknown harus tetap benar.
- Rasio jumlah titik terhadap titik lain bukan luas cakupan wilayah; jangan mengembalikan klaim coverage tersebut.

### 3.3 Globe menampilkan kegagalan dan demo dengan jujur

File: `GlobeView3D.tsx`, `apps/web/src/services/geospatial/earthquakeSnapshotService.ts`.

- Promise fulfilled tidak otomatis berarti data berhasil. USGS diperiksa payloadnya; BMKG diperiksa status pengambilannya. Kedua sumber gagal berarti STALE, satu berhasil berarti PARTIAL.
- Data hotspot yang gagal tidak boleh menjadi `0 deteksi LIVE`.
- Tidak ada banner LIVE tanpa syarat. Angka cuaca delapan kota yang ditulis tetap di kode diberi status DEMO, sumbernya contoh Harmony, dan lapisan contoh mati saat awal.
- Efek warna termal diberi keterangan bahwa efek tersebut bukan pengukuran suhu.
- Kedalaman, magnitudo, dan jenis vegetasi yang tidak diketahui tidak boleh dibuat seolah diketahui.

### 3.4 Statistik dan katalog satelit

File: `charts/HarmonyChartEngine.tsx`, `services/geospatial/chartStatistics.ts`, `services/geospatial/stacService.ts`, `GeospatialRemoteSensingTab.tsx`.

- Grafik hujan memakai batang dan seri area memakai area; perbaikan ini sudah ada sebelum pemeriksaan lanjutan. Pertahankan.
- Median/kuartil memakai interpolasi yang dinyatakan; wind rose memiliki 16 arah yang benar, melingkar pada utara, memisahkan angin tenang, dan tidak membaca arah hilang sebagai utara.
- Box plot memperlihatkan Q1, median, Q3 dan whisker minimum/maksimum yang disebut jelas; jangan mengaku memakai aturan Tukey jika belum diterapkan.
- Pencarian STAC mengambil metadata, bukan otomatis membaca piksel raster. Status metadata scene `ARCHIVED`; ketelitian CE90, nama platform, resolusi, dan tutupan awan tidak boleh diciptakan.
- Tidak semua aset STAC adalah COG. UI menyebut aset katalog. Metadata awan optik yang hilang bukan radar tembus cuaca.
- Perubahan lokasi/AOI/koleksi/filter membatalkan dan mengosongkan pencarian lama. Respons terlambat tidak boleh menimpa lokasi terbaru.
- Memilih scene metadata tidak mengaktifkan angka indeks demo. Memilih demo menghapus pilihan scene metadata.
- Label aksesibilitas radial merupakan estimasi, bukan sertifikasi kota 15 menit atau layanan terjangkau penuh 100%.

## 4. Inventaris yang harus dilindungi

Pertahankan 15 domain: `weather`, `bmkg`, `remote_sensing`, `terrain`, `positioning`, `hydrology`, `field_survey`, `analytics`, `charts`, `fusion`, `catalog`, `hotspots`, `accessibility`, `emissions`, `swot`.

Pertahankan peta 2D, globe Three.js, mode miring, Cesium, cari lokasi, GPS, routing, AOI termasuk lubang/MultiPolygon, pengaturan lapisan, opacity, ekspor/impor, katalog sensor, model cuaca, akun/storage, dan semua fitur pembelajaran yang sudah ada.

Tombol alat baru ditempatkan di panel `Alat & Analisis` dalam pengaturan peta. Periksa tombol yang sudah terhubung sebelum menambah. Hapus hanya tombol depan yang benar-benar duplikat setelah memastikan akses dan callback dalam panel bekerja. Nama yang ditampilkan tetap `Peta Cuaca`; atribusi penyedia boleh ditampilkan pada bagian sumber.

Sumber gagal tetap diinventaris. Bedakan configured, available, requested, accepted, actually-used dan reference-only. Jumlah nama sumber bukan jumlah sumber numerik independen.

## 5. Masalah prioritas yang masih harus ditangani

### A. Status, cache, dan snapshot lintas lokasi/sumber

Periksa `geospatialDataTelemetryService.ts`, `weatherDataIntegrity.ts`, `weatherAggregatorService.ts`, `bmkgService.ts`, `hotspotFireService.ts`, serta controller terkait.

1. Buat hasil pengambilan yang terikat query, bukan membaca status singleton terakhir yang mungkin milik menu atau wilayah lain. Kembalikan snapshot berisi data dan metadata status dalam satu hasil immutable.
2. Cache key harus memuat provider, model, variabel, lokasi/AOI hash, rentang waktu, sensor, profil rute, versi algoritma dan pilihan produk. Jangan memakai pembulatan koordinat yang membuat lokasi dekat saling menimpa tanpa aturan grid yang terdokumentasi.
3. Pisahkan health endpoint, hasil request, status dataset, dan status pemakaian data pada perhitungan. HTTP 200 HTML/JSON salah tidak ONLINE-ingestion; endpoint bisa reachable tetapi payload gagal.
4. Setiap percobaan mempunyai requestId, queryKey, startedAt/completedAt, HTTP status, receivedCount, rejectedCount, acceptedCount, selectedCount, reason, serta sumber/waktu/area. Jangan mencatat sukses sebelum parse dan validasi selesai.
5. Pembatalan karena pergantian lokasi bukan kegagalan provider. Respons lama tidak boleh mengubah status query baru. Update cache harus atomik dan scoped.
6. Bila refresh gagal, hasil lama boleh dipertahankan dengan status usang dan waktu asli. Jangan menyebutnya pengambilan baru berhasil. Bila tidak pernah punya hasil valid, tampilkan tidak tersedia.
7. Registry harus mencakup adapter cuaca, udara, BMKG, USGS, FIRMS per produk, STAC per koleksi, elevasi, routing/traffic, dan provider peta yang benar-benar dipakai. Katalog sensor tidak berarti stasiun tersebut terhubung.
8. Periksa badge LIVE lain pada MapsView, weather embed, registry, dan tooltip. Renderer aktif, iframe dimuat, atau waktu komputer bergerak tidak membuktikan semua lapisannya live.

### B. BMKG: integrasi belum tersambung dan schema belum cukup ketat

Bukti saat pemeriksaan: autogempa dan terkini mengembalikan data; enam produk lainnya masih guard HTTP 503: warnings, climate indicators, air-quality, geophysics potential, time-sun, microzonation. Jangan menyalakan template angka/warning lama.

- Verifikasi dokumentasi resmi, format, endpoint, izin, cakupan, frekuensi, dan mekanisme akses setiap produk. Tambah adapter nyata jika akses tersedia. Provider pengganti harus disebut sebagai provider berbeda, bukan diganti namanya menjadi BMKG.
- Pada `apps/server/src/routes/bmkgRoutes.js`, beberapa validasi masih `parseFloat` dan hanya memeriksa adanya DateTime. Tambahkan validasi rentang lat/lng, format angka, waktu valid, dan schema tiap produk sebelum menyatakan berhasil. String seperti `12junk`, koordinat di luar bumi, atau tanggal tidak valid harus ditolak.
- Jangan memotong timeout hanya sampai header fetch; lindungi pembacaan body/JSON juga. Simpan waktu pengambilan asli saat cache/last valid digunakan.
- Data waktu Matahari boleh dihitung dengan algoritma astronomi terdokumentasi, berstatus DERIVED dan menyebut zona waktu; jangan diberi atribusi pengamatan BMKG.
- Mikrozonasi/PGA memerlukan data/model resmi dan metodologi. Tidak boleh menyimpulkan zona aman dari koordinat saja.
- Produk citra Himawari/IR memiliki waktu akuisisi; gambar terakhir yang tersedia tidak otomatis gambar saat ini. IR awan adalah suhu kecerahan/puncak awan sesuai produk, bukan suhu tanah.

### C. FIRMS dan pemantauan gempa global

- Live FIRMS belum terverifikasi karena MAP_KEY belum dikonfigurasi pada lingkungan yang diperiksa. Pengujian multisumber/tujuh hari saat ini memakai fixture, bukan klaim NASA live.
- Pertahankan semua empat produk. Bila NRT tidak mencakup tanggal lama dalam tujuh hari, nyatakan PARTIAL; teliti produk arsip/standar dan latensinya sebelum memperluas adapter. Jangan membuat rekaman pengganti.
- Pertimbangkan antrian dengan konkurensi kecil dan fairness antar produk agar batas 45 detik tidak selalu mengutamakan produk pertama. Seluruh timeout, retry, rate limit, jendela yang terlewat, dan coverage wajib terlihat. Hindari request global berulang per klik kamera.
- Impor campuran baris valid/invalid masih perlu rincian jumlah penolakan dan alasannya. Pilihan rentang waktu untuk data impor/demo perlu aturan yang terlihat; jangan menampilkan data historis sebagai deteksi terbaru.
- FIRMS mendeteksi anomali termal. Hotspot bukan konfirmasi kebakaran hutan. Brightness temperature, FRP, luas terbakar, suhu udara, dan LST adalah variabel berbeda. Jenis hutan/gambut harus berasal dari overlay tutupan lahan nyata beserta waktunya.
- Gempa BMKG/USGS perlu cakupan waktu konsisten dan source-specific provenance. Feed `all_day` dan daftar gempa terbaru BMKG tidak otomatis jendela identik. Jelaskan keterlambatan/kelengkapan.
- Jangan menyaring magnitudo kecil diam-diam atau menyebut subset visual sebagai semua gempa dunia.

### D. STAC menjadi analisis raster nyata

Pencarian katalog sudah bekerja secara struktural dan diuji dengan fixture. Pipeline COG/piksel belum tersambung. Jangan mengubah demo skalar menjadi LIVE.

Alur yang harus dibuat:

1. Cari koleksi yang benar-benar tersedia di provider untuk AOI/tanggal; validasi metadata, pagination, cloud yang diketahui vs unknown, dan tanggal akuisisi. `totalFound` saat ini adalah jumlah hasil halaman yang lolos filter; jangan disebut seluruh scene katalog jika tidak mempunyai total/pagination.
2. Tangani Polygon, MultiPolygon, holes, serta AOI lintas garis tanggal secara eksplisit. Bbox hanyalah prefilter; analisis akhirnya harus memakai mask geometri AOI.
3. Resolve asset band dan QA sesuai koleksi, cek media type/COG/range support, serta signing URL bila provider membutuhkan. Jangan memberi label COG pada asset metadata atau thumbnail.
4. Baca window raster secukupnya untuk AOI melalui worker atau job server. Terapkan CRS transform, grid alignment/resampling, scale/offset, NoData dan mask awan/bayangan/saturasi sesuai produk. Tolak hasil tanpa piksel valid.
5. NDVI memakai red/NIR, NDWI/MNDWI sesuai definisi yang dinyatakan, NDBI memakai SWIR/NIR. Pembagian nol/NoData menjadi missing, bukan nol indeks.
6. Sentinel-1 radar bukan sumber suhu. LST Landsat memakai produk termal level yang sesuai, scale/offset dan QA; jangan memakai RGB/brightness shader sebagai suhu.
7. Statistik luas kelas/mean dihitung dari piksel AOI valid dengan luas/georeferensi yang benar. Laporkan validPixelCount, validAreaKm2, coverageFraction berbasis luas piksel, akuisisi, resolusi, serta versi algoritma.
8. Produk asli, perhitungan DERIVED, impor, dan DEMO harus dibedakan pada peta/ekspor. Rilis feature nyata satu per satu setelah kontrak dan fixture ilmiahnya lolos.
9. Proses job boleh cancelled/failed/unavailable. Kemajuan persentase harus berasal dari tahap kerja, bukan timer yang mengaku sukses. Jangan menulis job tes ke storage pengguna.

### E. 3D dan pembelajaran dari God's Eye View

Pelajari repo `https://github.com/bilawalsidhu/gods-eye-view` dan salinan referensi lokal `D:\Blender\test 1\harmony-web-check\2026-10-03\gods-eye-view-reference`. Salinan yang diaudit berasal dari commit `e7707d9a0f34d9fbffc300023c319f95caa5be30`; bila repo berubah, catat commit yang dibaca.

- Pelajari viewer, registry source slot, normalisasi record, lifecycle layer, provider proxy, cache, traffic, dan styling. Jangan menyimpulkan kemampuan hanya dari video/tampilan.
- Thermal shader pada referensi adalah efek warna dari luminansi. Kendaraan animasi dapat tetap simulasi meski memakai traffic flow nyata. Radar regional NOAA tidak otomatis mencakup Indonesia. Pertahankan perbedaan ini.
- Cesium Harmony saat ini belum menerima layer hotspot dari parent dan belum berbagi semua AOI/layer/filter/time dengan 2D/Three.js. Sambungkan melalui shared snapshot, jangan polling tiap renderer secara terpisah.
- Pisahkan peta dasar, terrain, dan 3D Tiles. Terrain/gedung realistis memerlukan provider/lisensi/token/cakupan yang sesuai. Tanpa akses, tampilkan mode dasar yang sudah berfungsi; jangan memasukkan key fiktif.
- Patuhi lisensi referensi dan atribusi data. Copas kode berlisensi wajib mempertahankan kewajibannya; periksa LICENSE sebelum mengambil bagian.
- Globe Three.js masih membatasi sebagian marker yang dirender, misalnya gempa 40. Tampilkan jumlah data vs jumlah marker yang digambar, atau implementasikan clustering/LOD dengan pemilihan deterministik. Jangan kehilangan data mentah atau menampilkan klaim cakupan penuh karena canvas terlihat ramai.
- Jaga cleanup entity/material/texture/event listener/polling saat pindah mode. Kembali ke 2D harus membawa fokus wilayah; perubahan AOI, filter, dan ekspor tetap bekerja.
- Jalankan pemeriksaan produksi pada path/subpath deployment untuk Workers/Assets/Widgets. Build berhasil saja tidak membuktikan URL aset benar saat hosting.

### F. Traffic, aksesibilitas, terrain, dan modul lain

- Traffic koridor dan mobil bergerak masih simulasi. Tambahkan provider flow nyata melalui server bila akses tersedia, misalnya TomTom, dengan current/free-flow speed, confidence, waktu dan coverage. Jangan menyebut kecepatan setiap kendaraan real-time dari data agregat jalan.
- Tanpa key/coverage, tetap sediakan simulasi berlabel dan routing yang sudah berjalan. Jangan menghapus jaringan jalan atau sumber lama.
- Aksesibilitas radial bukan waktu tempuh jaringan. Pertahankan sebagai ESTIMATED; mode network menggunakan graph/routing engine, batas transportasi, snap titik, hambatan, dan speed assumption yang terdokumentasi.
- Inventaris fasilitas OSM/Overpass kosong tidak berarti tidak ada fasilitas. Coverage dan timestamp harus cukup sebelum menilai kategori; kategori missing tetap unknown. Semua kategori dalam radius estimasi tidak membuktikan wilayah memenuhi standar kota 15 menit.
- Terrain slope/aspect/watershed memerlukan DEM georeferensi yang nyata; elevasi satu titik tidak membuktikan profil raster/hidrologi wilayah. Jangan mengubah placeholder DEM menjadi hasil sukses.
- Hidrologi/fusion/emissions tetap mempertahankan menu dan rumus yang benar, dengan input nyata atau status DEMO/UNAVAILABLE. Pembobotan contoh bukan data assimilation tervalidasi; potensi emisi bukan inventaris aktual.
- Survey, drone dan katalog tetap mendukung impor/ekspor/form yang ada; katalog alat bukan koneksi langsung ke sensor tersebut.

## 6. Ramalan cuaca, awan, angin dan akurasi

Pengguna ingin cakupan luas dan ramalan lebih akurat. Jelaskan dan bangun arsitektur yang benar: model global/regional umumnya sudah mengasimilasi observasi; browser Harmony tidak harus mengunduh semua titik setiap negara untuk meramalkan satu lokasi. Jangan mengarang pengambilan seluruh dunia atau persamaan yang tidak benar-benar dijalankan.

- Inventaris semua model/provider lama; pertahankan masing-masing dan perbaiki adapter. Source yang dipasang, dicoba, berhasil, memiliki variabel valid, dan masuk perhitungan harus dihitung terpisah.
- Selaraskan lokasi/grid, waktu valid, waktu run model, lead time, zona waktu, satuan, dan cakupan. Timestamp bergerak bukan bukti run baru.
- Awan, kelembapan, hujan, tekanan dan angin hanya dipakai jika tersedia dan valid pada lokasi/waktu yang sesuai. Variabel missing tetap null. Angin perlu statistik vektor/circular yang sesuai; rata-rata 359° dan 1° tidak menjadi 180°.
- Jangan menambah hujan sintetis agar grafik terlihat berisi. Probabilitas hujan, akumulasi hujan dan intensitas adalah nilai berbeda.
- Ensemble/model weighting harus punya metodologi, daftar input yang benar-benar digunakan, perilaku saat model gagal, dan ketidakpastian. Banyak sumber tidak otomatis lebih akurat.
- Jawaban Gemini bukan pengukuran atau forecast resmi. Jangan mengganti nilai provider dengan angka buatan AI; pisahkan komentar AI dan hasil numerik tervalidasi.
- Akurasi diukur terhadap pengamatan independen dengan holdout waktu/lokasi. Gunakan MAE/RMSE untuk suhu, metrik angin yang sesuai, Brier/reliability untuk probabilitas hujan dan skill terhadap baseline. Laporkan sampel, periode, coverage dan keterbatasannya. Tanpa evaluasi, jangan tampilkan angka akurasi atau TERKALIBRASI/TERVERIFIKASI.

## 7. Rencana pelaksanaan dan perubahan yang diperbolehkan

Tahap 1: snapshot baseline + inventaris; perbaikan query-scoped status/cache, schema dan error. Tahap 2: adapter BMKG/FIRMS/STAC serta registry nyata. Tahap 3: satu pipeline raster AOI lengkap dan traffic/network bila akses tersedia. Tahap 4: shared snapshot 2D/3D, terrain/3D Tiles sesuai sumber, serta optimasi bundle. Tahap 5: pengujian regresi dan dokumentasi.

Tambahkan adapter, validator, worker/job, registry, typed snapshot, pagination, cache, pengujian bermakna, serta UI status. Ganti hanya handler/schema/label/asumsi yang terbukti salah. Hapus hanya import mati, listener/polling bocor, placeholder yang diganti implementasi nyata, klaim palsu, dan tombol duplikat setelah fungsi penggantinya teruji.

Jangan hapus menu/submenu, provider/model, storage pengguna, auth, ekspor, GPS/routing/AOI, atribusi, flag DEMO, error guard, atau data layer lain. Bila sumber diganti, dokumentasikan sebab, perbedaan coverage/latensi/lisensi, sumber baru, dan sumber lama yang tetap dirujuk. Jangan menaikkan jumlah sumber dengan menggandakan nama.

Performa: build terbaru masih menghasilkan chunk MapsView sekitar 8.4 MB dan Cesium sekitar 5 MB sebelum gzip. Telusuri dataset traffic/bundling, lazy load per domain, dan worker. Jangan memindahkan semua data ke initial bundle atau menghapus dataset untuk menyembunyikan masalah.

## 8. Pengujian wajib dan bukti penerimaan

Jalankan dan catat output serta exit code:

- `npm run typecheck`
- `npm run build`
- `node tests/weatherDataIntegrity.test.mjs` (baseline 16 kelompok)
- `node tests/recoveryFollowup.test.mjs` (baseline 11 kelompok)

Baca dulu suite `npm test`: sebagian geospatialCompletion melakukan operasi job/storage. Jalankan pada storage sementara terisolasi, bukan database/file pengguna. Jangan mengganti assertion agar kode salah menjadi lolos.

Tambahkan tes sesuai perubahan: HTTP 200 HTML/null/schema salah; angka nol; string angka tidak valid; koordinat kutub/garis tanggal; tanggal invalid; valid empty vs all invalid; sumber partial/all failed; respons lama setelah pindah AOI; cancelled tanpa provider failure; cache original time; query lain tidak mengubah audit; cloud unknown; NoData/QA; pagination; assets bukan COG; raster window/mask/scale; provider quota dan missing credentials.

Browser: buka seluruh 15 menu dan subtab terkait perubahan; tombol panel/GPS/routing/AOI/layer/ekspor; chart sesuai tipe; impor invalid tidak crash; refresh gagal tidak LIVE; 2D ↔ Three.js ↔ Cesium; layer/filter/fokus tersinkron; desktop/mobile; cleanup beberapa siklus; runtime build produksi. Tidak cukup hanya memastikan tombol terlihat.

Tes gagal harus memakai fixture terkontrol dan menguji produksi normalizer/adapter, bukan salinan rumus terpisah. Live request diizinkan untuk pemeriksaan baca dengan batas rate; jangan mengaku live lulus dari fixture. Simpan evidence yang tidak mengandung key/token.

## 9. Hasil akhir yang harus diberikan

1. Rencana awal dan file/fungsi yang akan disentuh.
2. Daftar masalah yang ditemukan saat ini, bukan hanya dari prompt lama.
3. Diff terarah: yang ditambah, diperbaiki, dihapus beserta alasan dan fungsi yang dilindungi.
4. Inventaris 15 menu serta sumber/model/dataset sebelum/sesudah; status operasional, belum configured, belum connected, partial, dan belum tested.
5. Laporan gate, screenshot/error network yang relevan, exit code, dan batas pengujian.
6. Langkah konfigurasi sumber yang masih diperlukan, tanpa contoh key palsu atau membocorkan isi .env.
7. Daftar pekerjaan tersisa yang jujur. Jangan menyebut semua berfungsi, data dunia lengkap, atau ramalan akurat sebelum bukti mendukung.

## 10. Sumber primer yang perlu diverifikasi sebelum integrasi

- [NASA FIRMS Area API](https://firms2.modaps.eosdis.nasa.gov/api/area/) — batas request 1–5 hari, sumber produk, kalender akuisisi, bbox dan key.
- [CesiumJS Quickstart](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/) — runtime static assets, base URL, viewer dan Ion.
- [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) — pelajari implementasi, commit dan lisensinya.
- [Data Terbuka BMKG](https://data.bmkg.go.id/) — produk resmi dan format/cakupan yang tersedia.
- [USGS earthquake feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) — schema GeoJSON dan jendela feed.
- [Element84 Earth Search](https://earth-search.aws.element84.com/v1) — koleksi aktual dan STAC metadata.
- [Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/docs/) — katalog dan akses asset/signing.
- [TomTom Traffic API](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction) — flow, coverage dan akses provider.

Periksa ulang dokumentasi aktual; jangan menggunakan daftar tautan ini sebagai bukti bahwa semua layanan sudah terhubung.
