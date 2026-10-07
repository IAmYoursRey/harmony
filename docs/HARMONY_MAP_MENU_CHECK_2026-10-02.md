# Pemeriksaan panel dan fungsi peta Harmony

Tanggal: 2 Oktober 2026. Lingkungan: web lokal pada `http://localhost:5173/app/maps`, backend lokal pada port 3001, browser Edge tanpa antarmuka.

## Perubahan tampilan dan navigasi

- Akses Studio Geospasial, katalog sensor, manajer lapisan, navigasi, dan 15 menu analisis terkumpul di panel Harmony Maps yang ditunjuk pengguna.
- Pilihan basemap, lalu lintas, cakupan sensor, dan cuaca menggunakan kontrol yang sudah ada pada panel; tombol mengambang yang menduplikasi fungsi tersebut dihapus.
- Tab Alat & Analisis menyediakan pintasan. Daftar menu mengikuti konfigurasi Studio yang sama agar tujuan menu tidak berbeda.
- Katalog sensor memiliki satu akses utama pada panel. Duplikasi tombol kondisional pada bagian filter sensor dihapus.
- Sakelar kartu cuaca dipindahkan ke bagian Cuaca. Komponen sakelar menggunakan tombol yang bisa dioperasikan lewat keyboard.
- Perpindahan ke dialog/panel lain menutup panel pengaturan; elemen yang sedang keluar saat animasi tidak menghalangi klik.
- Hasil analisis vektor mengganti kelompok hasil sebelumnya dan mengarahkan peta ke extent yang valid. Studio menutup setelah hasil diterapkan.
- Jumlah menu dan kategori Studio dihitung dari daftar sebenarnya. Badge sidebar tidak lagi menyebut 11 domain.

## Koreksi fungsi dan keterangan data

- Tab satelit mulai kosong. Preset memiliki label Demo pada tampilan dan metadata ekspor. Distribusi kelas yang sebelumnya memakai persentase tetap dihilangkan dari hasil scalar contoh.
- Tab hidrologi tidak lagi membuat luas kelas berdasarkan kotak koordinat kota atau menampilkan skor banjir dari elevasi saja. Data yang belum terhubung ditampilkan belum tersedia.
- Aksesibilitas radial diberi status ESTIMATED dan penjelasan metode; kontur belum dianggap analisis graf jalan.
- Tab hotspot memiliki tombol Ambil Data FIRMS yang memanggil endpoint server, menangani konfigurasi yang belum tersedia, serta membedakan data belum dimuat dari nol deteksi pada respons sukses.
- Permintaan FIRMS dapat dibatalkan saat wilayah/waktu berubah. Bbox mengikuti AOI jika tersedia.
- Tab satelit, hidrologi, aksesibilitas, dan hotspot menggunakan hook perubahan AOI yang sudah tersedia di proyek.
- Filter hotspot mendukung MultiPolygon dan lubang polygon serta menolak koordinat di luar rentang.
- Hasil demo pada layer hotspot membawa nama dan status demonstrasi. Kontur radial membawa metode estimasi pada properties.

## Bukti pemeriksaan

| Pemeriksaan akhir | Hasil |
| --- | --- |
| Typecheck | Lulus, exit code 0 |
| Tes repositori, empat suite | Lulus, exit code 0 |
| Build produksi | Lulus, exit code 0; 17,82 detik |
| Perjalanan 15 menu | Lulus; tidak ditemukan galat JavaScript |
| Interaksi panel, layer, dan service produksi | Lulus; tidak ditemukan galat JavaScript |

Pengujian menu dilakukan pada desktop 1440 × 1000 dan panel ponsel 390 × 844. Semua 15 menu dibuka melalui panel; tidak ditemukan galat JavaScript pada perjalanan tersebut. Panel ponsel tidak mengalami overflow horizontal.

Pengujian interaksi tambahan mencakup:

1. Pemilihan basemap serta pembukaan/penutupan panel lalu lintas dan cakupan sensor.
2. Perubahan sakelar kartu cuaca.
3. Keadaan kosong tab satelit dan aktivasi DEMO secara eksplisit.
4. Keadaan kosong tutupan lahan dan keluaran service produksi tanpa skor banjir buatan.
5. Pemanggilan HTTP FIRMS aktual ke server lokal: **HTTP 200, success=false, NOT_CONFIGURED**. Ini menguji penanganan konfigurasi, belum membuktikan feed NASA aktif.
6. Penerapan hotspot demonstrasi dan kontur aksesibilitas estimasi ke peta.
7. Pembukaan dan penutupan Navigasi & Rute.
8. Filter hotspot terhadap fixture MultiPolygon dengan lubang serta penolakan koordinat invalid; tes memanggil service produksi.

Artefak pemeriksaan berada di `D:/Blender/test 1/harmony-web-check/`:

- `menu-check.json`: perjalanan 15 menu, ukuran panel ponsel, dan galat browser.
- `interaction-check.json`: hasil interaksi tambahan dan status provider.
- `tests.log`, `typecheck.log`, `build.log`: keluaran pemeriksaan proyek.
- Screenshot `after-map.png`, `after-panel.png`, `mobile-panel.png`, serta contoh modul dan layer.
- `backup/`: salinan source sebelum perubahan utama pada pekerjaan ini.

## Batas kesimpulan

Menu dapat dibuka dan jalur interaksi yang disebut di atas telah diperiksa. Itu tidak menyatakan seluruh fitur memiliki dataset operasional atau validasi ilmiah lengkap. Raster satelit/ESA, jaringan jalan pada tab aksesibilitas, dan feed FIRMS dengan kredensial masih memerlukan pekerjaan atau konfigurasi berikutnya.

Pemeriksaan ini tidak menguji setiap kombinasi lokasi/tanggal, seluruh unduhan, seluruh provider, mode globe pada setiap perangkat, login lintas akun, ataupun deployment publik. Status per fitur yang diperbarui tersedia pada `GEOSPATIAL_COMPLETION_STATUS.md`.
