# Harmony — Review remediasi tahap 8 dan prompt perbaikan tahap 9

Tanggal pemeriksaan: **4 Oktober 2026, WIB**. Bukti JSON memakai UTC; waktu `2026-10-03T22:xx:xxZ` adalah pagi **4 Oktober** di Indonesia.

## 1. Kesimpulan pemeriksaan independen

Perbaikan tahap 8 membantu, tetapi klaim bahwa seluruh P0/P1 sudah selesai belum didukung oleh perilaku kode saat ini. Masalah terbesar justru berada pada normalisasi **cuaca cadangan**: apabila MET Norway tidak memiliki titik waktu sekarang, Harmony menghasilkan suhu 28°C, kelembapan 60%, tekanan 1012 hPa, dan nilai lain yang tidak berasal dari respons penyedia. Metadata pengambilannya juga memuat ukuran dan durasi tetap.

Saya tidak mengubah kode aplikasi, konfigurasi, kredensial, atau deployment. Hasil tugas ini adalah review, bukti pemeriksaan terpisah, dan prompt implementasi untuk Gemini.

### Perbaikan yang terbukti bekerja

1. **Loading LST pulih setelah pindah koleksi.** Di browser lokal, analisis yang sedang berjalan dibatalkan; tombol dapat dipakai kembali tanpa reload. Hasil permintaan lama tidak muncul kembali.
2. **Handler LST memanggil resolver dua kali.** Alur S3 → resolver → aset HTTPS → pembacaan raster berjalan dengan fixture independen. Hasilnya `DERIVED`, 29,66°C, 49 piksel valid. Angka tersebut adalah nilai fixture, bukan pengamatan bumi.
3. Lima respons cacat sebelumnya—udara tanpa koordinat, elevasi tanpa koordinat, tanggal BMKG 30 Februari, BMKG tanpa parameter, dan FIRMS tanpa keterangan akuisisi—sekarang ditolak dari `ONLINE`.
4. MET menolak contoh tahun 2020, nilai fisik ekstrem yang diuji sebelumnya, dan respons koordinat 0/0 untuk lokasi Indonesia.
5. Fallback MET sudah dipanggil ketika cuaca utama gagal. **Pemanggilan sudah tersambung; isi hasilnya masih bermasalah.**
6. Saat fixture kegagalan disebabkan BoM, retry tanpa BoM menghasilkan delapan model. Ini belum menjadi mekanisme pemulihan untuk sembarang model yang gagal.
7. **MET Norway nyata berhasil diakses melalui service aplikasi di browser lokal**: 89 titik prakiraan, dengan waktu provider dan titik waktu sekarang yang tersedia. Tidak ada dasar untuk mengatakan penyedia MET sudah mati atau seluruh akses browsernya gagal.
8. Sebelas suite terarah, total **144 kasus/kelompok uji**, lulus; typecheck lulus. Pemeriksaan ini bukan pengulangan penuh `npm test` atau build produksi. Kelulusan suite yang ada belum mencakup celah baru berikut.

## 2. Temuan yang masih harus diperbaiki

| Prioritas | Lokasi utama | Masalah yang dibuktikan | Perilaku yang diperlukan |
|---|---|---|---|
| P0 | `weatherAggregatorService.ts`, blok fallback sekitar 246–339 | `met.success=true`, `current=null` menghasilkan cuaca saat ini dengan angka bawaan dan waktu saat ini | Tidak membuat pengukuran/prakiraan saat ini jika titik waktunya tidak ada; tampilkan kosong/tidak tersedia atau cache sah yang diberi status |
| P0 | Blok fallback yang sama | `latencyMs:120`, `payloadBytes:1024`, HTTP 200/500 dibentuk dari boolean, bukan respons; jalur catch memakai durasi 100 | Metadata berasal dari request nyata; HTTP null pada kegagalan sebelum respons; cache tidak dianggap download baru |
| P0 | Normalisasi fallback | Tekanan permukaan laut MET dimasukkan ke kolom tekanan permukaan; hujan/gusts kosong menjadi 0; kode cuaca selalu 1 | Pertahankan arti, satuan, waktu, interval, dan nilai null tiap variabel |
| P0 | Fallback ketika hanya cuaca utama gagal | Sembilan model dan PM2.5 berhasil diambil dalam fixture, tetapi output menghapus semua model dan PM2.5 | Pertahankan masukan sumber lain yang valid dan selaras; kegagalan satu sumber tidak mengosongkan sumber yang berhasil |
| P0 | `DataSourceProvenanceModal.tsx` sekitar 151–154, 462–465 | Jumlah online nol kembali ke angka descriptor 7; kredensial tetap berasal dari `apiKeyStatus` statis | Jumlah terverifikasi nol harus tetap nol; status kredensial membutuhkan hasil backend, bukan descriptor |
| P0 | Modal sumber, mapping sekitar 85–101 | BoM, CMA, JMA memakai satu status endpoint model gabungan | Status per produk/model harus berdasarkan data model tersebut, bukan keberhasilan model lain |
| P0 | `geospatialDataTelemetryService.ts`, validator BMKG/FIRMS | BMKG koordinat `999,999`, magnitudo `abc`, kedalaman `nonsense` → `ONLINE`; FIRMS tanggal `not-a-date`/jam `9999` → `ONLINE` | Parse dan validasi nilai sebenarnya; tanggal/jam yang sekadar tidak kosong bukan bukti validitas |
| P1 | Validator BMKG di telemetry dan `apiHealthService.ts` | Tanggal lokal sah `2026-10-04T06:30:00+07:00` ditolak karena tanggal UTC berbeda hari | Validasi kalender pada komponen tanggal lokal, kemudian konversikan offset; jangan membandingkan hari lokal dengan hari UTC |
| P1 | Validator FIRMS di telemetry | Campuran satu record valid dan satu invalid membuat seluruh sumber `OFFLINE` | Simpan record valid, laporkan `PARTIAL` dan jumlah ditolak; nol hasil sah berbeda dari semua record ditolak |
| P0 | Validator retry model sekitar 235–240 | Respons model koordinat London diterima untuk query Indonesia dan menghasilkan delapan model | Retry harus memakai kontrak lokasi/waktu/unit yang sama ketatnya dengan request awal |
| P1 | Retry model sekitar 229–244 | Saat CMA yang gagal, kedua request masih berisi CMA; seluruh model tersisa hilang | Pemulihan terbatas yang dapat mengisolasi model mana pun; BoM tidak otomatis dihapus tanpa bukti |
| P1 | `MapsView.tsx`, listener tile sekitar 3985–4012 dan status sekitar 4078–4087 | Counter tetap kumulatif; aturan `error > loaded` hanya mengubah ambang | Nilai status dihitung dari tile yang diperlukan viewport dan frame aktif, bukan riwayat sepanjang umur source |
| P1 | `metNorwayService.ts` | Geometry hilang, unit Fahrenheit/km/h, dan `updated_at='not-a-date'` masih diterima | Validasi metadata, koordinat, satuan, waktu penerbitan, dan rentang forecast dengan kontrak eksplisit |
| P1 | Service MET dan alur fallback | Masih request langsung frontend, tanpa deadline internal atau route/cache backend; kontak `support@harmony.ac.id` tidak terbukti milik proyek | Gunakan identitas nyata dari konfigurasi dan adapter backend dengan deadline/cache; jangan mengarang kontak |
| P1 | `stacService.ts`, resolver sekitar 303–340 | Item yang dikembalikan memiliki ID berbeda, tetapi asetnya diterima dan `isSigned=true` | Verifikasi identitas item/band sebelum memakai aset; status signed berdasarkan operasi/URL sebenarnya |
| P1 | `MapsView.tsx`, GIBS sekitar 3952–3957 | Waktu frame diperkirakan dari jam lokal minus 30 menit, bukan daftar frame yang tersedia | Pilih frame tersedia dari metadata provider; tampilkan umur frame dan tangani gap dengan jujur |
| P1 | Produksi `/api/spatial/*` | Hotspots dan traffic masih 404 HTML; tidak ada bukti rute tersebut berfungsi penuh pada deployment | Periksa versi deployment, entrypoint, route, log, serta kredensial secara terpisah; jangan menyimpulkan penyebab tunggal tanpa bukti |

### 2.1 Angka buatan pada fallback

Dalam uji independen, response MET hanya berisi titik **24 jam di masa depan**. Service mengembalikan `success=true` dengan `current=null`. Aggregator tetap mengembalikan:

```text
dataStatus: PARTIAL
consensusTemperature: 28
humidity: 60
precipitation: 0
cloudCover: 50
pressure: 1012
windSpeed: 10
windDirection: 0
windGusts: 0
conditionCode: 1
conditionText: Cerah Berawan (MET Norway)
dataTime: waktu saat pemanggilan
```

Status `PARTIAL` tidak membuat angka tersebut menjadi sah. Suhu, arah angin, hujan, dan waktu harus dapat ditelusuri ke titik data provider.

Ketika titik saat ini valid, masalah lain tetap ada: suhu aktual fixture 17°C disalin menjadi apparent temperature serta minimum/maksimum tanpa definisi perhitungannya; hujan yang tidak diberikan menjadi 0, gusts menjadi 0, kode cuaca tetap 1, dan tekanan permukaan laut 1005 hPa diperlakukan sebagai tekanan permukaan. Nilai yang dapat dihitung secara ilmiah boleh disediakan sebagai **hasil turunan**, dengan rumus, input wajib, dan labelnya; tidak boleh sekadar menyalin nilai agar semua kolom penuh.

`hourly.label` saat ini dibuat dari indeks `00:00`, `01:00`, dan seterusnya, bukan jam titik provider. MET tidak selalu memiliki interval satu jam untuk seluruh horizon. Ini dapat mengubah maksud waktu pada grafik.

### 2.2 Audit sumber yang belum sesuai runtime

Ekspresi jumlah stream saat ini:

```ts
verifiedOnlineCount > 0
  ? verifiedOnlineCount
  : DATA_SOURCES_REGISTRY.filter(s => s.isLiveConnected).length
```

Uji kode menghasilkan **7** saat seluruh endpoint `UNCHECKED` maupun `OFFLINE`. Di browser dengan gangguan sumber yang sengaja disimulasikan, modal juga menampilkan **7 Stream Operasional**, sementara beberapa kartu menampilkan **Gagal Mengambil Data**.

Mapping model gabungan memiliki masalah berbeda: satu endpoint `open_meteo_models=ONLINE` membuat BoM, CMA, dan JMA sama-sama mendapat status online. Padahal validator endpoint hanya membutuhkan setidaknya satu array suhu model. Keberhasilan request gabungan tidak membuktikan setiap model berhasil.

Descriptor tetap bermanfaat untuk menjelaskan lembaga, produk, metode, dan kebutuhan API key. Descriptor tidak boleh menjadi fallback bagi bukti pengambilan data.

### 2.3 Radar belum memakai viewport aktif

Listener sekarang masih menambahkan `requested`, `loaded`, `error` tanpa identitas tile atau perhitungan ulang saat viewport bergerak.

| Skenario | Hasil kode saat ini | Hasil yang diperlukan |
|---|---|---|
| 100 tile lama sukses; 20 tile pada viewport baru semuanya gagal | `PARSIAL` | Tidak tersedia pada viewport baru |
| 1 tile aktif sukses; 2 tile aktif gagal | `UNAVAILABLE` | Parsial, karena sebagian masih tersedia |
| 20 tile lama gagal; 3 tile pada viewport baru seluruhnya sukses | `UNAVAILABLE` | Berhasil untuk viewport baru, jika frame dan metadata masih valid |

Kelulusan tiga kombinasi counter dalam runner tahap 8 hanya membuktikan hasil ekspresi untuk angka tersebut. Runner tidak menyediakan identitas tile, perubahan extent, cache hit, atau event tile lama; karena itu tidak membuktikan evaluasi viewport aktif.

### 2.4 Hasil pemeriksaan layanan nyata

- Situs utama publik: HTTP 200.
- Endpoint aplikasi BMKG yang benar, `/api/bmkg/gempa/autogempa`: HTTP 200 JSON dan `success=true`.
- `/api/spatial/hotspots?...`: HTTP 404 HTML.
- `/api/spatial/traffic/flow?...`: HTTP 404 HTML.
- MET Norway: HTTP 200, 89 titik prakiraan. Service yang dipanggil dari browser juga berhasil. Header yang terlihat pada request browser adalah User-Agent browser, sehingga string kontak di kode tidak membuktikan identifikasi tersebut benar-benar dikirim.
- RainViewer: metadata HTTP 200; 13 frame radar sebelumnya, 0 frame infrared satelit dalam respons yang diperiksa.
- NASA GIBS: GetCapabilities HTTP 200; layer terkait tersedia, `GoogleMapsCompatible_Level6`, dan default terbaru pada pemeriksaan adalah **2026-10-03T21:30:00Z**. Daftar waktunya memiliki gap. Menghitung `Date.now()-30 menit` bukan cara membuktikan suatu frame tersedia.

Tidak ditemukan bukti bahwa API key FIRMS/TomTom expired, karena request produksi belum mencapai respons adapter yang dapat menjelaskan status key. Keberadaan route di source membuktikan route ditulis; belum membuktikan route dipublikasikan atau berhasil mengambil data provider.

Dokumentasi MET meminta identifikasi yang dapat dihubungi serta cache/revalidasi sesuai header, dan menyarankan proxy backend untuk aplikasi. Browser sederhana bisa mengakses API dalam kondisi yang diperbolehkan; hasil browser sukses di atas tidak boleh dilaporkan sebagai kegagalan CORS. [Ketentuan resmi MET Norway](https://api.met.no/doc/TermsOfService).

Metadata waktu, format, dan matrix GIBS harus mengikuti layer yang tersedia pada layanan. [Dokumentasi akses NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).

## 3. Bukti dan batas pemeriksaan

Folder bukti baru:

`D:/Blender/test 1/harmony-web-check/2026-10-04-ninth-remediation-review/`

| Berkas | Isi dan ruang lingkup |
|---|---|
| `stage8-reproductions.json` | Pengulangan 14 skenario lama pada source saat ini; respons fixture, bukan observasi bumi |
| `stage9-reproductions.json` | 20 skenario tambahan menggunakan service/ekspresi dari source sebenarnya; termasuk fallback, metadata, model, modal, resolver, dan radar |
| `browser-stage9.json` | Browser UI lokal: modal sumber, kontrol positif TIFF, cancel koleksi, dan S3 melalui resolver; jaringan STAC/TIFF berupa fixture independen |
| `browser-met-live.json` | Service MET sebenarnya di browser dengan respons provider nyata; bukan fixture MET |
| `live-provider-probes.json` | Pemeriksaan HTTP publik dengan URL, waktu, dan status yang dapat ditelusuri |
| `verification-summary.json` | Sebelas suite terarah dan typecheck; seluruh exit code 0 |
| `stage8-source-manifest.json` | Hash 11 source yang diaudit, sebelum pengulangan pemeriksaan |
| `stage9-source-integrity-final.json` | Pemeriksaan akhir bahwa source pada manifest tidak diubah oleh audit ini |

Screenshot browser disimpan terpisah di `D:/Blender/test 1/output/playwright/`: `stage9-source-modal.png`, `stage9-lst-after-cancel.png`, `stage9-lst-resolved.png`.

Pemeriksaan ini belum membuktikan pembacaan raster Landsat penuh dengan ukuran asli, semua layanan berkredensial pada produksi, semua negara/lokasi, atau akurasi ramalan terhadap pengamatan. Fixture tidak boleh dihitung sebagai sumber live. Laporan Gemini tentang build/npm test dibaca sebagai laporan pihak pelaksana; yang dijalankan ulang di review ini adalah cakupan yang tercatat di tabel.

---

# PROMPT UNTUK GEMINI — TAHAP 9

## A. Tugas, urutan kerja, dan bagian yang harus dipertahankan

Perbaiki repositori `D:/vscode/Harmony` berdasarkan review di atas. Fokus pada integritas data dan perilaku fitur yang benar-benar dipakai pengguna.

Sebelum mengedit, baca source terkini, perubahan yang belum dikomit, bukti tahap 9, dan pengujian terkait. Buat rencana singkat dengan daftar file, kontrak yang akan berubah, dan konsumen yang harus disesuaikan. Implementasikan perbaikan bertahap, kemudian verifikasi. Hindari penulisan ulang besar yang tidak diperlukan.

1. Pertahankan seluruh **15 domain Studio**, seluruh **16 ID sumber registry** yang sekarang ada, semua sumber model yang terdaftar, mode 2D/3D, AOI, katalog, LST, cuaca, kualitas udara, gempa, hotspot, lalu lintas, ekspor, serta menu peta. Adapter baru boleh ditambahkan tanpa menghapus sumber lama yang penting.
2. Pertahankan label pengguna **“Peta Cuaca”** dan penempatan menu dalam panel terpusat. Jangan menambahkan tombol duplikat di depan peta.
3. Pertahankan perbaikan loading LST, guard generasi request, endian, Predictor, CRS, QA, dan pemanggilan resolver yang sekarang sudah bekerja.
4. Jangan menambahkan nilai default pengamatan, timestamp observasi sekarang, confidence buatan, data demo pada mode operasional, atau status sukses hanya karena promise selesai/HTTP 200.
5. Jangan menghapus sumber yang sedang gagal demi membuat audit hijau. Diagnosa jaringan, HTTP, rate limit, kredensial, schema, lokasi, waktu, unit, serta ketersediaan produk. Jika penyedia benar-benar mengakhiri suatu produk, buktikan dengan dokumentasi/response dan gunakan pengganti setara dengan provenance baru. Jangan mengganti seluruh penyedia karena satu route belum ter-deploy.
6. Jangan mengubah test menjadi sekadar menerima perilaku implementasi yang salah. Jangan membuat aturan khusus angka fixture, nama provider gagal tertentu, atau jumlah stream tetap.
7. Jangan menimpa bukti dan review tahap sebelumnya. Simpan hasil baru ke folder/berkas tahap 9 dengan penjelasan fixture versus live. Jangan mengubah konfigurasi kredensial/deploy tanpa kebutuhan dan otorisasi yang jelas; pekerjaan kode serta konfigurasi usulan harus tetap dapat ditinjau.

Urutan implementasi:

1. Kontrak nilai yang bisa tidak tersedia dan metadata request yang faktual.
2. Adapter MET serta penggabungan fallback tanpa kehilangan sumber lain.
3. Validator produk bersama dan status sumber per query/produk.
4. Retry model umum serta audit hasil pemulihannya.
5. Tile viewport radar dan frame GIBS yang tersedia.
6. Ketepatan resolver/raster, pemeriksaan produksi, dan regresi konsumen UI.

## B. Perbaiki kontrak cuaca dan hilangkan angka buatan

File awal: `apps/web/src/services/weatherAggregatorService.ts`, `weatherDataIntegrity.ts`, `metNorwayService.ts`, lalu semua UI dan mesin analisis yang memakai `WeatherConsensusData`.

### Nilai saat ini

1. Hapus fallback numerik `?? 28`, `?? 60`, `?? 50`, `?? 1012`, `?? 10`, dan angka lain yang digunakan untuk mengganti variabel cuaca yang tidak tersedia. Jangan menggantinya dengan angka default berbeda.
2. Jika `met.current=null`, jangan membuat blok current dengan waktu sekarang. Boleh mengembalikan forecast masa depan tanpa current melalui kontrak yang membedakan keduanya, atau hasil tidak tersedia/stale cache yang eksplisit. Current dan forecast mempunyai waktu berlaku sendiri.
3. Tambahkan nullable/discriminated state pada kontrak secara terencana. Jangan memakai `as any`, non-null assertion, atau default 0 untuk menutupi konsumen yang belum mendukung null.
4. Telusuri semua pemakai: kartu cuaca, tabel, grafik, ringkasan AI, ekspor, thermodynamics, penilaian risiko, rute, dan telemetry. Nilai null ditampilkan sebagai “Tidak tersedia” atau garis kosong yang jelas. Grafik tidak menyambung gap seolah ada data. Analisis yang kehilangan input wajib harus melaporkan data belum cukup dan tidak menghasilkan angka turunannya.
5. Nilai **0 yang benar-benar dikirim penyedia** harus tetap 0. Bedakan tidak ada hujan terukur dari data hujan tidak tersedia, serta angin tenang dari kecepatan angin tidak tersedia.
6. Jangan menyamakan suhu biasa dengan apparent temperature. Apparent temperature boleh dihitung dengan metode terdefinisi dan input lengkap, diberi label turunan. Minimum/maksimum harian harus dihitung dari horizon hari yang benar; rentang antarmodel diberi nama berbeda.
7. Hapus `conditionCode:1` dan “Cerah Berawan” tetap. Mapping symbol MET harus terdokumentasi atau tampilkan label provider; symbol tidak tersedia tetap unknown. Jangan menciptakan symbol `cloudy` saat provider tidak menyediakannya.

### Tekanan dan interval

1. `air_pressure_at_sea_level` adalah tekanan permukaan laut; jangan masukkan langsung ke `surface_pressure` atau input thermodynamics yang membutuhkan tekanan di permukaan lokasi.
2. Simpan variabel tekanan dengan jenis/unit eksplisit. Jika pressure permukaan tidak tersedia, null. Konversi hanya dilakukan dengan model, elevasi, suhu, dan asumsi yang cukup serta provenance turunan.
3. `next_1_hours.precipitation_amount` merupakan akumulasi forecast interval tersebut. `next_6_hours` tidak boleh otomatis dilabeli hujan satu jam atau dibagi merata tanpa metode yang sah. Simpan awal/akhir interval dan bedakan forecast dengan current observation.
4. `hour`, `label`, dan urutan grafik berasal dari epoch/timestamp provider dalam timezone yang dipilih, bukan indeks array. Interval tiga/enam jam tidak dipaksa menjadi jam berurutan yang tidak pernah dikirim.
5. `dataTime`, `updatedAt`, `fetchedAt`, waktu tampil/cache, dan waktu berhasil terakhir memiliki arti berbeda. Data yang waktu terbitnya tidak ada tetap null/unknown; jangan memakai waktu sistem sebagai pengganti.

## C. Adapter MET yang faktual dan fallback yang mempertahankan data berhasil

### Transport dan validasi

1. Hubungkan adapter MET backend ke route sebenarnya, lalu frontend menggunakan route tersebut. Jangan sekadar membuat helper yang tidak dipanggil. Cocokkan mount path, apiClient, development proxy, serta entrypoint produksi.
2. Gunakan nama/domain/kontak proyek yang dapat dibuktikan dan dikonfigurasi. Jangan menyebut `support@harmony.ac.id` “resmi” tanpa bukti. Jangan menaruh key rahasia di frontend. MET sedang berfungsi pada pemeriksaan ini; perpindahan transport tidak boleh menghapus kemampuan yang sudah bekerja.
3. Gunakan batas waktu keseluruhan serta cancellation yang diteruskan. Hormati Expires/Last-Modified/If-Modified-Since, tangani 304 dan 429, cache per query koordinat, serta cegah request bersamaan berulang yang identik. Retry terbatas; jangan melakukan polling berlebihan.
4. Geometry wajib sah atau ketiadaannya diklasifikasikan jelas sehingga tidak lolos sebagai data lokasi terverifikasi. Koordinat memakai kontrak provider/grid dan domain geografis yang benar, termasuk batas kutub serta antimeridian.
5. Baca unit provider. Terima unit yang sesuai atau konversikan dengan metode eksplisit. Payload Fahrenheit tidak boleh dilabeli Celsius; wind km/h tidak dikalikan 3,6 lagi. Metadata unit hilang/tidak dikenal harus diberi status sesuai kontrak, bukan dianggap cocok diam-diam.
6. Validasi kalender, ordering, duplikasi, horizon, dan umur data terbit. `not-a-date` bukan updatedAt sah. Jika sebagian titik tidak valid, simpan titik valid dan jumlah ditolak. Jika tidak ada current yang sesuai waktu, jangan membuat current.

### Metadata request

1. Hapus durasi 120/100 dan ukuran 1024 buatan dari aggregator. Adapter mengembalikan attempt metadata dari operasi sebenarnya: waktu mulai/akhir, HTTP status sebenarnya, ukuran payload aktual dengan definisi konsisten, sumber, hasil validasi, request/query identity, dan error yang disanitasi.
2. Jika koneksi gagal sebelum respons, HTTP status null. Provider 403 tetap 403, 429 tetap 429, timeout tetap timeout; jangan meratakan semuanya menjadi 500.
3. Cache hit mencatat bahwa respons berasal dari cache serta waktu pengambilan asli. Jangan menambah bytes download/last successful fetch baru padahal tidak mengunduh. Simpan respons mentah yang disanitasi atau referensi/hash-nya agar angka hasil normalisasi dapat ditelusuri.
4. Jika schema attempt membutuhkan null/field tambahan, ubah kontrak dan semua pengguna secara lengkap, bukan cast.

### Penggabungan

1. Pisahkan pengambilan current weather, model comparison, air quality, serta fallback dari normalisasi akhir. Kegagalan current utama tidak boleh membuat hasil model/CAMS yang berhasil dibuang.
2. Selaraskan titik waktu dan lokasi sebelum menggabungkan. Sumber yang tersedia tetapi tidak cocok waktu/lokasi tetap dicatat dengan alasan, tidak dipakai sebagai nilai current.
3. Pertahankan model comparison, CAMS saat ini/historis, dan attempts yang valid ketika MET digunakan. Jangan menghasilkan `sources` hanya MET jika sumber lain telah menghasilkan masukan yang benar-benar digunakan.
4. Endpoint MET harus tercatat dalam status runtime/query. `met_norway_fallback` sekarang tidak ada pada daftar endpoint telemetry, sehingga attempt MET tidak cukup untuk memperbarui kartu sumber. Perbaiki mapping kontraknya; jangan memalsukan status Open-Meteo sebagai online karena MET sukses.
5. Cache, in-flight deduplication, raw snapshot, export, dan refresh failure tetap konsisten dengan query, sumber, serta generasi request. Kegagalan di lokasi B tidak boleh mengubah hasil lokasi A.

## D. Validator produk bersama, bukan pemeriksaan string tidak kosong

Gunakan kontrak validasi yang sama pada adapter operasional, telemetry/manual audit, dan health. Bedakan reachability endpoint/katalog dengan ketersediaan data produk yang telah diverifikasi.

### BMKG

1. Parse `Coordinates`, lintang/bujur, magnitude, dan depth menjadi nilai valid. Koordinat harus memenuhi rentang geografis, nilai numerik tidak boleh berisi `abc`/`nonsense`. Pertahankan nol yang sah bila definisi produknya mengizinkan.
2. Validasi komponen kalender lokal termasuk bulan, hari/leap year, jam, menit, detik, dan offset sebelum konversi. `2026-10-04T06:30:00+07:00` adalah tanggal sah walau UTC-nya hari sebelumnya. Jangan membandingkan literal hari lokal dengan `getUTCDate()` setelah offset diterapkan.
3. Pakai parsing tanggal bersama pada frontend/backend/health bila memungkinkan. Bedakan timestamp tidak sah, data lama, dan waktu future tidak wajar.
4. Feed historis gempa boleh menampilkan kejadian lama dengan timestamp kejadian; jangan membuatnya menjadi kejadian baru atau menganggap waktu kejadian lama berarti pengambilan feed pasti gagal.

### FIRMS

1. Gabungkan tanggal dan jam akuisisi atau gunakan timestamp canonical adapter yang valid. `acq_date` saja, `acq_time` saja, `not-a-date`, dan `9999` tidak membuktikan waktu deteksi.
2. Dukung nama field raw dan canonical melalui normalisasi terdefinisi, bukan daftar OR string yang sekadar tidak kosong. Validasi source/product, koordinat, bbox, rentang waktu query, kualitas/QA yang diwajibkan produk, serta FRP jika ada.
3. Record valid tetap disimpan ketika record lain ditolak. Laporkan accepted/rejected counts dan `PARTIAL` yang faktual. Semua record ditolak → tidak tersedia/validation failure, bukan zero detections yang dianggap berhasil.
4. Respons kosong yang sah pada area/waktu yang benar → pengambilan berhasil dengan zero detections, bukan error dan bukan jaminan wilayah bebas kebakaran.

### Cuaca, udara, model, dan elevasi

Validator request awal, retry, fallback, dan audit memakai aturan koordinat/waktu/unit yang sama. Jangan memperketat satu jalur sementara retry mengabaikan lokasi. Kontrak toleransi lokasi mengikuti grid/produk dan harus dijelaskan; jangan membuat angka toleransi semata-mata agar fixture lulus.

## E. Status runtime sumber dan kredensial

1. Hapus fallback hitungan ke `isLiveConnected`. `verifiedOnlineCount=0` harus menghasilkan nol terverifikasi. Jangan menggantinya dengan minimal 1 atau nilai descriptor lain.
2. Hitung berdasarkan identitas **produk sumber** yang terpetakan, bukan sekadar jumlah endpoint mentah. Beri status terpisah untuk belum diperiksa, sedang mengambil, tersedia, parsial, stale/cache, unavailable, kredensial belum dikonfigurasi, katalog, dan kebutuhan key yang belum diketahui.
3. Descriptor API-key menyatakan kebutuhan akses; konfigurasi aktual ditentukan oleh laporan backend yang aman. Jangan mengirim key atau potongan key ke browser/log. Backend belum dapat diakses → status konfigurasi unknown, bukan otomatis configured atau not configured.
4. BoM/CMA/JMA memperoleh status per model berdasarkan array/titik yang lolos validasi untuk model tersebut. Keberhasilan ECMWF tidak membuat BoM online. Suhu model tidak membuktikan radar, satelit, angin, lapisan 850 hPa, atau semua parameter lembaga itu sudah diunduh.
5. Bedakan provider asal, gateway distribusi, dataset, produk, dan parameter yang benar-benar dipakai. Koreksi keterangan registry yang melebihkan integrasi nyata tanpa menghapus informasi lembaga/referensi.
6. Sumber katalog yang memang digunakan tetap dapat dilabeli katalog terjangkau; sumber yang belum punya adapter tidak disebut terhubung. Pertahankan 16 ID registry; MET atau provider tambahan dapat dicatat sebagai produk/adapter baru dengan relasi yang jelas.
7. Status runtime disimpan/subscribed per query lokasi/waktu/parameter dan diberi umur pemeriksaan. Respons lokasi lain atau pemeriksaan lama tidak boleh menjadi status global baru bagi lokasi saat ini.

## F. Pemulihan model umum

1. Jangan selalu menghapus `bom_access_global` setelah setiap kegagalan request gabungan. Kegagalan mungkin berasal dari CMA/JMA/model lain, jaringan, rate limit, schema, maupun parameter query.
2. Pakai strategi recovery terbatas: informasi error provider jika cukup jelas; atau pengelompokan/pemisahan dengan batas concurrency, request budget, retry, deadline, serta cancellation. Jangan membanjiri provider dan jangan mengulang terus pada 429.
3. Uji kegagalan model yang berbeda-beda. Tetap coba model yang mungkin sehat, termasuk BoM apabila kegagalan berasal dari model lain. Model yang benar-benar tidak tersedia tetap ditampilkan gagal, dengan alasan spesifik.
4. Retry harus menolak koordinat London untuk query Indonesia. Validasi waktu, unit, panjang seri, dan nilai pada indeks yang sama sebelum memasukkan ke perbandingan.
5. Perbaiki raw snapshot yang masih memakai `modelComparisonResponse: models.data` sesudah recovery. Simpan respons yang benar-benar dipakai (`modelResult`) serta riwayat request awal/recovery dan status per model.
6. Status gabungan bisa parsial walau sebagian besar model sehat. Jangan menetapkan kriteria sukses harus tepat delapan atau sembilan; kriteria berdasarkan produk yang diminta dan data yang benar-benar tersedia.

## G. Radar dan GIBS berdasarkan cakupan/frame aktif

### Radar

1. Hapus aturan `error > loaded` sebagai penentu utama. Jangan menggantinya dengan rasio/ambang fixture yang lain.
2. Identifikasi tile dengan provider, layer/frame, z/x/y, dan generasi viewport. Hitung tile yang diperlukan extent serta resolusi layar sekarang, termasuk tile dari cache. Deduplicate event dan pisahkan pending, loaded, failed, serta empty yang sah.
3. Setelah pan/zoom/frame/layer berubah, status dihitung ulang dari himpunan aktif. Event tile lama tidak mengubah status generasi baru. Transisi view/layer maupun unmount membersihkan listener.
4. Semua tile aktif gagal → unavailable. Sebagian aktif tersedia dan sebagian gagal → partial. Tile aktif lengkap dengan frame/metadata valid → tersedia. Jika masih pending, tampilkan loading/pending yang sesuai. Riwayat berhasil/gagal tetap dapat dicatat sebagai audit terpisah.
5. Metadata radar stale dan keberhasilan tile adalah dua dimensi berbeda. Jangan menyebut live hanya karena gambar lama berhasil dimuat.

### GIBS

1. Ambil availability/Time/Default dari GetCapabilities atau endpoint metadata waktu resmi layer. Hormati gap, cadence, resolusi, matrix, dan format.
2. Pilih frame tersedia yang sesuai pilihan pengguna. Jam lokal minus 30 menit boleh menjadi batas pencarian, bukan timestamp yang diasumsikan tersedia. Jangan mengarang timestamp fallback ketika metadata gagal.
3. Tambahkan refresh tersendiri yang menghormati interval/cache provider, cancellation, dan generasi layer. Jangan mengandalkan perubahan path RainViewer sebagai satu-satunya pemicu pembaruan citra GIBS.
4. Tampilkan waktu akuisisi/frame dan umur frame. Pertahankan frame terakhir yang benar-benar berhasil sebagai stale/cached ketika metadata atau frame berikutnya gagal, tanpa mengubah waktu aslinya.
5. Pakai status tile aktif untuk citra, terpisah dari radar. `PARSIAL CITRA` perlu warna/status UI yang konsisten. GIBS infrared adalah visualisasi; tidak boleh dilabeli LST permukaan numerik atau temperatur hutan tanpa produk dan analisis yang sesuai.

## H. Resolver LST dan batas pembacaan raster

1. Pertahankan pemanggilan resolver dari handler dan pemulihan loading saat konteks berubah.
2. Verifikasi returned item ID, collection, platform/sensor, waktu dan product processing level, serta identitas band yang diperlukan sebelum memilih aset. Jangan menerima item `DIFFERENT_SCENE` untuk `EXPECTED_SCENE`.
3. Mapping band harus eksplisit sesuai sensor/collection; QA_PIXEL berbeda dari ST_QA/QA_RADSAT. Jangan memilih semua asset yang mengandung `qa` sebagai pengganti yang seolah setara.
4. `isSigned` mencerminkan signing yang sebenarnya, bukan `true` tetap. Kesalahan hydrate dan signing dibedakan. Signed URL/key tidak masuk log, export, atau screenshot audit.
5. Beri deadline serta batas ukuran/dukungan raster pada operasi resolusi, fetch, decode, dan sampling. Pertimbangkan pembacaan Range/COG per AOI atau pengolahan backend agar raster besar tidak diunduh penuh tanpa kendali. Jangan mengklaim streaming efisien jika masih memakai unduhan seluruh file.
6. Pertahankan dukungan QA, CRS, endian, dan compression yang sudah benar; format tak didukung menghasilkan alasan spesifik, bukan fallback DEMO. Validasi luas/coverage sesuai AOI, proyeksi, dan metode sampling; statistik sampel tidak dilabeli statistik semua piksel.
7. Buktikan fixture positif, pembatalan request, dan jalur resolver sukses terlebih dahulu. Lalu pemeriksaan real asset yang terbatas dan terdokumentasi bila dapat dilakukan; jangan menyebut fixture sebagai analisis Landsat nyata.

## I. Produksi dan perbaikan sumber gagal

1. Periksa **path aktual**: `/api/spatial/hotspots` dan `/api/spatial/traffic/flow`; bukan `/api/spatial/firms` atau `/api/spatial/traffic` yang berbeda dari route terpasang.
2. Cocokkan `api/index.js`, mount Express, `vercel.json`, API base URL frontend, deployment root/build, commit/version publik, dan log provider. Source sekarang sudah mempunyai forwarding `/api/*`; jangan langsung menyatakan reverse proxy pasti penyebab tunggal 404.
3. Status 404 HTML harus tetap kegagalan route. Jika route mencapai backend kemudian upstream 401/403, baru identifikasi masalah key/akses sesuai respons. Jangan menyimpulkan expired dari 404 hosting.
4. Jika kredensial memang belum tersedia, laporkan kebutuhan konfigurasi dengan aman. Jangan membuat key baru atau mengganti penyedia tanpa izin/bukti. Sumber publik/setara dapat menjadi fallback dengan batas dan label jelas, bukan mengaku tetap data TomTom/FIRMS.
5. Jangan mengklaim “fungsi lokal penuh” berdasarkan daftar route atau mock. Tunjukkan response actual adapter yang lolos validator. Deployment/perubahan akun harus mengikuti otorisasi pengguna; jika belum dipublikasikan, nyatakan hasil lokal dan status produksi terpisah.

## J. Verifikasi yang harus dilakukan dan format laporan

Tambahkan pemeriksaan bermakna pada perilaku consumer berikut, dengan fixture independen yang jelas:

1. MET berhasil dengan forecast future-only/current null: tidak ada current buatan.
2. MET current valid tetapi precipitation/gust/symbol/apparent temperature tidak ada: null tetap null; current code tidak dipaksa cerah.
3. Tekanan permukaan laut tidak disajikan/dipakai sebagai tekanan permukaan lokasi.
4. Waktu titik dimulai pukul 22:00 dan kemudian berinterval tiga/enam jam: label grafik mengikuti timestamp, bukan indeks.
5. Cuaca utama gagal sementara model dan CAMS berhasil: data yang selaras dipertahankan.
6. Metadata attempt mempunyai status HTTP/latency/bytes yang diukur; cache hit dan network failure tidak membuat request palsu.
7. MET geometry hilang, unit salah, updatedAt cacat, semua/sebagian titik invalid, timeout, cancellation, 304, dan 429.
8. Semua sumber unchecked/offline: jumlah terverifikasi nol; status kredensial belum diketahui tidak menjadi configured.
9. Satu model sukses tidak membuat semua kartu model online. Query B tidak memakai status query A.
10. BMKG angka/koordinat invalid ditolak; tanggal sah ber-offset lintas hari diterima; 30 Februari tetap ditolak.
11. FIRMS tanggal tanpa jam, jam tanpa tanggal, timestamp cacat, record campuran, semua invalid, dan hasil kosong valid.
12. Kegagalan BoM, CMA, dan JMA secara terpisah; recovery tidak menghapus model sehat; lokasi salah pada retry ditolak.
13. Radar pan/zoom/frame dengan keberhasilan/kegagalan lama, cache hit, event duplikat, pending, serta 1 tile sukses + 2 gagal.
14. GIBS metadata mempunyai gap, jam perangkat melenceng, metadata gagal, frame gagal, serta frame cache yang stale.
15. Resolver returned item berbeda ditolak; kedua band benar memperoleh HTTPS; signed URL tidak bocor.
16. Browser: analisis LST aktif → pindah koleksi/AOI → loading pulih → analisis baru berhasil → respons lama tidak muncul. Pertahankan kontrol TIFF 29,66°C yang lulus sebelumnya sebagai **fixture**.

Jalankan suite regresi relevan, lalu gate proyek yang diperlukan (`npm test`, typecheck, build) setelah perbaikan consumer selesai. Catat nama perintah, exit code, suite/kasus sebenarnya, dan batas fixture/live. Jangan menampilkan “semua selesai” jika masih ada blocker produksi/data penting yang belum terverifikasi.

Laporan akhir harus memuat:

- Perubahan setiap file dan tujuan perubahan.
- Sumber/produk yang diminta, yang berhasil, yang gagal, serta mana yang benar-benar dipakai.
- Pemisahan status transport, validasi, freshness, dan coverage.
- Bukti sebelum/sesudah dari consumer dan browser, bukan hanya helper dipanggil.
- Pengujian yang benar-benar dijalankan dan kasus yang belum dapat diuji.
- Status lokal dan produksi secara terpisah; konfigurasi yang masih memerlukan data pengguna.
- Daftar masalah tersisa beserta dampak dan alasan. Pertahankan `accuracyValidated:false` sampai ada validasi terhadap pengamatan; banyak model/sumber tidak otomatis membuktikan ramalan akurat atau seluruh bumi sudah dipantau.

Keberhasilan tugas berarti data yang tersedia bisa dipakai sesuai arti dan cakupannya, data gagal tidak dianggap berhasil, nilai kosong tidak berubah menjadi cuaca buatan, dan kemampuan aplikasi yang telah bekerja tetap terjaga.
