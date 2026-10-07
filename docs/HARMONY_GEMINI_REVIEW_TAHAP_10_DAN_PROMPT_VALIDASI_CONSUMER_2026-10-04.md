# HARMONY — Review tahap 10 dan prompt perbaikan untuk Gemini

Tanggal pemeriksaan: 4 Oktober 2026, WIB. Proyek: `D:/vscode/Harmony`.

## 1. Kesimpulan pemeriksaan

Perbaikan tahap 9 memang menyelesaikan beberapa masalah penting. Namun, hasil tersebut belum cukup untuk menyatakan seluruh aliran data dan tampilan sudah benar. Masih ditemukan dua arah kesalahan: data sah dianggap gagal, dan data tidak lengkap/terlalu lama menghasilkan status atau kesimpulan yang terlalu meyakinkan.

**Temuan paling penting:**

1. CMA dan JMA mengembalikan HTTP 200 serta suhu numerik dari penyedia sebenarnya, tetapi validator audit Harmony menandainya OFFLINE karena mengharapkan nama kolom respons multi-model pada permintaan satu model.
2. Pada browser lokal, prakiraan dengan seluruh nilai hujan kosong tetap disimpulkan “Cenderung kering sepanjang hari”. Titik prakiraan besok juga dibahas sebagai “Kesimpulan Cuaca Hari Ini”.
3. Jalur cuaca cadangan menerima PM2.5 berumur 30 hari sebagai bagian kondisi sekarang. Model yang hilang pada lokasi baru juga bisa tetap ONLINE dari lokasi sebelumnya.
4. Penghitung radar belum benar-benar mengikuti tile dalam viewport aktif. Pembaruan metadata GIBS masih dapat ditimpa respons lama.
5. Endpoint hotspot dan traffic di web publik masih 404 HTML. Penyebab spesifiknya belum terbukti dari informasi deployment yang tersedia.

Tidak ada perubahan kode aplikasi, konfigurasi, kredensial, atau deployment oleh pemeriksa dalam tahap ini. Berkas tambahan hanya berupa bukti audit dan dokumen ini.

## 2. Lingkup dan bukti

Folder bukti independen:

`D:/Blender/test 1/harmony-web-check/2026-10-04-tenth-remediation-review/`

| Bukti | Lingkup |
|---|---|
| `stage9-reproductions.json` | Pengulangan 20 skenario audit sebelumnya pada source saat ini; bukan sertifikat bahwa seluruh fitur lulus. |
| `stage10-reproductions.json` | 15 skenario tambahan memakai service sebenarnya dan ekstraksi callback/hook/effect dari source. Input kegagalan dikendalikan; bukan klaim kejadian nyata di penyedia. |
| `live-provider-probes.json` | Permintaan nyata CMA/JMA, replay respons tersebut melalui validator audit aplikasi, serta tiga probe web publik. |
| `browser-regression.json` | Pemeriksaan browser lokal dengan respons fixture: audit sumber, LST, pembatalan, resolver aset. |
| `browser-weather.json` | Pemeriksaan UI cuaca lokal dengan MET hanya memiliki titik +24 dan +27 jam; cuaca utama/model/udara 503. |
| `verification-summary.json` | 12 suite terpilih yang aman dibaca ulang, semua exit 0; total 152 kasus/grup. Typecheck exit 0. |
| `source-manifest.json`, `source-integrity.json`, `source-integrity-final.json` | Hash 17 berkas source/package; perbandingan akhir juga memastikan semuanya tidak berubah. |

Screenshot browser berada di `D:/Blender/test 1/output/playwright/`: `stage10-weather-null-rain.png`, `stage10-source-modal.png`, `stage10-lst-after-cancel.png`, `stage10-lst-resolved.png`.

Timestamp bukti memakai UTC. Contohnya `2026-10-03T22:42:21Z` adalah pagi 4 Oktober 2026 WIB.

**Batas pemeriksaan:** tidak menjalankan ulang seluruh `npm test` ataupun build produksi; tidak membuktikan akurasi terhadap pengamatan lapangan, kesiapan semua negara, atau kestabilan semua penyedia. Pengujian browser memakai fixture untuk mereproduksi kegagalan secara terkontrol. Jangan menuliskannya sebagai hasil pengambilan data live.

Backend lokal port 3001 tidak tersedia selama sesi browser; beberapa request di luar fixture mendapat ECONNREFUSED dari proxy Vite. Itu batas lingkungan audit, bukan bukti bahwa rute tersebut pasti rusak pada backend yang sedang berjalan. Server pengujian dan sesi browser milik pemeriksa telah ditutup setelah audit.

Laporan Gemini menyebut 12 suite dengan 85 pass. Daftar 12 suite yang ditulis dalam laporan sendiri berjumlah 152 kasus/grup; jumlah dan lingkup harus diperbaiki. Perintah `npm test` saat diperiksa memuat 16 suite, sehingga 12 suite terpilih tidak boleh disebut keseluruhan suite. Ini ketidaksesuaian pelaporan; bukan bukti bahwa pengujian sengaja dipalsukan.

## 3. Perbaikan yang sudah bekerja dan perlu dipertahankan

- MET tanpa titik kondisi sekarang menghasilkan `current: null`, bukan suhu/kelembapan/tekanan bawaan.
- Banyak kolom current yang tidak tersedia tetap null, termasuk simbol cuaca, apparent temperature, gust, serta hujan.
- Tekanan permukaan current tidak lagi diisi menggunakan tekanan permukaan laut MET. Masalah masih tersisa pada hourly, dijelaskan di bawah.
- Ketika cuaca utama gagal, 9 model dan PM2.5 CAMS yang sah pada fixture tetap dipertahankan.
- Kasus kegagalan CMA dengan pesan berisi ID model dapat diisolasi; delapan model lain tetap tersedia. Respons retry berlokasi London ditolak untuk query Indonesia.
- Tanggal BMKG dengan offset lokal sah diterima; beberapa tanggal/koordinat tidak valid ditolak. FIRMS dengan waktu tidak valid ditolak dan campuran rekaman valid/tidak valid ditandai sebagian.
- Jumlah stream awal/all-offline tidak lagi berasal dari angka statis sukses.
- Resolver STAC menolak ID scene yang berbeda dan tidak menyatakan signed tanpa perubahan URL nyata.
- GIBS mulai membaca Default dari GetCapabilities, menggantikan perkiraan waktu frame dari jam sistem.
- Regresi browser LST masih berhasil: hasil DERIVED 29,66°C dari 49 piksel fixture; pembatalan dapat dipulihkan tanpa reload; resolver aset S3/Planetary Computer berjalan pada fixture. Ini bukti jalur perhitungan, bukan observasi suhu lapangan.

## 4. Masalah yang masih ada

### A. Kesimpulan UI mengubah data kosong menjadi klaim cuaca

Lokasi: `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx`, terutama `weatherInsights` sekitar baris 394–437, `chartSummary` 484–513, pemilihan jam 625, render 1134–1179 dan 1475–1505.

`precipitation || 0` dan `precipitationProb || 0` membuat nilai yang tidak tersedia diperlakukan seperti nol. Teks awal `rainWindowText` adalah “Cenderung kering sepanjang hari”. Tutupan awan yang hilang juga masih diganti 25 dalam rata-rata. Pemilihan titik hanya membandingkan angka jam, tanpa tanggal.

**Bukti browser:** current kosong ditampilkan sebagai `--`, tetapi badge tetap “Hangat”. UI memperlihatkan “Cenderung kering sepanjang hari. Peluang hujan/gerimis tertinggi % pada jam …” saat semua nilai hujan/probabilitas null. Dua titik besok masuk ke bagian “Kesimpulan Cuaca Hari Ini”; kalimat pagi/malam lebih sejuk tidak didukung cakupan sampel.

**Bukti hook, berbeda dari bukti tampilan:** `chartSummary.totalRain` menghasilkan `0.0 mm` untuk seluruh hujan null. Dalam source saat ini hook tersebut tidak ditemukan dipakai pada render; browser tidak memperlihatkan angka nol hujan tersebut. Perbaiki logika itu, tetapi jangan melaporkan angka nol sebagai temuan visual.

Seharusnya: null tetap tidak tersedia, nol sah tetap nol, ringkasan menyebut tanggal/interval yang benar dan kelengkapan sampel. Tidak ada kesimpulan “kering”, “Hangat”, rata-rata awan, atau perilaku pagi/malam tanpa data pendukung.

### B. Fallback belum konsisten dengan kontrak waktu dan kolom

Lokasi: `apps/web/src/services/weatherAggregatorService.ts`, jalur fallback sekitar 314–410; bandingkan pemeriksaan alignment udara pada jalur utama sekitar 437.

- Kasus `fallback-old-air`: air.current berumur 30 hari, PM2.5=15, tetap masuk ke current MET sekarang; attempt udara SUCCESS dan CAMS online.
- Kasus `fallback-hourly-null-consumer`: simbol MET kosong, current.conditionCode null tetapi hourly.conditionCode menjadi 1 karena `?? 1`.
- Kasus sama: current.pressure null tetapi hourly.pressure 1005 dari `air_pressure_at_sea_level`. Kolom generik yang pada jalur utama berarti surface pressure kini memuat besaran lain.

Seharusnya: pemeriksaan waktu/lokasi/satuan berlaku pada semua jalur. Pertahankan data sah yang sesuai; data lama boleh hadir sebagai riwayat berlabel, tetapi tidak digabung sebagai current. Tekanan permukaan laut dan tekanan permukaan harus dipisah secara semantik. Simbol yang hilang tetap null pada semua konsumen.

### C. CMA/JMA sehat tetapi validator audit salah membaca respons

Lokasi: `apps/web/src/services/geospatialDataTelemetryService.ts`, URL model tunggal sekitar 163–166 dan validator sekitar 217–229.

Probe nyata pada koordinat -7,25/112,75:

| Permintaan | HTTP | Kolom hourly aktual | Suhu pertama | Hasil audit Harmony |
|---|---:|---|---:|---|
| `models=cma_grapes_global` | 200 | `time`, `temperature_2m` | 27,3°C | OFFLINE |
| `models=jma_seamless` | 200 | `time`, `temperature_2m` | 27,4°C | OFFLINE |

Validator mengharapkan kolom bersufiks model. Ini bukan bukti CMA/JMA mati atau key expired. Respons nyata menggunakan waktu ISO; URL audit tidak memaksa unixtime.

Sebaliknya, fixture dengan kolom bersufiks dan `time: ['not-a-time']` justru ONLINE. Normalisasi harus mengikuti jenis query, memvalidasi timestamp, alignment array, satuan, lokasi, identitas query/model, dan cakupan. Perbaiki pembacaan penyedia ini; jangan menghapus atau menggantinya hanya karena validator salah.

### D. Status sumber dapat tertinggal atau menghapus informasi partial

Lokasi: `geospatialDataTelemetryService.ts` sekitar 454–470; `DataSourceProvenanceModal.tsx` sekitar 153–154 dan 462.

- Kasus `fallback-missing-models-status`: setelah query A memiliki sembilan model, query B hanya memiliki satu model. BoM/CMA/JMA masih ONLINE dari query A karena hanya model yang hadir diperbarui. Attempt gabungan query B juga masih SUCCESS.
- Pada MET future-only, attempt PARTIAL dan current null, tetapi `recordRawIngestion` kembali menetapkan endpoint MET ONLINE berdasarkan adanya fallback.
- Badge kredensial masih memakai deskriptor registry `CONFIGURED/ACTIVE`, bukan konfirmasi backend saat ini. Kebutuhan key, keberadaan konfigurasi, dan validitas key adalah tiga hal berbeda.

Seharusnya: status terikat lokasi/query/generasi dan produk. Keberhasilan sebagian tetap terlihat sebagai sebagian. Riwayat sukses boleh disimpan tanpa dipakai sebagai keberhasilan query baru. Prakiraan masa depan yang tersedia tetap dapat digunakan, dengan current tidak tersedia dinyatakan terpisah.

### E. Validasi dan metadata pengambilan MET masih terlalu longgar

Lokasi: `apps/web/src/services/metNorwayService.ts` serta validator MET dalam telemetry.

| Skenario | Hasil aktual |
|---|---|
| Issue time 2020, titik prakiraan sekarang | SUCCESS; umur issue tidak diperiksa secara efektif. |
| Satu titik valid + satu titik kelembapan 999 | Titik invalid dibuang, tetapi SUCCESS tanpa jumlah rekaman ditolak. |
| Respons HTTP 203 dengan teks Unicode | Attempt ditulis HTTP 200; ukuran dilaporkan 546, ukuran UTF-8 aktual 551 byte. |
| Pembacaan cache | checkedAt baru, latency/bytes nol, tanpa asal cache/retrieval yang tegas pada attempt. |
| MET manual dengan timeseries `[{}]`, metadata/geometri valid | ONLINE walaupun tidak ada titik yang dapat digunakan. |

Service masih melakukan fetch browser langsung, tanpa deadline internal yang terikat request, deduplikasi in-flight, atau revalidasi bersyarat cache. Ini temuan source, bukan bukti seluruh request browser pasti gagal CORS. Perbaikan identifikasi kontak palsu dari versi sebelumnya sudah baik dan harus dipertahankan.

Seharusnya: pisahkan umur model issue dari valid time titik, catat rekaman diterima/ditolak, status HTTP aktual, ukuran UTF-8 aktual, serta metadata cache. Gunakan kebijakan freshness sesuai produk dan dokumentasi penyedia; jangan menetapkan semua produk memiliki umur maksimum yang sama.

### F. Radar belum memiliki cakupan viewport yang dapat dipercaya

Lokasi: `MapsView.tsx` sekitar 4030–4060 dan `weatherStatusText` 4139–4163.

Penghitung active hanya bertambah dari event lalu direset pada moveend. Tidak ada identitas tile, daftar tile pada extent, atau generasi viewport/frame. Saat activeRequested=0, status kembali memakai jumlah historis.

Eksekusi effect yang diekstrak dari source: satu tile selesai, lalu moveend mereset active menjadi nol tetapi status masih LIVE berdasarkan historicalLoaded=1. Error tile lama yang terlambat kemudian mengubah status menjadi PARSIAL. Tes ini mereproduksi callback, bukan pembuktian coverage geografis melalui server tile nyata.

Seharusnya: coverage dihitung dari tile yang diperlukan viewport/frame saat ini, termasuk tile sah dari cache; event lama tidak memengaruhi generasi baru. Jangan menyatakan sukses berdasarkan jumlah historis ketika belum mengetahui cakupan aktif.

### G. Pembatalan GIBS tidak membatalkan fetch yang sebenarnya

Lokasi: `MapsView.tsx`, `fetchGibsMetadata` sekitar 3942–3970.

Controller milik callback di-abort, tetapi fetch memakai `AbortSignal.timeout(10000)` yang berbeda. Respons tidak memeriksa generasi sebelum commit. Dalam reproduksi, request B memberi Default 01:00; respons A lama datang belakangan dan menggantinya menjadi 23:00. Controller A aborted=true, signal fetch A aborted=false.

Seharusnya: gabungkan timeout dan pembatalan milik request, lalu periksa request/generasi sebelum menulis state. Waktu metadata dan waktu frame adalah metadata berbeda; cache/metadata baru tidak membuat frame tua menjadi realtime.

### H. Parsing angka BMKG masih menerima teks rusak

Lokasi: `geospatialDataTelemetryService.ts` sekitar 272–304; periksa juga `geospatial/apiHealthService.ts`.

Fixture Coordinates `-7junk,112junk`, Magnitude `foo2.1bar`, Kedalaman `foo10bar` mendapat ONLINE karena parseFloat atau penghapusan semua karakter nonnumerik.

Seharusnya: gunakan grammar yang membolehkan format resmi seperti kedalaman `10 km` atau koordinat berarah sesuai kontrak, tetapi menolak teks acak. Pertahankan dukungan tanggal lokal valid yang baru diperbaiki.

### I. Recovery model masih bergantung pada tebakan pesan error

Source `weatherAggregatorService.ts` sekitar 286 mengisolasi model jika pesan berisi ID persis; pesan tak dikenal masih dapat berakhir dengan asumsi BoM. Satu percobaan ulang grup tidak menjamin pemulihan dua model bermasalah atau pesan nama ramah.

Ini kesimpulan dari source, bukan skenario live baru. Pertahankan recovery CMA yang sudah lulus, lalu tambahkan pemulihan terbatas dengan inventaris model tetap utuh dan alasan kegagalan per model. Jangan menjadikan retry berhasil sebagai bukti semua model berhasil.

### J. Produksi masih belum menyediakan dua rute spatial

Probe nyata:

- `/api/bmkg/gempa/autogempa`: HTTP 200 JSON.
- `/api/spatial/hotspots`: HTTP 404 HTML.
- `/api/spatial/traffic/flow`: HTTP 404 HTML.

Pernyataan “deployment memakai commit lama” pada laporan Gemini adalah hipotesis yang belum disertai deployment ID/commit/build log. Respons lokal HTTP 200 dengan `NOT_CONFIGURED` membuktikan rute dapat menjelaskan konfigurasi hilang; itu bukan bukti data hotspot/traffic berhasil diambil.

## 5. PROMPT UNTUK GEMINI — salin mulai bagian ini

Kamu memperbaiki Harmony di `D:/vscode/Harmony`. Baca seluruh review tahap 10 di atas, bukti eksternal, serta laporan tahap 9 sebelum mengubah kode. Fokus kali ini integritas pengambilan data, konsumen/UI, status sumber, radar, dan race request. Jangan mengubah PPT/esai, merombak desain, atau membangun ulang proyek.

### Aturan kerja wajib

1. Catat status Git dan diff awal. Ada pekerjaan pengguna yang belum di-commit; jangan reset, checkout ulang, menghapus file, atau menimpa perubahan yang tidak terkait.
2. Buat daftar fungsi/menu, sumber, ID registry, rute dan consumer sebelum perubahan. Pertahankan seluruh sumber/model yang sudah terdaftar, termasuk CMA/JMA/BoM, MET, CAMS, BMKG/USGS, FIRMS, traffic, GIBS/RainViewer, STAC dan jalur raster yang ada. Jangan mengurangi jumlah sumber agar audit tampak hijau.
3. Nama menu tetap “Peta Cuaca”. Pertahankan penempatan menu terpusat; jangan mengembalikan tombol floating duplikat. Pertahankan peta 2D/3D, Studio, katalog, pengukuran, LST dan pembatalan analisis.
4. HTTP 200, Promise fulfilled, JSON dapat dibaca, atau API key tercantum tidak otomatis berarti produk tersedia. Validasi payload dan cakupan produk sebelum status sukses.
5. Jangan membuat angka contoh/default/random sebagai data nyata. Bedakan null, nol sah, EMPTY sah, PARTIAL, STALE, FAILED, NOT_CONFIGURED, cache dan CANCELLED. Pemetaan ke enum yang ada harus dijelaskan; hindari enum paralel yang saling bertentangan.
6. Jangan menampilkan atau menulis key, token, signed URL lengkap, isi .env, maupun header rahasia dalam log/bukti. Jangan mengganti kredensial atau deploy otomatis.
7. Penyedia hanya diganti jika ada bukti resmi bahwa layanan sudah dihentikan atau tidak dapat memenuhi kebutuhan. CMA/JMA pada audit ini masih merespons sah: perbaiki validatornya.
8. Jumlah sumber atau konsensus tidak membuktikan akurasi ramalan. Pertahankan `accuracyValidated: false` sampai ada validasi lapangan terdokumentasi. Jangan mengaku seluruh bumi/negara terpantau hanya dari probe beberapa lokasi.

### Rencana dan urutan implementasi

**Tahap A — periksa dan buat kontrak bersama.** Petakan request → validasi → normalisasi → agregasi → telemetry → UI. Gunakan fungsi murni bersama untuk normalisasi waktu/satuan/null, lokasi query, identitas model, freshness dan cakupan. Hindari validator audit longgar yang berbeda dari validator data produk.

Setiap hasil setidaknya memiliki identitas query/lokasi/model/produk, request/generation ID, issuedAt bila tersedia, validTime/interval, fetchedAt dan lastSuccessfulFetchAt, accepted/rejected counts, asal cache, retrievalAttempt aktual, status/kualitas produk, serta alasan kekurangan. Sesuaikan struktur yang sudah ada; jangan memaksa refactor besar jika adapter kecil cukup.

**Tahap B — selesaikan masalah C, B, A dan D terlebih dahulu.**

- Normalisasi respons satu model `temperature_2m` dan multi-model bersufiks berdasarkan query. Jangan menerima `temperature_2m` dari respons sembarang model tanpa hubungan dengan request. ISO/epoch dinormalisasi secara eksplisit mengikuti timezone/unit metadata; array waktunya harus valid dan selaras.
- CMA/JMA/BoM memakai parser yang sama dengan agregator. Respons nyata CMA/JMA di bukti harus diterima setelah validasi; fixture waktu rusak harus gagal.
- Jalur fallback tetap membawa model/udara yang berhasil, tetapi alignment lokasi, valid time, age, satuan dan toleransinya harus sama ketat dengan jalur utama. Data udara 30 hari jangan masuk current; pertahankan sebagai riwayat jika produk mendukungnya.
- `conditionCode` nullable pada hourly maupun current. Pisahkan `surfacePressure` dan `seaLevelPressure`; jangan menyamakan melalui label generik. Jelaskan jenis tekanan pada UI/grafik. Jangan mengonversi tanpa informasi ketinggian/metode yang sah.
- Ringkasan UI mengabaikan sampel null untuk perhitungan, tetapi tetap mengukur kelengkapan interval. Seluruh hujan null berarti “Data hujan belum tersedia”, bukan nol atau kering. Nol sah dengan cakupan memadai boleh dijelaskan sebagai tidak ada hujan dalam interval tersebut.
- Probabilitas kosong tidak boleh menghasilkan `%` tanpa angka. Kolom hujan kosong tidak boleh menghasilkan `Hujan: mm`. Nilai apparent kosong tidak boleh memberi badge Hangat. Awan kosong tidak boleh menjadi 25%.
- Pilih titik dengan timestamp penuh, tanggal dan timezone wilayah. Jangan memakai `find(hour)` yang ambigu antarhari atau label “saat ini” untuk prakiraan besok. Ringkasan dibatasi hari/interval terpilih; jangan mengatakan pagi/malam lebih sejuk hanya dari dua titik malam.
- Perbarui status setiap model yang diminta untuk query baru, termasuk yang hilang. Status query A tidak menjadi status query B. Simpan riwayat secara terpisah, dan cegah respons A terlambat menimpa query B.
- Jangan menimpa attempt PARTIAL MET menjadi ONLINE penuh karena fallback dipakai. Pisahkan ketersediaan forecast dan current. Status agregat harus mempertahankan kegagalan model/produk penyusunnya.
- Badge key menunjukkan hasil pemeriksaan backend yang aman; jika belum diperiksa, tulis belum diperiksa. Registry hanya menjelaskan kebutuhan/configuration intent, bukan membuktikan key valid. Hitung produk/sumber unik berdasarkan pemetaan yang jelas, bukan menjumlahkan deskriptor dan retry.

**Tahap C — perbaiki MET, parsing dan recovery.**

- Gunakan kontrak validasi MET yang sama pada ingestion dan audit manual. `[{}]` bukan prakiraan usable. Jika sebagian titik invalid, simpan yang valid dan catat rejection/coverage sebagai PARTIAL.
- Tentukan freshness issue time dan valid time secara terpisah. Model issue 2020 tidak menjadi current sah karena mempunyai timestamp titik sekarang. Bedakan pengambilan baru dengan prakiraan lama dari cache.
- Catat HTTP aktual, termasuk 203, dan ukuran UTF-8 aktual. Response cache menyimpan waktu sukses jaringan sebelumnya; akses cache bukan successful retrieval baru. Boleh mencatat cacheCheckedAt terpisah.
- Tambahkan timeout/cancellation yang terikat request, deduplikasi in-flight dan revalidasi cache. Bila menggunakan proxy backend, ikuti pola rute/proxy yang sudah ada dan tetap validasi lokasi/input/response. Jangan menjadikan proxy terbuka untuk URL bebas.
- Periksa aturan resmi MET terkait identifikasi klien, caching/Expires/Last-Modified, rate limit dan 203. Pakai identitas kontak yang benar milik proyek; jangan mengarang alamat email.
- BMKG memakai parser numeric grammar resmi: boleh format satuan yang dikenal, tidak boleh `foo2.1bar` atau `-7junk`. Kalender, offset lokal, koordinat, magnitudo, kedalaman dan skema produk diuji melalui parser bersama.
- Recovery model menggunakan hint terverifikasi lalu retry bounded per kelompok/model sesuai anggaran request. Error tak dikenal jangan otomatis menyalahkan BoM. Beberapa kegagalan, 429 dan timeout tetap tercatat per model; hasil parsial yang valid dipertahankan.

**Tahap D — radar dan GIBS.**

- Simpan identitas tile/provider/frame/z/x/y dan generasi viewport. Hitung required tiles dari extent/zoom aktif, dengan penanganan wrap/extent sesuai peta; tile cache sah juga dihitung.
- Event lama dari frame/viewport/layer yang telah diganti tidak masuk coverage aktif. Moveend jangan hanya menghapus counter setelah tile selesai lalu memakai sejarah sebagai pengganti.
- Tanpa coverage aktif yang diketahui, status memuat/belum tersedia; bukan LIVE berdasarkan historicalLoaded. Satu sukses + dua gagal adalah partial, semua gagal unavailable, seluruh required tile sah baru sukses. Metadata/frame yang stale tetap stale walaupun tile selesai diunduh.
- Gabungkan signal controller dan timeout pada fetch GIBS. Guard generasi sebelum semua commit state; respons lama dan response setelah unmount diabaikan. Abort tidak menjadi kegagalan provider palsu.
- GetCapabilities parsing harus memastikan Default milik layer yang dipilih, kalender/timezone sah, dan metadata/frame freshness terpisah. Frame timestamp berasal dari penyedia, bukan now-minus-N.

**Tahap E — diagnosis produksi dan pelaporan.**

- Periksa entrypoint/routing/build configuration lokal untuk `/api/spatial/*`, kemudian cocokkan deployment ID/commit/build logs jika akses resmi tersedia. Jika tidak, tulis penyebab belum terkonfirmasi. Jangan menyimpulkan commit lama/key expired dari 404 HTML saja.
- Pastikan proxy tidak meneruskan HTML 404 sebagai JSON sukses. NOT_CONFIGURED, key invalid, rate limit, timeout, payload invalid dan provider unavailable memiliki alasan berbeda. Local route 200 NOT_CONFIGURED bukan keberhasilan ingestion.
- Jangan deploy, mengganti key, atau mengubah layanan produksi tanpa instruksi pengguna. Siapkan diagnosis dan perubahan lokal yang dapat direview.

### Berkas yang perlu diperiksa, bukan izin mengubah semuanya

- `apps/web/src/services/weatherAggregatorService.ts`
- `apps/web/src/services/weatherDataIntegrity.ts`
- `apps/web/src/services/metNorwayService.ts`
- `apps/web/src/services/geospatialDataTelemetryService.ts`
- `apps/web/src/services/geospatial/apiHealthService.ts`
- `apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx`
- `apps/web/src/components/dashboard/views/spatial/charts/HarmonyChartEngine.tsx`
- `apps/web/src/components/dashboard/views/spatial/MapsView.tsx`
- `apps/web/src/components/common/DataSourceProvenanceModal.tsx`
- Registry sumber, rute API/proxy, entrypoint serverless dan konfigurasi Vercel yang benar-benar berkaitan.

Pertahankan STAC/LST/rasterReader yang sudah berhasil kecuali ada dependensi konkret yang harus diubah. Sebelum menghapus kode, daftar fungsi/caller yang digantikan dan buktikan penggantinya mempertahankan perilaku penting. Hapus hanya default buatan, override status salah, atau duplikasi yang terbukti tidak diperlukan; jangan menghapus provider/menu.

### Pengujian penerimaan yang wajib dan bermakna

1. Replay body nyata CMA/JMA ke parser/audit; single-model diterima, timestamp invalid ditolak. Tambahkan multi-model, ISO, epoch, offset lokal, unit/lokasi salah dan panjang array tidak selaras.
2. Browser: seluruh hujan/probabilitas null; current null; titik hanya besok; awan null; nilai nol sah. Periksa teks, badge, selector dan grafik, bukan hanya JSON service. Tidak ada klaim kering/Hangat/today palsu atau unit tanpa angka.
3. Fallback MET + udara 30 hari; fallback dengan udara sah aligned; simbol kosong; sea-level pressure saja. Data sah tetap terlihat, data lama/tidak sejenis tidak menjadi current.
4. Query A sembilan model → B satu model → respons A terlambat. Status B tidak mewarisi delapan model A. Test fallback current null tetap partial dan inventory tetap lengkap.
5. MET old issue, satu valid+satu invalid, seluruh invalid, HTTP 203, Unicode byte count, cache hit, conditional revalidation, timeout, pre-abort dan dua caller bersamaan. Cek provenance dan rejected count, bukan sekadar promise resolve.
6. BMKG format resmi valid termasuk kedalaman km/offset lokal, numeric junk, kalender mustahil. Audit dan produk harus sepakat.
7. Recovery exact ID, nama ramah, pesan tak dikenal, dua model gagal, 429, semua gagal. Model sukses tetap dipakai dan model gagal tetap tercatat.
8. Radar viewport A sukses → viewport B gagal; viewport cache valid; late error/success dari A; ganti frame/layer; partial satu sukses dua gagal. Gunakan identitas tile nyata pada fake source dan minimal satu pemeriksaan browser, bukan counter tanpa scope.
9. GIBS respons B baru datang dahulu lalu A lama; abort/unmount; Default salah layer; invalid/stale frame. Final state tidak boleh mundur karena race.
10. Regresi LST 49 piksel fixture, resolver S3, scene ID mismatch, cancellation/retry, metadata thermal/QA, serta fungsi peta/menu utama. Jangan menyatakan fixture sebagai live suhu bumi.
11. Rute spatial: 404 HTML, NOT_CONFIGURED, key ditolak, upstream valid, valid EMPTY dan mixed invalid. API key diperlakukan rahasia. Probe nyata hanya read-only, dengan timeout dan frekuensi wajar.
12. Jalankan suite yang relevan, typecheck dan build. Bila menjalankan full npm test, periksa dulu efek samping/storage dan gunakan lingkungan terisolasi. Laporkan jumlah kasus/grup per suite dan exit code sesuai log; jangan menyalin angka 85/20 dari laporan sebelumnya.

Simpan bukti baru pada folder tahap 10 yang terpisah; jangan menimpa bukti baseline atau berkas pemeriksaan independen. Pisahkan source inspection, fixture, browser fixture, live probe dan deployment evidence. Jangan membuat assertion yang hanya mencari string pada source untuk menyatakan aliran data bekerja.

### Hasil akhir yang harus diserahkan Gemini

1. Daftar perubahan per berkas: masalah, perbaikan, yang ditambah/dihapus, alasan, dan fitur penting yang dipertahankan.
2. Tabel sebelum/sesudah untuk temuan A–J dengan referensi bukti. Temuan yang belum terselesaikan harus tetap tercatat.
3. Matriks sumber/model sebelum/sesudah: inventory, last attempt, lokasi/query, valid time, freshness dan alasan kegagalan. Jangan menyatakan semua hijau bila key/penyedia/route belum tersedia.
4. Hasil pengujian dan screenshot UI cuaca/radar/audit setelah perbaikan; jelaskan mana fixture dan mana live.
5. Diagnosis produksi dengan bukti deployment jika tersedia, atau batas yang belum dapat dibuktikan.

Selesai berarti data dan statusnya konsisten pada skenario yang diuji, fitur lama tetap bekerja, serta keterbatasan eksternal dinyatakan jujur. Tidak ada janji seluruh request akan selalu berhasil: bila upstream gagal, pulihkan melalui cara yang sah atau tampilkan kegagalannya dengan benar.

## 6. Referensi penyedia

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): gunakan kontrak query, waktu, unit dan variabel pressure yang sesuai. Bukti bentuk single-model dalam review ini berasal dari respons nyata yang tersimpan, bukan asumsi dokumentasi.
- [MET Norway Terms of Service](https://api.met.no/doc/TermsOfService): periksa identifikasi klien, aturan cache, rate limit dan respons deprecation sebelum membuat proxy/cache. Rincian implementasi harus mengikuti dokumentasi terbaru.

---

Review ini menyiapkan perbaikan untuk Gemini; tidak menyatakan seluruh aplikasi telah diperbaiki atau tervalidasi.
