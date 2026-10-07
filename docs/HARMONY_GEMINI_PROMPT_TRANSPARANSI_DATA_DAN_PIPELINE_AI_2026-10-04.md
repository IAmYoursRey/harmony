# Prompt Gemini — Perbaiki Transparansi Data dan Alur Prakiraan Harmony

Salin seluruh dokumen ini ke Gemini/Antigravity yang memiliki akses ke proyek. Dokumen disusun dari pemeriksaan kode, reproduksi terkontrol, dan permintaan GET langsung pada 4 Oktober 2026. Penyusunan prompt ini tidak mengubah kode aplikasi.

## 1. Tugas dan batas pekerjaan

Kerjakan perbaikan pada `D:/vscode/Harmony`. Fokus pada modal **Transparansi Data**, pengambilan data cuaca dan sumber terkait, perhitungan, serta sambungan analisis AI. Abaikan PPT dan esai. Mulai dengan rencana singkat berdasarkan kode yang benar-benar ada, kemudian implementasikan dan buktikan hasilnya.

Tujuan: pengguna memilih lokasi, aplikasi mengambil data yang relevan, memeriksa validitasnya, menyelaraskan waktu dan satuan, menghitung indikator yang memang didukung, lalu menjalankan analisis AI atas data yang sama. Tampilan cuaca, matriks mentah, audit, ekspor, dan hasil AI harus konsisten.

Seluruh sumber harus mempunyai hasil pemeriksaan dan alasan yang jelas. Ini tidak berarti setiap sumber harus dipaksa berstatus berhasil. Sumber gagal, belum dikonfigurasi, tidak mencakup lokasi, atau tidak menyediakan suatu parameter harus dinyatakan apa adanya.

Ketentuan wajib:

- Pertahankan menu, sumber, fitur, dan perubahan pengguna yang sudah ada. Kondisi Git sedang banyak perubahan; jangan reset, checkout untuk membuang perubahan, atau mengganti keseluruhan aplikasi dengan versi lain.
- Perbaiki sambungan dan kontrak data sebelum merombak tampilan. Pertahankan tata letak utama dan pengelompokan menu peta yang sudah disepakati.
- Pertahankan pemeriksaan rentang nilai, satuan, kesesuaian lokasi, kesegaran waktu, sanitasi deret, pembatalan kueri lama, serta pengambilan model dengan batas konkurensi yang sudah ditambahkan.
- Jangan mengubah pemeriksa atau tes hanya untuk membuat semua hasil hijau. Jangan mengganti null dengan angka nol, tekanan 1013, peluang hujan buatan, angka acak, atau data fixture pada jalur produksi.
- Jangan menghapus penyedia yang gagal dari registri untuk menaikkan persentase keberhasilan. Jika penyedia harus diganti, verifikasi alternatif resmi, kemampuan, cakupan, izin, dan alasan penggantiannya. Catat sumber lama sebagai digantikan.
- Lindungi nilai kunci API, token, header autentikasi, dan URL yang memuat kredensial. Kunci hanya di server; laporan cukup menampilkan ada/tidak dan kode kegagalan yang telah disanitasi.
- Jangan menerapkan perubahan ke situs publik tanpa instruksi penerapan tersendiri. Siapkan perbaikan lokal dan catatan kebutuhan lingkungan produksi; periksa situs publik hanya secara aman.

## 2. Bukti pemeriksaan yang harus ditindaklanjuti

### A. Yang terlihat pada lampiran pengguna

Modal menunjukkan **5/14 Sumber Online**, **Siap Diperiksa**, **1 Variabel Dikalibrasi**, tetapi matriks mentah mempunyai **0 parameter** dan **0 baris**. Lampiran berisi tab data mentah, sehingga tidak memperlihatkan alasan kegagalan setiap sumber. Jangan menyimpulkan sembilan sumber semuanya putus berdasarkan angka itu saja.

### B. Lima masalah yang berhasil direproduksi dari modul aplikasi saat ini

Reproduksi menggunakan respons terkontrol untuk mengisolasi cacat kode, bukan bukti keberhasilan penyedia atau pemanggilan AI produksi.

| Kasus | Hasil aktual | Hasil yang diperlukan |
|---|---|---|
| Open-Meteo gagal, MET Norway menyediakan suhu 22°C | Cuaca menampilkan 22°C, tetapi `rawTemperature=null`, matriks 0 baris, payload asli MET tidak disimpan | Data MET yang lolos pemeriksaan masuk ke snapshot dan matriks dengan asal, waktu, dan satuannya |
| Pemeriksaan AI setelah fallback MET | Suhu yang dikirim null; audit AI OFFLINE | AI memakai snapshot normalisasi yang sama dengan cuaca; parameter yang tidak tersedia ditangani per kemampuan |
| Backend mengembalikan respons penjelasan AI valid dengan `calibratedRainProb=null` | Klien menolak hasil dan berpindah ke diagnostik lokal | Null yang diizinkan kontrak diterima; nilai di luar rentang tetap ditolak |
| Tekanan tidak tersedia pada masukan diagnostik | Seluruh diagnostik melempar `Data untuk diagnostik atmosfer tidak lengkap.` | Perhitungan yang tidak membutuhkan tekanan tetap berjalan; kerapatan udara ditandai belum dapat dihitung |
| Snapshot mempunyai 9 model pada fixture | Pemeriksaan AI mengirim `modelComparison: []`, jumlah model 0 | Hanya model valid dari snapshot yang sama dikirim beserta waktu, cakupan, dan satuan |

Bukti dan skrip tersedia di:

- `D:/Blender/test 1/harmony-web-check/2026-10-04-transparency-prompt-review/reproductions.json`
- `D:/Blender/test 1/harmony-web-check/2026-10-04-transparency-prompt-review/reproduce.mjs`

### C. Respons nyata pada 4 Oktober 2026 sekitar 09:07 WIB

Lokasi utama pemeriksaan `-7.25,112.75`. Probe memakai GET melalui Node, bukan peramban: hasil ini tidak membuktikan kelolosan CORS atau tampilan UI. Pemeriksaan publik menggunakan `https://harmony-nine-tau.vercel.app`.

| Sumber/operasi | Bukti | Arti dan tindakan |
|---|---|---|
| Open-Meteo cuaca | HTTP 200, JSON | Terjangkau; tetap periksa parameter, waktu, lokasi, dan kebutuhan current/hourly/daily pada konsumen |
| Perbandingan 9 model | HTTP 200; banyak model mempunyai nilai, BoM 0 dari 168 nilai suhu | Batch tidak boleh dianggap seluruh model sukses; pisahkan status per model dan horizon |
| BoM individual | HTTP 200, seluruh 168 nilai suhu null | Tidak ada suhu yang dapat dipakai untuk kueri ini. Bukan keberhasilan data dan bukan bukti penyedia tutup permanen |
| CMA individual | 111 dari 168 nilai suhu finite | Ketersediaan terbatas menurut horizon; selaraskan waktu, gunakan bagian valid, jangan mengarang sisanya |
| JMA individual | 168 dari 168 suhu finite | Ada deret numerik pada probe ini; tetap validasi waktu/satuan |
| CAMS/Open-Meteo kualitas udara pada URL audit | HTTP 200; pemeriksa aplikasi menghasilkan PARTIAL, 3 diterima, 1 ditolak | URL hanya meminta current, tetapi pemeriksa mengharuskan hourly. Ini ketidakcocokan kontrak audit |
| MET Norway | HTTP 200, 93 titik timeseries | Ada data fallback, tetapi adapter snapshot dan pengiriman ke AI masih bermasalah |
| BMKG TEWS, USGS, Open-Elevation | HTTP 200, JSON | Terjangkau pada probe; jangan mengklaim validitas seluruh isi hanya dari HTTP 200 |
| FIRMS di situs publik | HTTP 404, HTML | Jalur publik tidak menyediakan respons API yang diharapkan; telusuri deployment/rewrite/base URL |
| TomTom di situs publik | HTTP 404, HTML | Sama: belum tersambung di deployment yang diperiksa |
| FIRMS dan TomTom pada server lokal | HTTP 200, `success:false`, `NOT_CONFIGURED`, `UNAVAILABLE`; kedua kunci tidak ada | Endpoint lokal ada, layanan penyedia belum dikonfigurasi. Jangan laporkan online hanya karena HTTP 200 |
| AI health lokal | `configured:true`, `weather:true`; kunci weather khusus tidak ada, kunci fallback chat/chatbot ada | Ada konfigurasi fallback, tetapi health ini tidak membuktikan inference berhasil atau model dapat digunakan |

Pada batch model, CMA, Meteo-France, dan UKMO juga memiliki bagian deret null. Keberhasilan harus dinilai untuk variabel dan horizon yang diminta, bukan semua 168 jam wajib ada jika penyedia memang memiliki horizon lebih pendek.

Tidak ada pemanggilan inference Gemini nyata pada pemeriksaan ini. Jangan mengklaim AI produksi sudah berhasil berdasarkan fixture atau health.

Bukti probe: `D:/Blender/test 1/harmony-web-check/2026-10-04-transparency-prompt-review/live-results.json`; skrip `live-check.mjs` pada folder yang sama. Ulangi probe seperlunya setelah perubahan; hasil penyedia dapat berubah.

## 3. Cacat kode dan perbaikan yang diminta

### 3.1 Adapter fallback dan snapshot tunggal

Periksa:

- `apps/web/src/services/weatherAggregatorService.ts`, cabang fallback MET dan `reverifyWithAi`.
- `apps/web/src/services/geospatialDataTelemetryService.ts`, `recordRawIngestion`, `rawParameters`, matriks, dan ekspor.
- `apps/web/src/services/metNorwayService.ts`.

Saat ini fallback memanggil `recordRawIngestion` dengan objek `{ fallback: 'met_norway', modelComparisonResponse: ... }`, bukan respons MET asli. Telemetri kemudian membaca `weatherRes.current`, format khusus Open-Meteo. Karena itu data cuaca yang valid hilang dari audit.

Tambahkan adapter per penyedia. Pertahankan respons mentah yang aman, hasil normalisasi, sumber setiap nilai, dan alasan nilai yang hilang. Jangan membaca MET seolah memiliki `.current` Open-Meteo. Jangan menyalin nilai olahan ke kolom bernama mentah tanpa mencatat transformasinya.

Gunakan snapshot immutable dengan sekurangnya `snapshotId`, `queryKey`, `runId`, lokasi/AOI, `fetchedAt`, waktu keluaran/valid data jika disediakan, unit, source attempts, current/hourly/daily, modelComparison, data mentah, normalized parameters, dan kelayakan per tahap. Perubahan audit tidak boleh memutasi data milik konsumen lain.

Tekanan permukaan dan tekanan setara permukaan laut adalah dua variabel berbeda. MET tidak boleh mengisi surface pressure langsung dengan sea-level pressure. Jika membuat estimasi berbasis elevasi, tampilkan metode, masukan, dan status DERIVED; tanpa masukan cukup, biarkan null.

Snapshot cuaca, matriks, AI, perhitungan, dan ekspor harus merujuk snapshotId yang sama. Gunakan penyimpanan per kueri/lokasi yang sudah tersedia; jangan bergantung pada satu `latestSnapshot` global saat pengguna berpindah tempat.

### 3.2 Kontrak pengambilan data dan status sumber

Periksa `geospatialDataTelemetryService.ts`, `weatherDataIntegrity.ts`, `weatherValueValidation.ts`, serta registri sumber.

- Samakan pembangun URL dan pemeriksa dengan scope operasi. Untuk audit kualitas udara yang membutuhkan hourly, mintalah hourly yang sesuai; jika hanya menguji current, gunakan pemeriksa scope current dan tampilkan bahwa hourly belum diperiksa. Jangan melonggarkan pemeriksa ingestion lengkap.
- Samakan query model individual dengan batch: format epoch/UTC yang jelas, timezone eksplisit, variabel, lokasi, dan horizon. URL BoM/CMA/JMA individual sekarang tidak menyertakan `timeformat`/`timezone`; hindari Date.parse atas waktu tanpa zona yang bergantung pada timezone laptop.
- Status batch model harus mempunyai detail per model, per variabel dan rentang waktu. Null di luar horizon tidak boleh menghapus titik valid di dalam horizon. Nilai all-null bukan data numerik berhasil.
- Pemanggilan audit saat ini mencampur status endpoint dengan status ingestion. Pisahkan `reachable`, `payloadValidity`, `dataAvailability`, `freshness`, `usedInForecast`, dan `lastOperationScope`, atau representasi setara. Jangan menambah status yang merusak konsumen lama tanpa migrasi.
- HTTP 200 dengan `success:false`, HTML, JSON rusak, all-null parameter yang diwajibkan, lokasi salah, waktu kedaluwarsa, atau unit salah tidak boleh menjadi SUCCESS/ONLINE untuk pengambilan data.
- Koleksi kejadian kosong dapat menjadi hasil valid jika query, cakupan, waktu, dan schema sah. Nol hotspot berbeda dari gagal mengambil hotspot; ini juga berlaku untuk gempa dan ruas jalan yang tidak tercakup.
- Beri reasonCode yang dapat ditindaklanjuti: NOT_CONFIGURED, AUTH_INVALID, RATE_LIMITED, TIMEOUT, ROUTE_NOT_FOUND, CORS_BLOCKED, INVALID_SCHEMA, STALE, NO_COVERAGE, EMPTY_VALID, PARTIAL, dan CANCELLED, sesuai kebutuhan. Jangan menyebut API expired tanpa bukti respons autentikasi/ketentuan penyedia.
- Batasi audit serentak, misalnya maksimum tiga permintaan; gunakan deduplikasi, TTL, cooldown dan Retry-After. Jangan mengirim semua sumber sekaligus berulang ketika panel render.

### 3.3 Orkestrasi siklus dan perubahan lokasi

Periksa `GeospatialDataTransparencyModal.tsx`, `GeospatialWeatherModal.tsx`, serta service yang dipanggil.

`handleSimulateCycle` sekarang memanggil `handlePingAll()` dan `onRefreshWeather()` tanpa await. Audit memasukkan AI, sehingga AI dapat berjalan sebelum data baru siap. Callback refresh bertipe void tidak membawa snapshot hasil. Ini risiko race yang harus dibuktikan melalui tes sebelum dan sesudah.

Buat satu koordinator asinkron yang mengembalikan hasil tiap tahap, dengan kontrak callback bertipe Promise yang benar. Urutan:

1. Ambil lokasi/AOI aktif dan buat runId/queryKey; tandai siklus sedang berjalan.
2. Ambil sumber cuaca dan model yang relevan, gunakan cache yang masih berlaku dan fallback nyata bila diperlukan. Sumber opsional diperiksa terpisah tanpa menggagalkan cuaca yang valid.
3. Periksa payload, lokasi, satuan, waktu, horizon, dan kelengkapan variabel.
4. Normalisasi dan simpan snapshot baru; data mentah dan penolakan tetap dapat ditelusuri.
5. Hitung indikator dengan persyaratan masukan masing-masing.
6. Bentuk prakiraan per waktu dari deret penyedia/algoritme yang jelas; selanjutnya jalankan analisis AI memakai snapshot ini jika masukannya layak dan konfigurasi tersedia.
7. Publikasikan hasil, status AI, dan status penyimpanan per runId; tampilkan tahap yang gagal dan hasil parsial yang masih sah.

Pemeriksaan koneksi sumber saja tidak boleh otomatis melakukan inference AI. Tombol menjalankan siklus penuh boleh memanggil AI satu kali ketika data siap. Status AI dalam audit diambil dari eksekusi itu, bukan POST duplikat saat ping umum. Tombol pemeriksaan ulang AI harus tersedia ketika prasyaratnya terpenuhi.

Tangani double-click, timeout, unmount, dan perpindahan lokasi. Abort atau abaikan hasil generasi lama. Data lokasi A yang selesai setelah lokasi B tidak boleh mengubah panel B. Modal kini berlangganan service dengan effect hanya bergantung `[isOpen]` dan filter koordinat dengan toleransi 0.001; tambahkan dependency yang tepat dan gunakan identitas kueri, bukan perkiraan kedekatan koordinat saja. Log, delta, akurasi, dan ekspor juga harus terikat kueri yang ditampilkan.

### 3.4 Perhitungan parsial dan integrasi AI

Periksa `atmosphericNwpAiService.ts`, `apps/server/src/services/weatherIntegrity.js`, dan `apps/server/src/routes/ai.js`.

Audit AI sekarang membangun request dari rawParameters dan selalu mengirim `modelComparison: []`. Gunakan DTO tervalidasi dari snapshot normalisasi yang sama, termasuk deret waktu dan model yang benar-benar tersedia. Jangan mengambil nilai yang ditolak untuk membuat masukan lengkap.

Gunakan pemeriksa response AI yang setara di server, klien, dan telemetri. Klien sekarang menuntut `calibratedRainProb` finite walaupun tipe memperbolehkan null; audit memakai pemeriksa jauh lebih longgar. Perbaiki keduanya. Null yang diizinkan bukan kegagalan keseluruhan, tetapi NaN, Infinity, angka probabilitas di luar 0–100, schema salah, dan narasi kosong tetap harus ditolak.

Ubah diagnostik menjadi hasil parsial berdasarkan persyaratan:

- Parameter Coriolis membutuhkan lintang valid.
- Estimasi gas ideal membutuhkan suhu absolut dan tekanan yang sesuai, dengan konversi unit dan batas fisik yang benar. Nyatakan pendekatan gas kering jika digunakan.
- Parameter lain hanya dihitung bila algoritme, unit, dan masukan benar-benar tersedia. Jangan memaksa apparent temperature, peluang hujan, atau angin tersedia agar semua perhitungan lokal bisa berjalan.
- Arah angin adalah variabel melingkar: jika dirata-ratakan, gunakan pendekatan vektor dan tangani kasus angin tenang/tidak terdefinisi, bukan rata-rata biasa antara 359° dan 1°.

Bedakan hasil komputasi lokal yang valid dari keberhasilan AI eksternal. Pertahankan reasonCode respons saat fallback; jangan menelan quota/auth/timeout menjadi pesan sukses umum. Beri `aiStatus`, `aiModel`, `snapshotId`, waktu, asal CACHE/LIVE, serta status tiap indikator. Nama lama `isAiVerified` tidak boleh ditafsirkan sebagai akurasi ramalan teruji.

Timeout klien dan server harus selaras dengan anggaran proses. Periksa opsi timeout/abort SDK yang terpasang; jangan hanya Promise.race yang meninggalkan inference berjalan. Cache memakai identitas data/waktu masukan yang relevan, TTL, dan provenance; hasil cache tidak dihitung sebagai pemanggilan AI baru. Cegah duplikasi dan tangani cooldown dengan jelas.

### 3.5 Prakiraan yang benar-benar berdasarkan data

Saat ini endpoint AI terutama menghasilkan teks `scientificBriefing`. Angka keluaran berasal dari diagnostik lokal dan mempertahankan angka penyedia. Jadi keberhasilan endpoint ini bukan bukti Harmony mempunyai model prediksi AI numerik mandiri.

Hubungkan alur yang diinginkan pengguna secara nyata:

- Gunakan current dan deret hourly/daily yang valid untuk merangkum prakiraan pada waktu mendatang: suhu, peluang/intensitas hujan jika ada, awan, arah/kecepatan angin, serta tekanan bila tersedia. Sertakan validTime/horizon dan sumber setiap angka.
- Hitung perbandingan/konsensus hanya untuk variabel, waktu, grid/lokasi, dan jenis keluaran yang sebanding. Tidak boleh mencampur suhu saat ini dari satu model dengan prakiraan hari berikutnya dari model lain.
- Gunakan metode yang terdokumentasi. Jika tanpa kalibrasi pengamatan, tampilkan konsensus sebagai agregasi model, bukan peningkatan akurasi yang terbukti. Banyak model melalui satu agregator tidak sama dengan banyak sensor independen.
- AI membaca hasil terstruktur beserta awan, angin, waktu, ketidaklengkapan, dan sumber. AI dapat menjelaskan kemungkinan perkembangan kondisi berdasarkan prakiraan tersebut. Angka, rentang waktu, dan klaim harus dapat ditelusuri ke masukan atau perhitungan yang dinyatakan.
- Jangan meminta LLM mengarang persentase hujan, angka confidence, atau waktu hujan pasti dari data permukaan. Jika data probabilitas tidak ada, tampilkan tidak tersedia dan tetap jelaskan prakiraan lain yang sah.
- Data satu lokasi permukaan tidak cukup untuk mengklaim solver NWP 3D, CAPE, transport polutan, atau model global mandiri. Jika fitur itu belum mempunyai masukan/metode, beri status belum tersedia dan kebutuhan data yang konkret.
- FIRMS/gempa/traffic adalah informasi konteks bahaya atau mobilitas; jangan otomatis memasukkannya ke persamaan cuaca. Negara asal model tidak membuktikan seluruh negara/bumi diunduh. Jika ada AOI/grid nyata, catat batas geografis dan resolusinya.

Simpan forecast yang benar-benar diterbitkan dengan issueTime, targetValidTime, variabel, nilai, model/versi, dan sumber. Tambahkan struktur pencocokan terhadap observasi independen kelak, tetapi akurasi tetap belum diuji sampai pasangan pengamatan ada. MAE/RMSE membutuhkan observasi numerik sebanding; Brier membutuhkan probabilitas dan kejadian yang cocok. Selisih antarmodel tidak boleh menjadi skor akurasi. Riwayat penjelasan AI bukan bukti pelatihan model.

### 3.6 Konfigurasi API, deployment, dan riwayat

- FIRMS dan TomTom lokal belum dikonfigurasi, sedangkan endpoint publik 404 HTML. Telusuri `vercel.json`, `api/index.js`, route mounting, build/deployment yang benar-benar aktif, serta `VITE_API_BASE_URL`. Jangan menganggap server lokal yang sehat membuktikan deployment publik sehat.
- Jika belum ada kunci yang sah, siapkan konfigurasi server dan pesan kebutuhan kunci yang tepat; jangan membuat kunci palsu. Jika perlu alternatif, verifikasi sumber resmi yang menyediakan data setara dan syarat aksesnya. Hotspot satelit NRT bukan pengukuran suhu udara atau bukti kebakaran pasti.
- `ai.js` membuat aiInstances saat import dan membaca `.env`; `server.js` memanggil dotenv untuk `.env.local/.env` pada badan modul setelah static import. Reproduksi skenario konfigurasi hanya `.env.local` sebelum menyatakan penyebab, lalu benahi bootstrap konfigurasi bila terbukti. Jangan merusak konfigurasi quiz/chat/chatbot yang masih dipakai.
- `/api/ai/health` saat ini hardcode `configured:true`. Laporkan keberadaan konfigurasi weather yang sebenarnya, model yang dipilih, dan hasil pemeriksaan inference terakhir secara terpisah. Jangan memanggil inference setiap health check.
- Model default kode `gemini-3.6-flash` belum diuji terhadap akun ini. Jangan menggantinya berdasarkan dugaan. Periksa model yang tersedia melalui API resmi `models.list`/metadata dan lakukan satu pengujian inference terkendali bila kunci sah tersedia; dokumentasikan sukses/gagal tanpa mencetak kredensial.
- Penyimpanan AI memakai locationKey 3 desimal, tetapi `weather-models-comparison` membaca 2 desimal. Repository membandingkan string persis. Satukan pembentuk key dan tangani data lama secara kompatibel. Jangan membulatkan sehingga dua lokasi berbeda tercampur tanpa kebijakan resolusi yang jelas.
- Repository PostgreSQL sekarang mengambil LIMIT riwayat global sebelum filter lokasi di JavaScript. Perbaiki filter lokasi sebelum LIMIT di query yang terparameterisasi sehingga riwayat lokasi aktif tidak hilang karena lokasi lain.
- `.catch(() => {})` pada penyimpanan menyembunyikan gagal menyimpan. Pisahkan inferenceStatus dan persistenceStatus; jangan membatalkan penjelasan yang sah hanya karena penyimpanan gagal, tetapi jangan mengklaim riwayat tersimpan.

## 4. Transparansi yang mudah dipahami pengguna

Pertahankan semua sumber dan tab, tetapi perbaiki makna informasinya:

- Ringkasan harus membedakan berhasil, parsial, gagal, belum diperiksa, belum dikonfigurasi, serta tampilan iframe yang bukan data numerik. Hindari rasio tunggal yang membuat iframe/AI yang belum dijalankan tampak seperti API mati.
- `Siap Diperiksa` harus berdasarkan data valid/prasyarat tahap, bukan sekadar snapshot ada. Jika mentah kosong karena gagal, tampilkan sumber dan alasan; jika kosong karena filter, sediakan reset filter dengan keterangan berbeda.
- `1 Variabel Dikalibrasi` sekarang hanya menghitung panjang daftar delta, padahal item menjelaskan nilai penyedia tidak dikoreksi. Gunakan istilah proses yang benar, misalnya langkah normalisasi. Kalibrasi hanya bila ada metode dan data pembandingnya.
- Matriks harus mencakup parameter valid yang benar-benar digunakan: cuaca primer/fallback, kualitas udara, dan model. Jelaskan perbedaan jumlah parameter, jumlah model, dan jumlah sumber; jangan menghitung semuanya sebagai satu jenis feed.
- Klasifikasi model kini dipaksa `GLOBAL_TOP_NWP` dan countryCode kosong. Perbaiki metadata/filter bila kategori memang dipertahankan; nama negara/lembaga bukan cakupan pengamatan. Jangan mengubah data model menjadi label sensor langsung.
- Detail sumber tampilkan scope, lokasi, waktu data, waktu pemeriksaan, HTTP/status semantik, asal cache, jumlah nilai diterima/ditolak, alasan, dan apakah digunakan dalam prakiraan. Sambungkan hasil AI ke sumber/snapshot yang dipakai.
- Ekspor harus memuat snapshot dan log kueri yang terlihat, bukan data global dari lokasi terakhir yang berbeda. Sanitasi seluruh detail/error sebelum ekspor.

## 5. Rencana pelaksanaan

1. Catat Git status awal dan baca kode terkait; telusuri caller hingga backend. Reproduksi masalah yang disebutkan, tandai mana yang sudah berubah pada versi terbaru.
2. Tulis rencana perubahan per file, kontrak input-output, serta syarat selesai. Pisahkan cacat kode dari kebutuhan kredensial atau deployment.
3. Perbaiki adapter MET, snapshot/provenance, request-validator parity, dan perhitungan parsial terlebih dahulu.
4. Perbaiki koordinator siklus, identitas kueri, race/cancel, serta transfer model/hourly ke AI. Selaraskan schema AI dan pelaporan fallback/cache.
5. Perbaiki status/modal/ekspor tanpa mengurangi fitur. Benahi konfigurasi dan riwayat yang relevan.
6. Jalankan pengujian bermakna, kemudian pemeriksaan UI. Buat laporan hasil aktual, daftar sumber yang pulih, dan blocker konfigurasi tersisa. Jangan menulis laporan selesai sebelum pemeriksaan dijalankan.

## 6. Tes dan syarat penerimaan

Tambahkan tes regresi yang memakai modul aplikasi, bukan implementasi ulang dalam tes:

- Open-Meteo gagal + MET valid: cuaca, raw matrix, snapshot, dan request AI konsisten; payload MET asli tersimpan; sea-level pressure tidak disamakan dengan surface pressure.
- Primary dan fallback gagal: tidak ada angka default atau klaim berhasil; AI tidak menerima input palsu.
- current saja dibanding current+hourly pada kualitas udara: hasil mengikuti scope request, bukan kelengkapan yang tidak pernah diminta.
- BoM all-null; model lain valid; horizon terbatas; titik negatif/null/NaN/range salah; masing-masing dilabel benar dan tidak menghapus data valid lain.
- Timestamp epoch, ISO dengan offset dan tanpa offset, serta timezone Asia/Jakarta dibanding UTC: penyelarasan tidak bergantung laptop.
- Respons AI dengan probabilitas null diterima bila bagian lain valid; probability negatif/di atas 100, NaN, Infinity, JSON salah, dan penjelasan kosong ditolak.
- Tekanan hilang: Coriolis tetap dihitung; kerapatan tidak tersedia; penjelasan dapat menyatakan data parsial tanpa klaim solver.
- Model yang valid benar-benar muncul dalam request AI; model ditolak tidak ikut. Data hourly/cloud/wind terikat validTime yang tepat.
- Siklus menunggu snapshot baru sebelum AI; ping umum tidak melakukan inference; double-click tidak menggandakan pemanggilan; lokasi lama yang terlambat tidak mencemari lokasi baru.
- AI 401/403/404/429/timeout/missing-key: reasonCode tetap terlihat; diagnostik lokal bukan sukses inference. Uji cooldown dan cache tanpa panggilan berulang.
- HTTP 200 `success:false`, 404 HTML, koleksi kejadian kosong valid, dan sumber di luar cakupan mempunyai hasil berbeda.
- Gagal penyimpanan terlapor; baca/tulis locationKey konsisten; filter lokasi sebelum LIMIT bekerja; riwayat bukan validasi akurasi.
- `.env.local` saja dibanding `.env`/environment deployment: health dan instance AI membaca konfigurasi yang sama tanpa mengekspos nilai.

Gunakan `npm run test:data-integrity`, `npm run typecheck`, dan `npm run build` sebagai pemeriksaan dasar setelah perubahan. Periksa skrip sebelum menjalankan seluruh `npm test`: ada tes lama yang menulis penyimpanan nyata. Isolasi tes berpotensi menulis DB/local storage; jangan merusak data pengguna.

Lakukan uji peramban pada lokasi Indonesia serta lokasi lain yang dicakup sumber, refresh penuh, pergantian lokasi cepat saat modal terbuka, sumber parsial, dan AI gagal. Catat CORS/console/network dan cocokkan requestId/snapshotId dari panel hingga request backend. Tes Node saja tidak cukup membuktikan UI atau CORS.

Lakukan probe live terbatas setelah perbaikan dengan waktu, query, HTTP, status semantik, accepted/rejected count, dan reasonCode. Inferensi AI nyata hanya satu pengujian terkontrol ketika konfigurasi sah tersedia; jangan menggunakannya untuk seluruh fixture. Jika kunci/model/deployment belum tersedia, nyatakan belum teruji dan kebutuhan pastinya.

Selesai berarti jalur lokal yang diperbaiki terbukti tersambung dan hasilnya konsisten, sumber gagal tidak dihitung berhasil, serta semua blocker eksternal dilaporkan jelas. Jangan menyatakan semua sumber/prediksi aktif jika masih ada konfigurasi atau hasil live yang belum berhasil.

## 7. Format laporan akhir Gemini

Sertakan:

1. Penyebab utama yang ditemukan dan bukti sebelum/sesudah.
2. File yang diubah beserta tujuan; sumber/fitur yang dipertahankan atau diganti dengan alasannya.
3. Hasil test/typecheck/build/UI dan probe live aktual; bedakan fixture, lokal, peramban, dan produksi.
4. Alur akhir lokasi → data → validasi → normalisasi → perhitungan → prakiraan → AI → penyimpanan/tampilan, termasuk cabang gagal.
5. Matriks status sumber dan konfigurasi yang masih diperlukan. Jangan menyertakan rahasia.
6. Keterbatasan hasil prakiraan serta status pengujian terhadap pengamatan.

Simpan laporan baru dan evidence baru tanpa mengubah bukti pemeriksaan lama untuk membuat riwayat terlihat berhasil.

## Referensi resmi untuk verifikasi kontrak

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): verifikasi variabel, model, satuan, waktu, dan horizon yang digunakan.
- [Gemini Models API](https://ai.google.dev/api/models): gunakan daftar/metadata model yang tersedia, bukan dugaan nama model.

Periksa juga dokumentasi resmi MET Norway, FIRMS, TomTom, dan layanan pengganti sebelum mengubah query atau sumbernya.
