# Hasil Pemeriksaan dan Perbaikan Harmony — 3 Oktober 2026

## Ringkasan

Pemeriksaan mencakup situs publik, proyek lokal `D:\vscode\Harmony`, aliran data tertentu, 15 menu Studio, dan renderer 3D. Kesalahan yang dapat dipastikan diperbaiki pada proyek lokal. Situs publik belum diperbarui oleh pekerjaan ini.

Prompt siap diberikan kepada Gemini: [HARMONY_GEMINI_FOLLOWUP_PROMPT_2026-10-03.md](D:/vscode/Harmony/docs/HARMONY_GEMINI_FOLLOWUP_PROMPT_2026-10-03.md).

## Perbedaan publik dan lokal

Situs publik pada `/app/maps` merespons HTTP 200 dan dapat dibuka. Saat pemeriksaan, publik masih mempunyai 11 domain, nama `Peta Cuaca Windy`, dan beberapa label lama yang mengklaim live/verifikasi. Lokal mempunyai 15 domain dan panel `Alat & Analisis`. Bukti: [perbandingan publik/lokal](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/public-and-cesium-before.json>).

Pemeriksaan tersebut tidak membuktikan seluruh fungsi situs publik bekerja. Perbaikan lokal tidak berarti sudah terpasang di Vercel.

## Yang diperbaiki dalam pemeriksaan ini

| Bagian | Kesalahan yang ditemukan | Perbaikan |
|---|---|---|
| Cesium | Tombol tersedia tetapi dependency dan import runtime tidak bekerja; kegagalan disebut WebGL | Dependency, import Vite, lazy loading dan aset runtime disambungkan. Mode OSM/ellipsoid berfungsi tanpa Ion. Terrain tetap opsional sesuai akses sumber. |
| FIRMS sumber | ALL/VIIRS tidak meminta seluruh produk sesuai pilihan | Adapter server memilih SNPP, NOAA-20, NOAA-21, MODIS sesuai sensor, dan melaporkan percobaan tiap produk. |
| FIRMS tujuh hari | Rentang dipotong menjadi lima hari | Request kalender dibagi menjadi bagian maksimal lima hari, lalu disaring ke rentang waktu berjalan yang diminta. |
| FIRMS validasi | Rekaman ditolak dapat terbaca sebagai hasil nol berhasil | Header, koordinat, waktu/tanggal dan baris divalidasi. Semua invalid = gagal; received/rejected count tetap tercatat. Hasil valid kosong dibedakan. |
| FIRMS status | Gagal sebagian sumber dan cache kurang jelas | PARTIAL per sumber/jendela, waktu cache asli, batas request keseluruhan 45 detik, alasan kegagalan tanpa key, dan pesan parsial diperbaiki. |
| CSV impor | File invalid bisa menghasilkan analisis sukses nol dan angka `undefined MW` | Envelope gagal dengan alasan, pesan UI, angka kosong, parsing tanggal dan identitas deteksi diperbaiki. |
| Globe gempa/titik panas | Promise selesai atau array kosong dapat menampilkan LIVE meski sumber gagal | Pemeriksaan payload/status sumber; LIVE/PARTIAL/STALE berdasarkan hasil, perlindungan abort dan respons lama. |
| Globe cuaca | Delapan angka kota ditulis tetap tetapi disebut data BMKG/Open-Meteo | Ditandai DEMO dan contoh statis Harmony, lapisan contoh mati saat awal. Tidak dihapus. |
| Globe nilai asumsi | Kedalaman, magnitudo, vegetasi dapat diisi angka/nama asumsi | Missing tetap tidak tersedia. Efek warna termal diberi penjelasan bukan pengukuran suhu. Banner LIVE tanpa syarat dihapus. |
| Statistik | Kuartil, urutan arah angin, calm/missing dan box plot kurang tepat | Kuartil interpolasi, 16 sektor melingkar, calm terpisah, missing tidak menjadi nol/utara, dan box plot dengan whisker min/max. |
| STAC metadata | Scene katalog disebut LIVE, ketelitian CE90/platform/resolusi diciptakan, unknown cloud disebut radar | Metadata ARCHIVED, hanya nilai yang berasal dari metadata, asset disebut katalog, cloud unknown tetap tidak tersedia. Piksel belum dianalisis. |
| STAC lifecycle | AOI MultiPolygon diabaikan dalam bbox; hasil pencarian lama dapat menimpa query baru | Menggunakan bbox AOI, pembatalan/nomor generasi dan invalidasi lokasi/koleksi/filter. Pilihan demo dan scene dipisahkan. |
| Aksesibilitas | Estimasi radius diberi label tercapai penuh 100% | Label menjadi estimasi jangkauan dan tidak mengaku sertifikasi kota 15 menit. |

Grafik hujan batang, seri area, dan kategori fasilitas missing yang lebih jujur sudah tersedia pada baseline dari perbaikan sebelumnya. Tidak diklaim sebagai perbaikan baru dalam pemeriksaan ini.

## Hasil verifikasi

| Pemeriksaan | Hasil | Batas bukti |
|---|---|---|
| `npm run typecheck` | Lulus, exit 0 | Memeriksa tipe, bukan ketelitian data dunia. |
| `npm run build` | Lulus, exit 0 | Ada warning ukuran chunk besar; masih perlu optimasi. |
| `weatherDataIntegrity.test.mjs` | 16 kelompok lulus, exit 0 | Fixture integritas dan sebagian handler; bukan backtest ramalan. |
| `recoveryFollowup.test.mjs` | 11 kelompok lulus, exit 0 | Statistik, CSV, FIRMS multisumber/tujuh hari/partial/deadline, schema gempa dan STAC dengan fixture. |
| Buka 15 menu setelah perbaikan | 15/15 terbuka; page error 0; tidak ada overflow halaman desktop | Buka menu, bukan seluruh aksi/subfitur. |
| Cesium versi development | Satu canvas aktif, error 0; kembali 2D lulus | OSM/ellipsoid tanpa bukti terrain/gedung fotorealistik. |
| Cesium hasil build produksi, preview lokal | Satu canvas aktif, request aset Cesium gagal 0, page error 0; kembali 2D lulus | Diuji path root preview lokal, bukan deployment Vercel/subpath. |
| Globe dengan USGS/BMKG/FIRMS sengaja HTTP 503 | Status STALE/gagal; tidak menjadi LIVE; page error 0 | Intersepsi browser terkontrol. |
| CSV invalid desktop 1440px dan mobile 390px | Pesan gagal muncul; page error 0; tidak ada `undefined MW` | Tidak menguji seluruh fitur mobile. |
| Backend live baca | BMKG autogempa 1 rekaman dan terkini 15 rekaman; FIRMS NOT_CONFIGURED; warnings/air-quality NOT_CONNECTED | Status pada waktu pemeriksaan, bukan jaminan uptime berikutnya. |

Tidak menjalankan keseluruhan `npm test` pada storage pengguna karena suite job geospasial dapat menulis data. Tidak menyebut gate tersebut lulus. Aplikasi development dan server milik pengguna tetap berjalan. Preview sementara untuk memeriksa build dihentikan setelah pengujian.

## Yang belum selesai dan perlu dilanjutkan

1. **Koneksi FIRMS live:** MAP_KEY belum dikonfigurasi. Logika multisumber diuji dengan fixture; jangan mengaku koneksi NASA live sudah teruji.
2. **Enam produk BMKG:** warnings, climate indicators, air-quality, geophysics potential, time-sun, microzonation belum terhubung. Guard unavailable dipertahankan agar tidak menghidupkan template data palsu.
3. **STAC/raster:** katalog bukan NDVI/LST AOI nyata; pembacaan COG, QA/mask/scale/offset, pagination, dan dukungan lintas garis tanggal perlu dilengkapi. Pencarian live STAC tidak diverifikasi dalam sesi ini.
4. **Shared snapshot:** status singleton FIRMS/BMKG dan query-scoped metadata lintas renderer perlu dirapikan; semua layer/AOI/time belum tersinkron ke Cesium. Hotspot belum diteruskan dari parent ke renderer Cesium.
5. **Validasi lanjutan:** backend BMKG masih memakai beberapa parsing/validasi longgar; CSV campuran valid/invalid perlu rincian penolakan; rentang waktu impor perlu aturan eksplisit.
6. **Traffic/accessibility/terrain:** simulator traffic bukan provider live; radius bukan network travel time; DEM/hidrologi/fusion belum otomatis memiliki input nyata. Menu dan sumber tetap dilindungi.
7. **Performa:** MapsView sekitar 8.4 MB dan Cesium sekitar 5 MB sebelum gzip pada build terbaru; lazy loading Cesium sudah ada, tetapi dataset/bundle lain masih berat.
8. **Ketelitian ilmiah:** belum ada backtest forecast dengan pengamatan independen. Banyak sumber dan tampilan 3D tidak otomatis membuktikan akurasi.

Prompt lanjutan menjabarkan langkah perbaikan, kontrak data, sumber primer, pengujian, serta bagian yang boleh ditambah/diganti/dihapus. Tidak meminta pengurangan menu/sumber untuk menyembunyikan kegagalan.

## File yang disentuh pada sesi perbaikan ini

- `apps/web/package.json`, `package-lock.json`, `apps/web/vite.config.ts`.
- `apps/web/src/components/dashboard/views/spatial/CesiumGlobe3D.tsx`, `MapsView.tsx`, `GlobeView3D.tsx`.
- `apps/web/src/components/dashboard/views/spatial/charts/HarmonyChartEngine.tsx`.
- `apps/web/src/components/dashboard/views/spatial/studio/GeospatialHotspotsTab.tsx`, `GeospatialRemoteSensingTab.tsx`, `GeospatialAccessibilityTab.tsx`.
- `apps/web/src/services/hotspotFireService.ts`.
- `apps/web/src/services/geospatial/types.ts`, `firmsService.ts`, `stacService.ts`, `chartStatistics.ts`, `earthquakeSnapshotService.ts`.
- `apps/server/src/controllers/spatialController.js`, `apps/server/src/services/firmsIntegrity.js`.
- `tests/recoveryFollowup.test.mjs` dan dua dokumen tindak lanjut ini.

Diff terhadap HEAD juga mencakup banyak pekerjaan dari sesi sebelumnya; jangan menganggap semuanya dibuat pada sesi ini. Snapshot awal beberapa file yang akan diedit disimpan pada direktori bukti `before`; snapshot ini bukan backup seluruh repository.

## Bukti lokal

Direktori: `D:\Blender\test 1\harmony-web-check\2026-10-03-followup`.

- [Hasil buka 15 menu](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/after/current-menu-audit.json>)
- [Cesium hasil build](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/cesium-production.json>)
- [Uji gagal globe](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/globe-failure-after.json>)
- [CSV invalid desktop/mobile](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/invalid-csv-browser.json>)
- [Pemeriksaan backend live](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/live-backend-check.json>)
- [Log build terakhir](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/build-final.log>)
- [Log 11 kelompok tes](</D:/Blender/test 1/harmony-web-check/2026-10-03-followup/recovery-tests-final.log>)

Batas API FIRMS 1–5 hari per request mengikuti [NASA Area API](https://firms2.modaps.eosdis.nasa.gov/api/area/). Penataan runtime Cesium mengikuti [CesiumJS Quickstart](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/).
