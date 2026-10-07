# Prompt Gemini — Lanjutan Setelah Review Hasil Perbaikan, 3 Oktober 2026

Kerjakan proyek `D:\vscode\Harmony`. Fokus halaman peta dan integritas data. Baca `docs/HARMONY_GEMINI_RESULT_REVIEW_2026-10-03.md` dan kode terbaru terlebih dahulu. Jangan mengerjakan PPT/esai. Jangan mengulang perbaikan yang sudah selesai atau menyalin laporan lama sebagai hasil audit baru.

## 1. Tugas dan aturan kerja

Buat rencana berdasarkan kode sekarang, lalu implementasikan perubahan kecil yang dapat diuji. Setiap rencana menyebut file/fungsi, masalah, perubahan, fitur yang dilindungi, risiko, dan cara memverifikasi. Selesaikan yang tidak terhalang akses sumber; laporkan hambatan konfigurasi secara spesifik.

Proyek memiliki banyak perubahan pengguna yang belum di-commit. Jangan reset/clean/checkout massal atau memakai Git HEAD sebagai pengganti baseline terakhir. Buat backup file yang akan disentuh. Jangan menghapus menu/provider/model demi menutupi kegagalan.

Pertahankan 15 domain: weather, bmkg, remote_sensing, terrain, positioning, hydrology, field_survey, analytics, charts, fusion, catalog, hotspots, accessibility, emissions, swot. Pertahankan 2D/Three.js/miring/Cesium, GPS, cari lokasi, routing, AOI, ekspor/impor, layer/opacity, katalog, akun/storage dan pembelajaran. Tombol alat berada di panel `Alat & Analisis`. Nama tampilan tetap `Peta Cuaca`.

Jangan deploy atau mengubah konfigurasi rahasia tanpa arahan pengguna. Jangan mengeluarkan nilai key, isi .env, URL upstream berkey, atau token dalam log/laporan. Provider gagal tetap tercatat; simulasi/estimasi/katalog dibedakan dari observasi dan data yang benar-benar masuk perhitungan.

## 2. Kondisi terbaru dan perbaikan yang harus dipertahankan

Perbaikan Gemini sebelumnya memang memperketat parsing BMKG dan timeout, menambah prop hotspot Cesium, serta memberi label jumlah marker terbatas. Namun laporan sebelumnya terlalu luas: label OPERATIONAL seluruh domain dan sembilan model belum dibuktikan oleh tes yang disebut.

Review tambahan menemukan dan memperbaiki hal berikut:

- Snapshot audit sekarang memakai lokasi tepat dan query key terpisah. Tidak ada fallback lookup 3 desimal yang bisa mengembalikan lokasi lain. Kegagalan lokasi B tidak menghapus snapshot A yang berdekatan.
- Snapshot disalin dan dibekukan sampai objek/array di dalamnya, sehingga respons asli atau pemakai UI tidak dapat mengubah audit yang sudah disimpan.
- Cache cuaca tidak lagi membulatkan koordinat pengguna secara diam-diam. Model/provider tetap masuk key.
- STAC menerima geometri Polygon/MultiPolygon melalui `intersects`, termasuk ring lubang. Tidak diganti hanya dengan bbox. Tab penginderaan jauh meneruskan geometri AOI saat tersedia.
- Ekstensi `.tif` tidak membuktikan COG. Boolean kompatibilitas sekarang hanya membaca deklarasi media profile dari katalog, dan `cogStatus` menjelaskan DECLARED/NOT_DECLARED. Ini belum verifikasi fisik TIFF/HTTP range.
- Traffic menolak `flowSegmentData: {}` dan parameter/geometri tidak valid, mempertahankan nol yang sah, melindungi pembacaan JSON dengan timeout, dan menyamarkan error upstream agar tidak membocorkan key.
- Audit manual mempertahankan status PARTIAL dan menolak speed traffic null; schema feed USGS diperiksa.
- Kunci FIRMS menerima `FIRMS_MAP_KEY` atau nama lama `MAP_KEY`, tanpa menampilkan nilainya. Jangan memutus konfigurasi lama.
- Empat gempa contoh yang tidak diberi label telah dihapus dari state awal MapsView. Data awal kosong sampai ada hasil nyata. Magnitudo/kedalaman nol atau missing pada feed USGS tidak diganti 4.5/10.
- Tanggal BMKG yang mustahil, misalnya 30 Februari, ditolak. Date.parse yang menormalisasi tanggal bukan validasi kalender penuh.

Pertahankan juga perbaikan terdahulu: status source nyata, FIRMS empat produk dan jendela tujuh hari/timeout total/sourceAttempts, CSV invalid gagal, grafik/statistik benar, weather demo eksplisit, thermal effect bukan suhu, Cesium runtime assets dan kembali 2D, indeks skalar DEMO/UNAVAILABLE, serta fasilitas missing UNKNOWN.

## 3. Prioritas pertama: snapshot pemantauan yang benar-benar dibagikan

Masalah yang masih ada:

- MapsView mengambil hotspot sekali saat mount untuk Cesium.
- GlobeView3D memiliki state dan polling hotspot sendiri.
- Peta 2D memakai fitur hasil Studio, bukan otomatis snapshot global yang sama.
- Peta 2D mengambil feed USGS 2.5_week, state awal MapsView mengambil BMKG, sedangkan globe memiliki pilihan feed dan polling sendiri.

Prop `hotspots={hotspots}` saja tidak membuktikan ketiga renderer sinkron. Jangan melaporkan selesai sebelum tes menunjukkan snapshot/query yang sama.

Implementasikan:

1. Buat service pemantauan dengan snapshot immutable berisi queryKey, provider/product, bbox/AOI, time window, filter, records, status, fetchedAt, sourceAttempts, reason dan counts.
2. Hasil source dan status dikembalikan bersama. Hindari memanggil getter status singleton setelah await yang bisa berubah karena menu lain.
3. Request yang identik berbagi satu pekerjaan melalui single-flight; cache scoped. Query beda tidak mengubah data/status query lain. Cancellation konsumen jangan membatalkan konsumen lain yang masih membutuhkan hasil.
4. Buat scheduler refresh dengan interval provider, batas rate, backoff, tab visibility, dan cleanup. Berhenti ketika layer tidak digunakan; jangan memulai request global berat pada setiap mount halaman 2D.
5. MapsView/Studio/Three.js/Cesium berlangganan snapshot yang relevan. Adapter renderer hanya menggambar/memfilter tampilan; jangan menduplikasi fetch sumber di setiap renderer.
6. Selaraskan AOI, rentang waktu dan filter sensor/magnitudo. Global dan wilayah pilihan boleh menjadi query berbeda yang disebut jelas; jangan menyamakan hasilnya.
7. Bila refresh gagal, pertahankan last valid dengan status usang/waktu asli. Bila belum pernah valid, tampilkan tidak tersedia. Valid kosong berarti nol pada window/cakupan yang berhasil diperiksa, bukan dunia tanpa risiko.
8. Perubahan lokasi/filter serta unmount tidak boleh menerima response lama sebagai hasil baru. Kembalikan fokus peta saat berganti mode; pertahankan GPS/rute/layer pengguna.
9. Jelaskan jumlah data vs jumlah marker yang dirender. Batas 40 gempa masih pemotongan tetap; itu belum clustering/LOD dinamis. Implementasikan pemilihan/clustering deterministik bila perlu tanpa kehilangan data mentah.

Tes penerimaan: dua renderer/query sama memakai requestId/snapshot yang sama; refresh memperbarui semuanya; query B tidak mengubah A; berganti mode tidak menambah polling duplikat; failure/partial/valid-empty tetap identik; source counts dan marker counts jujur.

## 4. Audit dan registry masih perlu diperluas dengan bukti

Registry telah bertambah, tetapi daftar endpoint belum sama dengan integrasi sumber lengkap. Menambahkan nama sumber bukan keberhasilan koneksi.

- Catat masing-masing produk FIRMS, collection STAC, model cuaca, BMKG, USGS, traffic, elevasi/routing, dan embed sebagai adapter/catalog/reference sesuai perannya.
- Pisahkan transport health, payload validity, query status, dataset status dan actually-used inputs. Check endpoint tidak boleh mengubah audit ingestion menjadi sukses.
- Setiap attempt: queryKey/requestId, start/completion time, HTTP code, jumlah diterima/invalid/lolos seleksi, provider-time dan fetchedAt, cached/age, alasan partial/failure.
- Koordinat query audit harus sesuai pilihan pengguna. Endpoint contoh bbox tetap Indonesia tidak boleh dianggap pemeriksaan lokasi negara lain.
- Lookup memakai query key yang diminta; tidak fallback ke produk/model/waktu lain bila query tidak ditemukan. Batasi ukuran cache dan logs.
- Periksa badge LIVE yang masih statis pada embed, panel, tooltip, daftar sensor dan Cesium. Renderer aktif/iframe dimuat tidak membuktikan data baru diterima.
- Sembilan model dikonfigurasi tidak otomatis sembilan model berhasil. Tampilkan configured/requested/returned-valid/used secara terpisah. Jangan menambah source count melalui duplikasi nama.

## 5. Sumber yang belum tersambung

Enam produk BMKG masih mengembalikan 503 NOT_CONNECTED. Cari dokumentasi dan akses resmi yang memang tersedia untuk tiap produk; jangan menganggap seluruhnya harus menunggu BMKG membuka API baru tanpa penelitian. Pasang adapter nyata jika memungkinkan. Jika akses/kredensial tidak tersedia, jelaskan keterbatasan dan pertahankan guard serta menu.

FIRMS membutuhkan key server yang valid. Logika API sudah diuji fixture, tetapi fixture tidak membuktikan koneksi NASA live. Keberhasilan harus memiliki trace sanitasi per produk/window. Tujuh hari dapat melampaui cakupan produk NRT; teliti sumber arsip/standar dan latensinya, jangan mengisi kekosongan dengan deteksi buatan.

TomTom proxy telah diperketat. Ini belum berarti UI traffic koridor memakai provider tersebut. Buat frontend adapter/query scoped dan hubungkan flow ke ruas dengan timestamp/coverage/confidence. Kendaraan animasi tetap simulasi bila bukan pelacakan kendaraan sebenarnya. Pertahankan mode simulasi berlabel dan route yang ada.

## 6. Raster dan analisis bumi yang belum selesai

Metadata STAC dan deklarasi COG bukan pembacaan piksel.

1. Verifikasi koleksi, asset band/QA, URL/signing, pagination, waktu akuisisi, provider coverage dan lisensi.
2. Verifikasi GeoTIFF/COG sebenarnya dan dukungan HTTP range. Status DECLARED dari metadata bukan VERIFIED.
3. Buat window raster worker/job berdasarkan AOI: CRS transform, pixel/grid alignment, resampling, scale/offset, NoData, QA awan/bayangan/saturasi dan polygon/hole mask.
4. Hitung NDVI/NDWI/MNDWI/NDBI hanya dari band sesuai definisi. LST hanya dari produk termal yang sesuai, bukan Sentinel-1/RGB/thermal shader.
5. Laporkan validPixelCount, validAreaKm2, coverageFraction berbasis luas piksel, akuisisi, resolusi dan versi algoritma. Nol piksel valid = tidak tersedia, bukan indeks nol.
6. Luas kelas/mean AOI berasal dari piksel valid; jangan dari contoh satu angka band. Pertahankan DEMO terpisah dan ekspor provenance.
7. Geometry lintas garis tanggal/polar serta self-intersection perlu strategi eksplisit; lolos validasi struktur ring belum membuktikan topologi lengkap.
8. Pisahkan hasil per halaman katalog dan total hasil. Jangan menyatakan totalFound mencakup seluruh katalog tanpa pagination/total resmi.

Terrain/hidrologi memerlukan DEM nyata dan metadata; elevasi satu titik bukan raster slope/aspect/watershed. Aksesibilitas radius tetap ESTIMATED sampai ada graph routing yang benar. Emissions/fusion/form/import/export harus diuji dengan input/unit nyata sebelum dilabeli operasional seluruhnya.

## 7. 3D dan ramalan yang dapat dipertanggungjawabkan

Cesium dasar sudah berjalan. Terrain/3D Tiles fotorealistik merupakan integrasi berbeda yang memerlukan provider/token/lisensi/cakupan. Pertahankan mode dasar tanpa key, runtime Workers/Assets/Widgets/ThirdParty, serta atribusi.

Referensi God's Eye View: pelajari source registry, records normalization, layer lifecycle dan provider proxy; catat commit/lisensi. Shader termal = efek warna, bukan suhu fisik. Radar regional NOAA tidak otomatis Indonesia. Jangan menyalin klaim live dari tampilan.

Ramalan: gunakan model/provider yang benar-benar valid; selaraskan lokasi/grid, model-run/valid-time/lead-time, unit dan zona waktu. Variabel missing tetap null. Jangan mengklaim Harmony mengunduh semua titik tiap negara bila yang dilakukan query grid model untuk lokasi pilihan. Arah angin memerlukan statistik melingkar/vektor. Akurasi memerlukan backtest pengamatan independen dan metrik yang sesuai; komentar AI bukan observasi atau bukti akurasi.

## 8. Gate dan laporan yang wajib

Jalankan:

- `npm run typecheck`
- `npm run build`
- `node tests/weatherDataIntegrity.test.mjs` (16 kelompok baseline)
- `node tests/recoveryFollowup.test.mjs` (12 kelompok baseline)
- `node tests/geminiReviewIntegrity.test.mjs` (12 kelompok baseline)

Jangan menurunkan assertion untuk menutupi regresi. Tes harus menjalankan production adapter/normalizer/route. Jangan menjalankan suite job yang menulis storage pengguna; gunakan storage sementara terisolasi.

Browser tersedia melalui `puppeteer-core` dan Edge terpasang. Kegagalan download driver Playwright tidak menghalangi penggunaan Edge ini. Jalankan smoke 15 menu, subfitur yang diubah, desktop/mobile, failure fixture, refresh dan pergantian renderer. Build/typecheck bukan pengganti browser. Catat error dan exit code; jangan menyebut kegagalan browser sebagai seluruh modul fungsional terverifikasi.

Hasil akhir: rencana, diff terarah, inventaris menu/sumber sebelum-sesudah, apa yang ditambah/diganti/dihapus dan alasannya, gate dengan bukti, konfigurasi yang diperlukan tanpa nilai rahasia, serta sisa kerja. Gunakan status tested/fixture-only/live-tested/not-connected/not-configured/not-tested yang sesuai bukti. Jangan menyebut semua data akurat atau seluruh fitur operasional tanpa pengujian.
