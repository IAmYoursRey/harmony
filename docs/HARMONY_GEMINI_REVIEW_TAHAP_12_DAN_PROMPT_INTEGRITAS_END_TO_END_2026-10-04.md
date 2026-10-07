# HARMONY — Review tahap 12 dan prompt integritas data untuk Gemini

Tanggal: **4 Oktober 2026, WIB**. Proyek: `D:/vscode/Harmony`.

## 1. Kesimpulan

Tahap 11 memperbaiki pemilihan titik antarhari, parameter bujur audit, beberapa validasi kalender/unit, dan beberapa status parsial. Namun, pernyataan seluruh R1–R10 sudah ditangani belum sesuai pemeriksaan tambahan.

Masalah utama sekarang adalah **validasi yang belum diterapkan sampai data benar-benar dipakai**, angka bawaan yang muncul kembali pada MET, status PARTIAL yang hilang pada audit manual, pembatalan permintaan bersama, serta pembacaan cache radar yang tidak sesuai OpenLayers terpasang.

**Pemeriksa tidak mengubah kode aplikasi, konfigurasi, kredensial, atau deployment.** Berkas tambahan hanya bukti audit di luar proyek dan dokumen ini. Server serta browser pengujian milik pemeriksa sudah ditutup.

## 2. Bukti dan lingkup pengujian

Folder audit baru:

`D:/Blender/test 1/harmony-web-check/2026-10-04-twelfth-remediation-review/`

| Bukti | Yang diperiksa |
|---|---|
| `baseline-stage11.json` | Script verifikasi Gemini dijalankan ulang pada source saat ini; output dialihkan ke folder audit. **21/21 lulus.** Ini baseline Gemini, bukan pemeriksaan independen lengkap semua jalur. |
| `stage12-reproductions.json` | **18 skenario tambahan** memakai service aplikasi dan hook/effect dari source. Termasuk kontrol positif; bukan 18 kegagalan dan bukan pengamatan bumi live. |
| `browser-weather.json` | Dua kondisi browser lokal: pemilihan hari berikutnya dan kolom MET yang hilang. Fixture jaringan terkontrol; tidak ada page error dalam dua kondisi itu. |
| `openlayers-cache.json` | Pemeriksaan implementasi OpenLayers **10.10.0** yang benar-benar terpasang; source vs renderer cache. Status tile LOADED disimulasikan, tanpa unduhan tile nyata. |
| `live-provider-probes.json` | Probe nyata CMA/JMA dan tiga rute web publik. |
| `verification-summary.json` | Empat suite terpilih, **57 kasus/grup**, semua exit 0; typecheck exit 0. |
| `source-manifest.json`, `source-integrity.json`, `source-integrity-final.json` | Hash 17 berkas source/package sebelum dan setelah audit. |

Suite terpilih: weatherDataIntegrity (16 grup), stage11IntegrityVerification (10), stage10IntegrityVerification (12), evidenceStage6 (19). Tidak mengulang seluruh npm test/build produksi. Angka 222 pada laporan Gemini merupakan klaim laporan mereka; hasil yang diulang pemeriksa sendiri hanya lingkup di tabel ini.

Screenshot:

- `D:/Blender/test 1/output/playwright/stage12-selector-correct.png`
- `D:/Blender/test 1/output/playwright/stage12-missing-optional-defaults.png`

Timestamp bukti memakai UTC. `2026-10-04T00:27:08Z` adalah 07.27 WIB. Backend lokal port 3001 tidak tersedia; beberapa request sebelum fixture terpasang gagal ECONNREFUSED. Itu batas lingkungan audit, bukan bukti bahwa seluruh rute/menu rusak. Tidak ada pengujian seluruh negara, semua penyedia, atau akurasi lapangan.

## 3. Perbaikan yang sudah bekerja — pertahankan

1. **Pemilihan hari berikutnya benar di browser.** Tombol 30° kini menghasilkan banner “Prakiraan jam terpilih: 30°C | Hujan: Tidak tersedia”, bukan 17°C hari sebelumnya.
2. **Bujur audit MET** memakai adapter query yang mengenali `lon`, termasuk koordinat negatif pada baseline.
3. **Validasi dasar MET dan model** menolak kasus sebelumnya seperti timestamp `not-a-time`, kelembapan 999, historical-only, unit fraction, array model berbeda panjang dan tanggal 31 Februari dalam baseline.
4. **Status ingestion MET parsial** tidak lagi dipaksa ONLINE ketika current valid tetapi titik lain ditolak. Audit manual masih berbeda, dijelaskan di bawah.
5. **Ringkasan sampel hujan sangat sedikit** kini mencatat data belum lengkap; probability-only pada baseline tidak lagi otomatis disebut gerimis. Semua-null tetap tidak tersedia.
6. **Radar satu loaded dari tiga requested** tidak lagi langsung LIVE pada evaluator status baseline. Metadata/citra GIBS berumur tahun 2020 dinyatakan stale pada evaluator baseline.
7. **MET memiliki deadline internal dan deduplikasi** untuk dua permintaan identik tanpa pembatalan. Masalah lifecycle pembatalan masih tersisa.
8. **CMA/JMA masih sehat:** probe nyata HTTP 200, audit ONLINE; suhu pertama 25,8°C dan 27,6°C pada waktu pemeriksaan. Jangan menghapus kedua penyedia.

## 4. Temuan yang harus diperbaiki

### T1 — Angka buatan kembali muncul pada MET [P0]

Lokasi: `apps/web/src/services/metNorwayService.ts:191–194`; tipe `MetNorwayPoint` sekitar baris 8–11 dan konsumen fallback pada `weatherAggregatorService.ts`.

Parser mengizinkan wind_speed, wind_from_direction, cloud_area_fraction dan air_pressure_at_sea_level tidak tersedia, tetapi normalisasi menggantinya dengan:

| Kolom hilang | Nilai yang dibuat |
|---|---:|
| Wind speed | 0 km/h |
| Wind direction | 0° |
| Cloud fraction | 0% |
| Sea-level pressure | 1013 hPa |

Fixture hanya memiliki suhu dan kelembapan, dengan metadata unit sah. Hasil current memiliki windSpeed=0, windDirection=0 dan cloudCover=0; hourly.seaLevelPressure=1013. Attempt MET **SUCCESS**, endpoint **ONLINE**, acceptedCount=1 dan rejectedCount=0.

**Bukti browser:** UI menampilkan “Langit Cerah Terbuka” dan “Rata-rata awan harian: ~0%” ketika penyedia fixture tidak memberikan data awan. Angka tekanan buatan dibuktikan pada hasil service; jangan mengklaim screenshot memperlihatkan 1013 hPa. Surface pressure current tetap null dan pemisahan sea-level/surface sudah benar — pertahankan.

Seharusnya: kolom opsional hilang tetap null, bukan nilai bawaan. Suhu/kelembapan sah tetap dipakai dengan coverage/status yang menjelaskan kekurangan. Nilai nol sah dari penyedia harus tetap dibedakan dari null.

### T2 — Shared validator belum dipakai pada ingestion model [P0]

Lokasi: `weatherAggregatorService.ts`, validator `open_meteo_models` sekitar 254 dan `open_meteo_models_split` sekitar 305; bandingkan `validateOpenMeteoModelPayload` pada `weatherDataIntegrity.ts`.

Agregator masih memakai pemeriksaan tersendiri: ada angka finite dalam tiap array model. Fungsi shared model validator tidak diterapkan pada dua jalur itu.

**Reproduksi ingestion nyata dengan fixture:** current Open-Meteo valid, tetapi sembilan model memberikan suhu **999°C** pada timestamp yang selaras. Hasil:

- Model attempt SUCCESS.
- Kesembilan nilai 999 masuk ke modelComparison.
- `current.tempMin` dan `current.tempMax` menjadi 999.

Ini bukan sekadar kelemahan badge audit. Data tidak layak benar-benar masuk ke perbandingan dan batas suhu pada hasil cuaca. Angka 999 berasal dari fixture audit, bukan klaim bahwa penyedia live mengirim suhu itu.

Seharusnya: validasi/normalisasi model yang sama berlaku pada audit, request utama, retry, fallback, hourly, perbandingan, min/max dan input analisis. Nilai tidak sah tidak digunakan, tetapi model/sampel sah tetap dipertahankan dengan PARTIAL.

### T3 — Validator masih menerima sebagian isi rusak dan waktu tak dapat diparse [P0]

Lokasi: `weatherDataIntegrity.ts:73`, `:223`, `:233` dan `:260`.

| Fixture | Hasil aktual |
|---|---|
| Suhu model `[28, 999]` | Validator ONLINE dan audit ONLINE, karena cukup `some` sampel dalam rentang |
| Unit suhu `bananas`, nilai `[28,29]` | ONLINE; hanya Fahrenheit tertentu yang ditolak |
| Epoch `1e20` | ONLINE; finite/positif diterima tanpa representabilitas tanggal dan horizon produk |
| Waktu `2026-10-04T08:00:00+99:99` | ISO helper true, model ONLINE, meskipun Date.parse menghasilkan NaN |
| Issue time MET dengan offset `+99:99`, titik current sah | Audit ONLINE dan MET success=true; updatedAt rusak dipertahankan |

Regex ISO memeriksa kalender/jam tetapi tidak membuktikan offset maupun timestamp hasil parse sah. Perhitungan usia dengan NaN tidak menolak data. Model numeric time juga menebak seconds/milliseconds dari ambang 1e11, tanpa memastikan kontrak unit waktunya.

Seharusnya: kalender, offset, hasil parse finite, unit epoch yang dinyatakan, timestamp representable, urutan/duplikasi dan horizon diperiksa. Validasi setiap pasangan waktu/nilai; sanitasi hasil sebelum dikonsumsi. Unit memakai daftar yang didukung, bukan sekadar pengecualian °F. Metadata unit kosong mengikuti kontrak query yang eksplisit, bukan tebakan bebas.

### T4 — PARTIAL hilang pada audit manual MET [P0]

Lokasi: `geospatialDataTelemetryService.ts:236–238` dan adapter hasil validator untuk sumber lainnya.

Fixture satu titik valid dan satu titik kelembapan 999:

- Shared validator: valid=true, status=PARTIAL, acceptedCount=1, rejectedCount=1.
- Service MET: attempt PARTIAL, counts tetap ada.
- Audit manual endpoint: **ONLINE**.

Penyebab: hasil validator direduksi menjadi `v.valid ? null : error`. Status PARTIAL dan counts dibuang; fetchCheckedJson kemudian menganggapnya SUCCESS. Perbaikan status `recordRawIngestion` belum melindungi tombol audit manual.

Seharusnya: adapter meneruskan status, alasan, coverage dan counts. Shared validator tidak cukup jika caller membuang hasilnya. Audit dan ingestion harus menghasilkan penilaian produk yang sama pada payload yang sama.

### T5 — Deduplikasi MET merusak pembatalan dan menimbulkan rejection tak tertangani [P1]

Lokasi: `metNorwayService.ts:93–104`, executeFetch dan pengikatan signal.

| Dua konsumen, satu network request | Hasil aktual |
|---|---|
| Konsumen kedua membatalkan setelah bergabung | Pembatalan diabaikan; kedua konsumen menerima success |
| Konsumen pertama membatalkan, kedua masih membutuhkan data | Kedua konsumen mendapat AbortError; network bersama dibatalkan |
| Cleanup `fetchPromise.finally()` | Menghasilkan unhandledRejection AbortError pada proses audit, walaupun promise kedua caller sudah ditangani |

Dalam audit, listener sementara merekam unhandledRejection agar bukti tersimpan; listener itu tidak dipasang ke aplikasi. Tidak ada klaim crash browser nyata dari pengujian ini.

Seharusnya: pekerjaan jaringan bersama memiliki lifecycle sendiri; setiap consumer punya subscription/cancellation sendiri. Batalkan jaringan ketika tidak ada consumer yang membutuhkan hasil atau deadline bersama habis. Tangani rejection cleanup; tidak membuat promise turunan yang dibiarkan tanpa handler.

### T6 — Coverage dan jendela hujan masih memakai panjang/index array [P1]

Lokasi: `GeospatialWeatherModal.tsx:428–450`.

Empat reproduksi hook aktual:

1. Dua sampel nol berjarak **23 jam** dihitung coverage 100% dari array yang ada, lalu disimpulkan kering sepanjang periode.
2. 18 sampel nol dan enam null dalam 24 titik tetap disimpulkan kering sepanjang periode karena ambang 75%. Enam interval belum diketahui tetap perlu dinyatakan; threshold tidak membuktikan kondisi seluruh periode.
3. Amount 10 mm pada titik pertama, amount null tetapi peluang 70% pada titik berikutnya: seluruh rentang disebut “Hujan lebat …”. Titik probability-only mewarisi intensitas dari titik lain.
4. Dua titik hujan berjarak **24 jam**, bersebelahan pada array: digabung berdasarkan index, bahkan label jam sama menghilangkan pembeda hari.

Seharusnya: coverage mengukur interval yang diharapkan menurut cadence/produk, bukan hanya persentase elemen yang tersisa. Jendela hujan memakai timestamp dan durasi; peluang dan amount dipisahkan. Ringkasan menyebut tanggal, interval, coverage dan batas data. Jumlah/akumulasi dengan interval berbeda tidak diberi arti intensitas per jam tanpa dasar.

### T7 — Pembacaan cache radar memakai objek tile baru dan membuang coverage parsial [P1]

Lokasi: `MapsView.tsx:4078–4111`; implementasi terpasang `node_modules/ol/source/TileImage.js` dan `node_modules/ol/renderer/canvas/TileLayer.js`.

**Probe OpenLayers 10.10.0:** tile disimpan oleh renderer dan diberi state LOADED=2 secara terkontrol. Memanggil `source.getTile()` seperti kode Harmony menghasilkan objek berbeda dengan state IDLE=0; renderer mengambil objek cached yang sama. Jadi getTile pada source bukan pembacaan cache gambar yang sudah tampil. Bukti: `openlayers-cache.json`.

**Reproduksi effect:** viewport memiliki satu tile loaded, satu loading, satu error. moveend membuang seluruh active counts menjadi nol karena bukan semua tile cachedLoaded. Tile loading yang masih diperlukan kemudian selesai, tetapi event diabaikan karena gen lama; status tetap MEMUAT.

Kode juga memakai floor(view.zoom)=13 untuk query cache, sementara source radar memiliki maxZoom=7. Pembacaan coverage harus menggunakan effective tile zoom/resolution dan projection yang digunakan renderer.

Seharusnya: gunakan identitas dan state tile dari renderer/cache yang benar pada versi terpasang, atau tracking tile yang konsisten tanpa membuat tile baru untuk inspeksi. Pertahankan required/loaded/pending/error pada coverage parsial, retag/rekonsiliasi tile yang masih diperlukan, dan abaikan hanya event di luar scope. Jangan memakai API private secara tersebar tanpa adapter dan pengujian terhadap versi terpasang.

### T8 — Dua rute publik tetap 404; penyebab belum dibuktikan [P1]

Probe nyata terbaru:

- `/api/bmkg/gempa/autogempa`: 200 JSON.
- `/api/spatial/hotspots`: 404 HTML.
- `/api/spatial/traffic/flow`: 404 HTML.

Laporan terbaru menyebut “unmapped serverless routing issue” telah diverifikasi. Bukti yang tersedia hanya respons 404 HTML dan inspeksi source; belum ada deployment/function manifest, commit atau log yang menetapkan penyebab spesifik tersebut. Endpoint belum bekerja hanya karena kegagalannya didokumentasikan secara lebih baik.

Seharusnya: status rute tetap belum selesai/route unavailable, penyebab spesifik belum terkonfirmasi. Periksa deployment aktual dengan bukti; jangan menebak key expired, provider down atau mapping tertentu dari 404 saja. Respons lokal NOT_CONFIGURED bukan successful data ingestion.

## 5. Mengapa baseline hijau belum cukup

21 skenario runner Gemini memang lulus saat diulang. Tetapi beberapa menguji helper/evaluator terpisah, bukan jalur ingestion/consumer keseluruhan. Model validator yang lulus tidak membuktikan agregator menggunakannya; helper key berbeda tidak membuktikan UI memilih titik yang benar; counter buatan tidak membuktikan cache OpenLayers benar.

Pemeriksaan browser mengonfirmasi pemilihan timestamp sudah benar, sekaligus menemukan regresi awan 0%. Dedup tanpa abort sudah lulus, tetapi dua jenis abort gagal. Ini tambahan cakupan yang konkret; tidak berarti semua bukti lama palsu. Perbaiki laporan agar “lulus pada skenario yang diuji” tidak berubah menjadi “semua aliran selesai”.

## 6. PROMPT UNTUK GEMINI — salin mulai bagian ini

Kamu memperbaiki Harmony di `D:/vscode/Harmony`. Baca review tahap 12 ini dan bukti pada folder audit eksternal. Fokus perubahan pada T1–T8. Jangan mengulang pembangunan aplikasi, merombak visual/menu, atau mengurus PPT/esai.

### Ketentuan sebelum mengubah kode

1. Catat Git status/diff awal. Pertahankan pekerjaan pengguna yang belum di-commit; jangan reset, membersihkan folder, menghapus file/sumber atau menimpa perubahan tidak terkait.
2. Catat inventory sumber/model, menu terpusat, 15 domain Studio dan mode 2D/3D/Cesium yang ada. Pertahankan semuanya, termasuk CMA/JMA/BoM, MET, CAMS, BMKG/USGS, FIRMS, traffic, GIBS/RainViewer, STAC/raster/LST/DEM. Nama menu tetap **Peta Cuaca**. Jangan menambah tombol floating duplikat.
3. Data hilang tidak menjadi angka bawaan. Nol sah tetap nol; null/EMPTY/PARTIAL/STALE/FAILED/NOT_CONFIGURED/cache/cancellation tidak disamakan. HTTP 200 atau Promise resolve bukan bukti produk usable.
4. Tidak mencetak .env, key/token, header rahasia atau signed URL lengkap. Jangan mengubah kredensial, deploy atau mengganti penyedia otomatis. CMA/JMA masih sehat.
5. Pertahankan `accuracyValidated: false`; jangan mengklaim pemantauan seluruh negara atau ramalan akurat dari jumlah model/sumber saja.

### Rencana perbaikan yang harus dibuat dahulu

Buat peta request → payload → parsed/normalized product → validated samples → aggregation → telemetry → UI. Identifikasi semua jalur yang memakai data model/MET: utama, split retry, fallback, audit manual, cache, hourly, min/max, model comparison dan input diagnostik. Untuk setiap T1–T8, tulis berkas/fungsi yang akan diubah, perilaku pengganti, fitur yang dipertahankan, serta acceptance test sebelum mengedit.

### A. Hilangkan angka buatan dan satukan hasil parser

- Ubah tipe kolom opsional MET menjadi nullable. Hapus default wind 0, direction 0, cloud 0 dan sea-level pressure 1013 untuk kolom yang tidak dikirim. Jangan menghapus nilai valid suhu/kelembapan atau menggagalkan seluruh sumber hanya karena kolom opsional hilang.
- Sediakan normalized product dari parser bersama: titik valid, nilai nullable, unit, issuedAt, validTime/interval, accepted/rejected counts, missing fields, coverage, status dan alasan. Hindari validator yang hanya mengembalikan boolean lalu caller mengulang parsing dengan aturan berbeda.
- Pertahankan surface pressure dan sea-level pressure sebagai variabel terpisah. Nilai null tidak boleh dijumlah/dibanding/ditampilkan sebagai nol; UI awan yang hilang tidak menyatakan langit cerah. Wind direction hilang bukan utara, wind speed hilang bukan angin tenang.
- Consumer/grafik/AI/diagnostik membaca normalized product yang sama. Tidak menambah guard acak di setiap file sebagai pengganti perbaikan di batas ingestion.

### B. Terapkan validasi model pada seluruh jalur yang memakai nilainya

- `weatherAggregatorService` utama dan split memakai parser model yang sama dengan audit. Pertahankan format single-model tanpa sufiks dan multi-model bersufiks menurut query yang benar.
- Validasi setiap pasangan timestamp/nilai/units sebelum memasukkannya ke modelComparison, hourly atau min/max. Jangan memakai some(valid) untuk meloloskan 999 pada indeks lain. Nilai sah dipertahankan, nilai rusak disanitasi/ditolak dengan alasan dan counts; sumber menjadi partial bila cakupan berkurang.
- Periksa daftar model yang diminta vs dikembalikan dan timestamp target yang benar. Jangan mengganti indeks model hilang dengan nilai model lain atau default.
- Unit menggunakan kontrak/allowlist. Unit tak dikenal ditolak; konversi unit yang memang didukung dinyatakan eksplisit dan dicatat. Periksa unit bersufiks tiap model maupun unit umum.
- Parser waktu memeriksa kalender, offset, parse finite, representable epoch, unit waktu dari kontrak, urutan dan duplicate timestamp. Jangan menebak seconds/milliseconds dari besarnya angka saja. ISO tanpa offset mengikuti timezone/utc_offset metadata, bukan laptop.
- Definisikan issue age, valid-time coverage dan horizon sesuai produk. Jangan memakai max timestamp saja untuk membuat data rusak tampak current. Timestamp NaN/1e20/+99:99 tidak boleh lolos; nilai invalid tidak masuk ke perhitungan.

### C. Status audit harus mempertahankan status parser

- Hapus adaptasi `valid ? null : error` yang membuang PARTIAL. Adapter typed membawa normalized data, status, coverage, accepted/rejected counts, missing fields dan alasan sampai SourceFetchAttempt serta registry/UI.
- Audit manual, ingestion dan cache membaca hasil parser yang sama. current valid + rejected point tetap partial; optional fields missing dinyatakan coverage kurang. Jangan mengubah partial menjadi ONLINE berdasarkan adanya satu angka atau satu current block.
- Status query/lokasi/generasi tetap terikat request; jangan mewarisi keberhasilan lokasi sebelumnya. Riwayat sukses dan lastSuccessfulFetchAt boleh disimpan terpisah dari lastAttempt failure.

### D. Perbaiki lifecycle shared MET requests

- Network flight memiliki controller/deadline sendiri dan daftar consumer aktif. Setiap caller memperoleh promise/wrapper sendiri yang memperhatikan signal caller, termasuk abort setelah bergabung.
- Caller A abort hanya membatalkan A. B tetap dapat menerima hasil jika masih aktif; begitu semua caller batal, jaringan boleh dibatalkan. Caller B abort tidak boleh diabaikan.
- Pre-aborted caller tidak bergabung. Cleanup subscriptions/timer/inFlight selalu dilakukan dan rejection dari cleanup promise ditangani. Jangan membuat ignored finally promise yang menimbulkan unhandledRejection.
- Cache hanya menyimpan hasil yang sudah tervalidasi; failure/cancellation tidak menimpa hasil baru yang sah. Pertahankan metadata retrieval asli dan bedakan cache access dari fetch jaringan.
- Pertahankan deadline yang meliputi headers/body/validasi. Dedup tidak menjadikan setiap consumer mengatur deadline bersama secara saling membatalkan.

### E. Coverage dan narasi cuaca mengikuti interval waktu

- Coverage dihitung terhadap grid/interval yang diharapkan pada periode terpilih. Dua sampel berjarak 23 jam bukan otomatis 100% coverage satu hari. Catat missing duration/samples dan jumlah sampel sah.
- Ambang 75% boleh menjadi indikator kelengkapan bila jelas, tetapi tidak membuktikan seluruh interval kering. Kalimat kondisi berlaku pada interval yang tersedia dan selalu mengakui gap yang belum diketahui.
- Pisahkan jendela amount-derived dan probability-only. Jangan menerapkan intensitas lebat dari satu titik kepada titik lain dengan amount null.
- Kelompokkan jendela menurut timestamp, cadence dan durasi; adjacency index tidak cukup. Cantumkan tanggal ketika lintas hari atau jam berulang. Tetap gunakan timezone data yang sudah diperbaiki.
- Total/rata-rata dari interval parsial dilabeli sesuai coverage; jangan menjadi total harian penuh. Akumulasi 1h/6h/12h tidak dijumlahkan ganda atau diperlakukan sebagai intensitas sama tanpa normalisasi yang sah.
- Pertahankan pemilihan timestamp penuh yang sudah bekerja di browser dan all-null unavailable.

### F. Coverage radar memakai cache/version OpenLayers yang benar

- Baca implementasi OpenLayers 10.10.0 yang terpasang sebelum memilih API. `source.getTile()` tidak membaca renderer cache gambar yang sedang tampil dan dapat membuat tile IDLE baru.
- Bangun adapter coverage kecil yang mengikuti renderer/cache atau tracking tile identities secara benar. Jangan menyebarkan akses private melalui any di banyak tempat; bila akses internal diperlukan, isolasikan, jelaskan dan uji terhadap versi terpasang.
- Required tile set memakai frame/provider, projection, extent, wrapX, pixel ratio dan effective zoom/resolution yang dirender. Map zoom 13 tidak menjadi tile zoom 13 untuk source maxZoom 7.
- Saat moveend, pertahankan loaded/pending/error dari tile yang masih diperlukan, termasuk tile loading yang dimulai sebelum moveend. Jangan menghapus coverage parsial menjadi nol.
- Callback event diperiksa terhadap required set dan generasi layer/frame. Tile di luar scope tidak mengubah status; tile yang tetap diperlukan boleh menyelesaikan request dan memperbarui coverage.
- Status loading/partial/failed/stale/available berasal dari coverage tersebut. Cache seluruh viewport sah dapat tersedia tanpa unduhan baru. Pertahankan gate yang mencegah LIVE saat baru 1 dari 3 tile selesai.

### G. Diagnosis produksi dan batas yang belum terselesaikan

- Verifikasi deployment ID/commit, routing/function manifest, entrypoint dan log untuk rute spatial bila akses resmi tersedia. Jangan menyebut unmapped serverless sebagai penyebab terverifikasi tanpa bukti itu.
- Sampai rute hotspot/traffic memberi respons kontrak yang valid, nyatakan route unavailable. 404 HTML, key missing/invalid, rate limit, timeout, valid EMPTY dan data usable adalah kondisi berbeda.
- Local NOT_CONFIGURED dan pesan error yang rapi bukan keberhasilan ingestion. Jangan mengganti penyedia atau mengurangi inventory untuk menutup kegagalan konfigurasi/routing.
- Jangan deploy/ganti key otomatis. Siapkan perubahan lokal dan diagnosis yang dapat direview; keterbatasan akses deployment dilaporkan apa adanya.

### Acceptance tests wajib

1. MET dengan suhu/RH sah tetapi wind/direction/cloud/pressure hilang: semuanya null, coverage jelas, tidak ada 0/1013 buatan, UI tidak menyebut langit cerah. Kontrol nol yang benar-benar dikirim penyedia tetap nol.
2. MET satu valid+satu invalid: parser, service, audit manual, registry dan UI sama-sama menunjukkan partial/counts. Future-only dan current-null tetap jujur.
3. Model sembilan nilai 999 pada target time: tidak masuk modelComparison/min/max/diagnostik. Campuran `[28,999]` mempertahankan 28 yang sah, menolak 999 dan menunjukkan partial.
4. Model/MET unit tak dikenal, epoch tak representable, offset +99:99, kalender mustahil, timestamp duplicate/out-of-order, timezone lokal tanpa offset dan metadata epoch unit. Uji hasil actual ingestion, bukan helper saja.
5. Dua consumer identik: abort pertama, abort kedua, pre-abort, semua abort, sukses dan timeout. Satu request jaringan saat sesuai; caller aktif tetap menerima hasil; tidak ada unhandledRejection dan subscription/timer bocor.
6. UI/hook: dua sampel nol berjarak 23h, 18 nol+6 null, positive amount+probability-only, dua titik hujan berjarak 24h, lintas zona/tanggal. Kalimat tidak melampaui coverage.
7. Radar: cache real renderer, cache parsial, in-flight masih diperlukan saat moveend, zoom peta melebihi maxZoom, late old events, ganti frame/layer dan wrap. Test helper counter saja tidak cukup membuktikan cache.
8. Browser ulang kontrol pemilihan 17°C/30°C lintas hari, all-null rain dan missing cloud/wind. Capture teks dan screenshot; fixture diberi label jelas.
9. Regresi sesuai dependensi yang berubah: menu terpusat/Peta Cuaca, sumber, 2D/3D, STAC/LST/raster dan cancellation yang ada. Jangan mengubah bagian yang sudah bekerja untuk meluluskan test.
10. Rute spatial diuji terpisah antara lokal/fixture dan web publik. Valid EMPTY tidak dianggap gagal; payload invalid tidak dianggap successful zero detections.

Ulangi baseline yang relevan dengan output baru, suite yang tersentuh, typecheck dan build. Jika full npm test diperlukan, periksa efek samping/storage dan gunakan lingkungan terisolasi. Jangan mengubah expected test agar menerima perilaku salah. Pisahkan source inspection, fixture, browser fixture, dependency probe, live probe dan deployment evidence.

### Hasil yang harus diserahkan

- Rencana dan daftar perubahan per berkas: apa ditambah/diganti/dihapus, alasan, caller yang terdampak dan fitur penting yang dipertahankan.
- Tabel T1–T8 sebelum/sesudah dengan referensi bukti; bagian belum selesai tetap dicatat, termasuk rute produksi bila belum pulih.
- Inventory sumber/model sebelum/sesudah dan status query yang konsisten; tidak ada pengurangan sumber untuk membuat persentase sukses terlihat baik.
- Log pengujian dengan jumlah/exit code sesuai eksekusi nyata, screenshot consumer, serta jenis bukti. Jangan mengklaim seluruh aplikasi selesai dari helper yang lulus.
- Diagnosis deployment dengan bukti, atau pernyataan penyebab belum terkonfirmasi bila akses tidak tersedia.

Kriteria selesai: data sah benar-benar digunakan, data invalid/missing tidak menjadi angka/status sukses, audit dan consumer konsisten, cancellation/cache/coverage benar, serta fitur lama tetap berjalan pada skenario yang diuji. Keberhasilan request tidak otomatis berarti akurasi ramalan sudah tervalidasi.

---

Dokumen ini adalah review dan prompt perbaikan untuk Gemini; tidak menyatakan aplikasi telah selesai diperbaiki.
