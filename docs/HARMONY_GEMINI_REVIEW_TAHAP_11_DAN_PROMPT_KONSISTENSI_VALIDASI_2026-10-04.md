# HARMONY — Review tahap 11 dan prompt perbaikan untuk Gemini

Tanggal: **4 Oktober 2026, WIB**. Proyek yang diperiksa: `D:/vscode/Harmony`.

## 1. Kesimpulan

Perbaikan tahap 10 nyata dan sebagian berhasil. Namun, klaim “diselesaikan secara menyeluruh” belum sesuai hasil pemeriksaan tambahan. Ada jalur audit yang masih menerima data tidak layak sebagai ONLINE, permintaan audit yang memakai bujur salah, kesimpulan cuaca yang melampaui cakupan data, pemilihan jam antarhari yang salah, serta status radar/GIBS yang belum mewakili kondisi sebenarnya.

**Kode aplikasi tidak diubah dalam pemeriksaan ini.** Tambahan hanya berupa skrip/bukti audit di luar proyek dan dokumen ini. Sesi browser serta server pengujian milik pemeriksa sudah ditutup.

## 2. Bukti dan batas pemeriksaan

Folder bukti baru, terpisah dari baseline:

`D:/Blender/test 1/harmony-web-check/2026-10-04-eleventh-remediation-review/`

| Berkas | Isi dan lingkup |
|---|---|
| `baseline-stage10.json` | Eksekusi ulang 15 skenario script Gemini pada source sekarang. Output dialihkan ke folder audit agar bukti proyek tidak tertimpa. **15/15 lulus.** |
| `stage11-reproductions.json` | **21 skenario tambahan** memakai service sebenarnya serta callback/hook/effect yang diekstrak dari source. Termasuk kontrol positif; bukan 21 kegagalan dan bukan pengamatan bumi live. |
| `browser-weather.json` | Dua kondisi cuaca pada browser lokal dengan fixture MET dan outage cuaca utama/model/udara. Tidak ada page error dalam dua kondisi tersebut. |
| `live-provider-probes.json` | Respons penyedia CMA/JMA nyata, replay melalui validator aplikasi, serta probe rute web publik. |
| `verification-summary.json` | Empat suite terpilih, **55 kasus/grup**, semua exit 0. Typecheck exit 0. |
| `source-manifest.json`, `source-integrity.json` | Hash 17 berkas source/package; tidak berubah selama harness. Perbandingan akhir disimpan dalam `source-integrity-final.json`. |

Empat suite yang diulang: `weatherDataIntegrity` (16 grup), `stage9IntegrityVerification` (8), `stage10IntegrityVerification` (12), dan `evidenceStage6` (19). Ini pengujian terpilih, **bukan pengulangan seluruh npm test atau build produksi**.

Screenshot:

- `D:/Blender/test 1/output/playwright/stage11-weather-missing.png`
- `D:/Blender/test 1/output/playwright/stage11-weather-partial-selector.png`

Timestamp bukti menggunakan UTC; `2026-10-03T23:37:47Z` adalah pagi 4 Oktober 2026 WIB. Backend lokal port 3001 tidak tersedia. Request di luar fixture pada sesi lokal dapat gagal ECONNREFUSED; kegagalan lingkungan tersebut tidak digunakan untuk menyatakan semua menu rusak. Tidak ada validasi lapangan, pengujian seluruh negara, atau pemeriksaan lengkap semua fitur dalam tahap ini.

## 3. Perbaikan yang sudah terkonfirmasi — pertahankan

1. **CMA dan JMA:** HTTP 200 dari penyedia nyata, kolom single-model `temperature_2m`, sekarang diterima sebagai ONLINE oleh audit. Suhu pertama pada probe masing-masing 27,3°C dan 27,4°C. Jangan mengganti atau menghapus kedua sumber ini.
2. **Seluruh hujan kosong:** UI sekarang menampilkan “Data hujan belum tersedia”, tanpa klaim kering. Badge “Hangat” juga tidak muncul ketika apparent temperature/current kosong pada fixture browser.
3. **Fallback:** hourly conditionCode tetap null; surface pressure tidak lagi diisi sea-level pressure, dan sea-level pressure disimpan terpisah. Data udara 30 hari ditolak dari current. Model/udara aligned yang sah tetap dipertahankan pada baseline.
4. **Model hilang pada query berikutnya:** baseline sembilan model → satu model kini menandai gabungan PARTIAL dan BoM/CMA/JMA yang hilang OFFLINE.
5. **MET ingestion:** issue lama ditolak, titik invalid dihitung, attempt PARTIAL dipertahankan pada hasil service; HTTP 203 dan byte UTF-8 dicatat benar. Cache menyimpan checkedAt retrieval sebelumnya dan asal cache.
6. **BMKG:** numeric junk pada baseline ditolak. Jangan merusak format resmi dan kalender dengan offset lokal yang sudah lulus.
7. **GIBS race lama:** signal fetch kini berasal dari controller milik request dan respons lama tidak lagi menimpa respons baru dalam baseline.
8. **Radar late error:** event tile lama dengan identitas tile yang sama tidak lagi menaikkan activeError setelah generasi berubah. Itu perbaikan event lama, belum bukti cakupan viewport benar.

## 4. Masalah tersisa dan cara kerja yang seharusnya

### R1 — Audit MET menerima data yang ditolak service cuaca [P0]

Lokasi utama: `apps/web/src/services/geospatialDataTelemetryService.ts:242`, khususnya `hasUsablePoint` sekitar 254; bandingkan parser `metNorwayService.ts`.

Empat fixture dengan geometri dan issue time sah menghasilkan hasil berbeda:

| Isi titik/metadata | Audit sumber | Service MET |
|---|---|---|
| Timestamp `not-a-time` | ONLINE | Gagal: tidak ada titik valid |
| Kelembapan 999 | ONLINE | Gagal: nilai fisik tidak valid |
| Titik prakiraan berumur 30 hari | ONLINE | Gagal: seluruh titik historis |
| Unit kelembapan `fraction` | ONLINE | Gagal: unit tidak kompatibel |

Audit hanya memastikan ada `air_temperature` numerik pada satu titik. Timestamp, rentang fisik, unit lengkap dan cakupan yang diperlukan produk tidak diperiksa melalui parser yang sama.

**Seharusnya:** parser/validator bersama menghasilkan penilaian yang konsisten untuk ingestion dan audit. Ketersediaan sebagian boleh disimpan sebagai PARTIAL dengan rincian parameter/cakupan. Respons yang tidak dapat menghasilkan produk cuaca yang diklaim tidak boleh mendapat ONLINE penuh hanya karena memiliki satu angka suhu.

### R2 — Bujur pada permintaan audit MET tidak mengikuti lokasi [P0]

Lokasi: `geospatialDataTelemetryService.ts:207`, pembentukan URL melalui rangkaian regex.

Untuk lokasi pilihan **lat -7,34; lng 110,35**, URL aktual audit:

`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-7.340&lon=112.75`

Parameter `lat` diganti, tetapi `lon` tetap 112,75 karena kode hanya menangani `lng`/`longitude`. Respons yang sah untuk URL tersebut ditolak OFFLINE karena tidak sesuai lokasi pilihan. Ini kesalahan pengikatan query pada aplikasi, bukan bukti penyedia mati.

**Seharusnya:** pembentuk query per penyedia menggunakan URL/URLSearchParams atau adapter parameter eksplisit; `lon`, `lng`, `longitude`, pasangan locations dan bbox harus mengikuti kontrak masing-masing. Buktikan URL final untuk bujur berbeda, termasuk bujur negatif. Jangan “memperbaiki” masalah dengan melonggarkan pemeriksaan lokasi.

### R3 — Validator model belum memeriksa keselarasan, satuan dan cakupan [P0]

Lokasi: `geospatialDataTelemetryService.ts:212–240`. Periksa validator model agregator juga; jangan membuat dua standar.

Empat fixture CMA tetap ONLINE:

- Dua timestamp tetapi hanya satu suhu.
- Metadata unit suhu °F dan nilai 82, tanpa konversi/penolakan kontrak query yang meminta keluaran default °C.
- Waktu hanya `2020-01-01T00:00:00Z` pada audit prakiraan saat ini.
- Tanggal `2026-02-31T12:00:00Z`, yang dinormalisasi oleh Date.parse menjadi tanggal lain.

Pengecekan `some(finiteNumber)` dan `Date.parse` tidak membuktikan array selaras, kalender sah, satuan sesuai, atau cakupan prakiraan dapat digunakan. Laporan Gemini menyebut panjang array selaras, tetapi validator belum membandingkan panjangnya.

**Seharusnya:** format single/multi-model tetap diterima secara benar, lalu validasi kalender, ISO/epoch yang dinyatakan provider, satuan, panjang/index array, urutan waktu, lokasi query, rentang nilai dan interval yang diperlukan. Unit yang didukung dapat dinormalisasi dengan provenance konversi; jangan membiarkan °F diberi arti °C. Historical-only dapat menjadi produk arsip, bukan bukti current forecast ONLINE.

### R4 — PARTIAL MET kembali berubah menjadi ONLINE jika current ada [P0]

Lokasi: `geospatialDataTelemetryService.ts:510`.

Fixture satu current valid dan satu titik kelembapan 999 menghasilkan attempt MET **PARTIAL**, acceptedCount=1 dan rejectedCount=1. Namun endpoint menjadi **ONLINE** karena `metEp.status = data.current ? 'ONLINE' : 'DEGRADED'`.

Perbaikan future-only → DEGRADED sudah baik, tetapi adanya current tidak menghapus penolakan pada deret lainnya.

**Seharusnya:** status endpoint/produk mengikuti attempt tervalidasi dan cakupan; current, hourly, metadata freshness serta rejected records dinyatakan terpisah. Jangan menimpa PARTIAL dengan predikat ada/tidaknya current.

### R5 — Ringkasan cuaca parsial masih memberi kesimpulan berlebihan [P0/P1]

Lokasi: `GeospatialWeatherModal.tsx:401–445` dan konsumen `weatherInsights`.

| Skenario | Hasil aktual |
|---|---|
| Satu nilai hujan 0, 23 nilai lain null | “Cenderung kering sepanjang periode prakiraan” |
| Probabilitas 70%, jumlah hujan null | “Gerimis / hujan ringan sekitar pukul …” |
| Hujan pada jam pertama dan keempat, dua jam tengah nol | Satu rentang dari jam pertama sampai keempat, tanpa menyatakan sela kering |

Kasus pertama juga terlihat pada browser dengan satu nilai 0 dan dua nilai kosong. Semua-null sudah diperbaiki, tetapi `validPrecipList.length > 0 || validProbList.length > 0` belum cukup untuk menyimpulkan keseluruhan periode kering. Probabilitas tidak menetapkan intensitas hujan. Rentang first-to-last dapat menyembunyikan sela dan pergantian tanggal.

`intervalLabel` juga memakai timezone perangkat melalui toLocaleDateString tanpa `timeZone: data.timezone`, sementara jam menggunakan zona data. Pada harness UTC yang dijalankan di Windows WIB, satu titik UTC 3 Oktober mendapat label 4 Oktober. Tampilan harus memakai satu zona yang dinyatakan jelas.

**Seharusnya:** hitung coverage berdasarkan interval/sampel yang diharapkan, tampilkan hasil hanya untuk sampel tersedia, bedakan peluang dengan jumlah/intensitas, kelompokkan jendela hujan yang terpisah, dan format seluruh tanggal/jam menggunakan zona lokasi/data. Jangan membuat kalimat tentang pagi/malam dari sekadar keberadaan jam pagi/malam tanpa membandingkan suhu pada interval tersebut.

### R6 — Pemilihan hari berikutnya masih memilih hari sebelumnya [P1]

Lokasi: `GeospatialWeatherModal.tsx:660` dan `:1180`.

State masih `selectedHour` berupa angka; tombol memanggil `setSelectedHour(h.hour)` dan titik dicari dengan `find(h.hour === selectedHour)`.

**Bukti browser:** tombol titik hari berikutnya menunjukkan **30°**, tetapi setelah diklik ringkasan tetap **“Prakiraan jam terpilih: 17°C | Hujan: 0 mm”** dari hari sebelumnya. Key dan highlight timestamp tidak memperbaiki state pemilihannya.

**Seharusnya:** state menyimpan identitas timestamp penuh atau ID titik unik. Klik memilih tepat titik tersebut; tampilkan tanggal dan timezone. Saat data/query berubah, pilihan diperiksa ulang dengan kebijakan jelas, bukan otomatis mengambil jam pertama yang sama.

### R7 — Radar terlalu cepat LIVE dan dapat terus MEMUAT pada cache [P1]

Lokasi: `MapsView.tsx:4040–4082`, `weatherStatusText` sekitar 4164.

Effect aktual yang diekstrak diuji menggunakan tiga objek tile beridentitas stabil:

- activeRequested=3, activeLoaded=1, activeError=0 → **LIVE RADAR**, padahal dua tile masih pending.
- Semua tiga tile selesai, lalu moveend mereset counter → **MEMUAT**. Coverage cache tidak dihitung; bila tidak ada event unduh baru, counter tidak akan pulih.
- Error dari tile generasi lama kini diabaikan dengan benar; pertahankan perbaikan ini.

Counter masih bukan daftar required tiles viewport. Generasi berubah pada moveend, sehingga tile yang sudah dimulai selama gerakan peta dapat dianggap generasi lama saat selesai. Ada risiko indikator terus memuat walaupun gambar cache tersedia, atau LIVE sebelum coverage lengkap.

**Seharusnya:** hitung required tile IDs dari extent/zoom/provider/frame aktif; cocokkan state loaded/error/pending/cache dengan daftar itu. Ada status memuat/sebagian untuk tile pending. Historical counters hanya statistik, bukan dasar keberhasilan viewport.

### R8 — GIBS: batas waktu body, kegagalan timeout dan umur frame [P1]

Lokasi: `MapsView.tsx:3942–3975` dan status satellite sekitar 4174.

Tiga reproduksi tambahan:

1. `clearTimeout(timeoutId)` dipanggil sebelum `await res.text()`. Saat body masih pending, timer sudah mati dan signal belum aborted. Deadline tidak melindungi pembacaan XML yang macet.
2. Timeout internal meng-abort controller, lalu catch langsung return karena signal.aborted. Tidak ada pembaruan stale/error. Timeout aktif perlu dibedakan dari pembatalan pengguna/cleanup.
3. Default `2020-01-01T00:00:00Z` diterima dan `setGibsMetadataStale(false)` dipanggil. Branch badge satellite tidak memeriksa umur `gibsFrameTime`, sehingga metadata baru dapat membuat citra lama tampak tersedia tanpa penjelasan umur frame.

**Seharusnya:** deadline meliputi headers, body dan validasi; cleanup timer di finally. Simpan sebab abort. Timeout pada request aktif memperbarui retrieval failure/stale sesuai data tersimpan; pembatalan pengguna tidak membuat kegagalan provider palsu. Metadata freshness dan frame age terpisah, kalender/layer/interval sah dan status citra mengikuti keduanya. Pertahankan guard generasi yang sudah berhasil.

### R9 — MET transport dan model recovery belum lengkap [P1, pemeriksaan source]

`metNorwayService.ts` masih memakai fetch browser dengan signal caller opsional, tanpa deadline internal, deduplikasi request identik dan conditional revalidation. Cache kini lebih jujur tentang waktu, tetapi nilai bytes/latency attempt lama ditimpa nol saat cache hit; pemisahan jaringan vs cache perlu dibuat konsisten.

`weatherAggregatorService.ts` kini tidak otomatis mengecualikan BoM pada setiap pesan tak dikenal. Namun, recovery hanya sekali retry grup jika satu hint cocok, belum memulihkan beberapa model gagal atau pesan tak dikenal. Pencocokan substring `access` juga perlu diperiksa: “Access denied” generik tidak membuktikan BoM ACCESS bermasalah.

Ini temuan dari source, bukan hasil live outage baru. Jangan mengklaim semua recovery/deduplikasi sudah selesai berdasarkan 15 baseline yang tidak menguji jalur tersebut.

### R10 — Hotspot dan traffic produksi masih 404 [P1]

Probe web publik terbaru:

- `/api/bmkg/gempa/autogempa`: HTTP 200 JSON.
- `/api/spatial/hotspots`: HTTP 404 HTML.
- `/api/spatial/traffic/flow`: HTTP 404 HTML.

Laporan tahap 10 mengganti dugaan “commit lama” menjadi “perbedaan pemetaan fungsi serverless”, tetapi belum memberikan bukti deployment ID, commit, routing/function manifest atau build log yang menetapkan penyebab itu. Perlakuan client terhadap 404 adalah penanganan kegagalan, bukan perbaikan layanan tersebut.

**Seharusnya:** nyatakan kegagalan rute sebagai belum selesai; periksa deployment aktual dan mapping entrypoint menggunakan bukti. Respons lokal NOT_CONFIGURED bukan keberhasilan mengambil hotspot/traffic. Jangan menuduh key expired atau provider mati berdasarkan 404 HTML.

## 5. Koreksi pelaporan pengujian

Jumlah pada daftar 17 suite dalam laporan Gemini adalah **212 kasus/grup**, bukan 202: 10+20+7+11+16+9+12+12+10+14+14+11+13+14+19+8+12.

Ini koreksi aritmetika terhadap daftar laporan, **bukan klaim bahwa pemeriksa menjalankan ulang 212 pengujian**. Hasil yang diulang sendiri hanya 15 baseline, empat suite/55 kasus-grup, typecheck, 21 skenario tambahan dan dua kondisi browser. Banyak hasil baseline memang lulus; cakupannya belum membuktikan temuan R1–R10 selesai.

Test `radar-moveend-then-cached-viewport` tahap 10 menerima MEMUAT setelah cache selesai. Assertion tersebut tidak membuktikan syarat sebelumnya “recompute active cache coverage”. Jangan mengubah expected agar mengikuti implementasi salah; periksa kebutuhan perilaku sebenarnya.

## 6. PROMPT UNTUK GEMINI — salin mulai bagian ini

Kamu memperbaiki proyek Harmony di `D:/vscode/Harmony`. Baca seluruh review tahap 11 ini dan bukti pada folder audit eksternal sebelum mengubah kode. Tahap 10 sudah memperbaiki sebagian masalah, jadi lanjutkan dengan perubahan terarah. Jangan mengulang pembangunan aplikasi, merombak desain, atau mengurus PPT/esai.

### Batas perubahan dan prinsip data

- Catat Git status/diff awal; pertahankan pekerjaan pengguna yang belum di-commit. Jangan reset, membersihkan folder, menghapus sumber/menu, atau mengganti kode besar tanpa kebutuhan konkret.
- Pertahankan inventory sumber/model, 15 menu/domain Studio dan peta 2D/3D/Cesium yang sekarang ada. Nama menu tetap **Peta Cuaca** dan tombol tetap terpusat pada panel yang telah disepakati, tanpa floating button duplikat.
- Pertahankan CMA/JMA/BoM, MET, CAMS, BMKG/USGS, FIRMS, traffic, GIBS/RainViewer, STAC, DEM dan sumber lain yang terdaftar. Banyak sumber bukan bukti akurasi; jangan mengurangi inventory untuk membuat audit hijau.
- Tidak ada nilai default/random/demo dalam data nyata. Nol sah, null, EMPTY, PARTIAL, STALE, FAILED, NOT_CONFIGURED, cache dan cancellation memiliki arti berbeda. Gunakan struktur/status yang konsisten dengan kontrak produk.
- ONLINE harus didukung respons yang menghasilkan produk yang diklaim dengan lokasi, waktu, unit, coverage dan parameter valid. HTTP 200, JSON parse sukses dan Promise fulfilled tidak cukup.
- Rahasiakan key/token/header/signed URL; jangan menampilkan .env. Jangan mengganti kredensial, deploy atau mengubah layanan produksi otomatis.
- Pertahankan `accuracyValidated: false`; jangan mengaku validasi lapangan atau pemantauan semua negara berdasarkan fixture/probe terbatas.

### Langkah 1 — rencana konkret dan reproduksi sebelum perubahan

Buat peta ringkas request → parser → normalisasi → agregasi → telemetry → consumer/UI untuk MET dan model Open-Meteo. Catat berkas/fungsi yang akan disentuh, dependensi penting yang dipertahankan, serta acceptance test untuk setiap R1–R10. Reproduksi masalah menggunakan source saat ini dan simpan hasil sebelum perubahan di folder bukti baru. Jangan menimpa bukti tahap sebelumnya.

### Langkah 2 — satukan parser dan perbaiki lokasi query (R1–R4)

1. Ekstrak parser murni/validator produk MET yang dipakai ingestion dan audit. Jangan menjalankan fetch kedua hanya untuk memvalidasi body pertama. Kembalikan normalized points, current, units, issue/valid times, coverage, accepted/rejected counts dan alasan status.
2. Data tidak layak tidak ONLINE. Data sebagian boleh dipertahankan dengan PARTIAL yang menjelaskan parameter/titik hilang; tetapkan required vs optional fields secara eksplisit agar tidak membuang nilai sah tanpa alasan.
3. Ganti regex pembentuk URL audit dengan adapter parameter yang benar. Pastikan MET `lon` mengikuti lng pilihan. Periksa latitude/longitude, lat/lng, locations dan bbox pada penyedia lainnya. Toleransi lokasi mengikuti resolusi produk, bukan diperbesar untuk menutupi salah query.
4. Satukan normalisasi single-model `temperature_2m` dan multi-model bersufiks, berdasarkan ID/query model yang diminta. Pertahankan keberhasilan probe CMA/JMA. Periksa timezone/epoch unit, kalender sebenarnya, alignment array/index, dataTime, satuan, nilai fisik, coverage dan lokasi.
5. Jangan menggunakan Date.parse saja untuk membuktikan kalender sah; cegah normalisasi 31 Februari. ISO tanpa offset ditafsirkan menurut metadata timezone/utc_offset, bukan timezone perangkat. Angka epoch seconds/milliseconds tidak boleh ditebak tanpa kontrak.
6. Historical-only bukan current forecast. Nilai °F hanya dapat dipakai setelah konversi yang dinyatakan dengan provenance, atau ditolak bila melanggar kontrak query. Panjang array berbeda harus dijelaskan sebagai invalid/partial, bukan full ONLINE.
7. Endpoint MET mengikuti attempt tervalidasi. Current valid + rejected point tetap DEGRADED/PARTIAL, bukan diubah ONLINE. Jangan menghapus accepted/rejected counts saat status masuk registry.
8. Pertahankan pembatasan lokasi/query pada snapshot. Periksa request/generation agar respons lokasi sebelumnya tidak mengubah panel/status lokasi yang sekarang aktif. Keberhasilan riwayat disimpan terpisah dari keberhasilan request baru.

### Langkah 3 — kesimpulan dan pemilihan waktu (R5–R6)

1. Hitung availability per variabel dan cakupan interval. Ringkasan seluruh periode tidak boleh dibuat dari satu nilai nol ketika sebagian besar nilai kosong. Tulis misalnya “Pada sampel yang tersedia tidak tercatat hujan; data periode lainnya belum lengkap”, sesuai cakupan sebenarnya.
2. Probabilitas dan jumlah hujan berbeda. Probabilitas 70% dengan amount null berarti peluang hujan 70%, intensitas belum tersedia; jangan menyebut gerimis/ringan/sedang dari null yang dijadikan nol.
3. Kelompokkan rentang hujan yang benar-benar berurutan, termasuk tanggal dan zona. Dua jendela dengan sela nol/hilang tidak digabung menjadi satu rentang kontinu tanpa penjelasan.
4. Rata-rata/total dari sampel parsial diberi coverage dan intervalnya; jangan menyebutnya total harian lengkap. Pertahankan seluruh-null sebagai tidak tersedia dan nol sah sebagai nol pada sampel yang memang tersedia.
5. Format semua tanggal, jam, interval dan selector memakai timezone data/lokasi yang sama. Perbandingan kalender tidak bergantung timezone laptop. Ketika hanya titik besok tersedia, jangan menyebut hari ini.
6. Ganti state selectedHour menjadi selected timestamp/point ID; klik titik kedua pada jam sama di hari berbeda harus memilih titik kedua. DataTime, suhu, hujan, highlight dan panel terkait harus mengikuti titik yang benar. Pilihan direset/diadaptasi secara jelas ketika query/data berubah.
7. Pertahankan perbaikan badge apparent null, unit tanpa angka, all-null rain dan current unavailable. Jangan membuat UI baru sebagai pengganti fitur yang sudah bekerja.

### Langkah 4 — coverage tile dan lifecycle GIBS (R7–R8)

1. Radar/satellite memakai required tile set berdasarkan extent, zoom efektif, provider dan frame. Gunakan identitas tile resmi, loaded/error/pending state serta cache. Jangan hanya menambahkan counter lalu meresetnya pada moveend.
2. Bedakan generasi layer/frame/request dan kebutuhan viewport. Tile yang mulai saat peta bergerak tetapi masih diperlukan di viewport akhir tidak boleh dibuang semata karena moveend. Tile di luar scope tidak masuk coverage; event lama tidak merusak generasi baru.
3. Satu loaded + dua pending bukan coverage LIVE penuh. Semua required tile dari cache yang sah harus dapat menjadi tersedia tanpa menunggu event download yang tidak akan muncul. Tampilkan partial/loading/failed/stale secara tepat; statistik historis tetap terpisah.
4. GIBS deadline berlangsung sampai body XML selesai dan validasi selesai; cleanup di finally. Bedakan timeout internal, caller abort, pergantian layer dan unmount. Timeout pada request aktif mencatat retrieval failure dan stale pada metadata lama; cancellation tidak ditulis sebagai provider failure.
5. Pertahankan controller yang benar dan generation guard sebelum commit. Default harus milik layer yang dipilih dan tanggalnya sah. Catat fetchedAt metadata, frameTime dan frameAge; metadata baru bukan bukti frame baru.
6. Branch satellite memeriksa umur frame sesuai cadence produk. Citra lama dapat ditampilkan sebagai arsip/stale dengan tanggalnya, bukan dinyatakan realtime. Jangan membuat frameTime dari jam sistem.

### Langkah 5 — transport, recovery dan produksi (R9–R10)

1. MET membutuhkan deadline internal end-to-end, pre-abort handling, deduplikasi in-flight dan cache/revalidasi sesuai penyedia. Jika proxy diperlukan, gunakan rute backend yang ada dengan validasi input dan tujuan tetap; jangan membuat proxy URL bebas.
2. Pisahkan cache access record dari network attempt. Cache hit mempertahankan lastSuccessfulFetchAt, checkedAt retrieval, HTTP dan ukuran/latensi retrieval sebelumnya; record akses cache boleh memiliki bytes jaringan nol sendiri. Jangan mencampur satu attempt lama dengan metrik akses baru.
3. Recovery model terbatas oleh deadline, batas retry dan rate limit. Hint model harus terpercaya; “Access denied” generik bukan BoM. Tangani beberapa model gagal dan pesan tak dikenal tanpa membuang model sehat. Inventory yang gagal tetap tercatat, tidak dihapus.
4. Telusuri 404 spatial produksi dengan deployment/commit/build/routing/function manifest yang benar jika akses tersedia. Periksa mapping `/api/spatial/*` → entrypoint Express/serverless dan rute lokal. Jika akses tidak tersedia, tulis diagnosis belum terbukti dan langkah pemeriksaan; jangan mengarang penyebab.
5. Pisahkan NOT_CONFIGURED, key invalid, route missing, upstream failure, timeout, invalid payload, valid EMPTY dan data usable. Respons 200 NOT_CONFIGURED bukan sukses ingestion. Jangan deploy atau mengubah key otomatis.

### Pengujian penerimaan — uji perilaku, bukan sekadar bentuk source

- Ulangi 15 baseline tahap 10 tanpa menimpa output lama; pertahankan perbaikannya.
- Jalankan kasus R1 untuk timestamp invalid, physical range, historical points dan unit. Audit dan ingestion harus sepakat pada normalized product/status.
- Audit MET bujur 110,35, 112,75 dan bujur negatif: buktikan query URL dan response location binding, dengan body valid untuk query sebenarnya.
- Model single/multi valid, ISO/epoch, tanggal tidak sah, array beda panjang, unit salah/dapat dikonversi, historical-only dan cakupan parsial. CMA/JMA live tetap dapat diterima secara benar.
- Current MET valid + satu invalid point: status registry tetap partial dan counts tidak hilang. Uji juga future-only yang sudah berhasil.
- UI: all-null rain, satu nol dan sisanya null, probability-only 70%, beberapa jendela hujan terpisah, tanggal/zona lintas tengah malam. Tidak ada klaim dry/intensity/total yang melampaui data.
- Browser: dua timestamp dengan jam sama hari berbeda, suhu 17°C dan 30°C. Klik 30°C harus menampilkan 30°C dari timestamp kedua, termasuk highlight dan detail hujan yang sesuai.
- Radar: tiga required tile, satu loaded dua pending; seluruhnya cache-loaded; tile mulai sebelum moveend; late old events; ganti frame/layer; partial satu sukses dua gagal. Test cache tidak cukup mengharapkan MEMUAT: buktikan coverage cache yang benar.
- GIBS: header cepat/body pending, timeout sebelum/saat body, caller abort/unmount, respons terbalik, frame lama/future/invalid calendar/wrong layer. Final metadata/frame/status konsisten dan timer bersih.
- Recovery: hint exact ID, friendly name, error Access denied umum, dua model gagal, 429, timeout, semua gagal. Jangan mengurangi jumlah sumber untuk meluluskan test.
- Regresi fitur yang tersentuh: menu terpusat/Peta Cuaca, peta 2D/3D, sumber, LST/STAC dan cancellation. Gunakan kontrol LST/raster yang sudah ada bila perubahan menyentuh dependensinya; jangan menjalankan semua tes berulang tanpa alasan.
- Jalankan suite yang relevan, typecheck dan build setelah perubahan. Full npm test bila diperlukan dijalankan dengan storage/lingkungan terisolasi setelah efek samping diperiksa.

Jangan mengganti expected test hanya agar mengikuti implementasi yang salah. Simpan bukti actual/expected, status, coverage, query dan alasan. Label fixture, browser fixture, live probe dan deployment evidence secara terpisah. Valid EMPTY tetap sah, tetapi respons invalid tidak boleh disamarkan sebagai nol deteksi sukses.

### Berkas utama yang diperiksa

`geospatialDataTelemetryService.ts`, `metNorwayService.ts`, `weatherDataIntegrity.ts`, `weatherAggregatorService.ts`, `GeospatialWeatherModal.tsx`, `HarmonyChartEngine.tsx`, `MapsView.tsx`, serta rute/proxy dan `DataSourceProvenanceModal.tsx` hanya jika ada hubungan konkret. Perubahan parser bersama mungkin membutuhkan helper baru yang kecil. Jangan menyentuh seluruh aplikasi tanpa kebutuhan.

### Hasil akhir yang wajib

1. Daftar perubahan per berkas: masalah, fungsi yang ditambah/diganti/dihapus, alasan dan fitur penting yang dipertahankan.
2. Tabel R1–R10: hasil sebelum/sesudah, bukti dan bagian yang masih belum selesai. Source-only finding tidak dilabeli live reproduction.
3. Inventory sumber/model sebelum/sesudah dengan pemetaan produk dan status query yang jelas. Tidak ada sumber hilang untuk membuat persentase sukses terlihat lebih baik.
4. Log uji dan screenshot consumer setelah perubahan. Laporkan jumlah tepat per suite; daftar tahap 10 berjumlah 212, bukan 202. Jangan mengklaim mengulang semua suite jika hanya menjalankan sebagian.
5. Status rute produksi dan bukti penyebab jika tersedia. Diagnosis yang belum terbukti tetap disebut belum terbukti.

Kriteria selesai: aliran data, audit dan tampilan konsisten pada skenario yang diuji; data valid tetap digunakan; kegagalan/parsial/cache/stale dinyatakan sesuai bukti; fitur lama tetap bekerja. Tidak ada janji bahwa setiap penyedia akan selalu berhasil atau seluruh ramalan sudah akurat.

---

Dokumen ini adalah review dan instruksi perbaikan untuk Gemini, bukan laporan bahwa aplikasi sudah selesai diperbaiki.
