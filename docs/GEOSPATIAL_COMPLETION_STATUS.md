# Status fitur geospasial Harmony

Diperbarui 2 Oktober 2026 setelah pemeriksaan source dan interaksi browser lokal.

Dokumen ini menggantikan penilaian operasional pada laporan sebelumnya. Keberhasilan tes rumus, controller, typecheck, atau build tidak membuktikan bahwa dataset eksternal telah terhubung ke UI.

## Status yang ditemukan

| Fitur | Status saat ini | Bukti dan batas |
| --- | --- | --- |
| Panel Harmony Maps | Akses menu berfungsi | Satu panel memiliki alat peta dan akses ke 15 menu Studio. Tombol mengambang yang sudah tercakup dihapus. |
| Studio, katalog sensor, manajer layer, navigasi | Interaksi browser berfungsi | Akses melalui panel utama; perpindahan panel menutup panel sebelumnya. |
| NDVI/NDBI/SAR/LST pada tab satelit | Demonstrasi perhitungan | Mulai tanpa scene. Preset memakai nilai contoh dengan label DEMO. Pembacaan asset raster/COG dan clipping piksel AOI belum terhubung ke tab. |
| Tutupan lahan pada tab hidrologi | Dataset belum terhubung | Persentase berdasarkan kotak koordinat kota dihapus. Luas kelas, batas DAS, dan risiko banjir yang tidak didukung data ditampilkan belum tersedia. |
| Hotspot FIRMS | UI terhubung ke endpoint; akses provider belum teruji | Tombol Ambil Data FIRMS memanggil server. Server lokal merespons NOT_CONFIGURED karena MAP_KEY belum tersedia. CSV impor dan demo dapat diterapkan ke peta. |
| SiPongi | Rujukan portal | Tautan dan impor CSV tersedia; belum merupakan integrasi API langsung. |
| Isokron/aksesibilitas di tab Studio | Estimasi radial | Jalur frontend memakai radius dan faktor jarak asumsi. UI dan metadata diberi ESTIMATED; belum membuktikan akses melalui jaringan jalan. Endpoint ORS pada backend belum membuktikan integrasi tab. |
| Routing perjalanan | Dialog tersedia; provider bergantung akses | Dialog dapat dibuka/ditutup. Seluruh rute nyata, petunjuk, atau kondisi cuaca perjalanan belum diuji pada pemeriksaan menu ini. |
| Emisi transportasi | Kalkulator tersedia | UI terbuka dan tes repositori lulus. Frontend/backend masih memiliki registry terpisah; sumber tabel setiap faktor belum diverifikasi ulang. |
| ISPU | Estimasi berbasis model; perlu audit standar lanjutan | Input PM2.5 memiliki perhitungan rata-rata pada source terbaru. Ketepatan seluruh window, kelengkapan waktu, dan breakpoint terhadap lampiran regulasi belum diverifikasi ulang. |
| SWOT produk | Penyimpanan lokal | Menu terbuka; seed klaim diturunkan menjadi draft/unverified oleh perubahan sebelumnya. Persistensi akun melalui backend belum dibuktikan. |
| Job backend | Validasi dasar diuji | Tes controller menolak input kosong dan nodata. Pembacaan raster provider tidak dibuktikan oleh penerimaan array/scalar dari caller. Identitas masih menerima x-user-id tanpa bukti autentikasi pada route; perlu diperbaiki sebelum klaim isolasi akun. |
| Layer hasil Studio | Interaksi vektor terhubung | Hotspot dan kontur estimasi dapat diterapkan ke OpenLayers. Hasil satu kelompok mengganti hasil sebelumnya; peta diarahkan ke extent hasil. |

## Pengujian

Rincian pemeriksaan, bukti, dan keterbatasan dicatat dalam `HARMONY_MAP_MENU_CHECK_2026-10-02.md`. Pengujian dilakukan pada source lokal. Website publik belum dipublikasikan ulang melalui pekerjaan ini.

## Pekerjaan lanjutan

1. Hubungkan pemilihan scene, band raster, QA, AOI, statistik, layer raster, dan ekspor.
2. Hubungkan raster tutupan lahan dan data sungai/DAS yang dapat ditelusuri.
3. Hubungkan tab aksesibilitas ke matrix dan isokron jaringan; evaluasi ketidaklengkapan data fasilitas.
4. Konfigurasikan FIRMS dan uji respons provider nyata, termasuk schema dan nol deteksi.
5. Audit autentikasi job, sumber faktor emisi, ISPU, serta persistensi akun SWOT.

Gunakan NOT_CONFIGURED, UNAVAILABLE, DEMO, dan ESTIMATED sesuai kondisi aktual; jangan mengganti kekurangan data dengan keluaran operasional buatan.
