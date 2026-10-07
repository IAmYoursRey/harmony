# Perbaikan langsung integritas data Harmony

Tanggal: 4 Oktober 2026. Perubahan dilakukan pada kode lokal `D:/vscode/Harmony`.

## Perbaikan yang diterapkan

1. **Validasi nilai cuaca menyeluruh.** Suhu, kelembapan, awan, tekanan, arah/kecepatan angin, peluang hujan, dan kode cuaca diperiksa sebelum dipakai. Nilai tidak valid pada deret prakiraan dikeluarkan atau menjadi `null`; nilai nol yang sah dan suhu negatif tetap dipertahankan. Hari dengan suhu minimum lebih tinggi dari maksimum ditolak.
2. **Pemeriksaan satuan dan waktu.** Metadata satuan yang bertentangan dengan kontrak permintaan ditolak. Waktu terbit MET di masa depan, titik duplikat, horizon tidak masuk akal, dan offset waktu `+14:59` tidak diterima.
3. **Pemulihan sembilan model.** Kegagalan permintaan gabungan tidak menghapus model dari daftar. Deret yang hilang/rusak dicoba sendiri, maksimal tiga permintaan bersamaan. Hasil diselaraskan berdasarkan waktu; respons model tunggal dan epoch milidetik dinormalisasi. Riwayat permintaan gabungan yang gagal tetap tercatat sebagai gagal, meskipun permintaan berikutnya berhasil.
4. **Audit kualitas udara konsisten.** Pengambilan dan pemeriksaan manual memakai validator yang sama. Data usang gagal; parameter/deret yang sebagian kosong mendapat status parsial. Nilai polutan negatif tidak masuk ke grafik atau riwayat.
5. **MET memakai pemeriksaan titik yang sama.** Validator dan konsumsi menolak titik dengan gust, hujan, waktu, atau parameter lain yang tidak valid. Jumlah titik diterima/ditolak konsisten; titik diurutkan berdasarkan waktu.
6. **Radar memakai cache renderer sebenarnya.** Pemeriksaan tidak membuat tile baru. Hitungan hanya untuk wilayah aktif, mengikuti resolusi penyedia, termasuk peta berputar. Penyelesaian tile wilayah lama tidak membuat wilayah baru berstatus live. Event ganda tidak menambah hitungan unduhan dua kali.
7. **Kartu cuaca tidak mengulang tanpa henti.** Kegagalan tidak lagi memicu permintaan pada setiap render. Refresh mengikuti jadwal atau tindakan pengguna. Batas waktu mencakup pembacaan isi respons. Perpindahan lokasi membatalkan permintaan lama; respons terlambat tidak menimpa lokasi terbaru. Tanpa data dan penyedia offline, status menjadi “Tidak tersedia”.
8. **Keterangan tampilan diperjelas.** Rentang suhu diberi label “Rentang antar-model”. Data hujan kosong tidak disebut kering. Kode WMO hujan sedang/lebat dan salju diberi keterangan yang sesuai.

## Berkas utama

- `apps/web/src/services/weatherValueValidation.ts`
- `apps/web/src/services/weatherDataIntegrity.ts`
- `apps/web/src/services/weatherAggregatorService.ts`
- `apps/web/src/services/metNorwayService.ts`
- `apps/web/src/services/geospatialDataTelemetryService.ts`
- `apps/web/src/services/geospatial/weatherTileCoverage.ts`
- `apps/web/src/services/geospatial/mapWeatherLiveService.ts`
- `apps/web/src/services/geospatial/mapFreshnessEngine.ts`
- `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`
- `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx`
- `apps/web/src/components/dashboard/views/spatial/map/MapWeatherObservationCard.tsx`
- `apps/server/src/services/weatherIntegrity.js`
- `apps/server/src/controllers/spatialController.js`

Daftar sembilan model, sumber, dan struktur menu dipertahankan. Perubahan yang sebelumnya sudah ada pada proyek tidak di-reset.

## Pengujian

Perintah terarah: `npm run test:data-integrity`.

- 37 tes perbaikan langsung dan regresi tahap 10–12: lulus.
- 16 kelompok integritas cuaca, termasuk rute backend dan kegagalan sumber: lulus.
- 20 pemeriksaan freshness dan lifecycle: lulus.
- Empat pemeriksaan melalui Edge pada aplikasi lokal: lulus; tidak ada JavaScript page error. Kasus meliputi API gagal tanpa loop, pemilihan prakiraan hari berikutnya, hujan jarang tanpa klaim kering, dan parameter awan/angin yang kosong tanpa angka pengganti.
- Typecheck dan build produksi: lulus. Build masih memberi peringatan ukuran bundle besar; optimasi ukuran berada di luar perubahan integritas ini.

Tes baru `tests/directDataIntegrity.test.mjs` juga dimasukkan ke perintah pengujian standar. Adaptor tes radar lama diperbarui untuk membaca cache yang sebenarnya; tes tahap 12 kini memakai OpenLayers terpasang, termasuk penyelesaian tile setelah pindah wilayah.

Pengujian terarah tidak mencakup semua alur bisnis aplikasi. Fixture pengujian bukan bukti akurasi ramalan terhadap pengamatan lapangan.

## Hasil pemeriksaan layanan langsung

Pemeriksaan sekitar 08.42 WIB, pada koordinat -7.25, 112.75:

| Sumber | Hasil |
|---|---|
| ECMWF, ICON, JMA, CMA, Météo-France, UKMO, GEM | HTTP 200; nilai/model lolos validator |
| Open-Meteo cuaca utama | HTTP 200; lolos validator |
| MET Norway | HTTP 200; lolos validator |
| RainViewer | HTTP 200; metadata radar tersedia |
| CAMS kualitas udara | HTTP 200; sebagian deret tidak lengkap, status parsial |
| GFS | HTTP 429 pada percobaan pemeriksaan; tidak dianggap berhasil |
| BoM ACCESS-G | HTTP 200 tetapi deret suhu kosong. Pemeriksaan tambahan 14 hari juga berisi 336 nilai `null`; tidak dianggap berhasil |
| Hotspot/traffic pada situs publik | HTTP 404 HTML; tidak dianggap berhasil |

Hasil ini berlaku pada permintaan yang diperiksa, bukan jaminan semua lokasi atau semua waktu selalu tersedia. Sumber yang gagal tetap terdaftar dan dicoba sesuai alur; tidak diganti dengan nilai simulasi berlabel live.

## Kendala konfigurasi dan publikasi

Rute hotspot dan traffic pada backend lokal tersedia dan mengembalikan JSON terstruktur dengan `success: false`, `reason.code: NOT_CONFIGURED`, serta `dataStatus: UNAVAILABLE`. Konfigurasi lokal belum memiliki kunci NASA FIRMS maupun TomTom. Kunci resmi diperlukan untuk mengaktifkan kedua layanan; tidak ada kunci yang dibuat-buat.

Situs `harmony-nine-tau.vercel.app` masih mengembalikan 404 untuk kedua rute tersebut. Kode lokal tidak dipublikasikan pada pekerjaan ini; penyebab deployment tidak disimpulkan tanpa log atau informasi deployment. Keberhasilan tes lokal tidak dicatat sebagai keberhasilan situs publik.

## Bukti dan referensi

Bukti tersimpan di `D:/Blender/test 1/harmony-web-check/2026-10-04-direct-remediation/`: `all-targeted.log`, `typecheck.log`, `build.log`, `browser-results.json`, dan `live-results.json`.

Implementasi mengikuti kontrak [Open-Meteo](https://open-meteo.com/en/docs), batas zoom pada [API RainViewer](https://www.rainviewer.com/api/weather-maps-api.html), dan kode renderer OpenLayers 10.10.0 yang terpasang di proyek.
