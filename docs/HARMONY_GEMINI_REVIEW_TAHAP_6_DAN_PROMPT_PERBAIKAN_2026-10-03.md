# Harmony — Review hasil tahap 5 dan prompt perbaikan tahap 6

Tanggal: 3 Oktober 2026. Proyek: `D:/vscode/Harmony`.

## 1. Kesimpulan

**Perbaikan sebelumnya benar-benar membantu, tetapi laporan “semua selesai” masih terlalu luas.** Kasus TIFF little-endian, big-endian dan Deflate sederhana sekarang menghasilkan DN 45000 / 29,66°C dengan benar. Browser lokal mengonfirmasi perbaikan big-endian. Penolakan QA OOB/NoData, prioritas QA_PIXEL, loading selama fetch, dan penolakan traffic tanpa confidence/roadClosure juga lulus suite terbaru.

Namun, masih ada masalah pada predictor/tiled TIFF, pemilihan produk Level-1 sebagai ST Level-2, pembatalan request melalui antarmuka, CRS, luas/cakupan, dan geometri traffic. Pemeriksaan tambahan juga menemukan data gempa contoh pada halaman Studio tersendiri serta default angka gempa dalam analisis buffer.

Reviewer hanya membaca/menguji aplikasi dan membuat dokumen serta evidence baru. Kode aplikasi, dependency, data pengguna dan deployment tidak diubah.

## 2. Temuan dengan bukti baru

### A. Decoder dan identitas produk

| Prioritas | Temuan | Hasil aktual | Perilaku yang diperlukan |
|---|---|---|---|
| P0 | Deflate + horizontal Predictor 2 | Piksel referensi DN 45100 terbaca 100. Mean sampel menjadi 29,66°C dengan 6 piksel valid, padahal reference decoder pada indeks sampel yang sama menghasilkan 31,94°C dengan 36 piksel unik | Decode predictor sebelum membaca DN; format tak didukung ditolak secara eksplisit |
| P1 | TIFF tiled | Piksel referensi DN 45000 terbaca null, hasil UNAVAILABLE | Baca TileOffsets/TileByteCounts dan layout tile; jangan hanya mendukung strip |
| P0 | Scene `landsat-c2-l1`, asset `b10` | Handler memberi DERIVED 29,66°C dengan nama dataset Landsat C2 L2 ST_B10 | Produk Level-1/raw B10 tidak boleh diberi konversi/identitas ST Level-2 |
| P0 | Asset non-ST | `findThermalAsset` menerima `st_qa` bila asset itu saja tersedia | Band ketidakpastian/kualitas bukan band suhu |
| P1 | GeoKey GeographicType 4269 | Decoder reference membaca EPSG:4269; Harmony menggantinya EPSG:4326 | Pertahankan CRS yang benar dan transformasi yang sesuai |
| P1 | Tiepoint/scale tersedia, CRS tidak tersedia | Harmony mengasumsikan EPSG:4326 lalu DERIVED | CRS unknown tetap unknown kecuali metadata sah lain menentukannya |
| P1 | PixelIsArea | Titik yang masih berada dalam sel row/col 0 dipetakan ke row/col 1 karena Math.round | Konversi menggunakan affine dan semantik sel/centre yang benar |

File: `apps/web/src/services/geospatial/rasterReaderService.ts`.

Perbaikan Deflate sekarang melakukan inflate, tetapi belum membalik horizontal differencing Predictor 2. Decompress saja tidak cukup untuk memperoleh nilai sampel. Fixture baru dibuat secara independen dengan Pillow; nilai diverifikasi melalui Pillow dan geotiff.js. Reference mean 31,94°C dihitung pada indeks sampel yang diminta kode saat ini sehingga perbandingan ini mengisolasi kesalahan decode, bukan perubahan metode sampling.

Pembaca TIFF yang tersedia seperti geotiff.js mendokumentasikan dukungan tiled/stripped images dan Deflate dengan predictor. Perlu memakai API sesuai versi dependency; versi baru memiliki perubahan akses fileDirectory/GeoKeys. [Dokumentasi resmi geotiff.js](https://github.com/geotiffjs/geotiff.js).

Pada parser GeoKeys, key model geografis 1024 menetapkan EPSG:4326 terlebih dahulu, lalu key 2048 diabaikan karena CRS sudah terisi. Default EPSG:4326 juga masih dipakai bila georeferensi ada tetapi CRS tidak ada. Georeferensi mencakup CRS dan transformasi raster, sehingga tiepoint/scale saja tidak membuktikan WGS84. [Standar GeoTIFF OGC](https://docs.ogc.org/is/19-008r4/19-008r4.html).

### B. Lifecycle LST — reset handler berbeda dari reset antarmuka

File: `GeospatialRemoteSensingTab.tsx`, sekitar baris 90 dan 359–517; `lstService.ts`, sekitar baris 174–213.

**Yang sudah benar:** handler ketika dijalankan tanpa scene memanggil resetRequestContext. Dua request analisis baru juga saling menggantikan melalui context service.

**Yang belum benar:** effect saat lokasi/AOI/koleksi berubah hanya membatalkan pencarian STAC dan menghapus tampilan; tidak membatalkan request LST. Cleanup effect juga tidak membatalkan LST. Memilih preset/scene baru tanpa menekan tombol analisis belum mengubah context aktif service.

Bukti:

- Eksekusi effect reset yang diambil dari source: envelope menjadi null, kedua signal LST tetap `aborted:false`, respons lama kemudian menghasilkan DERIVED.
- Cleanup unmount: kedua signal tetap tidak dibatalkan dan callback lama masih menghasilkan hasil.
- Menjalankan demo ketika request operasional tertunda: DEMO berubah kembali menjadi DERIVED milik scene lama.
- **Browser:** pilih Landsat fixture, mulai analisis tertunda, ganti koleksi ke Sentinel-2. Envelope sempat hilang, kemudian hasil Landsat lama muncul kembali sebagai DERIVED 29,66°C. Tidak ada uncaught page error.

Request owner sekarang berada pada singleton `lstService`, belum pada instance komponen. Ini perlu dipisahkan agar instance/modal berbeda tidak saling mengubah lifecycle.

### C. Luas, sampling dan coverage

File: `lstService.ts`, sekitar baris 431, 442–444, 481–495.

- Dedup validPixelCount sudah membaik: 49 titik yang membaca satu piksel dihitung sebagai satu piksel unik.
- Namun totalPixelCount masih 49 titik grid. Coverage dihitung `1 / 49 = 0.02`, walaupun piksel unik yang disampel memiliki QA valid. Ini mencampur dua denominator berbeda.
- Luas masih `uniqueValidCount × 0.0009 km²` untuk semua non-MODIS, lalu dibatasi luas bbox AOI. Itu belum merupakan perhitungan irisan piksel dengan polygon/hole AOI atau luas berdasarkan transformasi raster.
- Fixture lama berskala 0,001 derajat, bukan 30 m. Test tahap 5 yang mengharapkan 0,0009 km² mengunci asumsi tetap 30 m tersebut. Label “AOI sub-piksel” benar, tetapi penjelasan “satu piksel 30 m” tidak sesuai georeferensi fixture.
- Grid sampling masih 7 × 7. Statistik seluruh piksel AOI, area valid dan persentase coverage harus dibedakan dari statistik sampel.

### D. Signing, batas unduhan dan alasan gagal

File: `GeospatialRemoteSensingTab.tsx`, sekitar baris 409–491.

- Signer sudah dipanggil. Namun error non-abort dari signer ditelan, lalu handler meminta URL asal tanpa mencatat kegagalan signing.
- Fixture: dua signer mengembalikan HTTP 503, URL asal memberikan TIFF fixture valid; hasil akhir DERIVED tanpa alasan/attempt signing yang gagal. Ini bukan bukti token provider nyata kedaluwarsa. Ini membuktikan kegagalan tahap akses tidak tercatat.
- Request tetap mengambil dua file penuh dengan arrayBuffer. Abort signal bukan deadline atau batas byte; tidak ada Range/window network maupun budget file di handler.
- Inflate strip dijalankan setiap readPixelAt, sehingga strip yang sama bisa didecompress berulang kali dalam satu grid sampling.
- Error decode/format tetap dipetakan ke ASSET_ACCESS_FAILED. Tanggal scene yang kosong masih diganti tanggal tetap 1 Oktober 2026.

### E. Traffic dan radar

File: `MapsView.tsx`.

**Traffic:** confidence/roadClosure wajib sekarang benar, tetapi coordinates yang undefined masih dianggap valid sekitar baris 588. Payload lengkap selain geometry tetap LIVE. Koordinat `[[999, -777]]` juga diterima LIVE karena hanya diperiksa sebagai finite number. Sequence/active request masih globalThis.

**Radar:** status pending MEMUAT, semua tile gagal UNAVAILABLE, dan sebagian gagal PARSIAL sudah benar pada evaluasi ekspresi status. Listener dan cleanup tile juga telah ditambahkan.

Kekurangan radar yang perlu ditindaklanjuti:

- Counter dijumlahkan selama umur layer/frame, bukan tile aktif viewport. Jika viewport pertama sukses dan viewport baru seluruh tile gagal, keberhasilan lama masih membuat status PARSIAL. Ini counterexample model counter/status, belum pengujian pan/zoom browser lengkap.
- Tidak ada data/frame lama tetapi metadata gagal masih bisa berstatus STALE, padahal belum ada data yang bisa disebut usang.
- Waktu frame hanya diwajibkan positif/finite; batas waktu masa depan, host/path, deadline metadata dan evaluasi age berkala masih perlu ditangani.

### F. Gempa contoh dan nilai cadangan pada analisis buffer

File:

- `apps/web/src/components/dashboard/views/spatial/GeospatialStudioView.tsx`, sekitar baris 10–15, 29–55, 86.
- `apps/web/src/services/geospatialAnalysisService.ts`, sekitar baris 527–544.
- `studio/GeospatialAnalyticsTab.tsx` dan `studio/GeospatialChartsTab.tsx` sebagai konsumen.

1. Halaman Studio tersendiri menginisialisasi empat gempa hardcoded tanpa waktu pengamatan/provenance. Ketika kedua pengambilan feed BMKG gagal atau hasil kosong, array tersebut tetap dipakai untuk grafik/buffer.
2. Reproduksi menjalankan initializer dan callback loadData dari source dengan kegagalan feed: tetap ada empat event. Analisis buffer menampilkan contoh “Selatan Jawa Timur (Samudra Hindia)”, M4,8, kedalaman 24 km, sebagai nearestEarthquake.
3. Buffer masih memakai `q.mag || 4.5` dan `q.depth || 10`. Record dengan magnitude/depth tidak tersedia menghasilkan M4,5 dan 10 km. Angka ini tidak berasal dari record.
4. `if (q.lat && q.lng)` menolak koordinat 0 yang valid. Fixture gempa pada lintang 0 di pusat buffer menghasilkan count 0, padahal seharusnya 1.

Temuan standalone ini dibuktikan melalui source/callback/service, **bukan browser pada halaman tersebut**. Percobaan browser tanpa login tidak mencapai selector Studio; kode layout membatasi rute pendidikan bagi pengguna yang belum login. Tidak dilakukan bypass autentikasi. Browser pada `/app/maps` berhasil memverifikasi kasus LST di atas.

Ini jalur lain dari halaman peta utama yang sudah memakai earthquake snapshot. Perbaikan snapshot di peta utama belum otomatis memperbaiki konsumen Studio tersendiri.

## 3. Pemeriksaan laporan dan tes Gemini

- Sepuluh suite terarah dijalankan ulang: **125 kelompok/kasus lulus**, semua exit code 0. Typecheck juga exit code 0. Klaim jumlah ini terkonfirmasi.
- Production build yang disebut Gemini tidak dijalankan ulang reviewer. Laporan build bukan bukti kompatibilitas format raster ataupun kebenaran angka.
- Suite evidenceStage5 memiliki 14 test, tetapi tidak memiliki test aktual metadata/tile radar walaupun komentar pembukanya menyebut cakupan radar.
- Test lifecycle hanya menyimpan satu variabel release untuk dua fetch. Release kedua menggantikan release pertama, sehingga setelah “release” salah satu promise masih pending. Test tidak membuktikan respons lama benar-benar selesai dan ditolak.
- Test lifecycle juga memanggil handler no-scene secara manual. Itu tidak menguji effect reset antarmuka ketika collection/lokasi berubah.
- Test yang disebut end-to-end menggunakan decoder dan processThermalRaster langsung, lalu hanya memeriksa Blob ekspor ada. Tidak memanggil pipeline scene→signing→fetch, tidak parse/validasi isi GeoJSON, dan bukan browser test.
- Script reproduce-stage5 lama menghasilkan laporan JSON, bukan framework assertion dengan 13 status pass. “13/13 lulus” perlu dijelaskan per expected/actual; cetakan JSON sendiri tidak membuktikan semua requirement terselesaikan.
- Entry npm test belum memasukkan evidenceStage5. Import pako langsung juga belum dicatat sebagai dependency langsung apps/web; saat ini tersedia melalui dependency lain.
- Probe publik terbaru tetap cuaca 200 JSON success:true, traffic/hotspots 404 HTML. Klaim penyebab pasti “build lama”/“jatuh ke SPA” belum dibuktikan dengan deployed commit/log. Konfigurasi lokal justru mengarahkan seluruh `/api/(.*)` ke satu function sebelum catch-all SPA.

### Evidence baru dan batas review

- [25 skenario pemeriksaan, termasuk kontrol yang sudah benar](<D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/evidence-stage6.json>)
- [Browser: big-endian benar, collection race masih terjadi](<D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/browser-stage6.json>)
- [Suite dan typecheck](<D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/verification-summary.json>)
- [Referensi fixture independen](<D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/fixture-reference.json>)
- [Screenshot hasil lama setelah ganti koleksi](<D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/old-landsat-result-after-sentinel-switch.png>)
- Source/handler runner: `D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review/reproduce-stage6.mjs`.

25 skenario bukan 25 bug: ada kontrol sukses, reproduksi masalah, dan evaluasi status. Tidak dilakukan verifikasi seluruh negara/menu, asset satelit operasional nyata, browser radar pan/zoom, clean install, full npm test, atau deployment. Test yang menulis job tidak dijalankan terhadap data pengguna. Fixture tidak boleh disebut pengamatan nyata.

---

## PROMPT UNTUK GEMINI — salin mulai bagian ini

Perbaiki Harmony di `D:/vscode/Harmony` berdasarkan review tahap 6 ini. Fokus aplikasi web dan integritas data. Mulai dengan membaca source terbaru, evidence baru, instruksi proyek, dan git status. Buat rencana singkat perubahan per file, lalu implementasikan dan verifikasi. Jangan berhenti setelah menulis laporan.

Perbaikan tahap 5 berhasil pada beberapa kasus sebelumnya. Pertahankan perbaikan big-endian/Deflate sederhana, QA NoData/OOB, prioritas QA_PIXEL, loading pipeline, confidence/roadClosure wajib, cache ownership, header, dan listener/status dasar radar. Tugas kali ini menutup kekurangan yang masih terbukti, tanpa menghilangkan fitur/sumber.

### A. Batas pekerjaan

1. Working tree memuat banyak pekerjaan belum di-commit. Jangan reset/clean massal, menimpa MapsView penuh, mengganti keseluruhan file dengan backup lama, atau menghapus menu/provider untuk menghilangkan error.
2. Pertahankan semua menu Studio, mode 2D/3D/Cesium, basemap, sumber cuaca, radar, FIRMS, gempa, traffic, GNSS, DEM, hidrologi, analisis, katalog dan ekspor. Kontrol tetap di panel terpadu; jangan menambah tombol mengambang duplikat. Nama umum tetap **Peta Cuaca**.
3. Sumber gagal tetap di inventaris dengan status/alasan. Perbaiki adapter atau tambahkan alternatif yang sah dengan identitas berbeda bila API berubah. Jangan mengurangi jumlah sumber maupun menyamarkan perbedaan produk.
4. Data contoh boleh dipertahankan dalam mode DEMO eksplisit, tetapi dikeluarkan dari analisis/ekspor/status sumber operasional. Data hilang bukan angka nol, QA clear, tanggal tetap, M4,5 atau kedalaman 10 km.
5. Jangan mengedit evidence reviewer atau menjalankan runner yang menimpa output baseline. Buat evidence baru dengan nama/folder baru. Pertahankan assertion yang masih benar; perbaiki assertion yang mengunci hasil salah dengan bukti numerik dan alasan.
6. Jangan menyentuh PPT/esai, data pengguna, atau deployment. Siapkan diff lokal dan penjelasan mapping cloud yang dapat direview. Jangan membocorkan key/SAS di log, screenshot atau ekspor.

### B. P0 — selesaikan decoding raster, bukan hanya inflate

File utama: `rasterReaderService.ts`, `lstService.ts`, `GeospatialRemoteSensingTab.tsx`.

1. Gunakan decoder GeoTIFF yang menangani tile/strip, predictor, compression dan sample format dengan benar. geotiff sudah tersedia dalam tree dependency saat review; periksa versinya/API yang terpasang. Jangan menulis decoder sempit lagi hanya karena percobaan bundling pertama gagal.
2. Jika memakai geotiff.js, ikuti API versi tersebut, termasuk perubahan fileDirectory/GeoKeys dan async metadata. Pisahkan bundling browser/worker dari harness Node; kegagalan harness Node bukan bukti library tidak bisa dipakai di browser. Tidak perlu menambah dependency yang tidak digunakan.
3. Minimal dukung format asset provider aktif: tiled/stripped, II/MM, compression dan predictor yang ada pada produk tersebut, sample format/band layout, NoData dan overview. Format yang belum didukung ditolak sebelum statistik dengan reason UNSUPPORTED_RASTER_FORMAT.
4. Deflate + Predictor 2 harus dibalik ke nilai sampel asli setelah decompress. Fixture reviewer memiliki DN 45100 pada col 1,row 0; nilai 100 adalah residual predictor, bukan DN. Pada indeks sampling yang sama mean reference 31,94°C, bukan 29,66°C.
5. Dukung tiled TIFF: gunakan tile offsets/counts dan tile dimensions. Jangan memaksa TIFF tiled menjadi strip atau null tanpa alasan format yang jelas. Test fixture tiled reviewer harus terbaca DN 45000.
6. Validasi dimensi, tipe, offset/count, buffer truncated, predictor/compression compatibility dan band count. Tidak boleh silently memakai default atau memproses header/residual sebagai DN.
7. Decode blok hanya sekali per pipeline/cache blok. Jangan inflate strip yang sama 49 kali. Jalankan kerja berat dalam worker/backend yang dapat dibatalkan.
8. Baca AOI/window melalui Range bila server mendukung. Terapkan deadline keseluruhan signing/network/decode, budget byte gabungan dan batas memori. Jika server menjawab 200 full file, batasi streaming sebelum arrayBuffer tumbuh tanpa batas. Abort signal saja bukan deadline/size limit.
9. Catat layout/compression/predictor/sample format, actual window/resolution dan metode decode pada provenance aman. Fixture hanya mode pengujian, bukan fallback operasional.

### C. P0 — kontrak produk termal yang ketat

1. Handler wajib memvalidasi collection, processing level, platform/sensor dan jenis band. Prefix ID LC/LE/LT tidak cukup untuk membuktikan produk C2 Level-2 ST.
2. Scene landsat-c2-l1 dengan asset b10 tidak boleh masuk rumus ST Level-2. Jika ingin mendukung Level-1, buat pipeline radiance/brightness temperature/LST yang sesuai beserta metadata/QA dan status terpisah; jangan memperlakukan keduanya sebagai produk sama.
3. Gunakan adapter per provider/collection untuk asset ST_B10/ST_B6/lwir11 yang benar. Pilih exact semantic band sesuai metadata resmi, role data dan media type. Jangan fallback substring st_ menerima st_qa, st_emis, st_trad atau band non-ST lainnya.
4. Pisahkan QA_PIXEL, QA_RADSAT dan ST_QA. QA_RADSAT untuk aturan saturasi, ST_QA untuk informasi kualitas/uncertainty sesuai produk; keduanya tidak menggantikan QA_PIXEL. Generic qa tidak otomatis memakai bit Landsat.
5. Pastikan thermal dan QA dari scene yang sama, coverage/CRS/grid cocok atau alignment nearest-neighbour dinyatakan. Pertahankan rejection QA NoData/OOB/unknown. Jangan interpolasi numerik bitmask.
6. Skala/offset/satuan dan bit QA mengikuti produk/sensor. L2 ST sudah produk ST; jangan diberi koreksi emisivitas tambahan seolah input radiance mentah.
7. Tanggal metadata tidak tersedia tetap unknown/null atau ditolak jika wajib. Hapus fallback tanggal 1 Oktober 2026 dari provenance operasional. Dataset/sensor/band provenance mengikuti produk aktual.

Acceptance: scene Level-1 b10 ditolak sebagai ST Level-2; st_qa-only tidak dipilih sebagai thermal; scene Level-2 ST sah tetap berhasil; QA_PIXEL/QA_RADSAT/ST_QA tidak tertukar; tanggal kosong tidak berubah menjadi tanggal rekaan.

### D. P0 — ikat request pada state antarmuka dan instance komponen

1. Lifecycle LST harus per instance komponen/pipeline, bukan singleton global yang memiliki satu active request untuk seluruh aplikasi. Service komputasi tetap dapat dibagi, tetapi owner/controller/generation dipisahkan.
2. Saat lat/lng, AOI/hash, selected scene, preset, collection atau parameter analisis berubah: abort request lama, batalkan worker, naikkan generation dan reset state terkait. Ini harus terjadi melalui effect/event UI, tanpa menunggu pengguna menekan tombol analisis lagi.
3. Cleanup unmount wajib membatalkan LST dan STAC. Menutup Studio tidak boleh menyisakan callback hasil atau spinner owner lama.
4. Mode DEMO juga menginvalidasi pipeline operasional lama. Hasil lama tidak boleh menggantikan DEMO maupun scene kosong/baru.
5. Semua commit envelope, error dan loading/finally memeriksa generation + owner + context snapshot. Latest request wins harus berlaku juga untuk dua request scene sama dan dua instance.
6. Pertahankan pending state reading/decoding; jangan menandai failed sebelum kegagalan. Cancelled/abort berbeda dari failure provider. Jangan mematikan spinner request baru lewat finally lama.
7. Context key berisi scene, AOI hash, lokasi, preset/collection serta parameter yang mempengaruhi hasil. Jangan bergantung pada key yang baru diperbarui saat tombol run ditekan.

Acceptance browser wajib: pilih Landsat, mulai kedua fetch tertunda, ganti collection ke Sentinel-2, lepaskan kedua respons lama. Envelope tetap kosong/milik konteks baru; hasil Landsat tidak muncul lagi. Ulangi ganti lokasi/AOI/scene/preset, DEMO, tutup Studio, dua run cepat dan dua instance. Pending mock harus benar-benar diselesaikan agar test membuktikan callback ditolak.

### E. P1 — CRS, affine dan statistik area

1. Parse GeoKeys tanpa tergantung urutan. ModelType geographic tidak berarti EPSG:4326; GeographicType/ProjectedCSType menentukan CRS bila tersedia. Fixture GeographicType 4269 harus tetap 4269.
2. Hapus fallback CRS WGS84 hanya karena tiepoint/scale tersedia. Metadata STAC CRS boleh digunakan sebagai fallback jika sah dan konsisten, dengan asalnya tercatat; metadata kosong/bertentangan menghasilkan reason yang jujur.
3. Gunakan affine inverse dan PixelIsArea/PixelIsPoint. Titik [112.0008,-7.0008] pada fixture PixelIsArea 0,001 derajat masih sel 0,0. Jangan Math.round terhadap corner tiepoint tanpa offset centre yang benar. Dukung transform matrix/rotasi atau tolak format itu secara eksplisit.
4. Transformasikan WGS84 AOI ke CRS thermal/QA; QA alignment nearest-neighbour dengan validitas coverage. Jangan mencampur meter dan derajat.
5. Pisahkan sampledPointCount, uniqueSampledPixelCount, validUniquePixelCount, windowPixelCount dan spatialCoverage. Rasio jumlah unik / jumlah titik duplikat tidak bermakna.
6. Grid 49 titik tetap boleh sebagai sampling berlabel jelas, tetapi jangan diberi klaim statistik semua piksel/luas AOI. Untuk statistik seluruh AOI, baca dan mask pixel window sebenarnya dengan polygon/holes.
7. Luas berasal dari transform/grid cell dan irisan AOI dalam satuan yang benar. Hapus luas tetap 0,0009 km² untuk semua raster. Min(bbox area, uniqueCount × 30m²) bukan pixel-polygon intersection.
8. Hitung clipping polygon/MultiPolygon/holes dan area overlap valid. Tempatkan denominator yang tepat dalam provenance. Jika luas belum dihitung, null/tidak tersedia lebih benar daripada angka luas perkiraan yang dilabeli aktual.
9. Perbaiki test sub-piksel yang mengunci 0,0009 km² pada fixture berskala 0,001 derajat. Pertahankan assertion dedup satu piksel, lalu uji area against independent geometry reference dan resolution yang sebenarnya.
10. Ekspor data sesuai metode: titik sampling diberi koordinat/metode yang benar, polygon AOI dipisahkan dari raster coverage. Tulis actual CRS sumber dan WGS84 GeoJSON output tanpa menyamakannya.

### F. P0 — hentikan gempa contoh dan angka cadangan masuk data operasional

File utama: `GeospatialStudioView.tsx`, `geospatialAnalysisService.ts`, konsumen Analytics/Charts/WeatherModal.

1. Inisialisasi gempa operasional sebagai empty/loading, bukan empat record hardcoded. Jika contoh ingin dipertahankan, pindahkan ke dataset DEMO eksplisit dengan mode terpisah; jangan campur grafik/buffer operasional.
2. Gunakan snapshot/contract sumber gempa yang sama dengan peta utama. Hindari fetch duplicative tanpa provenance/status untuk halaman tersendiri.
3. Pengambilan gagal tanpa cache valid: UNAVAILABLE, tidak ada event pengamatan. Respons valid kosong: EMPTY. Gagal refresh dengan cache pengamatan valid: STALE dengan waktu sumber asli. Cache yang valid harus terbukti berasal dari ingestion sukses, bukan initial seed.
4. Record menyimpan eventId, source, waktu pengamatan, koordinat valid, magnitude/depth beserta units dan kualitas yang tersedia. Konsumen menerima status/provenance, bukan array any[] yang kehilangan identitas sumber.
5. Ganti q.mag || 4.5 dan q.depth || 10. Gunakan adapter field yang tepat (mag/magnitude, depth/depthKm) dan null untuk data hilang. Jangan membuat M4,5 atau 10 km sebagai default operasional.
6. Validasi koordinat dengan tipe/finite/range, bukan truthiness. Lintang/bujur 0 valid. Magnitude/depth 0 yang valid juga dipertahankan; null/undefined bukan nol.
7. Buffer/chart tidak boleh menghitung event DEMO atau stale sebagai live. Jelaskan status stale jika masih digunakan sebagai konteks arsip, dengan waktu dan sumber.
8. NearestEarthquake tidak otomatis berarti ancaman saat ini. Tampilkan event time dan sumber; jika data tidak tersedia, null dan alasan, bukan “Memuat” selamanya atau record cadangan.

Acceptance: kedua feed gagal → tidak ada empat seed dalam analisis operasional; field magnitude/depth hilang tetap null; valid event pada lat 0/lng 0 dihitung; payload snapshot depthKm tidak berubah menjadi 10; refresh gagal mempertahankan hanya cache pengamatan valid dengan STALE; demo terisolasi dari ekspor/angka operasional.

### G. P1 — tutup geometri traffic dan global owner

1. Coordinates wajib sesuai kontrak lengkap yang digunakan aplikasi. Hilangnya geometry jangan lolos lewat coordinates === undefined. Jika ada varian provider tanpa geometry, status/kegunaannya dibatasi dengan kontrak eksplisit, bukan disebut lengkap.
2. Validasi setiap coordinate longitude [-180,180], latitude [-90,90], struktur line dan minimum titik sesuai tipe geometry. Finite number di luar bumi tetap invalid.
3. Pertahankan speeds >= 0, confidence 0–1, roadClosure boolean eksplisit, termasuk nol/false valid. Unknown closure bukan jalan terbuka.
4. Ganti globalThis active request/sequence dengan ref per komponen dan cleanup/abort saat koridor berubah/unmount. Pertahankan guard request koridor sama.
5. Identitas provider, waktu ingestion/TTL serta keterbatasan flow ditampilkan sesuai data yang tersedia. Simulasi koridor tetap terpisah dan berlabel.

Acceptance: missing geometry dan [[999,-777]] tidak LIVE; payload sah tetap LIVE; zero speed/confidence diterima; dua instance/request cepat tidak saling menimpa.

### H. P1 — radar aktif viewport dan metadata

1. Pertahankan listener tile/start/end/error dan status pending/all-fail/partial yang sudah benar. Ubah penghitung menjadi tile key/state untuk frame+layer+viewport aktif, bukan semua kejadian historis satu layer.
2. Saat pan/zoom/frame/source berubah, tentukan tile yang relevan pada viewport terbaru. Keberhasilan tile viewport lama tidak boleh menutupi semua tile gagal di viewport baru.
3. Deduplicate/retry event sesuai tile identity. Cleanup dan generation guard mencegah event layer lama mengubah status baru. Cached tile yang valid boleh dihitung jika memang aktif, bukan karena pernah berhasil di wilayah lain.
4. STALE memerlukan frame/data lama yang benar-benar tersedia. Tidak ada frame + metadata gagal adalah UNAVAILABLE. Valid empty response berbeda dari malformed feed.
5. Validasi host/path/time dan batas future timestamp secara sesuai feed; jangan menerima time positif saja. Pertahankan source time, atur deadline refresh, dan evaluasi umur frame berkala walau UI tidak kebetulan rerender.
6. Pertahankan switch Windy dan nama umum Peta Cuaca. Radar mosaic tidak dilabeli observasi BMKG/Doppler langsung jika produk itu belum terhubung.

Acceptance: viewport A sukses → viewport B seluruh tile gagal → UNAVAILABLE untuk B; pending bukan LIVE; part-success PARSIAL; empty/malformed metadata dan stale recovery benar; tidak ada data lama bukan STALE; event/retry/cached tile tidak double-count.

### I. P1 — signing dan alasan kegagalan

1. Jangan catch error signer non-abort lalu melanjutkan diam-diam. Tentukan apakah asset memang membutuhkan signing. Jika wajib, kegagalan menghasilkan SIGNING_FAILED/AUTH_FAILED yang sesuai bukti.
2. Public asset yang memang boleh diakses tanpa signing dapat menggunakan jalur public yang eksplisit. Jika melakukan fallback setelah signer gagal, catat attempt gagal, alasan fallback dan keberhasilan akses yang benar; jangan menyebut seluruh tahap berhasil.
3. signing, fetch, body read, decode, QA dan statistics memiliki attempt/stage reason yang berbeda. UNSUPPORTED_RASTER_FORMAT atau MISSING_CRS bukan ASSET_ACCESS_FAILED umum. Abort tidak menulis failure sumber baru.
4. Renew token expired hanya berdasarkan respons/bukti yang tepat, dengan retry terbatas dan budget request yang sama. Jangan menebak expired dari 404 HTML/network error.
5. Signed href/token hanya digunakan dalam memori. Provenance menyimpan identifier/href aman yang tidak berisi query SAS. Jangan menyembunyikan credential failure atau mengurangi sumber untuk membuat audit hijau.

### J. Dependency, tes dan diagnosis deployment

1. Import langsung pako atau decoder pengganti harus dinyatakan pada dependency workspace yang tepat. Keberadaan transitive package pada node_modules saat ini tidak cukup sebagai kontrak dependency langsung. Hindari instalasi paket yang tidak dipakai.
2. Sertakan suite baru pada entry npm test/CI yang relevan. Jangan hanya menjalankannya manual lalu membiarkan command standar melewatkannya.
3. Perbaiki test lifecycle: simpan resolver per request thermal/QA, lepaskan keduanya, await completion dengan batas waktu, kemudian assert no stale commit. Gunakan effect reset/UI nyata, bukan hanya handler no-scene manual.
4. Tambahkan predictor 2, tiled/multistrip, missing/wrong CRS, PixelIsArea/Point, Level-1/ST_QA wrong product, unique denominators, area sesuai raster, DEMO/unmount races, geometry missing/out-of-range, radar viewport dan gempa seed/missing/zero regression.
5. Test positive pipeline memanggil scene→signing/access→decoder→QA→statistik→UI/export. Parse GeoJSON JSON dan assert type/features/geometry/units/provenance, bukan sekadar Blob ada. Test yang berbeda scope dinamai sesuai scope.
6. Fixture dibuat/dicek independent encoder/reference decoder. Uniform fixture saja tidak menangkap predictor/sample indexing: sertakan gradient dan QA bernilai berbeda.
7. Jalankan 10 regression suite yang saat ini lulus, typecheck dan production build setelah perubahan. Full suite dijalankan dengan data/storage terisolasi bila ada test menulis job. Jangan mengubah data pengguna.
8. Browser wajib memeriksa collection race dan positive path; gunakan lingkungan uji berizin untuk halaman Studio yang memerlukan login. Jangan bypass autentikasi atau menganggap redirect auth sebagai bug data.
9. Bila akses provider nyata tersedia, catat satu smoke path asset produk nyata, CRS/layout/compression/window dan pembanding numerik. Jika belum tersedia, beri UNVERIFIED; fixture tidak berubah menjadi observasi nyata.
10. Public traffic/hotspots masih 404 HTML; weather 200 JSON. Jangan menyebut penyebab pasti build lama/catch-all SPA tanpa deployed version/log. Trace route/function/rewrite lokal dan deployed evidence secara terpisah. Local configuration mengarahkan semua /api paths ke function sebelum SPA fallback. Jangan deploy atau membuat 200/success palsu dalam tugas ini.

### K. Laporan akhir

Serahkan:

- Rencana dan diff per file: apa ditambah/diubah/dihapus dan mengapa. Penghapusan implementasi decoder lama boleh hanya jika penggantinya terhubung dan seluruh fitur/kontrak penting dipertahankan.
- Tabel expected vs actual setiap temuan tahap 6, dengan test/evidence baru dan status resolved/partial/unverified.
- Alur nyata STAC→produk→signing→bounded read→CRS/window→decoder→QA→stats→provenance/export serta gempa→snapshot→buffer/chart.
- Jumlah/sumber pass dari output asli, exit code, scope unit/integration/browser/provider nyata. Jangan menyatakan seluruh requirement selesai dari jumlah tes atau build saja.
- Inventaris sumber/menu yang dipertahankan dan status integrasi yang belum tersedia.
- Status endpoint publik serta mana diagnosis yang sudah terbukti dan mana yang masih hipotesis.
- Batas yang tersisa. Jangan mengklaim clipping/coverage aktual, dukungan COG lengkap, atau data real-time jika yang tersedia hanya sampling/fixture/katalog.

Perbaikan selesai bila angka sesuai referensi pada format produk yang didukung, hasil milik konteks aktif saja, dan data gagal/kosong tidak menghasilkan pengamatan buatan. Pertahankan seluruh menu serta sumber yang sah selama menyelesaikan alur tersebut.
