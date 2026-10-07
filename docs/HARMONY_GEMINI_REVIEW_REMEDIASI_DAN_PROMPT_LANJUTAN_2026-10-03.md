# Harmony — pemeriksaan hasil Gemini dan prompt perbaikan lanjutan

Tanggal: 3 Oktober 2026. Pemeriksaan HTTP dan reproduksi terakhir: sekitar 13.57 WIB.

## Kesimpulan pemeriksaan

Sebagian perbaikan sudah benar, tetapi pernyataan dalam laporan Gemini bahwa seluruh perbaikan selesai dan semua domain siap digunakan belum didukung bukti. Beberapa uji lolos walaupun alur tampilan masih keliru, dan ada uji yang justru mengharuskan klasifikasi data yang salah.

Pemeriksaan ini membaca kode lokal `D:\vscode\Harmony`, meninjau laporan yang dikirim pengguna, menjalankan ulang lima suite uji dan pemeriksaan TypeScript, menjalankan 14 reproduksi dengan data buatan yang diberi label, serta memeriksa endpoint dan halaman peta publik. Pemeriksaan ini tidak mengubah kode aplikasi, tidak menjalankan migrasi, dan tidak melakukan deployment.

### Yang sudah diperbaiki dan perlu dipertahankan

- Rekaman BMKG dengan koordinat tidak valid seluruhnya tidak lagi dianggap sebagai sumber yang berhasil.
- Snapshot gempa yang menjadi STALE mempertahankan waktu pengambilan data yang terakhir berhasil.
- Permintaan snapshot yang sudah dibatalkan sebelum dipanggil ditolak.
- Opsi FIRMS dengan nama sumber berisi underscore dipertahankan saat penyegaran.
- Cache hotspot EMPTY tidak lagi berubah menjadi status gagal hanya karena tidak ada deteksi.
- Label sumber katalog dan tampilan eksternal mulai dipisahkan dari LIVE.
- Rute geodesi cadangan tidak lagi mempunyai durasi perjalanan jalan yang dibuat-buat.
- Mode geolokasi perangkat sudah menggunakan `watchPosition`; perekaman dan pemisahan simulasi masih bermasalah.
- Frekuensi perjalanan nol pada perhitungan emisi sudah ditangani sebagai nol.
- Identitas dataset elevasi sudah diganti ke Copernicus DEM GLO-90.

### Verifikasi yang benar-benar dijalankan ulang

| Pemeriksaan | Hasil |
|---|---|
| `monitoringSnapshot.test.mjs` | 9 kelompok lolos |
| `weatherDataIntegrity.test.mjs` | 16 kelompok lolos |
| `recoveryFollowup.test.mjs` | 12 kelompok lolos |
| `geminiReviewIntegrity.test.mjs` | 12 kelompok lolos |
| `auditRemediationReproductions.test.mjs` | 10 kelompok lolos |
| `npm.cmd run typecheck` | Lolos, kode keluar 0 |

Total yang diverifikasi ulang: **59 kelompok dalam lima suite**. Klaim 97 kelompok, build produksi, dan semua menu berfungsi berasal dari laporan Gemini; keseluruhan klaim itu tidak diverifikasi ulang pada pemeriksaan ini. Kelulusan uji di atas tidak membuktikan semua API hidup atau semua alur pengguna benar.

### Bukti tambahan yang dapat dibaca Gemini

- Reproduksi layanan dengan fixture: `D:\Blender\test 1\harmony-web-check\2026-10-03-post-remediation-review\evidence.json`.
- Skrip reproduksi: `D:\Blender\test 1\harmony-web-check\2026-10-03-post-remediation-review\reproduce.mjs`.
- Pemeriksaan HTTP dan browser: `D:\Blender\test 1\harmony-web-check\2026-10-03-post-remediation-review\public-and-provider-audit.json`.
- Audit sebelumnya: `docs/HARMONY_GEMINI_AUDIT_DATA_DAN_API_2026-10-03.md`. Ini catatan historis; jangan menganggap seluruh masalahnya masih sama setelah perubahan.

### Kondisi publik saat pemeriksaan

| Endpoint/halaman | Bukti yang terlihat | Batas kesimpulan |
|---|---|---|
| `/api/spatial/hotspots` | HTTP 404, HTML | Rute publik belum tersedia; belum membuktikan API key FIRMS kedaluwarsa |
| `/api/spatial/traffic/flow` | HTTP 404, HTML | Rute publik belum tersedia; belum membuktikan TomTom menolak key |
| `/api/spatial/weather/current` | HTTP 200 JSON, `success:true` | Respons diterima; akurasi prakiraan belum divalidasi |
| `/api/bmkg/gempa/terkini` | HTTP 200 JSON, `success:true` | Respons diterima; validasi setiap rekaman masih perlu diperbaiki |
| USGS `2.5_day` | HTTP 200, 36 fitur | Feed tersedia saat diperiksa |
| RainViewer metadata | HTTP 200, 13 frame radar lampau | Metadata tersedia; belum membuktikan tile berhasil dirender pada peta |
| Open-Meteo Indonesia dan London | HTTP 200, nilai suhu tersedia | Dua lokasi berhasil; bukan bukti setiap negara/lokasi berhasil |
| `/app/maps` | Menampilkan `11-Domain` dan `2025 - 2026 (Live Terverifikasi)` | Versi publik berbeda dari pekerjaan lokal; label verifikasi terlalu luas |

Tidak ada `pageerror` pada pembukaan halaman peta publik yang diperiksa. Ini bukan pengujian interaksi seluruh menu.

---

# Prompt untuk dikirim ke Gemini

Kamu mengerjakan proyek Harmony di `D:\vscode\Harmony`. Perbaiki sisa masalah hasil pekerjaan sebelumnya secara bertahap, berdasarkan kode dan bukti. Fokus pada web dan aliran data, bukan PPT atau esai.

## 1. Batas pekerjaan dan cara memulai

1. Baca instruksi repositori yang berlaku, status Git, audit sebelumnya, laporan perubahanmu sebelumnya, dan bukti pemeriksaan dalam dokumen ini. Jangan menyimpulkan selesai hanya karena tes yang kamu tulis lolos.
2. Buat rencana perubahan per kelompok masalah, daftar file, dampak terhadap pemanggil, dan cara membuktikan perbaikan. Setelah itu laksanakan perbaikan dalam lingkup ini.
3. Repositori memiliki banyak perubahan belum di-commit dan backup. Jangan reset, restore massal, clean, menghapus backup, menimpa pekerjaan pengguna, atau mengganti aplikasi dengan versi ringkas.
4. Pertahankan menu, fitur 2D/OpenLayers, Three.js, Cesium, katalog, sumber data, serta navigasi dalam panel yang sudah disatukan. Nama menu cuaca tetap **Peta Cuaca**. Jangan menambah tombol duplikat di depan peta.
5. Perbaiki konektor sumber yang rusak; jika penyedia berubah, migrasikan adapter berdasarkan dokumentasi resmi dan pertahankan identitas sumber serta alasan pergantian. Jangan menghapus sumber hanya agar angka keberhasilan terlihat bagus.
6. Jika kredensial tidak tersedia, laporkan `NOT_CONFIGURED` dan nama variabel yang dibutuhkan, bukan data simulasi pengganti. Jangan mengarang atau menampilkan nilai key/token.
7. Jangan commit, push, atau deploy otomatis. Siapkan perubahan dan bukti lokal. Bedakan hasil lokal dari versi publik.

## 2. Kontrak aliran data yang wajib dipakai

Telusuri untuk setiap menu: **aksi pengguna → lokasi/AOI dan waktu → adapter provider → HTTP/body → validasi produk → normalisasi → cache/snapshot → perhitungan → layer/panel/ekspor**.

Status HTTP, status pekerjaan, dan status kualitas/ketersediaan data merupakan hal berbeda. HTTP 200 tidak cukup untuk menyatakan data berhasil. Rendering peta dasar tidak cukup untuk menyatakan semua sumber hidup.

Setiap hasil perlu mengandung identitas permintaan, identitas snapshot data, provider dan produk, lokasi/AOI, variabel dan satuan, waktu data, waktu upaya terakhir, waktu pengambilan yang terakhir berhasil, status data, cakupan, alasan kegagalan, dan jejak upaya per sumber. Tipe status harus konsisten di backend, frontend, layer, tooltip, dan ekspor.

- `EMPTY`: permintaan yang relevan berhasil dan tervalidasi, dengan nol hasil dalam cakupan yang dijelaskan.
- `PARTIAL`: sebagian sumber, variabel, rentang waktu, atau rekaman tidak tersedia/ditolak; jelaskan bagian yang hilang.
- `STALE`: menampilkan snapshot lama setelah umur data melewati batas atau pembaruan gagal. Jangan memperbarui waktu data lama menjadi waktu sekarang.
- `UNAVAILABLE`: tidak memiliki data yang valid untuk kebutuhan tersebut.
- `CATALOG`/`STATIC`: referensi atau inventaris, bukan pemantauan langsung.
- `EXTERNAL`: tampilan layanan luar; jangan mengaku sudah mengaudit isi iframe.
- `SIMULATION`: demonstrasi yang dipilih pengguna, terpisah dari hasil operasional.
- `CANCELLED`: pengguna membatalkan pekerjaan; bukan bukti provider gagal.

Istilah LIVE perlu mempunyai definisi per produk dan batas umur data. Untuk prakiraan, tuliskan prakiraan model beserta waktu berlaku dan waktu model jika tersedia; jangan menyebutnya observasi sensor langsung. Jangan menyatakan akurasi tervalidasi sebelum ada evaluasi terhadap data pembanding.

## 3. Perbaikan prioritas berdasarkan temuan

### P0-A — Percakapan navigator masih membuat klaim keselamatan tanpa data

**Lokasi:** `apps/web/src/components/dashboard/views/spatial/RouteNavigatorModal.tsx`, terutama `handleSendQuery` sekitar baris 107–140; `apps/web/src/services/routingService.ts`, `evaluateHazards` sekitar baris 134–215; `apps/web/src/services/volcanoService.ts`.

**Masalah yang terlihat:**

- Saat belum ada rute, jawaban lokal mengatakan cuaca sekitar terpantau kondusif.
- Saat tidak ada `volcanoHazardSummary`, jawaban menyatakan tidak terdeteksi ancaman vulkanik atau kegempaan dan jalur aman. Ketiadaan ringkasan tidak membuktikan ketiadaan bahaya; alur ini tidak memeriksa gempa untuk klaim tersebut.
- Jawaban generik menyebut lokasi terhubung jaringan sensor meteorologi tanpa pemeriksaan koneksi.
- Service kini memberi label `Belum Dinilai` tanpa cuaca, tetapi masih memberikan skor 75/100 dan rekomendasi 60 km/jam. Reproduksi menunjukkan nilai itu tetap muncul.
- Gunung api sudah diberi status baseline tidak terverifikasi, tetapi penilaian rute masih memakai `v.level` katalog lama untuk menghasilkan peringatan aktivitas/radius bahaya.
- Hanya dua angka hujan dan angin dianggap cukup untuk mengklaim kondisi sepanjang rute, tanpa asal data, lokasi, waktu, cakupan koridor, atau model validasi keselamatan.

**Perbaikan:**

1. Buat jawaban navigator berdasarkan hasil terstruktur dan provenance yang benar-benar tersedia. Jika belum ada rute/data, sampaikan kebutuhan data tersebut.
2. Gunakan `null` untuk skor keselamatan atau rekomendasi kecepatan yang belum dapat dinilai; ubah tipe, kartu, chat, dan ekspor yang bergantung padanya. Jangan menjadikan angka default seolah hasil analisis.
3. Pertahankan katalog gunung api sebagai konteks kedekatan geografis. Level/radius aktivitas hanya boleh menjadi input operasional setelah berasal dari buletin resmi, berlaku pada waktu terkait, dan terverifikasi. Jangan membuat prediksi gempa atau jaminan jalur evakuasi.
4. Jika analisis koridor belum tersedia, tampilkan rute jalan dan keterbatasan penilaiannya. OSRM menghasilkan geometri/durasi jaringan jalan, bukan validasi keselamatan bencana.
5. Tolak metrik OSRM negatif dan koordinat geometri tidak numerik/tidak terbatas/tidak valid. Reproduksi sekarang menerima jarak **-1 km** dan durasi **-10 menit** sebagai `ROAD_NETWORK`.
6. Uji percakapan pengguna sebenarnya: belum pilih tujuan, belum ada rute, cuaca tidak tersedia, hanya satu parameter tersedia, katalog gunung api tidak terverifikasi, fallback geodesi, dan hasil OSRM rusak. Jangan hanya menguji string `safetyLevel`.

### P0-B — Jendela kualitas udara masih memasukkan masa depan

**Lokasi:** `apps/web/src/services/geospatial/ispuCalculatorService.ts:128`; `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx:1808`; `apps/web/src/services/weatherAggregatorService.ts:287`.

**Bukti:**

- UI mengirim `allowFutureHours: !hasHistorical`. Saat riwayat tidak ada, helper memakai seluruh deret prakiraan tanpa batas akhir.
- Reproduksi 48 titik, satu pada anchor dan 47 setelahnya, menghasilkan rata-rata **98,13**, `validSamples:48`, kecukupan/coverage 100%, tetapi label jendelanya 24 jam lampau.
- Batas `>= anchor-24 jam` dan `<= anchor` menerima **25 titik per jam**, bukan 24; reproduksi menghasilkan rata-rata 19,6 dari jendela yang dilabeli 24 jam.
- Anchor numerik detik tidak dinormalisasi seperti timestamp sampel; waktu berubah menjadi tahun **1970**.

**Perbaikan:**

1. Pisahkan perhitungan historis dari estimasi prakiraan. Hilangnya riwayat tidak boleh membuka batas atas waktu pada rata-rata historis.
2. Untuk data titik per jam, tetapkan interval yang jelas, misalnya `(anchor-24 jam, anchor]`, atau gunakan representasi interval dan pembobotan waktu yang terdokumentasi. Jangan memasukkan kedua endpoint tanpa menyesuaikan jumlah sampel.
3. Normalisasi detik/milidetik/string secara konsisten untuk anchor dan titik, atau gunakan tipe eksplisit yang menghindari tebakan satuan. Anchor tidak valid tidak boleh diam-diam diganti waktu sekarang.
4. Hitung coverage dari jam/interval yang benar-benar tersedia. Jangan menyembunyikan kelebihan sampel dengan menjepit rasio ke 100%.
5. Riwayat CAMS lewat `past_days` tetap keluaran model. Jangan menyebutnya observasi aktual stasiun atau ISPU resmi. Bila menampilkan indeks turunan model, beri label estimasi dan jelaskan parameter yang tersedia.
6. Verifikasi aturan periode rata-rata dan kategori indeks terhadap dokumentasi resmi indeks yang dipilih sebelum mengklaim sesuai standar. Jangan mencampur AQI dan ISPU.
7. Uji melalui alur modal: riwayat hilang, sebagian kosong, 25 endpoint, duplikasi jam, waktu tak terurut, format detik/milidetik, serta deret masa depan panjang. Tes R6 saat ini hanya menguji helper dengan opsi default; itu belum mencakup fallback UI.

### P0-C — Validasi kalender gempa dan hotspot belum ketat

**Lokasi:** `apps/web/src/services/geospatial/earthquakeSnapshotService.ts:1` dan `:16`; `apps/web/src/services/hotspotFireService.ts:351`; backend `apps/server/src/services/firmsIntegrity.js`.

**Bukti:**

- `isValidBmkgRecord` menerima `2026-99-99T99:99:99Z`. Regex awalan tanggal mengalahkan kegagalan parse.
- Validator USGS menerima `type:'not-a-FeatureCollection'` serta waktu kejadian esok hari pada fixture.
- Frontend FIRMS menerima **31 Februari**, jam **9999**, confidence **999**, dan memberi status **LIVE**.
- Backend FIRMS sudah melakukan pemeriksaan tanggal/jam lebih ketat; ketatnya backend tidak membenarkan frontend menerima kontrak rusak.

**Perbaikan:**

1. Parser waktu harus memeriksa tanggal kalender, jam/menit/detik, zona waktu, dan konversi bolak-balik. Format BMKG lokal yang memang dipakai harus diparse secara eksplisit dengan WIB, bukan tergantung `Date.parse` sistem.
2. Periksa bentuk koleksi dan fitur GeoJSON. Validasi waktu kejadian terhadap waktu permintaan dengan toleransi jam yang masuk akal dan terdokumentasi; jangan mengarang rekaman dari masa depan.
3. Validasi confidence sesuai produk: rentang numerik MODIS atau kategori VIIRS. Jangan menganggap keduanya skala yang sama.
4. Rekaman tidak valid dihitung sebagai ditolak. Semua ditolak harus menjadi kegagalan validasi, bukan EMPTY yang terverifikasi. Rekaman campuran harus menghasilkan status/keterangan parsial yang tepat.
5. Pertahankan `source`, `acquisitionTime`, instrumen, waktu UTC, dan identitas produk pada rekaman hasil normalisasi.
6. Tambahkan kasus kalender kabisat, tanggal mustahil, jam di luar batas, format WIB, confidence di luar rentang, dan koleksi rusak. Tes koordinat saja tidak cukup.

### P0-D — Audit FIRMS kehilangan jumlah dan identitas upaya

**Lokasi:** `apps/server/src/services/firmsIntegrity.js`, konstruksi `attempt`; `apps/web/src/services/hotspotFireService.ts:443`, pemetaan `sourceAttempts`.

**Bukti integrasi adapter:** backend nyata dengan fetch fixture menghasilkan `acceptedCount:1`; snapshot frontend juga mempunyai satu deteksi valid, tetapi `sourceAttempts[0].validCount` menjadi **0**. Backend tidak menyediakan field per-upaya yang dicari frontend. Pemetaan frontend juga membuang `bbox`, `date`, `dayRange`, dan `rejectedCount`.

**Perbaikan:**

1. Tetapkan satu schema upaya backend/frontend: request/attempt ID, produk, bbox, interval, status HTTP, jumlah diterima, valid hasil parsing, ditolak, di luar wilayah/waktu, duplikat, dan diterima setelah filter. Jelaskan apakah hitungan per-upaya atau gabungan.
2. Jangan mengganti count yang tidak diketahui menjadi nol. Gunakan null/unknown beserta alasan, atau tambahkan hitungan benar pada backend.
3. Pertahankan identitas upaya saat satu produk dipanggil pada beberapa bbox atau rentang hari. Jumlah gabungan setelah deduplikasi tidak harus sama dengan penjumlahan semua count per-upaya; dokumentasikan relasinya.
4. Status gabungan harus konsisten dengan status seluruh upaya dan hasil validasi. Flag `success`/`partial` yang kontradiktif tidak boleh menghasilkan badge hijau.
5. Uji backend → frontend → panel audit menggunakan output backend yang sebenarnya, bukan fixture buatan yang menambahkan field yang tidak pernah dikirim backend.

### P0-E — Status snapshot belum sampai ke seluruh tampilan peta

**Lokasi:** `apps/web/src/components/dashboard/views/spatial/MapsView.tsx:1643`, pemanggilan `CesiumGlobe3D` sekitar baris 3868; `map/MapLayerManager.tsx:42`; `CesiumGlobe3D.tsx:17` dan `:157`.

**Masalah:**

- Layer gempa memakai `earthquakes.length > 0 ? 'LIVE' : 'UNAVAILABLE'`. Snapshot STALE/PARTIAL yang berisi rekaman tetap tampak LIVE; EMPTY yang berhasil malah tampak tidak tersedia.
- `MapLayerManager` belum memiliki seluruh status snapshot seperti EMPTY/PARTIAL/STALE dalam tipenya.
- Cesium sudah menerima prop opsional `quakeSnapshot` dan `hotspotSnapshot` serta badge, tetapi pemanggil di MapsView hanya mengirim array rekaman. Badge kualitas itu tidak tampil dari pemanggilan tersebut.
- Data digitasi pengguna juga perlu dibedakan dari pemantauan LIVE.

**Perbaikan:**

1. Ambil status, waktu, alasan, cakupan, dan count dari snapshot yang sama; jangan menghitung ketersediaan dari panjang array.
2. Sambungkan prop snapshot ke Cesium dan pastikan Three.js, 2D, pengelola layer, inspector, serta panel audit memakai identitas data yang konsisten.
3. EMPTY harus menjelaskan produk, wilayah, dan periode yang diperiksa. Jangan menafsirkannya sebagai tidak ada bahaya di bumi.
4. Tampilkan umur data STALE dan waktu kejadian terpisah dari waktu pengambilan. Pertahankan marker lama bila berguna dengan label yang benar.
5. Uji pergantian mode 2D ↔ Three.js ↔ Cesium untuk LIVE/EMPTY/PARTIAL/STALE/UNAVAILABLE, termasuk sesudah mengganti AOI saat permintaan sebelumnya masih berjalan.

### P1-F — Respons HTML dan kegagalan aplikasi masih masuk cache API

**Lokasi:** `apps/web/src/services/apiClient.ts:36` dan `:96`; pemanggil endpoint spatial terkait.

**Bukti:** HTTP 200 `text/html` dikembalikan sebagai string dan disimpan cache; dua GET hanya melakukan satu fetch. Respons JSON `{success:false}` juga disimpan cache sebagai hasil normal. Pemisahan abort caller dari request bersama sudah membaik dan harus dipertahankan.

**Perbaikan:**

1. Untuk endpoint yang kontraknya JSON, wajib periksa tipe konten dan schema/envelope. Jangan mengubah semua endpoint menjadi JSON jika ada endpoint unduh sah; gunakan adapter/opsi kontrak yang tepat.
2. Kegagalan envelope tidak boleh masuk cache data sukses. Cache kegagalan untuk backoff, bila diperlukan, harus bertipe kegagalan dengan TTL dan alasan tersendiri.
3. Tambahkan deadline yang mencakup fetch dan pembacaan body, identitas request untuk cleanup cache, serta pembatalan jaringan ketika tidak ada konsumen tersisa. Jangan membuat request bisa menggantung tanpa batas.
4. Uji HTML 200, JSON rusak, JSON success:false, body yang macet sesudah header, kesalahan request lama sesudah request baru dimulai, dan pembatalan salah satu konsumen.

### P1-G — Pembatalan dan timeout snapshot belum lengkap

**Lokasi:** `apps/web/src/services/geospatial/earthquakeSnapshotService.ts:205`, `:260`, `executeFetch`; subscription snapshot; `weatherDataIntegrity.ts`.

**Bukti:** dalam satu permintaan bersama, caller A dibatalkan dan caller B tetap aktif; A masih menerima hasil **EMPTY** alih-alih ditolak dengan AbortError. `executeFetch` juga tidak mempunyai deadline sendiri, sehingga satu sumber yang macet dapat menahan `Promise.allSettled`.

**Perbaikan:** gunakan controller jaringan bersama dan pembatalan per-konsumen. Caller yang batal harus berhenti menunggu, sementara konsumen lain tetap mendapatkan hasil. Jaga penghitungan konsumen dan listener agar request lama tidak mengubah request baru. Beri deadline sumber/body serta total pekerjaan. Unsubscribe terakhir harus melepaskan pekerjaan yang tidak lagi dibutuhkan. Pembatalan pengguna tidak boleh mengubah audit kesehatan provider menjadi FAILED. Pertahankan hasil parsial sumber yang berhasil dengan alasan timeout sumber lain.

### P1-H — GNSS masih mencampur rekaman perangkat dan simulasi

**Lokasi:** `apps/web/src/components/dashboard/views/spatial/studio/GeospatialPositioningTab.tsx:70` dan `:142`; `apps/web/src/services/geospatialAnalysisService.ts:96`, `:585`, `:609`.

**Masalah:** timer menambahkan posisi terakhir setiap detik dengan waktu sekarang, sekalipun tidak ada fix baru. Setelah sensor error, perekaman berpindah otomatis ke `Math.random`. Titik track tidak menyimpan asal data/mode; satu track dan ekspor dapat berisi titik perangkat serta titik simulasi tanpa pembeda. Sebelum callback GPS pertama, klik berulang juga dapat membuat beberapa watch karena state aktif belum disetel. Sebagian label tetap menyebut sensor GPS asli pada posisi peta/simulasi.

**Perbaikan:**

- Rekam fix valid berdasarkan timestamp callback, accuracy, dan freshness; jangan mengarang fix baru setiap detik dari posisi lama.
- Pisahkan state permission, connecting, tracking, stale, error, dan stopped. Hentikan watch sebelumnya dan bersihkan saat error/unmount sesuai kebijakan yang jelas.
- Jika perangkat gagal, hentikan/jeda rekaman perangkat. Simulasi harus dipilih secara eksplisit dan dipisahkan per sesi atau segmen berlabel.
- Simpan mode/source, waktu fix asli, akurasi, dan informasi kualitas dalam track dan ekspor. Nilai altitude/heading/speed yang tidak tersedia tidak boleh dibuat seolah diukur.
- Browser Geolocation dapat menggunakan beberapa metode lokasi; jangan menjanjikan RTK atau penerimaan satelit langsung hanya karena `enableHighAccuracy:true`.
- Uji permission denied, timeout, fix sama berulang, perubahan mode, GPS error saat merekam, double click, unmount, dan ekspor campuran.

### P1-I — Ketiadaan inventaris fasilitas masih dianggap tidak terlayani

**Lokasi:** `apps/server/src/controllers/spatialController.js:934–979`; `apps/web/src/services/geospatial/networkAccessibilityService.ts`; `studio/GeospatialAccessibilityTab.tsx`; `tests/auditRemediationReproductions.test.mjs`, R8.

**Bukti:** transportasi tanpa inventaris mendapat `INSUFFICIENT_DATA` dan `hasAccess15Min:null`, tetapi juga dimasukkan ke `unservedCategories`; status kepatuhan gabungan menjadi false. R8 secara eksplisit mengharuskan klasifikasi ganda tersebut.

**Perbaikan:** pisahkan **belum diketahui** dari **sudah dievaluasi tetapi tidak terjangkau**. `unservedCategories` hanya berisi kategori yang benar-benar diuji dengan data memadai dan gagal kriteria yang dijelaskan. Kepatuhan gabungan harus mempunyai status `NOT_EVALUABLE`/null jika data belum cukup; jika diperlukan kompatibilitas, migrasikan schema dan semua pemanggil secara terencana. Jangan menyebut kategori tidak ada di input sebagai bukti fasilitas tidak ada di dunia nyata.

Metode Haversine × 1,35 dan kecepatan tetap masih perkiraan, bukan isochrone jaringan jalan. Pertahankan mode estimasi berlabel; untuk hasil jaringan jalan gunakan graph/routing/matrix yang benar. Ubah R8 berdasarkan kontrak domain yang benar, lalu pertahankan uji semua kondisi unknown, reachable, unreachable, dan campuran. Jangan menurunkan tes agar sekadar lolos.

### P1-J — MODIS masih diproses dan dilaporkan dengan identitas Landsat

**Lokasi:** `apps/web/src/services/geospatial/lstService.ts:58`, `:113`, `:127`, `:240`; alur pemilihan scene/raster di Remote Sensing.

**Bukti:** konversi DN MODIS 0,02 K sudah ditambahkan, tetapi provenance masih menyebut Landsat ST_B10 dengan resolusi 30 m; luas menggunakan 0,03 × 0,03 km. QA semua produk masih memakai bit Landsat QA_PIXEL. MODIS QA bernilai 01 ditolak sebagai fill/awan, padahal flag itu berarti LST diproduksi dengan kualitas lain yang perlu pemeriksaan rinci, bukan otomatis fill.

**Perbaikan:**

1. Pilih adapter berdasarkan ID koleksi/produk dan band, bukan nama satelit saja. Produk Landsat 7, 8/9, MODIS day/night mempunyai band/QA/metadata berbeda.
2. Gunakan scale/offset/nodata/QA dari produk yang benar, dengan kebijakan QA yang dijelaskan. QC MODIS memakai kelompok bit; jangan memakai decoder QA_PIXEL Landsat.
3. Provider, dataset, resolusi, metode, unit, dan luas piksel harus mengikuti scene/aset yang diproses. Uji provenance MODIS dan Landsat secara terpisah.
4. Clip dan mask berdasarkan geometri AOI; hash AOI saja tidak memotong raster. Verifikasi CRS/resolusi dan valid area. Jangan mengklaim raster piksel dibaca jika yang tersedia hanya metadata STAC/thumbnail.
5. Batas -20 sampai 75 °C tidak boleh dijadikan aturan universal untuk semua lokasi global tanpa dasar produk. Bedakan validitas radiometrik dari kategori tampilan.
6. QA yang tidak tersedia harus memiliki status/keterbatasan yang jelas. Jangan menyatakan semua piksel sudah bersih awan tanpa band QA.
7. Pastikan histogram menghitung setiap piksel valid tepat satu kali, termasuk data konstan dan tepi bin setelah pembulatan.

Rujukan: [MOD11A1 Collection 6.1 — band, skala, resolusi dan QC](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD11A1), [Panduan MOD11 NASA](https://modis-land.gsfc.nasa.gov/pdf/MOD11_User_Guide_V61.pdf).

### P1-K — Provider terdaftar/diperiksa belum tentu digunakan tampilan

**Lokasi:** `MapsView.tsx:686`, `:1045`, `:3719`; `geospatialDataTelemetryService.ts:161`; konektor traffic/radar; `weatherAggregatorService.ts:170–211`; `apiHealthService.ts` dan `stacService.ts`.

**Bukti pembacaan kode:**

- TomTom dipanggil pada pemeriksaan telemetry, tetapi alur traffic MapsView masih memanggil `simulateRealtimeTraffic`. Belum terbukti hasil TomTom dipakai panel koridor.
- Path RainViewer disimpan ke state, tetapi tidak ditemukan konsumsi `rainviewerPath`/`rainviewerSatellitePath` untuk membentuk layer tile pada kode aktif. Mendapat metadata bukan bukti overlay radar bekerja.
- Registry model memiliki BoM ACCESS-G dan CMA GRAPES. Laporan sebelumnya menuliskan ACCESS dan BoM sebagai dua model serta menghilangkan CMA.
- Request kualitas udara yang diperiksa meminta PM2.5, PM10, ozone; jangan melaporkan NO2/SO2/CO telah diambil pada alur tersebut tanpa menunjukkan request/pemakaian sebenarnya.
- Pemeriksaan kesehatan baru mempunyai empat target. ONLINE sebuah halaman katalog/backend tidak berarti seluruh produk/fitur sehat. Sebagian besar produk membutuhkan validasi endpoint masing-masing.
- STAC sudah memisahkan hasil metadata, tetapi pencarian belum menyediakan signing/refresh aset Planetary Computer dan jejak kegagalan setiap provider dalam hasilnya. Sukses search bukan sukses pembacaan raster.

**Perbaikan:**

1. Buat matriks setiap sumber: terdaftar, dikonfigurasi, dicoba, payload valid, digunakan oleh fitur mana, waktu/cakupan, dan hasil render/perhitungan. Semua kolom berasal dari bukti.
2. Sambungkan TomTom ke inspeksi ruas/koridor dengan koordinat pengguna, timestamp pengambilan, cakupan ruas, unit, confidence penyedia, dan status sumber. Jika belum tersedia, tampilkan unavailable; simulasi hanya dalam mode demo terpisah.
3. Sambungkan RainViewer melalui layer tile yang benar, host/path metadata, frame/time, atribusi, batas zoom/cakupan, dan event tile gagal. Jangan mengarang URL satelit ketika metadata tidak menyediakan produk itu. Pertahankan tampilan cuaca lain sesuai kontraknya.
4. Sinkronkan daftar model dengan registry sebenarnya. Kurangnya model di suatu lokasi harus dilaporkan sebagai coverage regional/tidak tersedia, bukan direplikasi dari model lain.
5. Bedakan health endpoint umum dari keberhasilan produk di AOI pengguna. Kembalikan salinan laporan yang tidak dapat dimutasi pemanggil.
6. Audit katalog/aset: koleksi yang didukung, pagination, waktu/AOI, pencarian sah kosong, provider gagal, COG terverifikasi, SAS kedaluwarsa, download/read raster. Jangan menyembunyikan error provider dengan catch kosong tanpa attempt record.

Rujukan: [Open-Meteo Air Quality API — keluaran CAMS dan past_days](https://open-meteo.com/en/docs/air-quality-api). Riwayat model tetap berbeda dari pengamatan stasiun.

### P1-L — Versi publik, error API, dan kredensial perlu diagnosis yang terpisah

**Lokasi:** `vercel.json`, `api/index.js`, registrasi router di `apps/server/src/server.js`, route spatial/BMKG, adapter provider, dan konfigurasi hosting.

1. Reproduksi `/api/spatial/hotspots` serta `/api/spatial/traffic/flow` pada server lokal dan build/preview yang sesuai. Keduanya masih 404 HTML di situs publik saat pemeriksaan. Cari apakah router belum terpasang, kode lama, base URL salah, atau rewrite serverless tidak sesuai.
2. Jangan menyebut 404 tersebut sebagai API expired. Key kedaluwarsa/ditolak perlu bukti HTTP/error penyedia yang relevan; 403 juga bisa berarti scope, billing, atau batas akses.
3. Bedakan `NOT_CONFIGURED`, unauthorized credential, forbidden/scope, rate limit, timeout, provider unavailable, schema changed, endpoint missing, dan cancelled. Simpan alasan aman tanpa URL berkredensial.
4. Untuk 429 hormati Retry-After bila tersedia, gunakan retry terbatas dan jitter; untuk auth jangan mencoba ulang tanpa perubahan credential. Untuk gangguan sementara gunakan backoff terbatas dan snapshot STALE berlabel, bukan success palsu.
5. Credential hanya dipakai sesuai model akses penyedia. Jangan menaruh secret FIRMS/TomTom pada bundle browser. Token browser Cesium, jika dibutuhkan, harus dibatasi scope/domain dan jangan diperlakukan seperti secret server.
6. Untuk SAS Planetary Computer yang kedaluwarsa, gunakan proses signing/refresh resmi dengan retry terbatas, identitas aset tetap, dan validasi hasil raster sesudah URL diperbarui. Jangan menghapus provider sebagai jalan keluar.
7. Hindari badge global `Live Terverifikasi` untuk rentang 2025–2026 yang tidak berasal dari audit produk. Peta dasar, tahun referensi, status backend, dan freshness setiap layer harus dibedakan.
8. Buat daftar apa yang perlu dilakukan ketika deployment diizinkan, tetapi jangan deploy dalam tugas ini. Perbaikan lokal tidak mengubah situs publik dengan sendirinya.

## 4. Cakupan dunia dan cara mengolah cuaca yang benar

Pengguna ingin memahami kondisi bumi dengan banyak sumber. Jangan menerjemahkannya menjadi permintaan semua negara dan semua titik bumi dari browser pada setiap klik.

- Interaksi peta meminta data berdasarkan titik/AOI/viewport dan rentang waktu, dengan cache yang mencakup provider, produk, koordinat/geometry, variabel, unit, waktu, dan versi.
- Pemantauan global memerlukan layanan backend terjadwal, strategi pembagian wilayah/resolusi, kuota, penyimpanan, deduplikasi, waktu per produk, dan coverage map. Buat rencana berdasarkan kemampuan produk yang benar-benar tersedia; jangan mengklaim pipeline global telah dibuat jika baru mengambil titik pilihan.
- Asal negara/lembaga model tidak berarti Harmony mengunduh seluruh negara itu. Angin, awan, suhu, tekanan, kelembapan, dan hujan harus disejajarkan berdasarkan lokasi, waktu berlaku, unit, dan level atmosfer.
- Jangan menjadikan rata-rata suhu beberapa model sebagai bukti peningkatan akurasi. Spread antar-model adalah ukuran kesepakatan/ketidakpastian, bukan validasi terhadap kebenaran.
- Pertahankan setiap sumber beserta coverage dan statusnya. Lebih banyak sumber hanya membantu jika relevan, valid, dan diproses dengan benar; jangan menambah data rusak pada gabungan demi jumlah.
- Cloud/thermal visualization harus menjelaskan apakah berasal dari radar, citra infrared, model cuaca, atau LST satelit; produk tersebut tidak saling menggantikan secara otomatis.

## 5. Pengujian yang harus membuktikan alur, bukan sekadar label

Mulai dengan reproduksi yang gagal pada kode sekarang, lalu perbaiki layanan dan pemanggil. Jalankan uji regresi yang relevan serta gate proyek. Jangan mengubah assertion domain menjadi salah agar kompatibel dengan implementasi keliru.

### Uji otomatis minimum

- Semua 14 reproduksi pada evidence.json harus memiliki pengujian kontrak yang benar. Fixture hanya data uji, bukan hasil live.
- HTTP 200 dengan HTML, envelope gagal, field null, angka string yang dilarang schema, nilai negatif/tidak terbatas, tanggal invalid, waktu masa depan, dan body yang menggantung.
- Snapshot LIVE/EMPTY/PARTIAL/STALE/UNAVAILABLE dan cancelled; waktu data lama tidak diperbarui saat gagal; AOI berbeda tidak saling menimpa.
- Dua konsumen satu request, salah satu batal, semua batal, unsubscribe, request lama selesai sesudah request baru, dan timeout salah satu sumber.
- Output backend FIRMS asli diproses frontend dan panel dengan hitungan/attempt yang konsisten.
- ISPU melalui opsi yang benar-benar dipakai UI; navigator melalui pertanyaan tanpa data; GNSS melalui callback/failure/mode; akses fasilitas unknown; provenance/QA MODIS vs Landsat.
- Typecheck dan build produksi. Jalankan seluruh suite proyek pada lingkungan terisolasi bila suatu uji menulis persistent job/database; jangan mencemari data pengguna untuk audit.

### Uji browser minimum

1. Jalankan frontend/backend lokal yang tepat; catat versi dan base URL. Jika sudah ada proses pengguna, gunakan port terpisah bila diperlukan.
2. Buka tiap domain/menu dari panel terpadu, uji tombol, ubah lokasi/AOI, lihat network response serta hasil panel/layer. Jangan menghapus menu yang gagal.
3. Bandingkan 2D, Three.js, Cesium dengan snapshot yang sama dan simulasikan kegagalan refresh.
4. Periksa traffic yang memakai data sumber, radar beserta tile yang benar-benar terambil, pembacaan raster/hasil indeks, aksesibilitas, ekspor, dan dialog error.
5. Labeli pengujian mocked secara jelas. Pisahkan bukti request sungguhan dari intersepsi respons.
6. Pilih titik uji representatif di Indonesia dan beberapa benua, wilayah laut, koordinat nol, dekat antimeridian, dan batas produk. Hasil satu titik tidak membuktikan seluruh cakupan global; unsupported harus dilaporkan jujur.
7. Catat dataTime/fetchedAt, status HTTP, reason code, coverage, dan jumlah. Screenshot saja tidak membuktikan payload valid.

## 6. Rencana perubahan yang diharapkan

Urutan kerja:

1. Perbaiki kontrak dan tampilan klaim keselamatan, validasi tanggal, jendela kualitas udara, serta audit FIRMS.
2. Sambungkan status snapshot ke semua mode peta dan pengelola layer.
3. Benahi lifecycle request/cache, perekaman GNSS, semantik aksesibilitas, dan adapter LST.
4. Sambungkan provider yang sudah ada ke fitur yang benar-benar memakainya; perbaiki health/error handling serta persiapan rute serverless.
5. Jalankan pengujian kontrak dan browser, lalu perbarui laporan berdasarkan bukti.

Penambahan yang boleh dilakukan: schema/adapter produk, parser waktu, provenance, status/kode alasan, retry terbatas, pengujian yang menangkap kesalahan nyata, dan indikator kualitas dalam panel yang sudah ada.

Penggantian yang diperlukan: jawaban keselamatan hardcoded, status berdasarkan panjang array, jendela waktu tanpa batas, metadata produk salah, fallback yang menyamarkan kegagalan, dan assertion yang menyamakan unknown dengan tidak terlayani.

Yang dihapus hanya klaim atau cabang rusak yang digantikan implementasi benar. Jangan menghapus katalog, provider, menu, renderer, atau data pengguna. Simulasi yang berguna tetap tersedia sebagai mode demonstrasi yang dipilih secara eksplisit dan berlabel.

## 7. Format laporan akhir Gemini

Berikan laporan yang bisa diperiksa:

1. Tabel masalah → perubahan file/fungsi → hasil sebelum/sesudah → bukti test/browser → batas yang masih ada.
2. Daftar penambahan, penggantian, dan penghapusan beserta alasannya.
3. Matriks provider: configured, attempted, valid, actual used, cakupan/waktu, reason bila gagal. Bedakan sensor, model, katalog, dan demo.
4. Hasil perintah beserta exit code dan jumlah suite aktual. Bedakan unit/fixture, integrasi adapter, browser lokal, dan request provider sungguhan.
5. Status tiap menu/domain: berfungsi dan diuji, sebagian, belum terhubung, memerlukan credential, atau belum diuji. Jangan tulis 100% bila ada syarat/bukti yang belum dipenuhi.
6. Perbedaan lokal vs publik dan kebutuhan konfigurasi/deployment yang masih menunggu.
7. Permasalahan yang tidak dapat diselesaikan tanpa credential/layanan berbayar/data resmi harus dinyatakan secara spesifik, dengan fitur tetap tersedia dan error yang jujur.

Tujuan akhir: setiap angka, marker, status berhasil, dan kesimpulan pada Harmony dapat ditelusuri ke sumber, produk, lokasi, waktu, dan validasi yang benar. Perbaikan tidak boleh membuat audit palsu atau mengurangi fitur untuk menyembunyikan masalah.
