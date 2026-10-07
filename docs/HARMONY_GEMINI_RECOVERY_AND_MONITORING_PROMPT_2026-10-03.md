# PROMPT GEMINI / ANTIGRAVITY — Pemulihan Harmony dan Pemantauan Bumi

Tanggal audit awal: 3 Oktober 2026.
Proyek: `D:\vscode\Harmony`.
Referensi: https://github.com/bilawalsidhu/gods-eye-view.git

Salin seluruh dokumen ini ke Gemini yang memiliki akses ke proyek. Ini adalah instruksi pengerjaan, bukan klaim bahwa perbaikan sudah selesai.

## 1. Tugas utama

Perbaiki aplikasi web Harmony yang beberapa fungsi/menu dan aliran datanya bermasalah setelah perubahan sebelumnya. Pulihkan fungsi dahulu, kemudian tambahkan pemantauan lingkungan lintas wilayah dan 3D yang lebih realistis dengan mempelajari God’s Eye View.

Fokus aplikasi web, terutama halaman peta. Abaikan PPT dan esai untuk pekerjaan ini.

Urutan kerja wajib: audit kondisi awal → inventaris fungsi/sumber → rencana perubahan per tahap → implementasi bertahap → pengujian non-regression → laporan hasil nyata. Tulis rencana sebelum mengubah kode, lalu lanjutkan implementasi yang dapat dikerjakan. Jangan berhenti hanya setelah membuat rencana jika akses proyek tersedia.

Jika kunci atau izin sumber belum tersedia, buat adapter/configuration/tests yang benar dan tandai integrasi live belum terverifikasi. Jangan membuat hasil pengujian atau kunci palsu. Jangan menganggap seluruh pemantauan bumi sudah lengkap hanya karena layer dapat dirender.

## 2. Aturan perlindungan proyek

1. Jangan rewrite seluruh aplikasi, MapsView, navigasi, atau semua layanan cuaca sekaligus.
2. Catat commit/status Git dan perubahan pengguna yang sudah ada; buat salinan pemulihan file yang akan disentuh. Jangan reset/clean/restore seluruh repo atau membuang perubahan belum dikomit.
3. Jangan menghapus fitur agar build lulus; jangan membuat handler kosong, membuang callback, atau menutup menu yang belum terhubung.
4. Pertahankan ID menu, prop publik, kontrak API dan format ekspor. Perubahan kontrak harus memperbarui seluruh pemanggil dan memiliki tes kompatibilitas.
5. Jangan menghapus sumber yang gagal. Perbaiki integrasi atau sediakan pengganti terverifikasi, dengan riwayat sumber lama dan alasan perubahan. Jumlah source/model tidak boleh dikurangi diam-diam.
6. Jangan mempertahankan sumber palsu demi angka. Nama lembaga di katalog, URL yang terdaftar, dan iframe bukan bukti numerical ingestion.
7. Jangan mengarang pengamatan memakai konstanta, tanggal tetap, random, atau mock yang disamarkan live. Mode demo harus terpisah dan dipilih sadar; label terbawa ke popup, grafik, peta dan ekspor.
8. Jangan mengembalikan sumber ke sukses ketika HTTP/payload gagal. Jangan membuat audit confidence/accuracy palsu.
9. Jangan membocorkan key, .env, URL berkey, token atau data pribadi melalui log/laporan/screenshot. FIRMS dan TomTom diproxy server; token peta browser dibatasi domain/izin/kuota.
10. Jangan deploy atau aktivasi layanan berbayar otomatis. Persiapkan hasil lokal dan konfigurasi yang diperlukan.
11. Jangan mengubah sistem pendidikan, kuis, kelas, autentikasi atau database yang tidak terkait perbaikan peta.
12. Baca kode/lisensi repo referensi sebelum mengadaptasi modul. Jangan menjalankan seluruh skrip instalasi aplikasi referensi di Harmony.

## 3. Bukti awal dan batas pemeriksaan

Pemeriksaan awal membaca kode Harmony serta kode referensi. Tidak tersedia diff terpisah yang membuktikan semua kekurangan dibuat Gemini. Pisahkan bug saat ini, integrasi belum selesai, konfigurasi kurang, keterbatasan cakupan, dan regresi yang benar-benar terbukti.

Pemeriksaan frontend desktop lokal setelah server frontend dijalankan:

- Seluruh 15 menu Studio dapat dibuka dari panel yang sama.
- Tidak ditemukan galat JavaScript tak tertangani pada sesi pembukaan menu tersebut.
- Tidak ditemukan overflow halaman pada viewport desktop 1440 px pada sesi itu.
- `npm run typecheck` selesai dengan exit code 0.
- Ini bukan pengujian seluruh tombol, analisis, ekspor, save/load, mobile, 3D, API live, maupun akurasi.
- Backend utama tidak dijalankan dalam sesi pembukaan menu ini. Request `/api/...` yang gagal pada sesi tersebut bukan bukti semua endpoint produksi rusak.
- Temuan integrasi berikut berasal dari kode dan harus diuji ulang terhadap versi yang kamu terima.

Artefak, jika tersedia:
`D:\Blender\test 1\harmony-web-check\2026-10-03\current-menu-audit.json`
dan screenshot `menu-bmkg-current.png`, `menu-charts-current.png`, `menu-hotspots-current.png`, `menu-remote_sensing-current.png`, `menu-accessibility-current.png` pada folder yang sama.

Baca juga `docs/GEOSPATIAL_COMPLETION_STATUS.md` dan `docs/HARMONY_DATA_FLOW_AUDIT_2026-10-03.md`. Hasil lama tidak membuktikan versi setelah perubahanmu.

## 4. Menu, navigasi dan fitur yang wajib dipertahankan

Registry: `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx`, `STUDIO_DOMAINS`.

| ID tetap | Menu | Alur yang harus diuji |
|---|---|---|
| weather | Ringkasan Cuaca & Grafik | Lokasi, waktu, variabel, model, grafik, kegagalan, audit |
| bmkg | Satu Peta MKG | Semua subtab, gempa, katalog, citra, status produk |
| remote_sensing | Penginderaan Jauh | Scene, AOI, band, indeks, QA, raster dan ekspor |
| terrain | Topografi & DEM | Elevasi, profil, slope, resolusi dan gagal provider |
| positioning | GNSS & Posisi | GPS, akurasi perangkat, katalog dan konversi |
| hydrology | Hidrologi & Lahan | DAS, land cover, data dasar dan perhitungan |
| field_survey | Survei & Drone | Input, impor, pengukuran dan hasil pengguna |
| analytics | Analisis & Buffer | CRS, geometri, luas/jarak, buffer dan apply |
| charts | Katalog Grafik | Renderer, variabel, satuan dan kebutuhan data |
| fusion | Fusi Data Global | Sumber yang digunakan, alignment, metode dan batas |
| catalog | Katalog Data | Metadata, lisensi, link dan keterhubungan nyata |
| hotspots | Titik Panas Karhutla | FIRMS, CSV, sensor, waktu, AOI, peta dan ekspor |
| accessibility | Akses Layanan 15m | POI, graph jalan, isokron, matriks dan skenario |
| emissions | Emisi Transportasi | Faktor, satuan, asumsi, rute dan ekspor |
| swot | Rencana Produk SWOT | Input, save/load dan ekspor |

Pertahankan pencarian, GPS/presisi, kompas, zoom, basemap, layer, pengukuran GIS, AOI, rute, fullscreen, popup objek, katalog sensor, transparansi data dan 2D/3D.

Menu baru harus masuk panel pengaturan peta yang sudah ada. Jangan menambah tombol mengambang bertumpuk. Hapus shortcut duplikat hanya setelah tujuan/handler yang sama tersedia dan diuji di panel.

Nama UI tetap **Peta Cuaca**, bukan Peta Cuaca Windy. Atribusi provider tetap ada pada informasi sumber.

Penanda UI untuk smoke test:
- `button[title*="Pengaturan Lapisan Peta"]`
- `[aria-label="Pengaturan Harmony Maps"]`
- Tab `Alat & Analisis`
- `[aria-label="Alat dan analisis peta"] summary`
- `[data-studio-domain="ID"]`
- Penutup `button[title="Tutup Studio"]`

## 5. Temuan kode yang harus dimasukkan ke rencana

Path pendek di bawah relatif terhadap `apps/web/src/components/dashboard/views/spatial/`, kecuali disebut lain. Periksa ulang fungsi/baris aktual sebelum edit.

### F01. Grafik salah perilaku

`charts/HarmonyChartEngine.tsx`:
- Tombol ID bar bertuliskan Bar Hujan, tetapi `case 'bar'` memakai temperature/Suhu (°C).
- `case 'area'` dan `case 'forecast'` berbagi LineChart; area tidak dirender sebagai area.
- Banyak pilihan katalog belum termasuk supportedCharts. Entri tampil bukan bukti perhitungan tersedia.

Perbaiki label/dataKey/unit/renderer/tooltip/ekspor bersama. Bar Hujan harus memakai presipitasi sesuai interval. Pisahkan AreaChart dari prakiraan. Implementasikan grafik dari data yang tersedia, terutama wind rose/histogram/box plot; hitung bins/kuartil dari sampel valid, bukan random. Wind rose menunjukkan frekuensi arah dan kelas speed, dengan label pengamatan/prakiraan. Null/nonfinite bukan nol. Sounding, seismogram, wave rose, MMI dan fan probabilistik butuh input/metode khusus; pertahankan katalog dan kebutuhan datanya tanpa grafik rekaan. Default chart harus memiliki data atau menjelaskan alasan spesifik.

### F02. Produk BMKG belum terhubung; jangan menghidupkan template lama

`apps/server/src/routes/bmkgRoutes.js` memiliki guard HTTP 503 NOT_CONNECTED pada:
`/weather/warnings`, `/climate/indicators`, `/air-quality`, `/geophysics/potential`, `/time-sun`, `/seismology/microzonation`.

Masih ada handler lama di bawahnya untuk sebagian path yang sama; guard menghentikan request sebelum handler tersebut. Keterangan kode menyebut angka/peringatan lama bersifat ilustrasi.

Jangan menghapus guard untuk mengembalikan data statis seolah resmi. Buat adapter per produk dengan sumber resmi yang benar-benar tersedia, schema dan tes terlebih dahulu. Pertahankan menu/rujukan bila belum dapat terhubung. Waktu matahari boleh calculated dengan algoritme/assumptions jelas, bukan diklaim API BMKG. Mikrozonasi memerlukan produk spasial setempat, bukan skor dari lat/lng. Setelah pengganti diuji, bersihkan handler duplikat; contoh berguna dipindah ke demo/fixture berlabel. HTTP 200 dengan success:false tetap gagal.

### F03. Schema BMKG dan race lokasi

`apps/web/src/services/bmkgService.ts`: fetchBody mengharuskan body.data kecuali katalog satelit/radar, sedangkan getAirQuality membaca body.stations. Ada potensi kontrak tidak cocok ketika backend menyediakan stations pada tingkat teratas. Jangan asumsikan semua endpoint mengirim bentuk sama.

`studio/GeospatialBMKGTab.tsx`: loadData memuat banyak produk lalu setState; efek lat/lng belum melindungi seluruh hasil dengan abort/request generation. Respons lokasi lama bisa menyusul lokasi baru. Retry citra harus memulihkan gambar yang sempat disembunyikan melalui style.

Tetapkan schema tiap endpoint lalu envelope internal konsisten. Wrapper []/null harus membawa status/error sehingga gagal berbeda dari empty sah. Status terikat produk/query/lokasi. Tambahkan AbortController/generation token dan cleanup. Keberhasilan menampilkan citra tidak sama dengan membaca piksel untuk model.

### F04. Metadata peta mengklaim verifikasi/akurasi secara tetap

MapsView.tsx, BASEMAP_METADATA:
- OSM diberi 2025–2026 Live Terverifikasi, Akurasi Topologi Standar BIG, Realtime 2026.
- ESRI imagery memiliki tahun tetap dan CE90 <2.5m.
- Traffic mengklaim live/tingkat lajur/realtime melalui metadata.
- Badge verifikasi dapat muncul tanpa hasil pemeriksaan layer aktif.

Pertahankan basemap/provider. Ganti klaim dengan metadata dataset yang dapat dibuktikan atau Tidak diketahui. Tahun instalasi bukan tanggal citra; OSM komunitas bukan sertifikasi BIG. Audit alur traffic sebenarnya. Badge mengikuti layer/snapshot, bukan konstanta JSX.

`observationCoverageService.ts` memuat katalog radar dengan status Aktif 24/7. Katalog lokasi bukan bukti sensor sedang online. Pertahankan inventaris dan pisahkan operation status yang benar-benar diverifikasi.

Jangan menuduh seluruh angka suhu ringkasan palsu: alur ringkasan utama memang mengambil cuaca. Telusuri asalnya dan pertahankan bila valid.

### F05. Remote sensing masih demo skalar

`studio/GeospatialRemoteSensingTab.tsx`: PRESET_SCENES berisi band skalar/tanggal tetap; DEMO/UNAVAILABLE; areaBreakdown kosong karena tidak ada piksel AOI. `services/geospatial/stacService.ts` ada, tetapi panel belum menghubungkan scene → asset → piksel AOI.

Pertahankan contoh rumus sebagai demo. Tambahkan STAC dengan AOI/waktu/cloud cover/koleksi terverifikasi, daftar scene/footprint/acquisition/QA. Thumbnail bukan band raster. Baca COG/GeoTIFF window dengan CRS, transform, nodata, scale/offset, Range/CORS/signed URL. Align resolusi/grid antarband, QA mask, clipping geometri AOI. Gunakan worker/job cancellable untuk ukuran besar. Statistik/luas dari piksel valid, bukan bbox/konstanta. NDVI/NDWI/NDBI/BSI sesuai sensor; SAR linear/dB tidak dicampur optik. Indikasi genangan bukan banjir terkonfirmasi.

### F06. FIRMS Studio: sensor, waktu, status dan atribusi tidak selaras

`studio/GeospatialHotspotsTab.tsx`:
- Request tetap VIIRS_SNPP_NRT walau UI menyediakan semua sensor/MODIS.
- Pilihan 7 hari diteruskan ke backend; FIRMS Area API satu permintaan mendukung 1–5 hari.
- CSV non-demo diberi SIPONGI_KLHK_IMPORT tanpa memastikan asal file.
- isLiveSource menimpa envelope menjadi LIVE, bisa menghilangkan kondisi partial/stale.
- Counter awal 0 saat belum dimuat.
- High >80% dipakai padahal VIIRS confidence kategorikal berbeda dari MODIS numerik.
- Confidence tinggi diberi keterangan Paling berisiko karhutla.

Hubungkan UI ke sumber sensor nyata: S-NPP, NOAA-20, NOAA-21, MODIS, masing-masing berstatus/provenance. Pertahankan S-NPP dan rujukan SiPongi. Asal CSV dipilih/diverifikasi, bukan otomatis SiPongi. Mode demo tidak otomatis fallback.

Rolling 24/48 jam dihitung dari acq_date+acq_time UTC dengan HHMM zero-pad. Satu hari kalender API bukan otomatis 24 jam terakhir. Pecah query 7 hari sesuai batas/tanggal/data availability; cache/dedup yang benar. Pertahankan raw confidence dan schema sensor; high detection confidence bukan risiko kebakaran %. Tampilkan umur data, satelit, FRP MW, brightness temperature dan keterbatasan NRT. Counter belum dimuat/gagal ≠ 0 valid. Hotspot anomali termal ≠ kebakaran hutan pasti. Export/map/popup membaca snapshot sama.

### F07. Hotspot globe masih bbox Indonesia dan membuang deteksi parsial

`apps/web/src/services/hotspotFireService.ts`:
- Bbox tetap 94,-11,141.5,6.5, S-NPP, dayRange=1.
- Record dibuang jika brightness atau FRP bukan angka, meski posisi/waktu bisa sah.

Terima viewport/AOI/time/sensor dari query, bukan bbox tetap. Brightness/FRP boleh nullable; record dengan identitas/lokasi/waktu valid tetap tercatat partial. Jangan mengganti instrument unknown menjadi VIIRS. Confidence numerik/kategorikal dipisah. Shared cache dan adapter Studio/2D/3D. Agregasi array global memakai loop, bukan push(...arrayBesar)/Math.max(...arrayBesar).

### F08. Globe belum memiliki lifecycle pemantauan konsisten

GlobeView3D.tsx:
- Three.js sphere/texture belum terrain/3D Tiles setara Cesium.
- USGS 2.5_week.geojson diambil sekali saat mount, tanpa response.ok/schema lengkap.
- Hotspot diambil sekali saat mount.
- Komentar USGS+BMKG pada efek tertentu tidak sesuai efek yang hanya mengambil USGS; periksa prop/layer lain sebelum menyimpulkan aplikasi sama sekali tidak memakai BMKG.
- Marker traffic memakai koridor simulasi; label harus terlihat di 3D juga.

Tambahkan scheduler per sumber, refresh manual, cache, polling sesuai produk, abort dan cleanup. Pilihan rentang/magnitudo gempa eksplisit; all_day bisa default dengan filter. Validasi Point [lng,lat,depthKm], event ID, mag/time dan bounds. Snapshot sah sebelumnya dipertahankan berlabel stale jika fetch gagal. Event revisi memperbarui ID, bukan duplicate. Data BMKG/USGS tidak digabung sembarangan menjadi satu kejadian tanpa provenance. Tidak ada prediksi waktu gempa atau klaim aman dari kosongnya marker.

### F09. Aksesibilitas radial dan kesimpulan dari data fasilitas kosong

`services/geospatial/networkAccessibilityService.ts`: isokron radial menggunakan speed tetap/faktor 0.78, waktu Haversine×1.28/speed. Tidak ada graph jalan nyata. Kategori tanpa record dianggap tidak terlayani.

`studio/GeospatialAccessibilityTab.tsx`: baseline memakai sekolah sekitar, tetapi hasil juga menyimpulkan kesehatan/evakuasi/pasar. Data sekolah tidak membuktikan tiga kategori lain tersedia.

Pertahankan mode ESTIMATED jelas; tambahkan mode network dari adapter/backend yang benar. Isokron/matriks/profil berasal dari graph/provider yang sama. OSRM routing tidak otomatis menyediakan isokron. Ambil POI kategori yang benar; OSM bukan inventaris pasti lengkap. Tambahkan UNKNOWN/INSUFFICIENT_DATA per kategori. Belum diambil/tidak lengkap ≠ tidak ada ≠ unreachable. Jangan menyarankan membangun fasilitas dari data kategori kosong. Kandidat tetap rencana/simulasi. Jangan klaim jalur evakuasi teraman.

### F10. Registry audit belum seluruh sumber dan snapshot bisa tercampur

`services/geospatialDataTelemetryService.ts`: enam entri awal (Open-Meteo cuaca/model/air, BMKG gempa, iframe, AI) belum mencakup semua STAC/FIRMS/terrain/USGS globe/traffic/routing/fasilitas. latestSnapshot tunggal dapat dihapus recordFailedIngestion untuk lokasi lain.

Inventaris adapter/request nyata, pisahkan provider/endpoint/dataset/model/renderer. Sembilan model dari satu endpoint bukan sembilan koneksi lembaga langsung. Scope snapshot/attempt per lokasi/query/model/produk. Gagal A tidak menghapus sukses B. Transport sukses, payload layak, citra tampil, formula selesai dan accuracy terukur adalah hal berbeda. Jangan mengembalikan skor rekaan atau menyembunyikan sumber gagal.

### F11. Perlindungan yang sudah benar jangan dibatalkan

- Cuaca gagal tidak diisi fallback palsu; zero sah tetap dipertahankan.
- Demo band dan estimasi radial sudah berlabel.
- Iframe dipisahkan dari numeric ingestion.
- Guard produk BMKG mencegah template diklaim resmi.
- MapsView onApplyFeaturesToMap sudah memakai studioGroup dan mengganti hanya grup yang diperbarui; jangan kembali clear seluruh analysis source.
- Studio hotspot sudah memiliki sebagian abort/sequence guards; pertahankan/perluas.

Empty sah memperbarui/menghapus hanya grup query terkait. Gagal fetch mempertahankan hasil lama berlabel stale; jangan menyamakan gagal dengan empty sah.

## 6. Pelajari God’s Eye View melalui kode, bukan klaim tampilan

Commit yang diperiksa: `e7707d9a0f34d9fbffc300023c319f95caa5be30`.
Salinan lokal jika tersedia: `D:\Blender\test 1\harmony-web-check\2026-10-03\gods-eye-view-reference`.

Repo menggunakan CesiumJS, Vite dan ES modules. Harmony menggunakan React/TypeScript, OpenLayers dan Express. Adaptasikan provider/lifecycle/normalizer, jangan mengganti stack dengan menyalin seluruh aplikasi.

Baca README/LICENSE/package.json serta:

| Modul referensi | Yang perlu dipelajari/adaptasi |
|---|---|
| src/app/viewer.js | Viewer, credit container, cleanup, kontrol |
| src/app/sources.js dan src/sources/sourceSlot.js | Registrasi sumber dan lifecycle |
| server/providers/firms.js dan src/data/firmsCsv.js | Multisumber, cache, CSV, waktu dan partial |
| src/layers/earthquakes/source.js dan records.js | Validasi snapshot sebelum mengganti hasil |
| server/providers/traffic.js dan src/layers/traffic/flowSource.js | Proxy/budget/cache flow, parser sesuai produk |
| server/providers/weather.js dan provider wind GFS/IFS | Cakupan observasi vs forecast, waktu dan grid |
| src/styles/thermal.js | Efek shader, bukan pengukuran suhu nyata |

Penting:

- Thermal shader mengubah luminance gambar layar menjadi palet termal/readout simulasi. Itu bukan sensor suhu setiap lokasi. Kata temperature dalam shader bukan bukti pengukuran fisik.
- Traffic kendaraan bergerak disimulasikan pada jalan. Flow speed provider dapat nyata; posisi tiap kendaraan bukan pengamatan live.
- Radar NOAA referensi mencakup contiguous US, bukan Indonesia. Lightning/GOES memiliki wilayah terbatas; produk global IR memiliki batas lintang/latensi juga. Jangan copy lalu klaim seluruh dunia.
- Normalizer gempa referensi menyaring M2.5+ walau source memakai all_day. Jangan menyalin threshold diam-diam lalu menyebut semua gempa.
- Cache global FIRMS berguna, tetapi jangan mengunduh dunia pada setiap pan; kelola ukuran/kuota dan tampilan bertingkat.
- Lisensi MIT meliputi kode, bukan otomatis dataset/aset/provider. Pertahankan notice/copyright pada bagian kode yang disalin dan patuhi syarat tiap sumber.
- Tidak perlu memasukkan modul pesawat/militer/CCTV/voice yang tidak terkait tujuan lingkungan Harmony.

Link kode tetap:

- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/src/app/viewer.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/server/providers/firms.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/src/layers/earthquakes/records.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/server/providers/traffic.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/server/providers/weather.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/src/styles/thermal.js
- https://github.com/bilawalsidhu/gods-eye-view/blob/e7707d9a0f34d9fbffc300023c319f95caa5be30/LICENSE

## 7. Arsitektur dan kontrak data

Gunakan/perluas tipe envelope yang sudah ada. Jangan membuat dua sistem status yang saling bertentangan.

### 7.1 Source registry

Setiap adapter/produk menyimpan:
- sourceId, provider, dataset/model/instrument, documentation URL.
- Request/parser/schema version, variabel wajib/opsional dan unit.
- Coverage region/bbox, batas waktu, resolusi, interval/TTL.
- Configuration requirement, lisensi/atribusi, fallback/pengganti.
- Jenis: observation, forecast, static inventory, derived calculation, imported file, demonstration, visual effect.

Setiap attempt/snapshot menyimpan:
- requestId/queryKey, lat/lng atau AOI hash, parameter normalisasi.
- sourceId/dataset/model, HTTP status nullable, hasil transport dan payload.
- requestedAt/fetchedAt/dataTime/acquisitionTime, validTime/forecast run bila tersedia.
- freshness/cached/stale/lastSuccessAt, alasan failed/partial/out-of-coverage.
- receivedCount/acceptedCount/rejectedCount, missing fields, unit, provenance.
- Calculation version/assumptions dan sumber masukan untuk hasil turunan.

Waktu internal UTC; tampilan mengikuti zona lokasi. fetchedAt bukan observationTime. Tanggal publikasi/inventory bukan acquisitionTime. Null/NaN tidak boleh berubah menjadi nol. Zero valid dipertahankan.

### 7.2 Pisahkan empat dimensi status

1. Transport: belum diminta/loading/sukses/HTTP-network gagal/timeout/aborted.
2. Isi: valid/empty valid/partial/invalid/out-of-coverage/not configured.
3. Umur: fresh sesuai produk/cache sah/stale/waktu unknown.
4. Jenis: observation/forecast/derived/estimated/inventory/import/demo/visual effect.

Contoh yang wajib benar:
- HTTP 200 success:false → data tidak sukses.
- HTTP 200 HTML/JSON struktur salah → invalid payload.
- CSV FIRMS dengan header valid tanpa record → empty valid, bukan jaminan tidak ada kebakaran.
- Tiga satelit sukses satu gagal → partial; tampilkan hasil sah dan satelit gagal.
- Cache lama saat timeout → attempt terbaru gagal, data tetap berlabel cached/stale.
- Katalog sensor → inventory, bukan operational live.
- Iframe/image onLoad → view loaded, bukan numeric ingestion.
- Formula selesai → calculation succeeded, bukan scientifically validated.
- Fasilitas kategori belum diambil → unknown, bukan unreachable.

### 7.3 Aliran sistem

Input lokasi/AOI → validate → coverage check → query-scoped cache → scheduled fetch → HTTP check → parser/schema → normalize coordinates/time/units → QA/dedup → shared snapshot → layer/chart/table → audit/export.

Semua kartu, popup, grafik, 2D/3D dan ekspor memakai snapshot sama, bukan angka lokal masing-masing komponen.

Implementasikan:
- Abort/generation token agar respons lokasi lama tidak menimpa lokasi aktif.
- Single-flight query identik, batas concurrency, response-size caps.
- Retry terbatas/backoff; 429 mengikuti Retry-After. Invalid key/request tidak diulang tanpa batas.
- Cache key meliputi source/model/variables/AOI/time/sensor/profile/algorithm version.
- Proxy allowlist, bukan endpoint yang mengakses URL bebas.
- Timer/worker/listener cleanup dan pengurangan polling tab tersembunyi.
- URL berkey disanitasi; error provider tidak menampilkan credential.

## 8. Cuaca, awan, angin dan validasi akurasi

Pertahankan sembilan model yang terdaftar saat audit:
`ecmwf_ifs025`, `gfs_seamless`, `icon_seamless`, `jma_seamless`, `bom_access_global`, `cma_grapes_global`, `meteofrance_seamless`, `ukmo_seamless`, `gem_seamless`.

Verifikasi ID dan ketersediaannya dengan dokumentasi sekarang. Bila ID/produk berubah, perbaiki mapping atau tambah pengganti dengan riwayat. Jangan hapus model gagal agar daftar tampak 9/9 berhasil.

Kebutuhan rinci:

1. Tampilkan model diminta, respons diterima, nilai valid, missing/failed/out-of-coverage, dan yang benar-benar masuk perhitungan.
2. Selaraskan lokasi grid, valid time, lead time, unit dan resolusi. Suhu dari waktu berbeda tidak langsung dirata-rata.
3. Gunakan cloud cover, humidity, pressure, precipitation, wind speed/direction/gust jika ada. Variabel diminta harus dibuktikan pada payload/transform yang benar-benar dipakai.
4. Angin adalah vektor: ubah speed/direction ke u/v dengan konvensi meteorologi, baru agregasi. Mean 359° dan 1° tidak boleh menjadi 180°.
5. Spread antarmodel berarti variasi prakiraan, bukan akurasi terhadap pengamatan. Gunakan istilah yang benar dan sampel valid.
6. Diagnostik awan/angin bukan otomatis solver NWP/nowcasting tervalidasi. LLM dapat menjelaskan snapshot, tetapi tidak mengganti numerik atau memberi stempel verifikasi.
7. Harmony membaca output model yang sudah menghitung atmosfer pada provider. Request sejumlah koordinat bukan asimilasi seluruh atmosfer bumi oleh Harmony.
8. Pemantauan global memakai data grid/tile/viewport dan query lokasi dengan cache. Jangan download setiap tempat di semua negara setiap refresh. Coverage berbeda per produk.
9. Untuk accuracy, simpan forecast saat diterbitkan dan cocokkan dengan observasi independen pada waktu/lokasi sama. Hindcast/seamless yang diperbarui bukan otomatis forecast yang dulu diterbitkan.
10. Ukur MAE/RMSE/bias suhu, error vektor angin, dan metrik hujan yang relevan bila data cukup. Laporkan n sampel, wilayah, periode, lead time, baseline, missingness dan keterbatasan.
11. Jika belum ada validasi, tulis Akurasi terhadap pengamatan belum diuji. Jangan membuat confidence/akurasi 98% atau menganggap lebih banyak sumber pasti lebih akurat.

## 9. FIRMS dan gempa lintas wilayah

### 9.1 Backend FIRMS multisumber

Sumber per adapter: VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT, MODIS_NRT. Server membaca MAP_KEY; browser tidak menerima key.

- Status per satelit, dataset, waktu dan jumlah record; kegagalan satu tidak membuat seluruh sistem sukses/semua kosong.
- Bbox WGS84 [west,south,east,north] dengan bounds benar. Antimeridian dipisah jika API tidak mendukung bbox lintas dateline.
- Query lokal sesuai viewport/AOI. Snapshot global opsional di server dengan interval, cache, batas ukuran dan quota; dipakai ulang lintas pengguna.
- API recent-day memakai hari kalender: rolling 24 jam perlu mengambil jendela cukup dan memfilter timestamp. 7 hari dibagi request sesuai batas 1–5 hari dan data availability, tanpa interval palsu.
- Normalize date + HHMM UTC; 0045 dan 45 sama-sama perlu interpretasi jelas. Invalid timestamp bukan now otomatis.
- Dedup pengamatan identik berdasarkan source/platform/time/coordinate/ID. Clustering kejadian lintas sensor berbeda dari dedup; simpan record asal.
- RT/URT yang diganti NRT tidak dihitung sebagai tambahan kebakaran tanpa aturan produk.
- Confidence raw dan schema sensor dipertahankan. Numeric MODIS tidak dipaksakan sama dengan VIIRS l/n/h.
- Brightness temperature K/°C adalah parameter sensor, bukan suhu udara atau suhu inti api. FRP MW bukan luas terbakar.
- Record sah yang intensitasnya missing tetap partial, bukan dibuang diam-diam.
- Key missing → NOT_CONFIGURED; HTML/error CSV → failed/invalid; header-only CSV valid → empty sah.
- Tampilkan received/rejected/accepted/filtered, waktu akuisisi, umur data, sumber dan alasan rejection.
- Cluster/LOD/tile untuk data besar; popup/detail sesuai kebutuhan, bukan semua marker DOM.

### 9.2 Gempa

Pertahankan BMKG nasional dan USGS global; kriteria tiap feed tidak sama.

- Source USGS all_day dengan filter jam/hari/minggu/magnitudo; polling dapat sekitar 60–120 detik, sesuai feed update dan cache, bukan tiap frame.
- GeoJSON [lng,lat,depthKm], event ID, time dan nullable magnitude divalidasi.
- Event time, feed generated time dan fetchedAt dipisahkan.
- Revisi ID yang sama memperbarui data, bukan event duplikat.
- Bila asosiasi BMKG/USGS belum pasti, tampilkan asal masing-masing; jangan cross-source dedup naif.
- Cache valid dipertahankan ketika update gagal dengan status jelas.
- Jangan meramal waktu gempa, memastikan tidak ada bahaya dari feed kosong, atau membuat tsunami warning resmi dari threshold sendiri.

## 10. Suhu, termal, hutan dan radar

Jangan menyatukan produk berbeda di balik label suhu realtime:

| Produk | Makna benar | Jangan diklaim sebagai |
|---|---|---|
| Suhu 2m | Forecast/observation udara dengan waktu/sumber | Suhu tanah/api |
| FIRMS | Anomali, brightness temperature, FRP | Suhu udara/inti api/kebakaran hutan pasti |
| Landsat LST | Suhu permukaan scene dengan QA | Live setiap detik atau suhu udara |
| Weather satellite IR | Radiansi/brightness/cloud product sesuai dataset | Suhu tanah bila piksel awan |
| FLIR shader | Efek visual/simulasi | Sensor termal geografi |

LST yang benar:
- Cari Landsat 8/9 Collection 2 Level-2 dengan produk surface temperature, sesuai AOI/waktu; scene tanpa ST tidak dipaksa.
- Baca ST band, nodata, QA/uncertainty, clip piksel AOI dan statistik valid.
- DN ST_B10 Collection 2 yang belum diskalakan: K = DN×0.00341802+149.0; °C = K−273.15. Cek metadata agar tidak scale dua kali.
- Tampilkan acquisition time, resolusi produk/native sensor bila relevan, cloud/no-data dan jumlah piksel valid.
- Area tanpa data tetap transparan/no-data; jangan diisi suhu model udara atau interpolasi tidak berlabel.
- Render raster 2D/3D dan ekspor membawa provenance/metode sama.

Kebakaran hutan:
- Overlay FIRMS, land cover bertanggal, AOI, administrative boundaries, cuaca dan angin dengan konteks waktu.
- Titik di vegetasi/hutan adalah konteks, bukan bukti sebab atau konfirmasi lapangan.
- Wind particle/plume dekoratif bukan model dispersi. Model asap memerlukan emisi/profil atmosfer/metode dan validasi.
- Confidence deteksi bukan risk score. Risiko, area terbakar dan kejadian terkonfirmasi adalah produk berbeda.
- Jangan menghitung luas hutan terbakar sebagai jumlah titik × luas nominal piksel tanpa metode sah.

Awan/radar:
- Gunakan coverage metadata sebelum aktif. Radar NOAA AS tidak dipakai sebagai radar Indonesia.
- Produk BMKG/Himawari untuk Indonesia hanya bila akses/kontrak/izin terverifikasi; jangan mengarang URL endpoint.
- Di luar cakupan → OUT_OF_COVERAGE, bukan 0 hujan.
- Timeline observed/past terpisah dari forecast/future. Forecast precipitation bukan radar pengamatan.
- Katalog/iframe boleh tetap tersedia dengan penjelasan bila numerical ingestion belum ada.

## 11. 3D realistis dengan 2D tetap berfungsi

Tambahkan CesiumJS sebagai renderer opsional/lazy React component, memakai OpenLayers 2D dan kontrak data existing. Jangan mengganti peta 2D sekaligus.

Shared state: fokus lokasi, AOI, layer, snapshot, time/filter, selected feature dan rute. Renderer berbagi data; GeoJSON kontrak WGS84, diproyeksikan saat render.

- Globe Three.js dipertahankan sampai replacement lolos gate. Feature flag untuk perpindahan; jangan dua viewer/polling aktif bersamaan.
- Terrain/imagery fallback terverifikasi; ellipsoid/texture biasa bukan photorealistic buildings.
- Google Photorealistic 3D Tiles atau alternatif opsional bila token/izin/coverage/quota tersedia. Wilayah tanpa coverage tetap punya alternatif yang benar.
- Credit container terlihat; patuhi ketentuan lisensi/cache provider.
- Konfigurasi asset/worker/base URL/CSS/CSP/build Vite sesuai versi Cesium terpasang.
- Lazy load, LOD/cluster, batas DPR/memori, request rendering bila tepat, mobile adaptation.
- Destroy viewer/primitives/listeners/timers/workers pada unmount dan error init. Context loss/GPU unavailable harus menyediakan kembali 2D.
- Picking, popup, AOI, filter, route, refresh dan fokus bekerja setelah 2D↔3D.
- Error tiles 401/403/429 terlihat; jangan diam-diam menyebut 3D premium aktif.
- Panel rapi dengan data utama, unit, timestamp, skala warna/legenda dan status sumber. Peta tidak tertutup tombol/kartu.
- Glow/transisi secukupnya dan reduced motion; warna merah bukan otomatis peringatan darurat.
- Menu sensor/model/time/3D tetap di panel peta yang sama.

## 12. Traffic nyata dan simulasi

Telusuri `trafficTelemetryService.ts`, MapsView, GlobeView3D, `routingService.ts`, RouteNavigatorModal dan backend network.

1. Pertahankan koridor/dataset/rute lama dengan STATIC/SIMULATION label; jangan hapus semuanya untuk layer baru.
2. Tambahkan traffic flow provider nyata, misalnya TomTom, lewat proxy backend.
3. Parse sesuai produk. Vector/raster tiles untuk tampilan tidak otomatis menyediakan semua angka absolute speed. Detail memakai kontrak flow segment yang relevan.
4. Current speed/free-flow speed/confidence/closure/time hanya dicatat bila respons menyediakannya; missing tidak diisi konstanta.
5. OSM menyediakan geometri/inventaris jalan, bukan speed live. Speed limit/road class bukan kecepatan sekarang.
6. Kendaraan animasi dapat mengikuti flow speed agregat, tetapi posisinya tetap simulasi, terlihat di tooltip/panel/ekspor/3D.
7. No key/no coverage: road network tetap terlihat; flow unavailable/out-of-coverage. Demo dipilih terpisah.
8. TTL, viewport/zoom tile budget, cache, dedup dan batas request; failure/429 tidak membuat seluruh jalan hijau seolah lancar.
9. Rute provider bukan otomatis rute evakuasi paling aman. Hazard layers dan keputusan keselamatan butuh data aktual serta metode tersendiri.

## 13. Menu lain yang harus tetap diselesaikan sesuai data

- Terrain: elevasi/profile/slope dari grid valid, datum/resolusi/sampling/latitude cell size jelas. DEM tidak sama dengan lidar live; slope saja bukan risiko longsor tervalidasi.
- GNSS: GPS browser tidak berarti semua CORS/GNSS katalog tersambung atau deformasi dipantau. Accuracy sesuai metadata perangkat.
- Hydrology: DAS/land cover/DEM/hujan harus tersedia. Jangan buat fraksi lahan atau risiko banjir dari nama kota/koordinat saja.
- Survey/drone: form/import/export tetap. Katalog bukan koneksi drone/lidar; CRS/units/source berkas divalidasi.
- Analytics/buffer: geometri/ring/CRS/meters-degrees/antimeridian dan luas geodesik atau proyeksi yang cocok.
- Fusion: hanya source dan transform yang benar-benar diimplementasikan. Pembobotan contoh bukan data assimilation/model fisik tervalidasi.
- Catalog: listed/configured/connected/used in calculation berbeda. Link diklik bukan ingestion sukses.
- Emissions: faktor frontend/backend, unit per kendaraan/per passenger, occupancy/distance/idle/version konsisten. Hasil adalah estimasi faktor, bukan sensor gas live.
- SWOT: save/load/export sesuai auth/storage existing. Jangan menaruh kepemilikan pengguna hanya dari x-user-id yang tidak diverifikasi.
- Jobs: succeeded hanya sesudah computation selesai dan hasil tersedia. Array band contoh tidak membuktikan raster pipeline. Tes memakai store terisolasi, bukan data pengguna.

## 14. Plan lalu implementasi dalam enam tahap

### A. Baseline
Catat status/commit/perubahan lokal. Inventaris 15 menu, seluruh subtab/button/callback/endpoint/source/layer/export. Bedakan works/bug/not connected/not configured/out-of-coverage/not tested. Baca skrip tes yang bisa menulis database. Dokumentasikan file yang akan diubah dan fungsi yang dilindungi.

### B. Perbaikan mendasar
Perbaiki F01/F03/F04/F06/F09/F10 dahulu. Pertahankan F11. Betulkan schema/status/provenance/race/false conclusions. Reproduksi menu yang benar-benar gagal; jangan hapus menu unavailable. Jalankan typecheck/build/tes kontrak sebelum perubahan renderer besar.

### C. Source adapters dan data bersama
Hubungkan FIRMS multisumber, USGS/BMKG polling, registry semua modul dan snapshot bersama. Produk BMKG lain hanya bila official contract tersedia; jangan mencabut guard dulu. Pertahankan model cuaca dan alignment variabel/time/vector. Network accessibility memakai sumber nyata, dengan completeness unknown.

### D. Raster dan traffic
STAC → asset → piksel/QA AOI → indeks/LST → layer/chart/export. Traffic provider sesuai key/coverage dengan simulasi terpisah. Job berat cancellable dan dibatasi; jangan freeze UI. Produk temp/cloud/fire benar secara semantik.

### E. 3D
Integrasikan renderer Cesium opsional dengan adapters/state stabil. Uji provider terrain/imagery/tiles dan fallback. Verifikasi picking/filter/route/AOI/refresh/disposal/fullscreen/mobile dan 2D↔3D. Menambah sphere/shader saja bukan penyelesaian 3D/data.

### F. Gate akhir
Uji versi setelah edit; bandingkan source/menu/features sebelum-sesudah. Review diff untuk penghapusan, stub/noop, data random, key log dan label palsu. Laporkan operasional vs konfigurasi kurang vs belum terhubung vs belum diuji.

Jika suatu tahap gagal, tangani penyebab sebelum menambah perubahan besar. Jika akses provider terhalang, kerjakan bagian independen dan tes fixture terisolasi; verifikasi live tetap berstatus tertunda.

## 15. Pengujian yang harus dilakukan

### Menu dan alur pengguna
- Semua 15 menu buka/tutup/buka ulang; subtab dan aksi utama benar-benar diuji.
- Panel tunggal, tanpa shortcut duplikat; Peta Cuaca tetap namanya.
- Search/pan/zoom/GPS/measure/route/fullscreen tetap setelah modal ditutup.
- Keyboard/focus/scroll/z-index, desktop dan mobile sekitar 390×844 tanpa overflow.
- Apply hasil hotspot dan accessibility berdampingan; update satu grup tidak menghapus yang lain.

### Payload, scope dan kegagalan
Gunakan fixture terpisah dari produksi; bukti tes jelas fixture atau live.
- Valid zero; HTTP 200 success:false; 200 HTML/JSON salah/kosong.
- Header CSV valid kosong berbeda dari malformed/error.
- Partial variables/models/satellites; missing key; outside coverage.
- Timeout/abort/offline/401/403/429/5xx.
- Cache lama saat update gagal; status/freshness tidak menjadi sukses terbaru.
- Invalid coords/time dan response beda lokasi.
- A lambat menyusul B tidak menimpa B; kegagalan A tidak menghapus snapshot B.
- Empty POI kategori tidak ditafsirkan unreachable.
- Bbox antimeridian, rolling time dan pembagian query FIRMS 7 hari.
- VIIRS vs MODIS confidence; optional FRP/brightness hilang tidak menghilangkan record sah.
- Layer/popup/tabel/chart/ekspor berasal dari snapshot/query sama.
- Tidak ada sumber online/success yang hanya berasal dari nama atau URL di registry.

### Numerik/grafik/GIS
- Bar Hujan precipitation sesuai interval; Area memakai area; tidak ada fan confidence rekaan.
- Wind rose/vector u-v: 359°/1°, calm dan null; bins memakai sampel valid.
- Fixture raster diketahui: band alignment, QA/nodata, clipping polygon, unit dan scale/offset.
- ST yang sudah scaled tidak diskalakan dua kali; LST/brightness/air temp tidak tertukar.
- Luas/distance/CRS valid dan partial coverage dinyatakan.

### 3D/performa
- Fokus/layer/AOI/filter tetap saat 2D↔3D dan polling tidak ganda.
- No key/no terrain/no tiles/WebGL error tetap bisa 2D dengan alasan jelas.
- Tiles 403/429, init fail, context loss, unmount/remount dan repeated toggle.
- Credit terlihat; cluster/LOD/memory/query cap mencegah global data freeze.
- Tidak ada timer/listener/GPU/worker leak; mobile tidak wajib download semua dunia.

### Gate proyek
Baca skrip sebelum menjalankan. Jalankan typecheck/build/tes relevan yang sudah ada. Tes job/database memakai penyimpanan terisolasi. Build sukses bukan bukti sumber live/accuracy; fixture sukses bukan bukti API provider saat ini. Pisahkan hasilnya.

## 16. Apa yang boleh ditambah, diganti, atau dihapus

**Tambahkan:** adapter nyata, schemas, shared snapshots, source registry lengkap, polling/cache/provenance, state unknown/partial/coverage, COG/QA pipeline, source multiproduk FIRMS, traffic flow, renderer 3D opsional, pengujian kontrak/non-regression.

**Perbaiki/ganti:** handler salah, label/renderer grafik, mapping schema, race lokasi, metadata tak berdasar, pilihan sensor yang tidak memengaruhi request, radial estimasi menjadi mode terpisah dan network nyata, source gagal dengan adapter/pengganti terdokumentasi.

**Hapus hanya setelah pengganti terbukti:** handler duplikat/tidak terjangkau, shortcut UI duplikat yang tujuan/handler sama sudah tersedia di panel, klaim static live/accuracy tanpa bukti, mock dalam jalur operasional. Contoh yang berguna dipindahkan ke mode demo/fixture, bukan dihapus bersama fitur.

**Jangan hapus:** salah satu dari 15 menu, subtab penting, source lama hanya karena gagal, model cuaca, GPS/route/AOI/export, katalog/rujukan, existing user storage/auth, status kegagalan jujur, atau layer lain saat memperbarui hasil.

Bandingkan inventaris sebelum-sesudah. Jumlah source configured/available/used harus dibedakan; jangan menaikkan jumlah dengan duplikasi nama atau mempertahankan claim palsu.

## 17. Hasil akhir yang wajib diberikan

1. Temuan dengan file/fungsi/baris, reproduksi, severity dan klasifikasi bug/gap/configuration/coverage/not tested.
2. Plan dan tahap yang benar-benar dikerjakan, belum dikerjakan serta alasan.
3. Tabel perubahan: fitur/file/ditambah-diperbaiki-dihapus/alasan/kontrak yang dijaga/bukti tes.
4. Inventaris source/model/dataset sebelum-sesudah: cakupan, konfigurasi, status, numerical input vs renderer/catalog, pengganti jika ada.
5. Daftar penghapusan spesifik dan alasan; bila tidak ada, tulis tidak ada.
6. Hasil tes nyata: waktu/versi/scope/perintah/exit code, fixture/live, screenshot/metadata disanitasi, limitations.
7. Konfigurasi: nama env dan cara memperoleh key/izin, tanpa nilai rahasia.
8. Daftar tertunda: not connected/not configured/out-of-coverage/accuracy not tested. Jangan menutup dengan Semua 100% berfungsi tanpa bukti.

Pemulihan dapat dinyatakan selesai ketika menu/fungsi lama terjaga, kesalahan terverifikasi diperbaiki, status data jujur, panel rapi dan gate relevan lulus. Fitur operasional lanjutan hanya dinyatakan selesai dengan bukti request → payload valid → normalisasi → calculation/render → audit/export. Kekurangan key/data harus dinyatakan sebagai batas nyata.

## 18. Sumber primer untuk verifikasi kontrak sekarang

- Repo: https://github.com/bilawalsidhu/gods-eye-view
- FIRMS Area API: https://firms2.modaps.eosdis.nasa.gov/api/area/
- FIRMS global API example/transactions: https://firms2.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html
- USGS GeoJSON feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- BMKG Data Terbuka: https://data.bmkg.go.id/
- Open-Meteo weather: https://open-meteo.com/en/docs
- Open-Meteo ensemble: https://open-meteo.com/en/docs/ensemble-api
- Historical Forecast: https://open-meteo.com/en/docs/historical-forecast-api
- Landsat ST: https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature
- Landsat scale factors: https://www.usgs.gov/faqs/how-do-i-use-a-scale-factor-landsat-level-2-science-products
- Cesium Google 3D Tiles: https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles
- TomTom Traffic: https://developer.tomtom.com/traffic-api/documentation/product-information/introduction

Verifikasi lagi ID, izin, unit, coverage, latency dan API saat implementasi. Jangan menganggap README atau sebuah efek visual sebagai bukti kemampuan pengamatan. Selesaikan Harmony dengan fungsi yang dapat diuji dan asal data yang dapat dilacak.

