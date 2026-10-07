# Audit alur data Harmony — 3 Oktober 2026

## Kesimpulan

Ada masalah nyata: jalur lama dapat mengganti kegagalan dengan angka contoh, menampilkan status ONLINE sebelum pemeriksaan, dan menyebut hasilnya terverifikasi. Jalur utama pengambilan cuaca, kualitas udara, audit sumber, cache, serta beberapa sumber peta telah diperbaiki di proyek lokal `D:/vscode/Harmony`.

Harmony saat ini meminta prakiraan **untuk koordinat yang dipilih**, termasuk suhu, kelembapan, tekanan, hujan, tutupan awan, serta arah dan kecepatan angin. Asal negara lembaga model tidak berarti data seluruh wilayah negara itu sudah diunduh. Harmony belum menjalankan asimilasi global dan solver atmosfer sendiri. Pengambilan yang berhasil bukan bukti ramalan akurat.

Perubahan ini belum diterbitkan ke situs Vercel. Pemeriksaan nyata hanya mencakup lokasi sampel dan endpoint yang disebutkan di bawah, bukan seluruh negara, setiap piksel, atau setiap kondisi gangguan.

## Alur yang berjalan

1. Periksa koordinat masukan.
2. Secara paralel minta cuaca Best Match, perbandingan sembilan model suhu, dan kualitas udara CAMS melalui Open-Meteo.
3. Periksa status HTTP, JSON, parameter numerik, koordinat respons, waktu, serta kelengkapan deret.
4. Pertahankan nilai asli, termasuk nilai nol yang sah. Parameter kosong tidak diubah menjadi angka perkiraan.
5. Cocokkan perbandingan model dan deret kualitas udara dengan waktu prakiraan. Gunakan zona waktu dari penyedia.
6. Catat hasil per sumber: berhasil, sebagian, atau gagal; simpan ukuran respons, durasi, waktu pemeriksaan, dan alasan kegagalan.
7. Jika cuaca utama gagal, tampilkan pesan gagal. Jika kualitas udara atau model tertentu gagal, tampilkan data yang tersedia dengan status sebagian.
8. Cache tetap membawa waktu data dan waktu pengambilan aslinya. Cache lama akibat kegagalan pembaruan ditandai menurun/gagal mendapatkan data baru.
9. Grafik menggunakan nilai penyedia. Grafik yang membutuhkan sumber atau perhitungan yang belum tersedia menampilkan pesan belum tersedia.
10. Penjelasan AI bersifat tambahan. Kegagalan AI tidak boleh berubah menjadi verifikasi berhasil, mengubah angka prakiraan, atau menjadi bukti akurasi.

## Temuan dan perubahan

| Bagian | Masalah sebelumnya | Penanganan sekarang |
|---|---|---|
| Status sumber | ONLINE/HTTP 200/ukuran respons sudah diisi sebelum pengambilan | Awal status belum diperiksa; status berubah setelah pemeriksaan respons |
| Cuaca | Kegagalan dapat menghasilkan suhu, hujan, dan skor kepercayaan contoh | Cuaca utama gagal menolak hasil; tidak ada cuaca pengganti |
| Multimodel | Nilai hilang diganti offset, beberapa lembaga nasional direkonstruksi dari model lain | Hanya model dengan nilai yang benar-benar dikembalikan pada waktu yang sesuai dipakai |
| Waktu | Pemilihan jam lokal dicampur dengan UTC | Menggunakan epoch penyedia; offset zona waktu pecahan juga diuji |
| Kualitas udara | Nilai kosong dapat menjadi nol atau memicu cuaca pengganti | Parameter kosong menjadi tidak tersedia; status sumber terpisah |
| Angin/suhu terasa | Hembusan dihitung sebagai kelipatan kecepatan; suhu terasa harian memakai tambahan tetap | Meminta hembusan dan suhu terasa dari penyedia; kosong tetap kosong |
| Grafik ilmiah | Komposisi awan, profil atmosfer, seismogram, confidence interval, dan beberapa statistik diisi contoh | Grafik yang belum memiliki data/perhitungan tidak menampilkan angka contoh |
| Akurasi | Klaim 98–99%, 100% lolos audit, serta pita confidence tanpa pengujian | Akurasi belum diukur; rentang suhu antarmodel hanya ukuran perbedaan model |
| AI/NWP | Perhitungan lokal disebut verifikasi AI dan penyelesaian tujuh persamaan | Diagnostik sederhana diberi batas; AI hanya penjelasan dan tidak mengubah angka penyedia |
| Fusi global | Tahap radar/sensor/satelit ditandai selesai walaupun belum terhubung | Ditandai simulasi dan tahap belum diimplementasikan |
| Gempa BMKG | Bentuk respons frontend salah dibaca; ada gempa contoh saat gagal | Bentuk respons diperbaiki; gagal menghasilkan null/daftar kosong, bukan gempa buatan |
| Menu BMKG lain | Ada angka cuaca, iklim, kualitas udara, geofisika, matahari, dan mikrozonasi statis yang disebut resmi | Enam endpoint numerik yang belum terhubung mengembalikan UNAVAILABLE; kondisi bandara/gelombang contoh dihapus |
| Citra BMKG | Citra gagal diganti citra lain di bawah label produk lama; ada klaim asimilasi realtime | Kegagalan pemuatan ditampilkan; citra sebagai tampilan, bukan masukan numerik |
| FIRMS/globe | API gagal diganti titik panas statis; respons HTML bisa dianggap nol deteksi | Tidak ada titik panas pengganti; CSV harus sesuai struktur; kegagalan ditampilkan |
| Katalog sensor | Status dan nilai pengukuran langsung statis | Belum terhubung; katalog tidak dianggap telemetri yang diunduh |
| Lalu lintas | Angka koridor simulasi disebut telemetri/sensor aktif | Panel secara jelas menyebut simulasi dan tidak menjadi masukan prakiraan |
| STAC/DEM | Respons kosong atau profil elevasi tidak lengkap berpotensi diterima | Katalog STAC harus FeatureCollection valid; profil DEM harus lengkap dan numerik |

## Pengambilan nyata lintas negara

Sampel melalui layanan aplikasi dan jaringan nyata pada 3 Oktober 2026. Semua memperoleh cuaca utama serta kualitas udara; hanya delapan dari sembilan model suhu tersedia. Pemeriksaan tambahan respons mentah menemukan **BoM ACCESS-G mengembalikan null**, sehingga hasil keseluruhan harus sebagian.

| Lokasi | Zona waktu penyedia | Model suhu tersedia | Deret cuaca | Status |
|---|---|---|---|---|
| Surabaya | Asia/Jakarta | 8/9 | 24 jam / 14 hari | Sebagian |
| Tokyo | Asia/Tokyo | 8/9 | 24 jam / 14 hari | Sebagian |
| Paris | Europe/Paris | 8/9 | 24 jam / 14 hari | Sebagian |
| New York | America/New_York | 8/9 | 24 jam / 14 hari | Sebagian |
| Nairobi | Africa/Nairobi | 8/9 | 24 jam / 14 hari | Sebagian |

Titik sampel tidak membuktikan cakupan setiap tempat. Nilai model yang kosong pada horizon berikutnya tetap kosong, karena panjang prakiraan tiap model dapat berbeda. Bukti tersimpan pada `weather-browser-audit.json`; pemeriksaan akhir kode terbaru pada `weather-browser-final.json` juga menyebut model yang tidak tersedia secara eksplisit.

## Pemeriksaan backend nyata

- Gempa otomatis: HTTP 200, satu kejadian dari cache yang masih tersedia; bukan pengambilan baru.
- Gempa terkini: HTTP 200, 15 kejadian dari cache.
- Gempa dirasakan: HTTP 200, 15 kejadian, sumber live.
- Produk satelit: HTTP 200, enam entri **katalog**. Ini tidak membuktikan enam citra berhasil dimuat atau datanya sudah dianalisis.
- Peringatan cuaca dan kualitas udara BMKG: HTTP 503, UNAVAILABLE/NOT_CONNECTED.
- FIRMS: HTTP 200 tetapi `success:false`, UNAVAILABLE/NOT_CONFIGURED. **Kunci FIRMS belum tersedia**; kode tidak boleh menyebut pengambilan berhasil hanya karena HTTP 200.

Bukti: `backend-live-audit.json`. Kredensial tidak dimasukkan ke laporan.

## Pengujian

- 16 kelompok regresi integritas: status awal, nilai nol, model sebagian, pemeriksaan ulang endpoint, cache, kualitas udara gagal, jaringan gagal, HTTP 200 kosong/null, waktu pecahan, cuaca musiman offline, AI gagal, cache berbeda lokasi, bentuk respons BMKG, HTML/timeout, diagnostik backend, cache backend kedaluwarsa, FIRMS/STAC, dan endpoint belum terhubung.
- Browser: jaringan gagal, respons cuaca kosong, kualitas udara gagal, respons lengkap. Status dan data yang diterima diperiksa pada layanan yang benar-benar dipakai UI.
- Ponsel: diagnostik tidak mengklaim AI terverifikasi; halaman tidak melebar melebihi layar.
- TypeScript dan build aplikasi lolos. Build masih memiliki peringatan bundel peta besar; hal ini bukan bukti pengambilan kondisi seluruh Bumi.
- Rangkaian tes geospasial yang ada mencakup CRS, jarak, geometri, raster, LST, hidrologi, FIRMS, rute, aksesibilitas, emisi, dan pekerjaan analisis. Tes berbasis fixture tidak menggantikan pemeriksaan jaringan atau validasi ilmiah.

## Yang belum berjalan sebagai sistem ramalan global

1. Asimilasi nyata AWS, radar volumetrik, profil vertikal atmosfer, dan deret citra awan.
2. Pengunduhan medan atmosfer seluruh Bumi dan penyelesaian dinamika atmosfer 3D di Harmony.
3. Kalibrasi bobot model berdasarkan kecocokan terhadap pengamatan setempat.
4. Pengujian akurasi prakiraan terhadap kejadian/pengamatan yang kemudian terjadi. Belum ada dasar untuk angka akurasi atau confidence interval.
5. Sambungan enam menu numerik BMKG yang disebutkan, data penerbangan/maritim, serta telemetri katalog sensor.
6. NASA FIRMS tanpa konfigurasi kunci yang diperlukan.
7. Keberhasilan layanan AI eksternal pada konfigurasi pengguna; jalur kegagalannya sudah diuji, layanan berbayar tidak digunakan untuk mengklaim verifikasi ilmiah.

Untuk mengembangkan ramalan yang lebih kuat, tahap berikutnya memerlukan data pengamatan yang terdokumentasi, penyelarasan lokasi/waktu/satuan, uji prakiraan terhadap pengamatan dengan metrik yang tepat, serta evaluasi menurut lokasi dan horizon. Penambahan jumlah model atau meminta penjelasan AI saja tidak membuktikan akurasi.

## Berkas dan bukti

- Pengujian yang dapat dijalankan ulang: `tests/weatherDataIntegrity.test.mjs` (termasuk dalam `npm test`).
- Implementasi utama: `weatherDataIntegrity.ts`, `weatherAggregatorService.ts`, `geospatialDataTelemetryService.ts`, `mapWeatherLiveService.ts`, `weatherIntegrity.js`, `spatialController.js`, dan layanan BMKG.
- Bukti layar dan JSON: `D:/Blender/test 1/harmony-web-check/2026-10-03/`.
- Cadangan sebelum perubahan: subfolder `data-audit-backup/`.

## Dokumentasi penyedia

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): parameter cuaca, waktu, model, dan deret prakiraan.
- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api): parameter kualitas udara dan satuannya.
- [Open-Meteo ECMWF API](https://open-meteo.com/en/docs/ecmwf-api): keluaran model prakiraan.

Dokumentasi menjelaskan layanan penyedia; dokumentasi tersebut bukan sertifikasi akurasi Harmony.
