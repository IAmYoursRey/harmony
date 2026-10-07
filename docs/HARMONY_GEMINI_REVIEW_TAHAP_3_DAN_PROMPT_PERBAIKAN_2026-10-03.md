# Harmony — Review tahap 3 dan prompt perbaikan untuk Gemini

Tanggal pemeriksaan: 3 Oktober 2026. Proyek: `D:/vscode/Harmony`.

## Ringkasan hasil pemeriksaan

Perbaikan sebelumnya menghasilkan kemajuan pada helper, tetapi belum membuat seluruh alur tampilan dan pengambilan data benar. Masalah paling mendesak berada pada LST baru: angka piksel dibuat di dalam tombol, kemudian hasilnya diberi provenance USGS/Landsat.

Pemeriksaan ini tidak mengubah kode aplikasi, tidak mengubah data pengguna, dan tidak melakukan deployment. Yang dibuat adalah dokumen ini dan bukti pemeriksaan terpisah.

### Bukti yang berhasil diverifikasi

- Tujuh suite terarah lulus: weatherDataIntegrity 16, monitoringSnapshot 9, recoveryFollowup 12, geminiReviewIntegrity 12, auditRemediationReproductions 10, evidence14Reproductions 14, evidenceCurrent14 14. Jumlah: **87 kelompok uji**.
- TypeScript typecheck: exit code 0.
- **11 reproduksi tambahan** terhadap service asli dan handler yang diekstrak dari kode saat ini. Angka masukan pada reproduksi adalah fixture, bukan pengamatan bumi.
- Browser lokal: membuka Penginderaan Jauh, menjalankan tombol LST, membaca ekspornya, memeriksa lebar halaman 1440 dan 390 piksel, serta memilih Angin saat mode Radar Native aktif. Tidak ada uncaught page error dalam alur terbatas ini.
- Pengujian browser sengaja memakai respons backend gagal yang diberi nama fixture. Ini tidak membuktikan backend produksi sehat atau raster satelit benar-benar tersedia.
- Probe publik baru: cuaca HTTP 200 JSON dengan `success:true`; traffic dan hotspots HTTP 404 HTML. RainViewer metadata HTTP 200, 13 frame radar lampau, dan tidak ada frame infrared.
- Production build dan seluruh 15 menu tidak diuji ulang dalam review ini. Jangan mengubah batas pemeriksaan tersebut menjadi klaim seluruh aplikasi sudah lulus.

### Temuan utama

| Prioritas | Bagian | Bukti saat ini | Perilaku yang dibutuhkan |
|---|---|---|---|
| P0 | Tombol LST | Tidak ada request raster; 49 DN dibuat dari rumus sinus; hasil `DERIVED`, provider USGS | Ambil raster dan QA asli; demo diberi status DEMO dan provenance simulasi |
| P0 | Ketergantungan lokasi LST | Surabaya dan New York menghasilkan DN identik dan rata-rata 29,08°C | Hasil berasal dari piksel scene pada lokasi/AOI yang benar |
| P0 | Identitas scene LST | ID fixture Sentinel-2 diterima, tetapi hasil mengaku Landsat 9 | Validasi koleksi, platform, produk termal dan asset sebelum analisis |
| P1 | Ekspor LST | `.geojson` berisi envelope tanpa `type` dan `features` | GeoJSON valid; envelope lengkap diekspor sebagai JSON terpisah |
| P1 | QA LST | `QA_PIXEL=4`, cirrus berkeyakinan tinggi, diterima sebagai piksel jernih | Terapkan bit QA sesuai Landsat 8/9 dan kebijakan masking yang dijelaskan |
| P1 | Signer STAC | AbortError ditelan, URL asal dikembalikan | Cancellation ditolak; kegagalan signing dibedakan dari signing berhasil |
| P1 | Tombol TomTom | Memanggil `/spatial/traffic/flow`, sementara route server dan Vite memakai `/api/...` | Selaraskan URL dengan kontrak apiClient dan konfigurasi yang ada |
| P1 | Status traffic | Error jaringan menjadi NOT_CONFIGURED; `data:{}` menjadi LIVE dan 0 km/jam | Status menurut bukti error; payload kosong tidak dianggap valid |
| P1 | Traffic berganti pilihan | Respons koridor A yang terlambat menimpa hasil B | Batalkan/abaikan respons lama berdasarkan identitas request dan pilihan |
| P1 | Cache setelah mutation | GET baru setelah POST masih bergabung dengan GET lama, mendapat versi 1 | GET setelah invalidasi memakai generasi baru dan membaca versi 2 |
| P1 | Variasi cache | `Accept-Language:en-US` menerima cache respons `id-ID` | Cache membedakan representasi respons yang relevan |
| P1 | Peta cuaca | Angin bisa dipilih pada native, tanpa tile native untuk wind dan tanpa iframe Windy | Pilih renderer yang mendukung parameter; status mengikuti layer yang benar-benar tersedia |
| P1 | Satelit cuaca | Native mencari `satellite.infrared` yang tidak ada; badge LIVE tetap ada | Provider pengganti yang valid atau status produk tidak tersedia, tanpa menghapus menu |
| P1 | Situs publik | Traffic/hotspots 404 HTML, konfigurasi route lokal sudah mencakup `/api/(.*)` | Diagnosis deployment dengan bukti; 404 tidak dianggap bukti API key hilang |

Rumus DN buatan berada di `GeospatialRemoteSensingTab.tsx` sekitar baris 100–137. Pernyataan di kartu atas bahwa raster belum terhubung sudah benar, tetapi kartu LST baru justru menampilkan angka dan identitas USGS tanpa label demo pada hasilnya. Ini membuat satu layar memberi keterangan yang bertentangan.

Di browser, menjalankan LST pada pilihan **Tanpa Scene / Kosong** menghasilkan 29,08°C, 49/49 piksel, dan luas valid 0,04 km². Pemanggilan handler untuk dua lokasi yang jauh juga menghasilkan angka identik. Kesamaan itu dibuktikan dari fixture; bukan klaim suhu kedua kota sebenarnya sama.

Dokumentasi RainViewer menyebut infrared dan nowcast dihentikan sejak 1 Januari 2026, maksimum zoom 7, dan radar lampau tetap tersedia. Pengaturan zoom 7 yang baru sudah sesuai dan perlu dipertahankan. [RainViewer API Transition Summary](https://www.rainviewer.com/api/transition-faq.html).

Laporan Gemini mencantumkan 11 suite dengan angka `10+20+7+11+16+9+12+12+10+14+14`, yang jumlahnya **135**, tetapi menyebut total 87. Review ini hanya memverifikasi tujuh suite berjumlah 87; tidak menyatakan 135 telah diuji ulang.

### Lokasi bukti baru

- [Reproduksi dan probe publik](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/evidence-stage3.json>)
- [Hasil pemeriksaan browser](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/browser-stage3.json>)
- [Ringkasan suite dan typecheck](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/verification-summary.json>)
- [Tampilan LST desktop](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/lst-current-desktop.png>)
- [Tampilan LST ponsel](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/lst-current-mobile.png>)
- [Tampilan Angin pada mode native](<D:/Blender/test 1/harmony-web-check/2026-10-03-third-remediation-review/native-wind-current.png>)

---

## PROMPT UNTUK GEMINI — salin dari bagian ini

Kamu memperbaiki aplikasi Harmony di `D:/vscode/Harmony`. Fokus hanya aplikasi web dan aliran data. Baca review tahap 3 ini beserta bukti JSON yang dirujuk sebelum mengedit. Perbaikan sebelumnya meluluskan beberapa helper, tetapi menambahkan LST dengan data buatan dan meninggalkan masalah pada UI, cache, renderer cuaca, serta endpoint publik.

Kerjakan diagnosis, rencana singkat, perubahan kode, dan verifikasi yang nyata. Tuntaskan pekerjaan yang dapat dilakukan di lokal. Jika penyelesaian memerlukan kredensial atau akses deployment yang tidak tersedia, siapkan perubahan lokalnya dan laporkan kebutuhan tersebut secara spesifik. Jangan mengklaim sudah online atau sudah memakai data langsung tanpa bukti.

### 1. Batas perubahan dan bagian yang wajib dipertahankan

1. Awali dengan `git status` dan baca instruksi proyek jika tersedia. Ada banyak perubahan belum di-commit. Jangan reset, checkout massal, clean, atau menimpa seluruh MapsView dengan versi lain.
2. Pertahankan seluruh 15 menu Studio, penyedia data, katalog sensor, GNSS, topografi, hidrologi, FIRMS, aksesibilitas, emisi, SWOT, mode peta dan Cesium. Masalah baru tidak boleh diselesaikan dengan menghapus menu atau mengurangi sumber.
3. Pertahankan pengelompokan menu di panel pengaturan yang sudah ada. Nama umum tetap **Peta Cuaca**. Penyedia boleh dijelaskan pada atribusi atau pilihan mode. Jangan menambah tombol mengambang yang menduplikasi menu panel.
4. Pertahankan perbaikan sebelumnya: identitas request, AbortError saat pembacaan JSON, pemeriksaan expectedType, nol hasil valid vs gagal mengambil data, USGS parsial, waktu WIB, QA yang sudah benar, ISPU 24 jam, GNSS dengan metadata tiap titik, dan FIRMS yang menolak klaim LIVE ketika seluruh upaya gagal.
5. Simulasi yang bermanfaat boleh dipertahankan sebagai mode demo yang dipilih secara jelas. Hasil demo tidak boleh masuk audit pengambilan data operasional atau statistik sumber langsung.
6. Jangan mengganti error dengan nol, nilai default yang terlihat masuk akal, tanggal sekarang, atau badge hijau. Jangan mengubah assertion menjadi lebih lemah agar tes lulus.
7. Jangan mengubah bukti reviewer lama. Log terakhir menunjukkan skrip reproduksi tahap 2 pernah diedit dan hasilnya dijalankan ulang. Simpan reproduksi baru dalam file baru; jelaskan perubahan fixture bila memang diperlukan. Jangan menganggap penulisan ulang evidence sebagai perbaikan aplikasi.
8. API key dan SAS token tidak boleh ditaruh di frontend, prompt, screenshot, ekspor atau log. Redaksi query rahasia pada provenance yang dapat diunduh. Jangan mengubah `.env` tanpa kebutuhan yang jelas dan jangan menampilkan nilainya.
9. Perbaikan lokal tidak sama dengan deployment. Laporan harus membedakan helper, handler, browser, HTTP lokal, HTTP publik dan layanan upstream.

### 2. P0 — ganti input LST buatan dengan alur raster asli

File utama:

- `apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`
- `apps/web/src/services/geospatial/lstService.ts`
- `apps/web/src/services/geospatial/stacService.ts`
- adapter raster/worker/backend yang benar-benar dibutuhkan.

**Masalah terbukti:** `handleRunLSTAnalysis` membuat grid 7×7, menghitung `Math.sin(...)`, membentuk `rawDN`, lalu menetapkan `qaPixel:0` untuk semua titik. Handler tidak mengambil raster. Scene ID dan waktu memiliki fallback buatan, platform selalu Landsat 9, hasil selalu masuk jalur provenance satelit asli.

**Hapus atau pindahkan hanya bagian ini:** generator DN sinus, QA jernih buatan, fallback scene ID dan tanggal hard-coded dari jalur analisis nyata. Jika dipakai untuk demonstrasi, pindahkan ke fungsi demo tersendiri, status DEMO, sourceType simulasi, dan nama dataset contoh. Jangan hapus menu LST, helper kalibrasi, atau pilihan demo yang sudah ada.

**Alur nyata yang harus dibuat:**

1. Pengguna menentukan AOI atau bbox fokus yang ditampilkan, lalu mencari scene Landsat C2 Level-2 yang sesuai. Simpan bbox, geometry, AOI hash, rentang waktu, scene ID dan collection sebagai identitas pekerjaan.
2. Validasi metadata produk. Scene Sentinel-1/2 bukan produk termal Landsat. Gunakan platform Landsat 8 atau 9 yang benar; jangan memaksa semua scene menjadi Landsat 9. Scene yang hanya memiliki produk reflectance tanpa asset suhu tidak boleh dianalisis sebagai LST.
3. Ambil asset suhu dan QA dari STAC item yang dipilih. Nama asset bisa berbeda menurut katalog; tentukan lewat metadata produk/asset yang diverifikasi, jangan menganggap thumbnail atau semua COG merupakan band termal.
4. Gunakan signer Planetary Computer jika asset memang membutuhkannya. Pencarian metadata berhasil tidak berarti asset raster sudah dapat dibaca. Pastikan band benar-benar terbaca dan catat kegagalan signing/download/decoding secara terpisah.
5. Baca GeoTIFF/COG asli pada window yang mencakup AOI dengan ukuran memori terbatasi. Gunakan georeferensi raster, transformasi CRS dan posisi grid asli; jangan mengganti raster dengan titik yang disebar merata di bbox. Bila perlu worker atau backend processing, gunakan komponen yang sesuai arsitektur proyek.
6. Selaraskan band suhu dan QA pada grid yang sama. Pertahankan NoData; resampling QA menggunakan pendekatan kategori seperti nearest-neighbor. Tentukan masking awan, cirrus, shadow, fill dan kualitas produk dengan kebijakan terdokumentasi. Jangan mengasumsikan QA jernih jika band QA gagal diambil.
7. Terapkan konversi Landsat C2 Level-2: `Kelvin = DN * 0.00341802 + 149.0`, lalu kurangi 273.15 untuk Celsius. Jangan menerapkan ulang kalibrasi ke produk yang sudah bersatuan suhu. Jangan mengganti rumus ini dengan sebutan umum “kalibrasi Cook” tanpa menjelaskan produk yang dipakai. [USGS Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature).
8. Potong sesuai polygon/multipolygon dan holes. Metode batas piksel harus dijelaskan. Statistik memakai semua piksel valid atau metode sampling yang dinyatakan; 49 titik sampel bukan cakupan lengkap AOI.
9. Hitung luas menggunakan transformasi grid/resolusi dan fraksi valid yang benar. Jangan mengalikan jumlah titik contoh dengan luas piksel 30m lalu menyebut seluruh wilayah sudah tervalidasi. Pisahkan jumlah sampel, jumlah piksel diproses, luas cakupan dan ketidakpastian.
10. Simpan provenance nyata: provider, collection, item ID, acquisition time, asset/band, CRS asli dan keluaran, resolusi, scale/offset, QA policy, AOI hash, processing time, serta jumlah valid/rejected. DERIVED hanya jika ada perhitungan dari raster valid yang benar-benar dibaca. Waktu pengambilan data tidak menggantikan waktu akuisisi scene.
11. Jangan menyebut suhu Landsat sebagai suhu saat ini atau suhu udara 2 meter. Tampilkan tanggal akuisisi dengan jelas. Scene arsip tetap arsip walaupun baru diproses.
12. Untuk skor panas, pertahankan penjelasan bahwa skor ambang suhu ilustratif belum merupakan pengukuran urban heat island berbasis baseline rural. UI harus menjelaskan hal itu dekat angka; jangan menyamakan skor 0 dengan bukti tidak ada UHI.
13. Tidak ada scene, asset termal tidak ada, semua piksel NoData, QA gagal, signing gagal dan seluruh piksel tertutup awan harus menghasilkan state yang dibedakan. Pengguna dapat mencoba scene lain atau mode demo; jangan otomatis menyisipkan angka demo ke mode nyata.

Jika implementasi raster belum selesai, status fitur tetap belum tersedia dengan alasan spesifik. Itu hanya keadaan sementara yang jujur; jangan menyatakan tugas selesai hanya karena tombol berhasil menampilkan angka.

### 3. P1 — kualitas, pergantian konteks, dan ekspor LST

**QA:** reproduksi `qaPixel=4` diterima sebagai jernih. Pada Landsat 8/9, bit 2 adalah high-confidence cirrus. Perbaiki kebijakan masking dan tesnya. QA untuk MODIS dan Landsat harus tetap dibedakan. Missing QA, fill, cirrus dan suhu dingin yang sah memiliki alasan berbeda. [USGS QA bands](https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands).

**Pergantian konteks:** effect reset saat `lat/lng/activeAOI/activeCollection` berubah menghapus STAC selection, tetapi tidak menghapus `lstEnvelope`. Batalkan pekerjaan sebelumnya; jangan tampilkan hasil AOI A sebagai hasil AOI B. Gunakan request generation dan hash AOI/scene/parameter sebelum menerima hasil worker atau fetch. Bila hasil lama dipertahankan sebagai riwayat, beri identitas lokasi lama dan statusnya secara jelas.

**Ekspor:** `handleExportLSTGeoJSON` saat ini mengunduh seluruh envelope sebagai `.geojson`. Buat `FeatureCollection`/`Feature` dengan geometry valid dan koordinat `[longitude, latitude]`. Properties dapat memuat suhu, QA, scene, waktu dan provenance tersanitasi. Bedakan hasil ringkasan AOI dan titik/piksel. Untuk metadata lengkap, tambahkan ekspor `.json`; jangan menyamarkan envelope menjadi GeoJSON hanya dengan mengubah MIME atau ekstensi. [RFC 7946](https://www.rfc-editor.org/rfc/rfc7946).

Ukuran ekspor harus terbatasi. Jika service hanya menyimpan 100 sampel, ekspor itu diberi keterangan sampel, bukan seluruh raster. Jangan menyalin jutaan piksel ke main thread tanpa batas.

### 4. P1 — signer STAC tidak boleh menelan kegagalan atau cancellation

`signAssetUrl` sudah ditambahkan, tetapi pencarian pemakai di kode menunjukkan belum ada integrasi pemanggil raster. Catch-nya mengembalikan URL asal pada error, termasuk AbortError. Adanya helper tidak membuktikan akses asset sudah berjalan.

- Hubungkan signer ke pembacaan asset nyata.
- Bawa cancellation sampai signer, download dan decoding. AbortError harus ditolak sebagai cancellation dan tidak dicatat sebagai source gagal karena jaringan.
- Bedakan URL yang tidak membutuhkan signing dari signing yang gagal. Jangan menandai URL asal sebagai hasil signing sukses.
- Validasi HTTP/content type/schema dan URL hasil signing. Tangani SAS kedaluwarsa dengan pembaruan token serta retry terbatas jika provider mengonfirmasi masalah otorisasi token.
- Gunakan host allowlist yang tepat saat membuat proxy/signing; jangan memakai `includes()` sebagai satu-satunya validasi URL.
- Caching signature mempertimbangkan masa berlaku. Jangan log atau ekspor token.
- Pelajari dokumentasi resmi sebelum memilih mekanisme signing. [Planetary Computer SAS](https://planetarycomputer.microsoft.com/docs/concepts/sas/).

### 5. P1 — benahi tombol TomTom sampai hasilnya dapat dipercaya

File utama `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`, fungsi `handleCheckTomTomLive` sekitar baris 554–599.

1. Panggilan sekarang `/spatial/traffic/flow?...`; route backend `/api/spatial/traffic/flow`, proxy Vite hanya `/api`, dan contoh VITE_API_BASE_URL adalah origin tanpa `/api`. Selaraskan pemanggilan dengan kontrak apiClient. Uji dengan base URL kosong dan origin backend; hindari `/api/api`.
2. Jangan mengubah seluruh apiClient atau semua caller untuk menutupi satu URL salah. Periksa pemanggil lain dan pertahankan kontraknya.
3. Loading adalah processing state, bukan bukti NOT_CONFIGURED. Status belum diketahui sampai ada respons yang valid.
4. NOT_CONFIGURED hanya saat backend memberi reason code itu karena konfigurasi memang tidak ada. HTTP 404, HTML, timeout, jaringan, 401/403, 429 dan 5xx harus dibedakan. API expired tidak boleh ditebak dari error generik; gunakan keterangan provider yang tersedia.
5. `success:true,data:{}` tidak valid. Validasi tipe angka finite, rentang, satuan, confidence, geometri, waktu/provenance dan identitas lokasi. Pertahankan validasi ketat backend yang sudah ada. Jangan menampilkan `?? 0` untuk nilai yang hilang. Angka nol asli yang valid tetap boleh ditampilkan.
6. Baca payload terstruktur `APIError.data` ketika ada. Error schema/HTML harus tetap dianggap error, bukan respons kosong sukses.
7. Saat pilihan beralih dari koridor A ke B, batalkan atau abaikan hasil A berdasarkan generation, corridor ID dan koordinat. Hasil A tidak boleh menimpa B. Pembatalan tidak memberi pesan API key hilang.
8. Cache traffic memiliki kebijakan umur sesuai kebutuhan data, bukan TTL generik 5 menit tanpa penjelasan. Tampilkan waktu diambil, umur dan freshness; refresh gagal dengan data lama berarti STALE disertai kegagalan terbaru.
9. Uji satu titik TomTom hanya memberi data segmen terkait respons tersebut. Jangan mengubah seluruh koridor Indonesia menjadi LIVE dari satu probe.
10. Jika mode live ditambahkan ke peta, gambar geometri/segmen TomTom yang valid dengan atribusi. Jangan mewarnai seluruh polyline OSM panjang berdasarkan satu titik tanpa menjelaskan batas cakupan. Simulasi koridor tetap terpisah dan berlabel DEMO.
11. Deteksi API key dilakukan di server. Key tidak boleh dikirim ke browser atau ditampilkan dalam pesan error.

### 6. P1 — tuntaskan invalidasi dan identitas cache API

File `apps/web/src/services/apiClient.ts`.

**Reproduksi yang gagal:** mulai GET versi 1 dan tahan respons; selesaikan POST versi 2; mulai GET baru sebelum GET lama selesai. GET baru bergabung dengan flight lama dan mendapat versi 1. Guard sebelum menulis cache sudah ada, tetapi guard saat memilih flight belum ada.

- Simpan generation pada flight dan hanya join flight yang masih relevan. Setelah mutation/clearCache, pembaca baru tidak boleh join generasi sebelumnya.
- Pemanggil GET lama boleh mendapatkan hasil request lamanya; hasil itu tidak boleh menjadi hasil pembaca baru setelah invalidasi atau mengisi cache baru.
- Gunakan identitas flight dan generation pada semua jalur yang menulis/menghapus cache, termasuk catch dan `success:false`. Late failure dari A tidak boleh menghapus cache B yang lebih baru.
- Perbaiki `clearCache(prefix)` agar prefix endpoint bekerja terhadap struktur cache key; key sekarang diawali token dan expectedType. Inventarisasi caller sebelum menentukan kontrak baru.
- Pertahankan deduplication dan cancellation per consumer: membatalkan satu consumer tidak membatalkan consumer lain.
- Cache key mempertimbangkan header/opsi yang mengubah representasi respons. Reproduksi `Accept-Language:id-ID` lalu `en-US` memberi respons cache id-ID untuk keduanya. Definisikan signature relevan; jangan memasukkan signal sebagai identitas data.
- Tangani header berbentuk `Headers`, tuple, dan record sesuai RequestInit, atau nyatakan pembatasan type yang jelas. Jangan silently mengabaikan bentuk header yang valid.
- Pertahankan pemisahan text/json/blob dan penolakan HTML saat expectedType json. Cache dan request dedup tidak boleh melonggarkan kontrak response.
- Jangan menyimpan respons gagal, payload invalid, atau data berbeda pengguna ke cache bersama.

### 7. P1 — setiap parameter cuaca harus mempunyai renderer yang benar

File `MapsView.tsx`: handler pemilihan overlay sekitar 1136, fetch metadata sekitar 3774, effect tile sekitar 3815–3880, kontrol mode sekitar 6640 dan daftar parameter sekitar 7220. Cari fungsi berdasarkan namanya jika baris berubah.

**Masalah terbukti di browser:** mode Radar Native aktif, pengguna memilih Angin. Pilihan menjadi aktif, tetapi tidak ada iframe Windy dan effect native tidak membuat URL wind. Panel masih mengatakan kanvas Windy realtime. Badge LIVE juga ditulis tanpa kondisi pengambilan data.

1. Buat matriks kapabilitas `parameter → renderer/provider/product`. Native RainViewer hanya memakai produk yang benar-benar tersedia. Suhu, angin, kualitas udara dan parameter lain memerlukan renderer/provider yang mendukungnya.
2. Saat pengguna memilih parameter yang tidak didukung mode aktif, arahkan ke renderer yang sesuai dengan keterangan jelas atau tampilkan alasan ketidaktersediaan. Jangan membiarkan pilihan aktif dengan peta kosong tanpa pesan.
3. Mode model tidak boleh menyebut semua lapisan ECMWF jika layer tertentu memakai dataset/provider lain. Nama model berasal dari produk yang benar-benar dipakai.
4. Pertahankan sinkronisasi lokasi dan zoom, penutupan drawer, opacity, cleanup layer dan maxZoom 7. Jangan mengembalikan layer dengan `visible:false` atau menutupi native dengan iframe.
5. Bedakan tile berhasil dimuat, sebagian gagal, metadata gagal, belum memuat, data lama dan produk tidak tersedia. LIVE bukan teks statis. Metadata HTTP 200 tidak membuktikan tile berhasil ditampilkan.
6. Metadata harus divalidasi: host, path, timestamp dan array frame. Objek JSON kosong tidak boleh mereset error menjadi sukses. Memuat metadata lagi juga tidak otomatis membuktikan tile yang gagal sudah pulih.
7. Terapkan timeout, cancellation, generation dan deduplication pada refresh metadata. Interval 5 menit dan event visibility tidak boleh membuat respons lama menimpa metadata baru. Last-known frame boleh ditampilkan sebagai STALE saat refresh gagal.
8. Tampilkan tanggal dan jam dengan timezone yang benar. Gunakan formatter `timeZone:'Asia/Jakarta'` jika label WIB; jangan menambahkan “WIB” pada jam timezone laptop secara otomatis. Waktu frame/generation jangan dipresentasikan sebagai waktu observasi tiap radar.
9. Parameter rain tidak boleh diam-diam menjadi produk radar pengamatan jika UI menjanjikan hujan model/prakiraan. Jelaskan jenis produk dan satuannya.
10. Native RainViewer bukan otomatis radar BMKG atau Himawari-9. Perbaiki keterangan `WINDY_PARAM_CONFIG`, drawer dan atribusi yang masih mengatakan komposit BMKG/Himawari tanpa bukti provider/produk. Pertahankan menu dan akses portal sumber resmi.
11. RainViewer tidak lagi menyediakan infrared publik pada API tersebut. Pertahankan menu satelit, hubungkan ke provider/viewer yang benar atau beri status produk tidak tersedia. Jangan menghidupkan kembali path lama, mengisi citra buatan, atau mengganti satellite dengan radar tanpa penjelasan.
12. Viewer eksternal tetap viewer. Jangan mencatatnya sebagai pengambilan masukan numerik Harmony atau bukti model ramalan telah tervalidasi. Error cross-origin yang tidak dapat diamati harus disebut sebagai keterbatasan observasi aplikasi.

Aturan layanan terbaru, zoom dan penghentian IR harus diperiksa melalui [RainViewer API Transition Summary](https://www.rainviewer.com/api/transition-faq.html). Jangan menghapus penyedia karena sebuah produk dihentikan; catat perubahan kapabilitas dan gunakan alternatif yang dapat diverifikasi.

### 8. P1 — endpoint publik 404 memerlukan diagnosis deployment

Probe review baru mendapatkan:

- `/api/spatial/weather/current?lat=-7.25&lng=112.75`: 200 JSON, success true.
- `/api/spatial/traffic/flow?lat=-6.2&lng=106.816`: 404 HTML.
- `/api/spatial/hotspots?bbox=111,-8,113,-6&source=VIIRS_SNPP_NRT&dayRange=1`: 404 HTML.

`vercel.json` lokal **sudah** mempunyai route `/api/(.*)` ke `/api/index.js`; entry point mengimpor server. Jangan asal menambah rewrite yang sama atau mencampur konfigurasi `routes` dan `rewrites` tanpa diagnosis.

Periksa versi build/deployment yang dilayani, mount Express, method/path, serverless bundling, file imports dan log handler bila aksesnya tersedia. Bedakan 404 dari Vercel, 404 handler Express, dan 404 upstream. Cuaca 200 tidak membuktikan traffic/hotspots sudah terpasang di deployment itu.

Tanpa akses deployment, siapkan perbaikan routing/import yang terbukti diperlukan dan instruksi verifikasi; laporkan root cause sebagai belum terkonfirmasi jika bukti belum cukup. Jangan menyatakan pasti API key hilang atau pasti deployment lama.

Backend baru boleh mengeluarkan NOT_CONFIGURED jika handler benar-benar berjalan dan melihat konfigurasi tidak tersedia. Untuk key salah/expired, pertahankan API integration, laporkan AUTH_ERROR sesuai respons provider, dan jelaskan kebutuhan rotasi key; jangan mengurangi jumlah sumber atau memasukkan key sembarang.

### 9. Audit pengambilan data dan pelaporan harus berdasarkan kejadian nyata

- Pisahkan transport request, validitas payload, cakupan AOI, kualitas/QA, freshness, status processing dan status data.
- Request attempted/failed/cancelled, respons berhasil, valid empty, invalid payload, valid records dan rejected records dicatat terpisah. Jangan menyebut semua fulfilled Promise sebagai sumber sukses.
- Status sumber tidak menjadi hijau hanya karena tombol ditekan, metadata STAC ditemukan, signer mengembalikan string, iframe ada, atau grafik dapat dirender.
- Catat semua sumber yang benar-benar dicoba. Provider yang tidak dijalankan, butuh key atau tidak mendukung lokasi dicatat dengan alasan masing-masing, bukan dicoret atau dihitung berhasil.
- Respons parsial tetap PARTIAL. Tidak ada deteksi yang valid berbeda dari tidak dapat mengambil deteksi. Pertahankan perbaikan FIRMS sebelumnya.
- Bedakan area pilihan pengguna dari cakupan global yang betul-betul dimuat. Satu bbox atau satu titik tidak boleh diberi klaim seluruh negara/dunia sudah dipantau.
- Banyak sumber tidak otomatis menaikkan akurasi. Jangan menambahkan skor akurasi ramalan tanpa validasi terhadap observasi, periode dan metrik yang jelas. Cuaca, angin dan awan yang diperlihatkan bersama belum membuktikan model baru telah menghasilkan ramalan yang tervalidasi.
- Pertahankan data sebelumnya hanya dengan status STALE/riwayat dan identitas waktu/lokasi; jangan mengubah waktu observasi agar tampak baru.

### 10. Rencana kerja yang harus diikuti

1. Baca bukti tahap 3 dan petakan pemanggil UI → service → endpoint → provider → validator → state → peta/grafik → audit/ekspor.
2. Susun daftar perubahan per file. Kerjakan P0 LST dan status traffic terlebih dahulu, lalu cache, renderer cuaca dan routing publik.
3. Siapkan fixture kegagalan dan kasus pergantian konteks sebelum/bersamaan dengan perbaikan. Fixture harus diberi label sebagai fixture.
4. Lengkapi pipeline raster nyata, cancellation dan provenance. Perubahan UI hanya menampilkan hasil yang benar-benar ada.
5. Jalankan regression suite yang relevan, typecheck dan production build. Bila suite menyimpan job/menyentuh repository, isolasikan data uji; jangan menulis ke data pengguna asli.
6. Verifikasi browser desktop dan ponsel pada alur yang berubah, lalu smoke-check seluruh 15 menu dan renderer 2D/3D yang terkena perubahan. Jangan menambah pengujian luas tanpa kaitan risiko; utamakan kontrak data dan interaksi yang sebelumnya salah.
7. Uji HTTP lokal dan publik secara terpisah. Deployment hanya dilakukan bila memang ada otorisasi dan akses dalam sesi kerja tersebut; jangan menganggap hasil build sebagai deployment.
8. Simpan evidence baru dan laporan akhir yang jumlah tesnya dihitung dari output nyata.

### 11. Acceptance test yang harus membuktikan perbaikan

| Kasus | Hasil wajib |
|---|---|
| LST tanpa scene/raster | Tidak ada angka operasional; alasan jelas atau mode demo eksplisit |
| Dataset demo LST | Label DEMO di hasil/ekspor, tidak tercatat sebagai sumber USGS yang berhasil diambil |
| Scene Sentinel dipilih untuk LST Landsat | Ditolak sebagai produk tidak sesuai; tidak mengganti nama platform secara paksa |
| Scene Landsat dengan asset termal+QA asli | Network/asset read terbukti, statistik sesuai fixture raster bergeoreferensi, DERIVED dengan provenance benar |
| Dua raster fixture dengan nilai berbeda | Output berubah sesuai nilai raster, bukan generator sinus atau lokasi string |
| QA cirrus bit 2 | Tidak diterima sebagai piksel jernih; masking sesuai kebijakan Landsat 8/9 |
| Missing QA vs awan vs suhu dingin valid | Alasan dibedakan; suhu dingin valid tidak dianggap awan otomatis |
| AOI Polygon, hole dan MultiPolygon | Piksel dan luas valid konsisten dengan geometry/grid/metode clipping |
| Ganti AOI/scene saat proses | Respons lama tidak menimpa hasil baru dan tidak diatribusikan ke lokasi baru |
| Ekspor LST GeoJSON | Dapat dibaca parser GIS sebagai FeatureCollection/Feature yang valid; koordinat/provenance benar |
| Signing dibatalkan | AbortError, tidak dianggap signing sukses dan tidak melanjutkan request raster |
| Signing kedaluwarsa/gagal | Reason sesuai bukti, retry terbatas, tanpa token bocor atau fallback sukses palsu |
| URL TomTom dengan API base kosong/origin | Keduanya mengarah ke `/api/spatial/traffic/flow` yang benar, tanpa `/api/api` |
| TomTom HTTP 404 HTML | Error route/HTTP; bukan NOT_CONFIGURED dan bukan LIVE |
| Backend eksplisit NOT_CONFIGURED | Status konfigurasi tepat tanpa angka simulasi masuk hasil live |
| Traffic data kosong/string/NaN/negatif | Ditolak; tidak berubah menjadi 0 km/jam dengan badge LIVE |
| Traffic angka nol asli dan payload lengkap | Tetap diterima sebagai data valid; jangan menolak nol secara umum |
| Traffic A lambat, B selesai lebih dulu | Hasil B tetap aktif; respons A tidak menimpa B |
| GET lama → POST → GET baru sebelum GET lama selesai | GET baru memakai generasi baru dan membaca versi sesudah mutation |
| Request A gagal terlambat setelah B berhasil | Cache B tetap ada; A tidak menghapus hasil baru |
| Endpoint sama dengan bahasa/representasi berbeda | Cache tidak menukar hasil antarrepresentasi |
| Dua consumer, satu abort | Consumer lain tetap memperoleh hasil; tidak ada perubahan state oleh consumer yang dibatalkan |
| Native dipilih lalu Angin/Suhu/PM2.5 dipilih | Renderer yang sesuai atau alasan unavailable; tidak ada pilihan aktif dengan layer diam-diam kosong |
| Metadata cuaca kosong/tidak valid | Tidak menampilkan LIVE atau mereset tile error sebagai berhasil |
| Metadata valid, tile gagal | Gagal/parsial terlaporkan; metadata sukses tidak menutupi kegagalan tile |
| Refresh radar gagal dan ada frame lama | Frame lama boleh tampil sebagai STALE dengan tanggal/waktu yang benar |
| Satellite IR RainViewer tidak ada | Menu tetap ada, alasan/provider alternatif jelas; tidak mengarang path |
| Public endpoint belum berubah | Laporan masih mengatakan 404; tidak mengklaim deploy sukses dari perubahan lokal |
| 15 menu dan mode peta | Tetap dapat dibuka; tidak ada fungsi penting dihapus akibat refactor |

### 12. Isi laporan akhir yang wajib dikirim

1. Tabel masalah → file/fungsi → perubahan → bukti sebelum/sesudah.
2. Daftar bagian yang ditambah, diubah dan dihapus, dengan alasan. Penghapusan hanya generator/data/label yang salah atau kode yang memang digantikan; bukan penghapusan fitur penting atau sumber.
3. Status tiap integrasi: nyata, derived dari data nyata, demo, metadata-only, viewer, arsip, partial, stale, unavailable atau not configured. Jangan memberi semua kategori label realtime.
4. Hasil tes dari eksekusi sebenarnya: suite, jumlah test/assertion yang konsisten, exit code, waktu dan log. Jika daftar suite berjumlah 135, jangan menulis 87 sebagai total daftar yang sama.
5. Bukti interaksi browser berupa tindakan, respons/network yang diperiksa, state yang terlihat dan screenshot relevan. Static render atau handler fixture tidak boleh disebut pengujian provider live.
6. Matriks HTTP lokal vs publik dan upstream. Klaim penyebab deployment harus didukung log/versi/route yang diamati.
7. Hal yang belum selesai serta alasan teknis, key/izin yang diperlukan, dan langkah berikutnya. Jangan menciptakan hasil agar laporan terlihat lengkap.

Ukuran keberhasilan tugas ini adalah data yang dapat ditelusuri, fungsi menu tetap utuh, dan status yang sesuai bukti. Hasil pengujian helper yang hijau harus dilengkapi bukti pada pemanggil UI dan provider untuk alur yang diperbaiki.

