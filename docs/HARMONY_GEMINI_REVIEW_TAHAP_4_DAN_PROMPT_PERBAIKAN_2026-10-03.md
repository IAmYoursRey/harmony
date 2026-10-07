# Harmony — Review hasil Gemini tahap 3 dan prompt tahap 4

Tanggal pemeriksaan: 3 Oktober 2026. Proyek: `D:/vscode/Harmony`.

## Kesimpulan pemeriksaan

**Perbaikan tahap 3 belum selesai.** Beberapa kasus sebelumnya sudah diperbaiki, tetapi generator suhu sintetis masih berada pada jalur analisis yang diberi identitas Landsat/USGS. Perubahannya mengganti seed sinus dari nomor baris/kolom menjadi koordinat lokasi. Itu membuat angka antarlokasi berbeda tanpa menghubungkan pembacaan raster satelit.

Review ini hanya membaca dan menguji aplikasi, serta membuat dokumen dan bukti pemeriksaan. Tidak ada kode aplikasi yang diubah atau deployment yang dilakukan oleh reviewer.

### Perbaikan yang sudah masuk

- Scene kosong dengan preset EMPTY menghasilkan UNAVAILABLE dan alasan NO_SCENE_SELECTED. Browser mengonfirmasi keadaan ini.
- Scene Sentinel yang dipilih langsung dari STAC ditolak oleh handler LST.
- Mask cirrus QA_PIXEL bit 2 sudah diperbaiki.
- Ekspor LST sudah berbentuk FeatureCollection, dengan ekspor metadata JSON terpisah.
- Hasil LST direset saat dependency lokasi/AOI/koleksi berubah.
- Signer STAC menolak AbortError dan tidak lagi mengembalikan URL asal pada kegagalan signing yang tertangkap.
- Tombol traffic memakai `/api/spatial/traffic/flow`, menolak kecepatan kosong, dan membedakan error jaringan dari NOT_CONFIGURED pada kasus yang diuji.
- GET baru setelah mutation tidak lagi bergabung dengan flight generasi lama pada kasus normal.
- Header bahasa berbentuk record sudah membedakan cache.
- Pemilihan Angin dari panel utama beralih ke renderer Windy. Browser mengonfirmasi adanya satu iframe pada alur itu.

### Masalah yang masih terbukti

| Prioritas | Bagian | Hasil aktual | Mengapa belum selesai |
|---|---|---|---|
| P0 | LST dengan scene Landsat | 49 piksel, suhu sekitar 29°C, DERIVED, provenance USGS, **0 request raster** | Angka berasal dari generator koordinat, bukan asset scene |
| P0 | Asset LST kosong/gagal | Scene tanpa asset maupun asset fixture yang tidak tersedia tetap menghasilkan DERIVED | Keberadaan/akses/isi raster dan QA tidak menentukan keberhasilan |
| P0 | Preset Demo Sentinel-2 | Tombol LST menghasilkan Landsat 9, DERIVED, provider USGS | Guard hanya menolak preset EMPTY; preset nontermal melewati guard |
| P1 | Identitas Landsat | Scene LE07 diberi nama Landsat 9/TIRS-2 | Platform ditentukan dengan kondisi LC08 atau selain itu Landsat 9 |
| P1 | Traffic request berulang | Respons request lama untuk ID koridor yang sama menimpa respons baru | Global variable hanya menyimpan ID koridor, bukan identitas request |
| P1 | Payload traffic | Confidence -3, roadClosure string `false`, geometri kosong masih LIVE | Yang divalidasi hanya dua angka kecepatan; string `false` menjadi boolean true |
| P1 | Cache late failure envelope | GET lama success:false menghapus cache generasi baru | Jalur success:false masih menghapus cache tanpa guard |
| P1 | Cache late abort | Abort request lama pada generasi sama menghapus cache request penggantinya | Guard generation tidak menggantikan guard pemilik cache/request |
| P1 | Header request | Headers dan tuple tidak mengirim Accept-Language/Accept yang dipakai pada signature cache | Normalisasi hanya dilakukan saat membuat key; fetch masih object spread |
| P1 | Drawer cuaca | Pilih Suhu pada mode native: **0 iframe**, pilihan aktif, header LIVE | Handler di drawer melewati aturan kapabilitas pada panel utama |
| P1 | Status radar | Path metadata menjadi dasar LIVE; refresh gagal hanya menulis console warning | Belum ada state kegagalan refresh dan bukti tile sukses sebagai dasar status |
| P1 | Laporan deployment | Menyatakan penyebab 404 pasti deployment lama | Versi deployment/log cloud belum dibuktikan |

Pada handler saat ini sekitar baris 218–225 masih terdapat:

```ts
const geoSeed = Math.sin(pLat * 12.9898 + pLng * 78.233) * 43758.5453;
const delta = (geoSeed - Math.floor(geoSeed)) * 1600 - 800;
const rawDN = Math.round(44800 + delta);
// ...
qaPixel: 0
```

Generator tersebut dijalankan juga ketika scene Landsat dipilih. `isDemo` hanya bergantung pada preset `landsat9_thermal`. Scene STAC Landsat dengan preset EMPTY masuk jalur DERIVED meskipun tidak ada raster yang dibaca.

**Bukti browser:** memakai metadata scene fixture berlabel `LC09_L2SP_REVIEW_FIXTURE`, dengan dua asset termal/QA yang sengaja tidak tersedia, aplikasi menghasilkan 29,17°C dan DERIVED. Tidak ada request ke kedua asset. Preset Demo Sentinel-2 juga menghasilkan 29,17°C dengan provenance USGS. Ini adalah bukti perilaku aplikasi terhadap fixture, bukan pengamatan suhu bumi.

**Bukti cache:** setelah cache versi baru tersimpan, kegagalan lama membuat pembacaan berikutnya melakukan request ketiga. Jumlah yang benar pada kedua reproduksi tersebut adalah dua request GET.

### Batas dan hasil verifikasi

- Delapan suite terarah: **98 kelompok uji lulus**, seluruh exit code 0. Termasuk 11 kasus pada `tests/evidenceStage3.test.mjs` yang baru dibuat Gemini.
- TypeScript typecheck: exit code 0.
- Sepuluh reproduksi tambahan pada handler/service saat ini. Seluruh masukan sintetis diberi label fixture dalam evidence.
- Browser lokal: scene kosong, preset optik, pencarian/pemilihan metadata Landsat fixture, ekspor metadata, lebar halaman desktop/ponsel, serta dua jalur pilihan parameter cuaca. Tidak ada uncaught page error pada pengujian terakhir yang berhasil.
- Lebar dokumen pada viewport 390 piksel adalah 390 piksel. Ini pemeriksaan overflow horizontal, bukan penilaian bahwa semua elemen ponsel sudah sempurna.
- Probe publik terbaru: cuaca 200 JSON success:true; traffic/hotspots tetap 404 HTML. RainViewer metadata 200 dengan 13 frame radar lampau dan nol frame infrared.
- Review ini **tidak menjalankan ulang seluruh npm test 146 kelompok**, production build, seluruh 15 menu, backend lengkap atau deployment. Jumlah 146 dalam laporan Gemini secara aritmetika sudah benar, tetapi tidak diperlakukan sebagai bukti seluruh fungsi telah diuji secara operasional.
- Empat suite lain pada npm test tidak dijalankan ulang. Suite geospatialCompletion memanggil fungsi penyimpanan job; pengujian seluruhnya perlu data uji yang terisolasi.
- Percobaan awal browser untuk STAC fixture gagal karena header CORS fixture belum lengkap. Header fixture diperbaiki, kemudian seluruh alur browser tersebut berhasil dijalankan. Kegagalan harness awal bukan temuan bug STAC aplikasi.

### Bukti pemeriksaan baru

- [Reproduksi dan HTTP publik](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/evidence-stage4.json>)
- [Hasil browser](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/browser-stage4.json>)
- [Hasil suite dan typecheck](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/verification-summary.json>)
- [Preset optik menghasilkan LST](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/optical-demo-fake-LST-current.png>)
- [Metadata Landsat fixture terpilih](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/selected-landsat-fake-current.png>)
- [Pilihan Suhu melewati routing renderer](<D:/Blender/test 1/harmony-web-check/2026-10-03-fourth-remediation-review/native-temperature-drawer-current.png>)

---

## PROMPT UNTUK GEMINI — salin mulai bagian ini

Perbaiki Harmony di `D:/vscode/Harmony` berdasarkan hasil review tahap 4 ini. Fokus aplikasi web dan integritas aliran data. Baca evidence tahap 4 dan kode saat ini sebelum mengedit. Jangan mengubah PPT atau esai.

Laporan tahap 3 menyebut seluruh remediasi selesai, tetapi jalur LST nyata masih menghasilkan DN dari rumus sinus dan tidak membaca asset raster. Prioritas pekerjaan kali ini adalah menyelesaikan alur tersebut serta masalah cache, header, traffic dan renderer yang masih terbukti. Tulis rencana singkat per file, lalu implementasikan dan verifikasi. Jangan berhenti setelah menambahkan guard pada scene kosong.

### A. Pertahankan hasil yang benar dan semua fitur penting

1. Mulai dengan git status dan instruksi proyek yang tersedia. Ada banyak perubahan belum di-commit. Jangan reset/clean/checkout massal, menimpa seluruh MapsView, atau mengambil versi lama sebagai pengganti keseluruhan file.
2. Pertahankan 15 menu Studio, seluruh sumber/provider, mode 2D/3D/Cesium, pengelompokan menu dalam panel pengaturan, GNSS, topografi, hidrologi, FIRMS, emisi, aksesibilitas dan SWOT.
3. Pertahankan perbaikan cirrus, GeoJSON/JSON terpisah, reset konteks, AbortError signer, URL traffic `/api/...`, penolakan payload kecepatan kosong dan cache generasi baru pada pembacaan setelah mutation.
4. Nama umum tetap **Peta Cuaca**. Penyedia/model dijelaskan melalui atribusi yang akurat. Jangan menambah tombol mengambang yang menduplikasi menu panel.
5. Jangan menghapus sumber yang gagal. Pertahankan integrasinya, perbaiki aksesnya atau tambahkan alternatif yang sah dengan identitas produk berbeda. Catat status provider dan alasan keterbatasan.
6. Mode DEMO boleh dipertahankan secara eksplisit. Dataset buatan tidak boleh mengalir ke statistik sumber operasional, status DERIVED dari pengamatan nyata, atau penilaian akurasi ramalan.
7. Jangan mengedit evidence reviewer tahap 3/4, mengendurkan assertion, atau hanya mengganti string status agar tampak lulus. Simpan bukti dan reproduksi perbaikan pada file baru.
8. Kredensial tetap di server. Jangan memasukkan key/token pada screenshot, log, ekspor atau source frontend. Jangan melakukan deployment hanya untuk membuat laporan menyatakan endpoint publik sudah pulih.

### B. P0 — selesaikan pembacaan raster LST nyata

File utama:

- `apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`
- `apps/web/src/services/geospatial/lstService.ts`
- `apps/web/src/services/geospatial/stacService.ts`
- modul pembacaan COG, worker atau adapter backend yang memang diperlukan.

**Bagian yang perlu dipindahkan:** loop grid sintetis, `geoSeed`, delta DN, DN 44800 buatan dan `qaPixel:0` buatan harus keluar dari jalur operasional. Simpan hanya dalam helper demo termal yang dipilih secara eksplisit. Mengubah seed agar suhu berbeda antarkota tidak menghubungkan data satelit.

**Pemilihan mode harus jelas:**

- Tidak ada scene: UNAVAILABLE dengan alasan yang benar.
- Demo termal Landsat: DEMO, dataset contoh, tanpa identitas scene nyata yang menyesatkan.
- Preset optik Sentinel-2 atau radar Sentinel-1 tanpa scene termal: tidak boleh menjalankan LST Landsat. Menolak analisis yang tidak sesuai tidak menghapus menu optik/radar.
- Scene STAC: masuk jalur pembacaan asset; identitas scene saja tidak boleh menghasilkan angka.
- Jangan menggunakan fallback scene ID `LC09_L2SP_REGIONAL_TIRS2` atau tanggal hard-coded pada hasil operasional.

**Pipeline yang harus benar-benar terhubung:**

1. Bekukan identitas input pekerjaan: scene/collection/platform, AOI atau bbox fokus, rentang waktu, parameter QA, serta hash konteks.
2. Tentukan produk termal berdasarkan metadata collection/platform/product dan asset, bukan hanya awalan ID. Scene Landsat dengan reflectance saja tidak otomatis memiliki suhu permukaan.
3. Petakan asset termal dan QA berdasarkan katalog yang dipakai. Pada fixture review, key `lwir11` dan `qa_pixel` menunjukkan pentingnya tidak mencari hanya literal `ST_B10` pada semua provider. Verifikasi pemetaan terhadap metadata/dokumentasi provider aktual.
4. Gunakan URL asset dari katalog yang benar. Panggil signer bila dibutuhkan, lalu pastikan asset benar-benar dapat dibaca. Signer mengembalikan URL bukan bukti download dan decoding berhasil.
5. Implementasikan pembaca GeoTIFF/COG dengan window AOI, batas ukuran/memori dan georeferensi. Pilih client worker atau backend berdasarkan kebutuhan proyek; jangan menunda seluruh decoder menjadi “siap dihubungkan” sambil memberi hasil DERIVED.
6. Baca raster suhu dan QA yang sesungguhnya. Petakan AOI ke CRS grid, cocokkan grid QA dan suhu, lalu transformasi koordinat hasil bila diperlukan. Gunakan resampling kategori yang sesuai untuk QA.
7. Mask fill, cirrus, cloud/shadow, NoData dan kondisi kualitas sesuai produk. Jangan mengasumsikan QA=0 jika file QA tidak ada/gagal. Pertahankan perbaikan MODIS vs Landsat dan suhu dingin yang valid.
8. Terapkan kalibrasi sesuai produk dan satuan: Landsat C2 L2 suhu Kelvin `DN * 0.00341802 + 149.0`; Celsius mengurangi 273.15. Jangan melakukan scale dua kali. [USGS Landsat Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature).
9. Hitung statistik dari piksel yang benar-benar diproses dalam Polygon/MultiPolygon beserta holes. Nyatakan metode boundary dan sampling. Jangan menyebut 49 titik buatan sebagai 100% AOI.
10. Luas valid dihitung dari grid/georeferensi/metode clipping. Perkalian 49 titik sampel dengan 30m×30m bukan bukti luas pengamatan seluruh bbox. Bedakan GSD keluaran dan resolusi sensor termal.
11. Gunakan identitas platform yang sebenarnya. Kode saat ini menerima LE07/LT05 tetapi memaksanya Landsat 9/TIRS-2. Jika pipeline sementara hanya mendukung Landsat 8/9, scene lain tetap ada di katalog dengan alasan analisis belum didukung. Jangan salah memberi nama atau menerapkan band yang salah.
12. Gunakan request generation dan cancellation sampai signing, download dan decoding. Hasil scene/AOI lama tidak boleh menimpa konteks baru.
13. DERIVED hanya diberikan setelah input raster valid tersedia dan perhitungan berhasil. Missing asset, HTTP error, signing gagal, decode gagal, QA gagal, semua NoData atau seluruh piksel dimask menghasilkan status/reason yang berbeda dan tidak diisi angka demo otomatis.
14. Provenance menyimpan provider yang benar, collection, scene ID, acquisition time, asset/band yang dipakai, CRS, resolusi, scale/offset, QA policy, hash input, processing time dan counts. Sanitasi token pada URL.
15. Tidak boleh menyebut Landsat arsip sebagai suhu realtime atau suhu udara 2 meter. Waktu akuisisi harus tampak di dekat hasil.

**Bukti minimal untuk menyatakan pipeline selesai:** fixture raster kecil bergeoreferensi dan QA dibaca melalui jalur UI/service yang sama dengan mode nyata; hasil cocok dengan nilai yang diketahui; kegagalan asset menyebabkan UNAVAILABLE; dan satu smoke test asset provider nyata jika jaringan/izin memungkinkan. Jika smoke test nyata terhalang, tulis keterbatasannya dan jangan mengaku telah memverifikasi provider live.

Status UNAVAILABLE sementara lebih jujur, tetapi menambahkan status itu saja tidak memenuhi pekerjaan menghubungkan raster nyata.

### C. Hasil dan ekspor LST harus menunjukkan asal data

1. Pertahankan FeatureCollection dan ekspor metadata JSON yang sudah benar secara struktur.
2. Tampilkan status DEMO/DERIVED/UNAVAILABLE pada kartu hasil, bukan hanya di envelope yang diunduh atau pada tombol preset di bagian atas.
3. Hasil demo menjelaskan bahwa suhu, histogram, QA dan luas tidak menggambarkan kondisi lapangan.
4. Ringkasan AOI, sampel titik, grid raster dan seluruh piksel adalah keluaran berbeda. Ekspor 100 sampel tidak boleh diklaim sebagai seluruh raster.
5. Properties ekspor menyertakan identitas konteks, status data, tanggal scene, satuan dan provenance tersanitasi. GeoJSON tetap memakai `[longitude, latitude]`.
6. Skor ambang suhu ilustratif tidak boleh diberi kesimpulan UHI terukur. Tampilkan penjelasan metode dan keterbatasannya dekat angka.
7. Kartu yang menyatakan “raster belum dibaca” tidak boleh berdampingan dengan hasil yang mengaku berasal dari raster scene itu. UI, audit dan ekspor harus mempunyai keterangan konsisten.

### D. P1 — perbaiki kepemilikan cache pada seluruh jalur akhir request

File `apps/web/src/services/apiClient.ts`.

Perbaikan generation pada join flight sudah masuk dan perlu dipertahankan. Dua jalur berikut masih salah:

**Kasus 1:** GET A ditahan → POST menginvalidasi → GET B selesai dan cache versi baru tersimpan → A selesai dengan `{success:false}` → A menghapus cache B tanpa guard → GET berikutnya mengambil ulang.

**Kasus 2:** request A pada generasi yang sama dibatalkan → replacement B selesai/cache tersimpan → penolakan abort transport A baru selesai kemudian → catch A menghapus cache B karena generation sama.

Perbaikannya:

- Cache entry/flight mempunyai identitas pemilik selain generation. Response lama tidak boleh menghapus atau menulis data milik request lain.
- Terapkan guard pada success, success:false, catch, cancellation dan invalidation. Jangan hanya menambahkan guard pada satu cabang.
- Merapikan inFlightRequests tidak memberi hak menghapus cache baru. Keduanya mempunyai lifecycle berbeda.
- Pertahankan reader lama dan reader baru setelah mutation, dedup per generasi, serta cancellation per consumer.
- Jangan menjadikan `clearCache(prefix)` pencarian substring sembarang key. Simpan endpoint sebagai metadata dan lakukan pencocokan prefix endpoint yang jelas, tanpa menghapus cache lain karena token/header/query mengandung kata yang sama.
- Uji kedua urutan kejadian di atas dengan gate/deferred Promise. Assertion memeriksa jumlah request dan isi cache secara tidak langsung melalui pembacaan berikutnya, bukan sekadar bahwa Promise resolve.

### E. P1 — normalisasi header yang dipakai fetch dan cache secara konsisten

`extractHeader` membaca `Headers`, tuple dan record dengan benar untuk signature cache. Namun `fetch` masih memakai object spread terhadap `options.headers`.

- Normalisasikan semua bentuk HeadersInit yang didukung sebelum mengirim request.
- Gunakan normalisasi yang sama ketika membangun signature representasi cache. Header yang dihitung dalam key harus benar-benar dikirim.
- `new Headers({'Accept-Language':'id-ID'})` harus mengirim bahasa id-ID; tuple bahasa en-US harus mengirim en-US. Saat ini keduanya hilang, dan tuple berubah menjadi header bernama 0/1.
- Pertahankan header Authorization dari kebijakan autentikasi yang ada serta Content-Type yang sesuai. Jangan mengubah kebijakan login untuk memperbaiki representasi header.
- Pertahankan pemisahan expectedType dan penolakan HTML untuk request JSON.
- Uji record, Headers, tuple, variasi kapitalisasi dan representasi cache menggunakan pemeriksaan outgoing headers, bukan hanya string cache key.

### F. P1 — traffic membutuhkan identitas request dan kontrak data lengkap

File `MapsView.tsx`, `handleCheckTomTomLive`, sekitar baris 554–622.

1. Pertahankan URL `/api/spatial/traffic/flow`, LOADING dan penolakan kecepatan kosong.
2. Ganti `globalThis.__harmony_active_traffic_corridor` dengan state/ref yang dimiliki instance komponen, request ID/generation monotonik dan controller. ID koridor bukan ID request.
3. Dua request berbeda untuk koridor yang sama, atau urutan A → B → A, tetap dapat menghasilkan respons lama. Hasil terbaru saja yang boleh menulis state. Cleanup berlaku saat drawer/komponen ditutup atau konteks berubah.
4. Jangan mengandalkan global variable demi membuat test ekstraksi handler mudah. Sesuaikan harness agar menyediakan ref/controller yang dipakai komponen, atau uji interaksi React yang sebenarnya.
5. Validasi kontrak frontend sesuai respons backend: finite nonnegative speed/travel time, confidence finite di 0–1, roadClosure boolean, geometri valid, provenance/freshness dan identitas lokasi. Angka kecepatan valid saja tidak membuktikan seluruh payload valid.
6. Jangan memakai `Boolean('false')`, karena hasilnya true. Tipe string bukan boolean dan harus ditolak atau ditangani sesuai kontrak eksplisit.
7. Pertahankan nol kecepatan asli yang valid. Nilai yang tidak tersedia tetap null/tidak tersedia; jangan mengarang nol.
8. Error HTTP, jaringan, timeout, schema, auth dan NOT_CONFIGURED dibedakan berdasarkan bukti. Jangan mendeteksi konfigurasi hilang hanya dengan substring pesan error.
9. Cache traffic memakai freshness yang sesuai produk. Probe satu titik tidak boleh membuat seluruh koridor/seluruh Indonesia dianggap live. Simulasi dan geometri real tetap dibedakan.

### G. P1 — gunakan satu aturan kapabilitas untuk seluruh kontrol cuaca

Panel utama sudah memakai `handleSelectWeatherOverlay` dan beralih ke Windy untuk Angin. Drawer `[data-windy-parameter]` masih memanggil setter secara langsung. Karena itu Suhu pada native dapat dipilih dengan peta kosong, dan header drawer tetap LIVE.

1. Buat pemilihan parameter dan renderer melalui satu fungsi/aturan kapabilitas bersama. Panggil dari panel utama, drawer parameter, daftar layer dan tombol mode renderer yang relevan.
2. Jangan sekadar memanggil handler toggle yang menutup drawer tanpa mempertimbangkan perilaku pilihan. Pisahkan operasi memilih parameter, toggle/reset, dan membuka/menutup panel bila diperlukan.
3. Renderer yang dipilih harus mendukung produk. Angin, suhu udara, PM2.5, satelit dan radar mempunyai produk/provider berbeda; jangan menyebut semuanya ECMWF secara otomatis.
4. Memilih native saat parameter model aktif harus menghasilkan parameter native yang jelas atau petunjuk ketidaktersediaan/opsi beralih yang terlihat pada panel aktif.
5. Semua badge pada semua panel memakai state sumber yang sama. Hapus LIVE statis yang masih ada pada header drawer sekitar baris 7244–7250. Pertahankan label umum Peta Cuaca.
6. Metadata radar valid, tile mulai memuat, tile berhasil, tile gagal, refresh metadata gagal dan data lama harus tercatat sebagai state berbeda. Path metadata saja bukan bukti radar tampil berhasil.
7. Catch refresh saat ini hanya menulis console warning yang menyebut stale; tidak mengubah state menjadi STALE. Perbaiki state dan UI, bukan kata dalam warning.
8. Tetapkan freshness menurut produk dan interval provider. Jangan menunggu dua jam untuk baru mengakui refresh yang gagal. Data valid sebelumnya boleh dipertahankan dengan umur dan kegagalan refresh terbaru.
9. Objek metadata kosong, path/timestamp invalid dan frame yang tidak tersedia harus menghasilkan alasan jelas. Jangan mengandalkan semua objek JSON dianggap metadata berhasil.
10. Tambahkan timeout terbatasi. Abort request sebelumnya adalah cancellation, bukan deduplication; jelaskan dan uji perilaku yang dipilih. Pertahankan generation, cleanup dan format WIB yang sudah benar.
11. Deskripsi “RainViewer Doppler / BMKG” masih dapat mengaburkan sumber. Mosaik reflektivitas tidak otomatis merupakan produk Doppler kecepatan angin atau radar BMKG langsung. Cocokkan setiap label dengan produk/provider yang dipakai.
12. Viewer eksternal tidak menjamin iframe bisa diamati ke dalamnya. Jangan menyebut load iframe sebagai validasi numerik/keberhasilan pengambilan data Harmony. Jika status internal viewer tidak dapat diketahui, tampilkan batas observasi itu.
13. Pertahankan maxZoom 7 dan menu satelit. RainViewer infrared publik sudah dihentikan; arahkan ke viewer/provider yang benar atau beri reason ketidaktersediaan. [RainViewer API Transition Summary](https://www.rainviewer.com/api/transition-faq.html).

### H. Koreksi kesimpulan deployment dan audit sumber

Endpoint cuaca publik masih 200 JSON, sedangkan traffic/hotspots masih 404 HTML. Route lokal dan konfigurasi Vercel membuktikan kode lokal memuat route; keduanya tidak membuktikan versi yang dijalankan cloud atau penyebab persis HTTP 404.

- Ubah diagnosis “pasti deployment lama” menjadi hipotesis sampai ada deployment ID/commit, routing logs atau handler trace yang mendukungnya.
- Periksa mount, method/path, bundling/import dan versi deployment jika akses tersedia. Jangan menambah rewrite duplikat karena route `/api/(.*)` lokal sudah ada.
- Bedakan HTTP 404 platform, handler lokal dan upstream. Jangan membuat respons 200 success:false palsu di frontend untuk menyembunyikan route publik yang masih gagal.
- Jangan menghapus route/provider akibat membutuhkan key. NOT_CONFIGURED hanya berasal dari pemeriksaan konfigurasi backend yang benar-benar berjalan. Key expired/salah memerlukan alasan auth yang sesuai respons provider, bukan tebakan.
- FIRMS dengan sebagian sensor gagal tetap PARTIAL sesuai kualitas/cakupan; “minimal satu sensor berhasil” tidak otomatis membuat seluruh snapshot LIVE. Pertahankan aturan yang sudah benar pada service.
- Catat semua provider attempted, failed, cancelled, skipped, metadata-only, viewer, valid-empty dan valid-records secara terpisah. Banyak sumber tidak otomatis berarti ramalan lebih akurat.

### I. Pengujian yang harus ditambahkan dan dijalankan

Pertahankan 11 tes tahap 3, tetapi tambahkan kasus yang menutup jalur operasional. Tes scene EMPTY dan nonthermal yang lulus tidak membuktikan pembacaan raster nyata.

| Kasus | Assertion utama |
|---|---|
| Scene Landsat, assets kosong | Tidak menghasilkan DERIVED atau suhu; reason missing asset |
| Scene Landsat, thermal/QA access gagal | Request benar-benar dicoba bila URL valid; failure jelas, tanpa generator fallback |
| Scene dengan thumbnail saja | Thumbnail bukan band suhu |
| Raster fixture kecil bergeoreferensi + QA | Decoder digunakan, nilai/statistik sesuai input yang diketahui |
| Semua QA tertutup/cloud atau NoData | Tidak menghasilkan angka valid; reason sesuai kondisi |
| Dua raster berbeda pada AOI sama | Statistik mengikuti raster, bukan koordinat seed |
| Demo Sentinel optik/radar lalu LST | Tidak menghasilkan Landsat operasional |
| Demo termal eksplisit | DEMO pada UI, provenance, audit dan ekspor |
| Landsat 8/9 dan LE07/LT05 | Identitas/sensor sesuai atau unsupported reason yang jelas |
| Ganti scene/AOI ketika worker berjalan | Hasil lama diabaikan; tidak menimpa konteks baru |
| A lama success:false setelah B generasi baru cached | B tetap cached; total GET 2 |
| A abort terlambat setelah B same-generation cached | B tetap cached; total GET 2 |
| Headers/tuple/record | Outgoing header benar dan signature cache konsisten |
| Dua request traffic pada ID sama | Respons lama tidak menimpa hasil terbaru |
| Traffic confidence -3, roadClosure string, geometri kosong | Payload invalid, bukan LIVE |
| Traffic lengkap dengan speed nol asli | Valid, tanpa menolak nilai nol secara umum |
| Pilih Angin/Suhu dari panel dan drawer | Keduanya memilih renderer yang sesuai atau reason yang terlihat |
| Ganti mode native ketika parameter model aktif | Tidak ada pilihan aktif tanpa layer/petunjuk yang terlihat |
| Metadata radar sukses, seluruh tile gagal | Tidak tampil LIVE karena path metadata ada |
| Refresh radar gagal dan frame lama masih tersedia | Data lama jelas, kegagalan terbaru tercatat; tidak hijau seolah refresh berhasil |
| Header drawer dengan viewer unavailable | Tidak ada LIVE statis |
| Probe publik sebelum/sesudah perubahan lokal | Hasil dilaporkan sesuai HTTP aktual, tanpa klaim deployment tanpa bukti |

Gunakan data uji terisolasi untuk tes job/repository. Jangan menyimpan job uji di data pengguna asli. Jalankan regression suite, typecheck, build dan browser pada alur yang berubah. Simpan log baru; jumlah suite/assertion dihitung dari keluaran yang sebenarnya.

### J. Rencana dan laporan akhir

Urutan kerja: petakan alur → reproduksi P0 selected-scene dan preset optik → pisahkan demo → hubungkan decoder/window raster/QA → betulkan cache/header → request identity traffic → satukan kontrol cuaca → verifikasi browser/provider → laporan.

Laporan akhir harus berisi:

1. Masalah, file/fungsi, perubahan dan bukti sebelum/sesudah.
2. Daftar fungsi/kode yang ditambah, diubah atau dipindahkan. Penghapusan dibatasi pada generator/keterangan salah atau kode yang benar-benar diganti; seluruh fitur/sumber penting dipertahankan.
3. Bukti pembacaan asset raster, bukan hanya daftar metadata STAC, tombol atau output angka.
4. Pemisahan test helper, handler fixture, browser fixture, provider nyata, lokal dan publik.
5. Status integrasi jujur: metadata-only, demo, derived dari input raster nyata, viewer, arsip, partial, stale atau unavailable.
6. Hasil tes, exit code, timestamp, log dan bukti browser yang relevan. Klaim seluruhnya selesai harus sesuai cakupan yang benar-benar dikerjakan.
7. Keterbatasan yang masih ada, alasan dan kebutuhan akses/configuration yang spesifik. Jangan menyebut decoder belum terhubung di bagian akhir sambil menyatakan LST nyata sudah selesai di ringkasan.

Keberhasilan tahap ini dibuktikan ketika jalur scene Landsat mengambil dan membaca raster/QA, kegagalan tidak menghasilkan suhu buatan, serta setiap kontrol UI dan cache mengikuti identitas request/data yang benar.
