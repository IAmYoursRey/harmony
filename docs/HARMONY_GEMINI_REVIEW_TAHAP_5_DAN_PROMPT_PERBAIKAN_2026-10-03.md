# Harmony — Review remediasi tahap 4 dan prompt perbaikan tahap 5

Tanggal pemeriksaan: 3 Oktober 2026. Proyek: `D:/vscode/Harmony`.

## 1. Kesimpulan

**Ada kemajuan, tetapi aliran data LST belum pulih sepenuhnya.** Handler sekarang benar-benar meminta file thermal dan QA. Generator suhu dari koordinat sudah tidak digunakan pada jalur scene operasional yang diperiksa. Akan tetapi, pembaca raster baru masih dapat mengubah isi file menjadi suhu yang salah dan memberikan status `DERIVED`.

Bukti terkuat berasal dari file TIFF yang dibuat dengan Pillow, bukan pembuat fixture milik decoder Harmony. Semua piksel thermal dalam file bernilai DN 45000. Dengan persamaan skala Landsat Collection 2 Surface Temperature, nilainya sekitar **29,66°C**. Decoder Harmony membaca file big-endian sebagai DN 51375 dan menghasilkan **51,45°C**. Browser lokal juga menampilkan hasil salah tersebut sebagai `DERIVED`. Rumus skala ST adalah `Kelvin = DN × 0.00341802 + 149`, lalu dikurangi 273,15 untuk Celsius. [Dokumentasi skala USGS](https://www.usgs.gov/faqs/how-do-i-use-a-scale-factor-landsat-level-2-science-products).

Ini merupakan pengujian integritas software memakai **fixture**, bukan hasil pengamatan suhu suatu wilayah. Temuan tersebut tidak menunjukkan bahwa seluruh data sumber eksternal salah; masalahnya ada pada pembacaan dan pengolahan lokal.

Review ini membaca dan menguji aplikasi serta membuat dokumen/evidence baru. Reviewer tidak mengedit kode aplikasi, menyimpan job analisis pengguna, memasang dependency, atau melakukan deployment.

## 2. Perbaikan yang sudah masuk dan perlu dipertahankan

- Scene tanpa asset thermal/QA yang dibutuhkan ditolak dengan alasan ketidaktersediaan.
- Handler LST meminta kedua asset dan menolak respons HTTP gagal pada kasus yang diuji.
- Preset optik tidak lagi melewati guard thermal; demo thermal tetap terpisah dan berlabel demonstrasi.
- Identitas Landsat 7 tidak lagi otomatis diberi nama Landsat 9 pada kasus regression suite.
- Identitas request traffic sekarang membedakan dua request berulang untuk koridor yang sama. Namun, penyimpanannya masih global.
- Traffic menolak confidence di luar rentang, roadClosure dengan tipe salah, dan array geometri kosong. Namun, field yang hilang masih lolos.
- Guard kepemilikan cache menangani late failure/late abort pada regression suite yang dijalankan.
- Normalisasi header record, `Headers`, dan tuple lulus regression suite.
- Kegagalan refresh metadata radar sekarang menandai state stale. Namun, metadata/path belum cukup untuk membuktikan tile berhasil dirender.
- Laporan Gemini terbaru sudah menyebut penyebab 404 sebagai hipotesis, bukan kepastian.

## 3. Temuan yang masih terbukti

### A. Pembacaan raster dan kualitas hasil

File utama: `apps/web/src/services/geospatial/rasterReaderService.ts`.

| Prioritas | Kasus | Hasil aktual | Hasil yang diperlukan |
|---|---|---|---|
| P0 | TIFF little-endian tanpa kompresi, DN 45000 | 29,66°C, `DERIVED` | Kasus kontrol ini sudah benar |
| P0 | TIFF big-endian, DN 45000 | DN terbaca 51375; 51,45°C, `DERIVED` | Byte order dibaca sesuai file; hasil tetap 29,66°C |
| P0 | TIFF Deflate, DN 45000 | Byte terkompresi dibaca sebagai sampel; rata-rata 3,23°C, `DERIVED` | Decompress raster terlebih dahulu; format tak didukung ditolak |
| P0 | QA tidak mencakup area thermal | Nilai di luar raster diubah menjadi 0; 36 sampel dianggap valid, `DERIVED` | QA di luar cakupan harus unknown/invalid, bukan clear |
| P0 | QA dengan GDAL NoData 64 | Nilai NoData diterima sebagai QA clear; `DERIVED` | NoData dibedakan dari nilai QA yang benar-benar tersedia |
| P1 | Raster ber-CRS EPSG:32649 | Metadata CRS diabaikan; koordinat derajat dipakai pada grid meter; semua pembacaan nol | Transformasi AOI WGS84 ke CRS raster sebelum akses piksel |
| P1 | File tanpa georeferensi | Origin 0,0 dan skala 0,0003 derajat diberikan otomatis | Georeferensi tidak boleh dibuat diam-diam |
| P1 | AOI lebih kecil dari satu piksel | Titik grid mengakses piksel yang sama 49 kali; dilaporkan 49 piksel dan 0,04 km² | Hitung piksel sumber unik dan luas irisan sebenarnya |
| P1 | Urutan asset QA_RADSAT sebelum QA_PIXEL | `findQaAsset` memilih QA_RADSAT | Pilih QA_PIXEL sesuai kontrak produk; QA_RADSAT memiliki fungsi berbeda |
| P1 | Thumbnail thermal sebelum asset lwir11 | `findThermalAsset` memilih PNG thumbnail | Pilih asset data ST yang benar; preview tidak digunakan sebagai raster analisis |

`readPixelAt` sekitar baris 183 selalu memakai little-endian untuk sampel 16/32 bit. Metadata `compression` dibaca, tetapi tidak ada decompression sebelum membaca sampel. Di luar raster dan di luar buffer, fungsi mengembalikan angka 0. `sampleWindow` sekitar baris 218 tidak membaca CRS dan tidak menyimpan identitas row/col piksel sumber.

Temuan tambahan dari pembacaan kode, **belum direproduksi sebagai fixture terpisah**:

- Tag tile offsets/byte counts tidak diproses. Decoder mengandalkan strip offsets dan memakai offset 0 apabila strip tidak tersedia.
- Pointer array SHORT/LONG multistrip belum diikuti dengan benar. Type/sample format dan predictor belum ditangani.
- Tidak ada dukungan transform matrix/rotasi grid yang eksplisit.
- `lstService.ts` memakai luas piksel tetap 0,0009 km² untuk non-MODIS dan provenance CRS EPSG:4326, terlepas dari georeferensi file.
- Statistik berasal dari grid 7 × 7 titik; belum membuktikan statistik seluruh piksel AOI.

Karena itu, klaim dukungan penuh COG, kecocokan QA, dan pemotongan polygon presisi pada laporan/antarmuka belum didukung implementasi yang diperiksa. CRS dan raster-to-model transform merupakan bagian dari georeferensi GeoTIFF, bukan informasi yang bisa digantikan tiepoint derajat untuk semua file. [Standar GeoTIFF OGC](https://docs.ogc.org/is/19-008r4/19-008r4.html).

QA_PIXEL dan QA_RADSAT adalah band berbeda dalam produk Landsat; substring `qa` tidak cukup untuk menentukan mask awan/fill. [Dokumentasi QA USGS](https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands).

### B. Lifecycle LST

File: `apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`, terutama baris 345–463.

1. `handleRunLSTAnalysis` bukan fungsi async yang menunggu `Promise.all`. `finally` langsung memanggil `setIsProcessingLST(false)`, sementara dua fetch masih pending. Reproduksi mencatat loading `[true, false]` sebelum respons tersedia.
2. Saat sedang mengakses asset, envelope justru berisi `processingState: 'failed'` dan `ASSET_ACCESS_FAILED`. Status ini bukan representasi kegiatan yang sedang berjalan.
3. Reset scene/AOI hanya membersihkan state. Request LST tidak dibatalkan dan tidak memiliki generation/context guard. Reproduksi menjalankan request lama, mengosongkan scene hingga `NO_SCENE_SELECTED`, lalu melepas respons lama. Hasil akhirnya kembali `DERIVED` dengan ID scene lama.
4. Handler langsung fetch href asset; signer Planetary Computer yang sudah ada tidak terhubung pada jalur ini. Belum dibuktikan bahwa token pengguna kedaluwarsa. Yang terbukti adalah signer tidak dipanggil oleh handler tersebut.
5. Seluruh file thermal dan QA dibaca melalui `arrayBuffer()` tanpa batas ukuran/window/deadline pada handler. Ini berbeda dari pembacaan window AOI pada COG.
6. Tanggal pengamatan kosong diganti tanggal tetap 1 Oktober 2026. Provenance harus menyimpan unknown atau menolak metadata yang diwajibkan, bukan membuat waktu pengamatan.

### C. Traffic dan radar

File: `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`.

- Sekitar baris 574–600, confidence, roadClosure dan coordinates yang `undefined`/`null` diterima oleh validator. Payload fixture hanya berisi dua angka kecepatan menghasilkan `LIVE`, confidence null dan roadClosure false. UI dapat menyebut jalan terbuka padahal status penutupan tidak tersedia. Ini counterexample kontrak frontend; review tidak menyatakan upstream TomTom nyata telah mengirim payload fixture tersebut.
- Sequence request masih disimpan pada `globalThis.__harmony_traffic_seq` dan global active request. Identitas untuk request pada satu instance sudah lebih baik; isolasi antar-instance/unmount belum ada.
- Sekitar baris 3936, hanya event `tileloaderror` yang dicatat. Tidak ada penghitung `tileloadend`. Sekitar baris 4018, keberadaan `rainviewerPath` dapat menghasilkan `LIVE RADAR` sebelum ada bukti tile sukses.
- Semua tile gagal tetap menjadi `PARSIAL`; status belum membedakan tidak ada tile yang sukses dari sebagian tile sukses.
- Callback metadata menganggap objek kosong sebagai metadata valid dan menghapus stale flag tanpa mewajibkan frame/path/time yang valid. Path/frame lama bisa tetap tersimpan.

Poin radar di atas berasal dari pemeriksaan kode status, bukan uji browser dengan semua tile gagal pada review ini.

## 4. Verifikasi dan batas pemeriksaan

- **111 kelompok/kasus uji lulus** dari sembilan suite terarah; seluruh exit code 0.
- TypeScript typecheck: exit code 0.
- Suite: weatherDataIntegrity 16; monitoringSnapshot 9; recoveryFollowup 12; geminiReviewIntegrity 12; auditRemediationReproductions 10; evidence14Reproductions 14; evidenceCurrent14 14; evidenceStage3 11; evidenceStage4 13.
- **13 reproduksi tambahan**, termasuk satu kasus kontrol yang benar, melalui decoder/service dan handler yang diambil dari kode saat ini.
- Uji Edge lokal: pencarian/pemilihan STAC fixture → fetch dua TIFF independen → analisis → ekspor envelope. Nilai aktual 51,45°C, `DERIVED`, dibanding nilai fixture 29,66°C. Tidak ada uncaught page error pada alur tersebut.
- File fixture dibuat dengan encoder Pillow dan dibaca ulang dengan Pillow untuk memeriksa nilai DN, bukan dibuat oleh `GeoTiffParser.createTestGeoTiffBuffer`.
- Probe publik terbaru: cuaca HTTP 200 JSON `success:true`; traffic dan hotspots HTTP 404 HTML. HTTP 200 ini hanya hasil pemeriksaan endpoint cuaca, bukan validasi akurasi ramalan.
- Tidak menjalankan ulang seluruh `npm test`, production build, seluruh menu, semua provider/negara, atau pengamatan satelit nyata. Test yang menyimpan job tidak dijalankan terhadap data pengguna.
- Tidak ada bukti bahwa key TomTom/FIRMS kedaluwarsa. 404 HTML tidak membuktikan status kredensial upstream. Diagnosis mapping deployment membutuhkan manifest/build/log atau identitas deployment yang sesuai.
- Kelulusan suite tidak sama dengan validasi numerik decoder ataupun validasi akurasi model.

### Evidence baru

- [Reproduksi dan probe publik](<D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/evidence-stage5.json>)
- [Hasil browser](<D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/browser-stage5.json>)
- [Suite dan typecheck](<D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/verification-summary.json>)
- [Metadata fixture independen](<D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/independent-fixtures.json>)
- Runner reproduksi: `D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/reproduce-stage5.mjs`.
- Runner browser: `D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/check-browser-stage5.mjs`.

---

## PROMPT UNTUK GEMINI — salin mulai bagian ini

Perbaiki Harmony di `D:/vscode/Harmony` berdasarkan review tahap 5 ini. Fokus aplikasi web dan integritas aliran data. Baca kode terbaru dan evidence sebelum mengedit. Tugasmu membuat rencana per file, mengimplementasikan perbaikan, lalu memverifikasi hasilnya. Jangan hanya menulis laporan atau mengubah label status.

Perbaikan tahap 4 sudah menghapus jalur LST sintetis operasional dan mulai fetch raster. Pertahankan hasil itu. Namun, decoder baru masih menghasilkan suhu salah pada big-endian dan TIFF terkompresi, menerima QA yang tidak tersedia, serta membiarkan request lama menimpa konteks baru. Selesaikan alur nyata sampai hasilnya benar secara numerik dan spasial.

### A. Batas pekerjaan dan bagian yang wajib dipertahankan

1. Periksa instruksi proyek dan git status. Working tree memuat banyak pekerjaan pengguna yang belum di-commit. Jangan reset/clean/checkout massal, mengembalikan keseluruhan MapsView ke versi lama, atau menimpa file besar tanpa diff terarah.
2. Pertahankan semua 15 menu Studio, sumber/provider yang telah diintegrasikan, mode 2D/3D/Cesium, katalog alat, topografi, GNSS, hidrologi, gempa, FIRMS, cuaca, lalu lintas, analisis, ekspor dan pengelompokan kontrol dalam panel pengaturan.
3. Pertahankan perbaikan cache ownership/generation, normalisasi header, mask cirrus, guard scene kosong/optik, signer AbortError, isolasi DEMO, serta ekspor GeoJSON/JSON terpisah.
4. Nama menu umum tetap **Peta Cuaca**. Atribusi sumber tetap jelas. Jangan menambah tombol mengambang duplikat atau merombak visual/menu yang sudah rapi untuk mengatasi decoder.
5. Jangan mengurangi jumlah sumber untuk membuat tes atau audit tampak berhasil. Sumber gagal tetap tercatat dengan status dan alasan. Jika API berubah, perbaiki adapter atau tambahkan pengganti sah dengan identitas produk yang benar; jangan menyamakan produk berbeda.
6. Jangan mengubah PPT, esai, file evidence reviewer, atau assertion lama supaya cocok dengan output salah. Buat regression tests dan evidence baru. Perubahan test lama hanya boleh memperbaiki harness/kontrak yang benar, dengan alasan dan diff yang jelas.
7. Jangan menggunakan data buatan, default cuaca, QA clear buatan, angka random/sinus, tanggal tetap, atau fallback angka nol untuk menandai sumber operasional berhasil.
8. Jangan melakukan deployment dalam tugas ini. Siapkan konfigurasi/perbaikan yang dapat direview dan jelaskan status publik apa adanya. Kredensial/token tidak boleh muncul dalam log, screenshot, ekspor atau source publik.

### B. P0 — ganti decoder yang salah dengan pembacaan GeoTIFF/COG yang benar

File utama:

- `apps/web/src/services/geospatial/rasterReaderService.ts`
- `apps/web/src/services/geospatial/lstService.ts`
- `apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`
- `apps/web/src/services/geospatial/stacService.ts`
- Worker/adapter pembacaan raster yang benar-benar diperlukan.

**Diagnosis:** `readPixelAt` memakai little-endian tetap; byte compression tidak didecode; CRS/NoData/tile metadata diabaikan; read di luar raster menghasilkan 0; georeferensi kosong diberi default.

**Implementasi yang diperlukan:**

1. Gunakan decoder GeoTIFF yang sudah mendukung struktur file, compression dan tile/strip dengan baik, misalnya geotiff.js setelah memeriksa dokumentasi resmi dan kompatibilitas proyek. Gunakan proj4 yang sudah ada untuk transformasi yang diperlukan. Jangan menganggap decoder raster otomatis melakukan semua transformasi CRS. Alternatif backend boleh dipilih bila lebih sesuai, tetapi pertahankan kontrak frontend. [Dokumentasi resmi geotiff.js](https://github.com/geotiffjs/geotiff.js).
2. Dukung minimal little/big-endian, compression yang digunakan asset provider aktif, tiled COG dan multistrip, predictor, jumlah band/samples, serta sample format yang relevan. Jika suatu format tidak didukung, keluarkan `UNSUPPORTED_RASTER_FORMAT` dengan hasil angka null. Jangan membaca header/compressed bytes sebagai DN.
3. Validasi dimensi, metadata, offset, panjang buffer dan konsistensi layout. File truncated/malformed tidak boleh lolos karena loop parsing berhenti lalu memakai default.
4. Baca CRS dari GeoKeys/metadata produk yang sah; simpan asal penentuannya. Baca affine transform atau ModelTransformation dan semantik PixelIsArea/PixelIsPoint. Bila CRS/georeferensi tidak tersedia atau bertentangan, keluarkan alasan terstruktur, bukan origin/resolusi rekaan.
5. Transformasikan AOI WGS84 ke CRS raster. Tentukan pixel window menggunakan inverse transform. Jangan memakai longitude/latitude derajat langsung pada grid UTM bermeter.
6. Batasi window terhadap ukuran raster, potong menurut Polygon/MultiPolygon dan holes AOI. Jika hanya sampling bbox yang tersedia, labeli sebagai sampling bbox dan jangan klaim clipping polygon presisi.
7. Baca blok/window yang diperlukan. Gunakan HTTP Range bila provider mendukung; jika server mengembalikan 200 full-file, batasi byte/ukuran dan hentikan pembacaan bila melebihi budget. Tetapkan deadline, abort dan batas memori untuk thermal + QA secara gabungan. Jangan mengunduh dua scene penuh tanpa batas melalui `arrayBuffer()`.
8. Proses decode/statistik berat di worker atau backend agar UI responsif. Pemilihan resolusi/overview harus dicatat. QA bitmask wajib tetap kategorikal, bukan hasil interpolasi bilinear.
9. API pembaca piksel harus dapat mengembalikan nilai invalid/unknown dan alasan. `0` adalah nilai numerik yang harus ditafsirkan menurut produk, bukan pengganti kegagalan/OOB/NoData.
10. Metadata sukses menyimpan byte order, compression, CRS, transform, resolusi, ukuran grid, sample format, band, NoData dan window yang dibaca. Jangan menyimpan URL bertoken dalam provenance.

**Acceptance:** fixture independen thermal little-endian, big-endian, Deflate dan format compression/tiled provider harus menghasilkan DN 45000 dan sekitar 29,6609°C sebelum pembulatan. Toleransi harus ditetapkan terhadap nilai referensi. Menolak big-endian/compression dengan jujur adalah pengamanan sementara, tetapi tidak cukup untuk menyatakan dukungan raster provider sudah selesai.

### C. P0 — pilih produk thermal dan QA yang benar

1. Ganti substring matcher dengan adapter per collection/provider/processing level. Cocokkan exact semantic asset key dan metadata band/roles/media type; urutan Object.entries tidak menentukan pilihan.
2. Untuk Landsat C2 L2 pilih produk Surface Temperature yang benar bagi sensor/platform. Jangan memperlakukan raw B10, radiance/brightness temperature, preview PNG atau band optical sebagai ST hanya karena key mengandung `thermal`/`b10`.
3. QA_PIXEL untuk mask kondisi piksel; QA_RADSAT untuk saturasi dengan aturan masing-masing sensor; ST_QA untuk informasi ketidakpastian bila tersedia. Ketiganya tidak saling menggantikan. Pertahankan semua asset dan tampilkan kegunaannya.
4. Pastikan thermal dan QA berasal dari scene yang sama dan memiliki overlap spasial. Jika grid/CRS berbeda, resample/alignment QA nearest-neighbour secara eksplisit atau tolak dengan alasan. Periksa NoData masing-masing raster.
5. QA OOB, decode gagal, NoData atau tidak tersedia harus unknown. Jangan mengisinya 0/clear. Nilai QA 0 yang benar-benar dibaca harus tetap dibedakan dari ketidaktersediaan; tafsir akhir mengikuti dokumentasi produk.
6. Pertahankan aturan fill/dilated cloud/cirrus/cloud/shadow per sensor. Jangan menerapkan bit Landsat 8/9 begitu saja pada sensor dengan definisi berbeda. Catat excluded pixel counts menurut alasan.
7. Bila ada sebagian piksel tanpa QA, keluarkan dari statistik terverifikasi dan catat keterbatasannya. Bila tidak ada piksel yang memenuhi kontrak, `UNAVAILABLE`, angka suhu null; jangan membuat area clear buatan.
8. Metadata scene yang wajib hilang, termasuk waktu pengamatan, tidak boleh diganti tanggal tetap. Identitas satellite, sensor, dataset, provider/catalog dan processing level harus berasal dari metadata yang tervalidasi.

**Acceptance:** asset dictionary dengan QA_RADSAT sebelum QA_PIXEL tetap memilih QA_PIXEL; thermal thumbnail sebelum lwir11 tetap memilih asset ST yang sah. QA di luar cakupan/NoData tidak menambah validPixelCount. Ada test scene sensor berbeda dan produk non-ST.

### D. P1 — statistik, luas, coverage dan provenance

1. Simpan identitas piksel sumber: scene, band, row/col atau tile+offset, dan window/resolusi. Deduplicate menurut identitas ini, bukan kesamaan nilai DN. Dua piksel berbeda boleh bernilai suhu sama.
2. Bedakan jumlah titik sampling, jumlah piksel sumber unik, jumlah piksel valid, area AOI, area overlap dan area valid.
3. Grid 49 titik bukan 49 piksel sumber unik, apalagi bukti statistik seluruh AOI. Untuk sampling, namai output sebagai statistik sampel dengan metode/budget yang jelas. Jangan menyamakan rasio sampel valid dengan persentase luas cakupan.
4. Luas dihitung dari georeferensi dan irisan AOI. CRS geografis memerlukan perhitungan area yang sesuai, bukan perkalian konstanta 30 m. Jangan memakai provenance EPSG:4326 untuk semua sumber.
5. Terapkan skala/offset/satuan menurut produk. Landsat L2 ST tidak diberi koreksi emisivitas tambahan seolah inputnya radiance mentah. Bedakan suhu permukaan dari suhu udara 2 m. Hindari rounding per-pixel terlalu awal sebelum statistik bila menyebabkan bias.
6. Histogram, kategori panas, simpangan baku dan skor lanjutan mengikuti piksel yang benar-benar lolos mask. Skor UHI yang membutuhkan area pembanding tidak boleh dipastikan dari statistik tunggal yang belum memenuhi syarat.
7. Provenance mencatat acquisition time, retrieval time, actual provider/catalog, asset identifier aman, raster CRS, resolusi, scale/offset, QA policy, sampling/aggregation method, excluded counts dan batas hasil.
8. Selaraskan teks UI: setelah asset dibaca jangan tetap menyatakan raster belum terhubung; saat belum dibaca jangan mengklaim clipping polygon presisi/kalibrasi lengkap. Jelaskan L2 ST sebagai konversi produk ST menurut skala sumber apabila itulah proses lokal yang dilakukan.

**Acceptance:** AOI yang lebih kecil dari satu piksel tidak menghasilkan 49 piksel sumber unik atau luas 0,04 km² dari hitungan duplikat. Polygon dengan hole menolak piksel di hole. Nilai coverage/area memiliki denominator/metode yang dapat diperiksa.

### E. P0 — lifecycle request LST dan status pemrosesan

1. Ubah handler menjadi async dan await pipeline hingga selesai. `finally` hanya menonaktifkan loading bila request tersebut masih pemilik state aktif.
2. Gunakan AbortController dan generation/requestId yang tersimpan pada instance komponen, ditambah context key sceneId + AOI hash + parameter hash. Tangkap snapshot input pada awal request.
3. Saat scene/AOI/lokasi/collection/parameter berubah, saat pengguna membatalkan, atau komponen unmount: batalkan request lama dan worker; naikkan generation. Semua callback state, termasuk catch/finally, memeriksa kepemilikan.
4. Abort adalah pembatalan, bukan kegagalan sumber baru. Hasil lama tidak boleh mengisi envelope konteks baru atau menonaktifkan spinner request baru.
5. Pisahkan processing state dari kualitas data. Gunakan state loading/reading/decoding/masking/complete/failed/cancelled yang cocok dengan tipe proyek. Selama pending, angka null dan pesan proses; jangan menetapkan `failed`/`ASSET_ACCESS_FAILED` sebelum failure terjadi.
6. Catat alasan tahap yang benar: HTTP failure, signing/auth failure, raster decode, unsupported format, CRS missing, QA coverage, no valid pixels. Jangan menyatukan seluruh error menjadi kegagalan download.
7. Cegah klik ganda yang tidak sengaja atau jalankan aturan latest request wins secara jelas. Tidak boleh ada request tanpa konteks dan cleanup.

**Acceptance:** delayed asset fetch membuat loading tetap aktif sampai selesai. Mulai scene A, ganti ke B/kosong, lepas respons A: envelope tetap milik B/kosong. Ulangi untuk AOI berubah, dua request scene sama, abort, error lama, dan unmount.

### F. P1 — signing, akses provider dan kredensial

1. Hubungkan `stacService.signAssetUrl` pada asset Planetary Computer/Azure yang memerlukannya. Jangan signer semua asset public provider lain tanpa kebutuhan.
2. signing→range/read→decode→mask→stats merupakan satu request context dan deadline. Abort tidak boleh mengembalikan URL asal sebagai fallback sukses.
3. Jika SAS expired, renew/sign ulang secara terbatas lalu ulangi request yang aman. Jangan retry tanpa batas. Bedakan 401/403, timeout, CORS, 404, rate limit dan payload invalid.
4. Jangan menyimpulkan key expired hanya dari jaringan gagal atau 404 HTML. `NOT_CONFIGURED` hanya saat konfigurasi server benar-benar tidak ada. `AUTH_FAILED`/expired membutuhkan respons/bukti provider yang sesuai.
5. Kunci privat tetap server-side. SAS sementara digunakan hanya dalam memori untuk akses data; sanitasi ekspor/log. Bila perlu proxy, gunakan adapter terbatas ke provider yang dikenal, bukan proxy URL bebas.
6. Pertahankan katalog/provider walau satu jalur gagal. Tampilkan attempt dan keterbatasan sumbernya; fallback alternatif tidak boleh diam-diam memakai scene/dataset berbeda untuk angka yang diberi identitas scene pertama.

### G. P1 — tutup celah kontrak dan lifecycle traffic

1. Validasi payload dengan schema bersama frontend/backend bila memungkinkan. Selaraskan field wajib terhadap kontrak TomTom yang memang dipakai aplikasi, termasuk finite nonnegative speeds, confidence 0–1, roadClosure boolean dan geometri koordinat valid.
2. Missing/null field wajib bukan nilai valid. Jangan default roadClosure unknown menjadi false atau menampilkan `Terbuka`. Jika kontrak mendukung field opsional, tampilkan `tidak tersedia` dan status keterbatasan yang benar; jangan menyebutnya kontrak lengkap.
3. Validasi struktur/tipe/rentang koordinat, bukan hanya panjang array. Simpan source, fetchedAt/data time yang tersedia dan TTL. Timestamp retrieval tidak boleh diklaim sebagai waktu pengamatan provider.
4. Tetap terima speed 0, confidence 0 dan roadClosure false yang benar-benar hadir. Null/undefined berbeda dari nol/false.
5. Ganti globalThis active request/sequence dengan ref/state per instance. Batalkan/abaikan respons setelah koridor berubah/unmount. Pertahankan regression guard dua request koridor sama.
6. Simulasi koridor tetap dapat digunakan sebagai demonstrasi berlabel jelas, terpisah dari flow TomTom. Jangan menghapus peta jalan atau sumber simulasi untuk menutupi error live.

**Acceptance:** payload dua kecepatan saja tidak menjadi `LIVE`/jalan terbuka. Tambahkan test missing/null confidence, missing roadClosure/geometry, coordinate invalid, nol valid, same-corridor race dan isolasi dua instance.

### H. P1 — status radar mengikuti tile dan metadata yang benar-benar tersedia

1. Validasi feed: host/path/frame time sesuai format, frame dalam rentang waktu yang masuk akal, dan daftar kosong dibedakan dari refresh valid. Metadata `{}` tidak menghapus stale flag sambil menyisakan path lama seolah baru berhasil.
2. Track tileloadstart/tileloadend/tileloaderror per layer/frame/request context, disertai cleanup event listener. Gunakan tile relevan untuk viewport; cegah double-count event dan event layer lama.
3. Sebelum ada tile sukses: `MEMUAT`, bukan `LIVE RADAR`. Sebagian tile sukses dan sebagian gagal: `PARSIAL`. Semua tile yang selesai gagal tanpa tile sukses: `UNAVAILABLE`. Tidak ada permintaan tile bukan bukti sukses atau kegagalan.
4. Frame lama yang masih ditampilkan saat refresh gagal: `STALE`, simpan waktu sumber asli dan alasan. Jika tidak ada frame/data lama, `UNAVAILABLE`. Prioritas label dan detail harus tetap menjelaskan jika ada dua keterbatasan sekaligus.
5. Reset error/count pada frame baru dengan identitas layer yang benar. Jangan label PARSIAL melekat selamanya setelah satu error lama; pemulihan memerlukan tile baru yang terverifikasi.
6. Batas age/deadline dievaluasi seiring waktu, bukan hanya ketika kebetulan render. Tambahkan timeout metadata. Atribusi radar mosaic tidak boleh mengklaim observasi langsung BMKG atau produk Doppler yang tidak terhubung.
7. Pertahankan auto-switch parameter Windy dan header dinamis yang sudah diperbaiki. Model iframe tetap dilabeli model; iframe terbuka bukan bukti numeric ingestion Harmony.

**Acceptance:** metadata valid dengan semua tile pending belum LIVE; metadata valid tetapi semua tile gagal UNAVAILABLE; sebagian sukses PARSIAL; empty/malformed refresh tidak membuat data lama fresh; recovery/frame switch tidak menerima event lama.

### I. P1 — endpoint publik dan bukti deployment

Pada pemeriksaan 3 Oktober 2026, `/api/spatial/weather/current` mengembalikan 200 JSON, sedangkan `/api/spatial/traffic/flow` dan `/api/spatial/hotspots` mengembalikan 404 HTML.

1. Telusuri route lokal, base URL frontend, konfigurasi Vercel/function/rewrite, bundle yang diproduksi, serta catch-all SPA. Perbaiki mapping yang benar-benar salah bila ada.
2. Bedakan route tidak termapping, route lokal tidak terdaftar, deployment belum sinkron, konfigurasi provider kosong dan upstream failure. Tulis mana bukti, mana hipotesis.
3. Probe lokal valid dan invalid; sukses memakai fixture diberi label fixture. Jangan mengartikan route lokal lulus sebagai endpoint publik sudah pulih.
4. Jangan melakukan deploy atau membuat respons 200/success:true palsu untuk menutupi 404. Bila belum dapat memeriksa cloud, laporkan kebutuhan identitas deployment/log dan keterbatasannya secara spesifik.

### J. Urutan kerja dan verifikasi yang wajib

1. Inventarisasi diff serta kontrak yang disentuh. Buat rencana file/perbaikan sebelum mengedit. Prioritaskan decoder, QA dan lifecycle LST; lanjutkan traffic/radar dan mapping API.
2. Tambahkan reproduksi independen yang gagal pada kode awal. Jangan hanya menambah fixture melalui decoder/writer yang sama lalu menyatakan dukungan nyata terbukti.
3. Gunakan evidence di `D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review/` sebagai masukan read-only. Runner AST reviewer mungkin membutuhkan harness baru setelah refactor; jangan mengubah evidence lama agar hasilnya menjadi resolved.
4. Buat suite baru `tests/evidenceStage5.test.mjs` atau nama konsisten lain. Cover decoder II/MM, Deflate dan format provider/tile/multistrip, CRS geographic/projected, NoData thermal/QA, OOB QA, missing georeference, wrong assets, unique pixel/area, AOI holes, delayed fetch/cancel/race, field traffic hilang, tile loading/failure/recovery.
5. Sertakan positive path end-to-end: scene fixture → asset fetch → decoder nyata → alignment QA → mask → ST → statistik → UI dan ekspor. Periksa expected angka, bukan hanya status/kata `DERIVED`.
6. Sertakan satu smoke path asset provider nyata bila akses tersedia. Catat collection/item, format file, CRS, compression, window, expected reference dan waktu. Jika akses tidak tersedia, laporkan belum terverifikasi; fixture tidak boleh diberi label observasi nyata.
7. Jalankan sembilan regression suite yang sebelumnya lulus, typecheck dan production build. Jalankan full suite hanya pada penyimpanan/data uji terisolasi apabila ada test yang menulis job. Jangan merusak data pengguna demi jumlah tes.
8. Uji browser desktop dan ponsel pada alur yang berubah. Periksa nilai, status proses, perubahan konteks, export provenance, error dan menu yang tetap dapat digunakan. Screenshot tanpa angka/state yang relevan bukan bukti numeric integrity.
9. Simpan evidence baru dengan command/exit code, scope, fixture vs live, expected vs actual dan keterbatasan. Jumlah pass dihitung dari output, bukan ditulis manual sebagai klaim keseluruhan aplikasi.

### K. Hasil akhir yang harus kamu serahkan

- Daftar file yang ditambah/diubah/dihapus serta fungsi tiap perubahan. Menghapus decoder lama hanya boleh setelah penggantinya terhubung dan fungsi publik/fitur penting tetap tersedia.
- Ringkasan alur STAC → akses/signing → window/CRS → decode → QA → statistik → UI/provenance/export.
- Tabel masalah awal, expected, actual setelah perbaikan, test/evidence, dan status resolved/partial/unverified.
- Daftar sumber/provider dan menu yang dipertahankan, termasuk integrasi yang belum tersedia beserta alasan.
- Hasil regression, typecheck, build, browser dan akses provider nyata secara terpisah.
- Status endpoint publik dan diagnosis dengan bukti, bukan janji deployment telah pulih.
- Pekerjaan tersisa, jika ada. Jangan menyatakan “integritas pulih sepenuhnya” ketika format provider, QA, angka atau alur race belum teruji.

Selesai hanya bila hasil numerik benar pada format yang didukung, data yang tidak tersedia tetap dinyatakan tidak tersedia, dan request lama tidak dapat mengubah hasil konteks aktif. Lulus build/test status saja belum memenuhi syarat tersebut.
