# SUMBER DATA, KEABSAHAN LEMBAGA, DAN LANDASAN HUKUM
## Platform Sistem Informasi Geospasial & Mitigasi Bencana Satuan Pendidikan Aman Bencana (SPAB) Harmony

---

## DAFTAR ISI
1. [BAB I: Pendahuluan dan Prinsip Integritas Data](#bab-i-pendahuluan-dan-prinsip-integritas-data)
2. [BAB II: Matriks Inventarisasi Sumber Data Otoritatif](#bab-ii-matriks-inventarisasi-sumber-data-otoritatif)
3. [BAB III: Rincian Lengkap Lembaga dan Variabel Data](#bab-iii-rincian-lengkap-lembaga-dan-variabel-data)
   - 3.1 [Badan Meteorologi, Klimatologi, dan Geofisika (BMKG RI)](#31-badan-meteorologi-klimatologi-dan-geofisika-bmkg-ri)
   - 3.2 [Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG - Badan Geologi ESDM)](#32-pusat-vulkanologi-dan-mitigasi-bencana-geologi-pvmbg---badan-geologi-esdm)
   - 3.3 [Badan Informasi Geospasial (BIG RI)](#33-badan-informasi-geospasial-big-ri)
   - 3.4 [Badan Nasional Penanggulangan Bencana (BNPB RI)](#34-badan-nasional-penanggulangan-bencana-bnpb-ri)
   - 3.5 [Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek RI)](#35-kementerian-pendidikan-kebudayaan-riset-dan-teknologi-kemendikbudristek-ri)
   - 3.6 [European Space Agency (ESA) & Program Copernicus Uni Eropa](#36-european-space-agency-esa--program-copernicus-uni-eropa)
   - 3.7 [United States Geological Survey (USGS)](#37-united-states-geological-survey-usgs)
   - 3.8 [European Centre for Medium-Range Weather Forecasts (ECMWF) & Open-Meteo](#38-european-centre-for-medium-range-weather-forecasts-ecmwf--open-meteo)
   - 3.9 [National Aeronautics and Space Administration (NASA) & NOAA](#39-national-aeronautics-and-space-administration-nasa--noaa)
   - 3.10 [OpenStreetMap Foundation (OSMF)](#310-openstreetmap-foundation-osmf)
   - 3.11 [Google DeepMind / Google Cloud AI (Gemini AI Engine)](#311-google-deepmind--google-cloud-ai-gemini-ai-engine)
4. [BAB IV: Kerangka Yuridis dan Regulasi Perundang-Undangan](#bab-iv-kerangka-yuridis-dan-regulasi-perundang-undangan)
5. [BAB V: Metodologi Integrasi dan Pipeline Pengolahan Data](#bab-v-metodologi-integrasi-dan-pipeline-pengolahan-data)
6. [BAB VI: Daftar Pustaka dan Referensi Sitasi Ilmiah](#bab-vi-daftar-pustaka-dan-referensi-sitasi-ilmiah)

---

## BAB I: PENDAHULUAN DAN PRINSIP INTEGRITAS DATA

### 1.1 Latar Belakang
Wilayah Negara Kesatuan Republik Indonesia berada pada pertemuan tiga lempeng tektonik aktif dunia (Lempeng Indo-Australia, Lempeng Eurasia, dan Lempeng Pasifik) serta berada di jalur Cincin Api Pasifik (*Pacific Ring of Fire*). Kondisi geologis dan klimatologis ini menempatkan Indonesia pada tingkat kerentanan bencana geologi dan hidrometeorologi yang sangat tinggi. Satuan pendidikan (sekolah, madrasah, dan perguruan tinggi) merupakan fasilitas publik dengan konsentrasi populasi rentan (anak-anak dan remaja) yang membutuhkan perlindungan mitigasi mutlak.

Platform **Harmony** dibangun sebagai Sistem Informasi Geospasial (SIG), Pemantauan Multi-Bencana Real-Time, dan Manajemen Satuan Pendidikan Aman Bencana (SPAB). Dalam operasionalnya, keandalan sistem mitigasi bencana sangat bergantung pada **validitas**, **otoritas hukum**, dan **keaslian sumber data**.

### 1.2 Prinsip Integritas Data (*Raw Data Integrity*)
Platform Harmony memegang teguh tiga pilar integritas data:
1. **Prinsip Non-Manipulasi (*Unadulterated Raw Data*)**: Sistem tidak merekayasa, mengubah, atau memalsukan angka magnitudo, kedalaman hiposenter, koordinat episenter, status gunung api, ataupun parameter cuaca ekstrem yang diterbitkan oleh instansi berwenang.
2. **Keterbukaan Informasi Publik**: Sesuai amanat Undang-Undang No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (KIP), seluruh data yang diakses bersumber dari jalur data terbuka (*open government data*) dan layanan antarmuka pemrograman aplikasi (API) resmi institusi negara.
3. **Kebijakan Satu Peta (*One Map Policy*)**: Menyelaraskan seluruh data spasial tematik kebencanaan dengan Informasi Geospasial Dasar (IGD) yang dikeluarkan oleh Badan Informasi Geospasial (BIG) guna mencegah tumpang tindih batas maupun kesalahan lokasi (*misalignment*).

---

## BAB II: MATRIKS INVENTARISASI SUMBER DATA OTORITATIF

Berikut adalah tabel komparasi inventarisasi seluruh sumber data yang terintegrasi di dalam platform Harmony:

| No | Lembaga / Institusi | Status Kelembagaan | Kategori Data | Frekuensi Pembaruan | Standar / Protokol Data | Lisensi / Landasan Hukum Utama |
|---|---|---|---|---|---|---|
| **1** | **BMKG RI** | Lembaga Pemerintah Nonkementerian (LPNK) RI | Gempa Bumi InaTEWS, Tsunami, Radar Doppler, Cuaca Ekstrem | Real-time (Detik s.d. 10 Menit) | WMO No. 49, UNESCO-IOC, Shakemap XML/JSON | UU No. 31/2009 & Perpres No. 93/2019 |
| **2** | **PVMBG - Badan Geologi ESDM** | Kementerian ESDM RI | Vulkanologi 127 Gunung Api Aktif, VONA, Radius KRB | Real-time saat krisis / Harian periodik | Standar IAVCEI / WOVO, VONA ICAO | Permen ESDM No. 13/2016 & UU No. 24/2007 |
| **3** | **BIG RI** | Lembaga Pemerintah Nonkementerian (LPNK) RI | DEMNAS Resolusi 8m, Batas Wilayah, Peta RBI | Periodik Kuartalan / Tahunan | SNI ISO 19115:2012, EGM2008 | UU No. 4/2011, Perpres No. 9/2016 |
| **4** | **BNPB RI** | Lembaga Pemerintah Nonkementerian (LPNK) RI | InaRISK, IRBI Multi-Bencana, Riwayat DIBI | Tahunan / Pembaruan Bahaya Regional | Perka BNPB No. 2/2012, Sendai Framework | UU No. 24/2007 |
| **5** | **Kemendikbudristek RI** | Kementerian RI | Data Pokok Pendidikan (Dapodik) 215.000+ Sekolah | Semester Akademik Berkala | Standar Data Pendidikan Pusdatin | Permendikbud No. 33/2019 & UU No. 20/2003 |
| **6** | **ESA Copernicus (Uni Eropa)** | Badan Ilmiah Resmi Internasional | Citra Satelit Sentinel-2 (Optik) & Sentinel-1 (SAR) | Revisit Time 5 Hari | CEOS CARD4L, OGC WMS/WCS | EU Regulation No 377/2014 (Full Free Access) |
| **7** | **USGS (Pemerintah AS)** | Badan Ilmiah Resmi Pemerintah Federal AS | Gempa Global Real-Time, Magnitudo Momen (Mw) | Real-time (Tiap menit) | USGS FDSN Web Services Standard | US Public Law 95-124 (NEHRP) |
| **8** | **ECMWF & Open-Meteo** | Organisasi Antar-Pemerintah Eropa | Model Numerik Cuaca (NWP IFS), Angin 360°, Barometrik | Setiap Jam / Interpolasi Real-time | WMO Standard GRIB2 & NetCDF | WMO Resolution 40 |
| **9** | **NASA & NOAA** | Badan Antariksa Pemerintah Federal AS | Titik Panas Karhutla (Hotspot VIIRS & MODIS) | 3 Jam Sekali (NRT) | NASA EOSDIS Open Science Policy | US Space Act 1958 |
| **10** | **OpenStreetMap (OSMF)** | Konsorsium Data Terbuka Internasional | Peta Dasar Vektor, Jaringan Jalan, Jalur Evakuasi | Kontinu Harian (Crowdsourced ODbL) | OGC Slippy Map Tilename, OSM XML/PBF | ODbL 1.0 (Open Data Commons) |
| **11** | **Google DeepMind / Cloud AI** | Penyedia Kecerdasan Buatan Enterprise | Model AI Multimodal Gemini Kebencanaan & SPAB | Real-time On-demand | ISO/IEC 27001, Enterprise AI Governance | Google AI Principles & API Terms |

---

## BAB III: RINCIAN LENGKAP LEMBAGA DAN VARIABEL DATA

### 3.1 Badan Meteorologi, Klimatologi, dan Geofisika (BMKG RI)
* **Kategori**: Seismik, Tsunami, dan Meteorologi Tropis.
* **Portal Resmi**: [https://data.bmkg.go.id/](https://data.bmkg.go.id/) dan [https://satelit.bmkg.go.id/](https://satelit.bmkg.go.id/).
* **Endpoint Integrasi**:
  - `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` (Gempabumi Terkini M ≥ 5.0).
  - `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` (15 Gempabumi Terkini).
  - `https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json` (Gempabumi Dirasakan).
* **Variabel Data yang Dimanfaatkan**:
  1. Parameter Hiposenter: Waktu gempa (WIB/UTC), Lintang, Bujur, Magnitudo, dan Kedalaman (km).
  2. Wilayah Potensi Tsunami: Status Ancaman (Awas, Siaga, Waspada).
  3. Peta Guncangan (*Shakemap*): Citra guncangan percepatan tanah (*PGA*).
  4. Skala Intensitas Dirasakan (*Modified Mercalli Intensity* / MMI): MMI I hingga XII.
  5. Radar Doppler Cuaca: Reflektivitas pita C-Band & X-Band (dBZ) untuk estimasi intensitas curah hujan.
  6. Peringatan Dini Cuaca Ekstrem (*Nowcasting*): Daerah berpotensi hujan lebat disertai petir dan angin kencang (rentang 0–6 jam).
  7. Citra Satelit Geostasioner Himawari-9: Kanal inframerah (*Infrared Enhanced*), uap air (*Water Vapor*), dan sebaran abu vulkanik.
* **Landasan Hukum**:
  - Undang-Undang Republik Indonesia Nomor 31 Tahun 2009 tentang Meteorologi, Klimatologi, dan Geofisika (khususnya Pasal 21 dan Pasal 29 mengenai penetapan BMKG sebagai otoritas tunggal peringatan dini resmi negara).
  - Peraturan Presiden Nomor 93 Tahun 2019 tentang Penguatan dan Pengembangan Sistem Peringatan Dini Gempa Bumi dan Tsunami (InaTEWS).

---

### 3.2 Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG - Badan Geologi ESDM)
* **Kategori**: Vulkanologi dan Gerakan Tanah Geologi.
* **Portal Resmi**: [https://magma.esdm.go.id/](https://magma.esdm.go.id/).
* **Endpoint Integrasi**: `https://magma.esdm.go.id/v1/gunung-api/laporan`.
* **Variabel Data yang Dimanfaatkan**:
  1. Posisi Geografis & Toponimi: Koordinat kawah dan elevasi puncak dari 127 gunung api aktif tipe A, B, dan C di Indonesia.
  2. Tingkat Aktivitas Gunung Api Resmi:
     - **Level I (Normal)**: Aktivitas dasar tanpa indikasi erupsi.
     - **Level II (Waspada)**: Peningkatan aktivitas seismik dan visual di sekitar kawah.
     - **Level III (Siaga)**: Peningkatan seismisitas nyata dan potensi erupsi dalam waktu dekat.
     - **Level IV (Awas)**: Erupsi utama sedang berlangsung atau akan segera terjadi.
  3. Kawasan Rawan Bencana (KRB): Poligon batas KRB I, KRB II, dan KRB III (radius 1 km hingga 12 km).
  4. Rekomendasi Bahaya Sektoral: Radius larangan mendekat pada bukaan kawah dan lembah aliran lahar.
  5. *Volcano Observatory Notice for Aviation* (VONA): Informasi ketinggian kolom abu dan arah sebaran angin untuk keselamatan rute penerbangan.
* **Landasan Hukum**:
  - Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana (Pasal 35 ayat 2 mengenai mitigasi bencana geologi).
  - Peraturan Menteri ESDM Nomor 13 Tahun 2016 tentang Organisasi dan Tata Kerja Kementerian Energi dan Sumber Daya Mineral.

---

### 3.3 Badan Informasi Geospasial (BIG RI)
* **Kategori**: Topografi, Elevasi Digital, dan Batas Administrasi.
* **Portal Resmi**: [https://tanahair.indonesia.go.id/demnas/#/](https://tanahair.indonesia.go.id/demnas/#/) (Ina-Geoportal).
* **Variabel Data yang Dimanfaatkan**:
  1. Model Elevasi Digital Nasional (DEMNAS): Data *gridded elevation* resolusi spasial tinggi 0.27 arc-second (~8.1 meter) hasil paduan sensor IFSAR, TerrSAR-X, dan ALOS PALSAR.
  2. Peta Rupa Bumi Indonesia (RBI): Skala 1:25.000 (Jawa-Bali-Nusa Tenggara) dan 1:50.000 (Luar Jawa).
  3. Batas Administrasi Wilayah Nasional: Poligon batas provinsi, kabupaten/kota, dan kecamatan terverifikasi.
  4. Analisis Morfometri Medan: Perhitungan sudut kelerengan (*slope* dalam derajat/persentase) dan aspek orientasi lereng guna menghitung ancaman longsor di sekitar sekolah.
  5. Referensi Vertikal Geoid Nasional (EGM2008).
* **Landasan Hukum**:
  - Undang-Undang Nomor 4 Tahun 2011 tentang Informasi Geospasial (Pasal 22 ayat 1: Penugasan BIG sebagai otoritas penyelenggara Informasi Geospasial Dasar / IGD).
  - Peraturan Presiden Nomor 9 Tahun 2016 juncto Peraturan Presiden Nomor 23 Tahun 2021 tentang Percepatan Pelaksanaan Kebijakan Satu Peta (*One Map Policy*).

---

### 3.4 Badan Nasional Penanggulangan Bencana (BNPB RI)
* **Kategori**: Pengkajian Risiko Multi-Bencana dan Rekam Jejak Sejarah Kejadian.
* **Portal Resmi**: [https://inarisk.bnpb.go.id/](https://inarisk.bnpb.go.id/) dan [https://dibi.bnpb.go.id/](https://dibi.bnpb.go.id/).
* **Variabel Data yang Dimanfaatkan**:
  1. Indeks Risiko Bencana Indonesia (IRBI): Skor indeks risiko komposit per kabupaten/kota (Kategori Risiko Tinggi, Sedang, Rendah).
  2. Peta Bahaya Tematik (*Hazard Layer*):
     - Bahaya banjir genangan dan banjir bandang.
     - Bahaya goncangan gempa bumi sesar aktif.
     - Bahaya likuefaksi dan tanah longsor.
     - Bahaya tsunami pantai.
     - Bahaya kekeringan dan kebakaran hutan dan lahan (Karhutla).
  3. Data dan Informasi Bencana Indonesia (DIBI): Statistik historis frekuensi kejadian bencana, korban jiwa, kerusakan infrastruktur sekolah, dan tren kerugian dalam 30 tahun terakhir.
* **Landasan Hukum**:
  - Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.
  - Peraturan Kepala BNPB Nomor 2 Tahun 2012 tentang Pedoman Umum Pengkajian Risiko Bencana.
  - Sendai Framework for Disaster Risk Reduction 2015–2030 (Pilar 1: *Understanding Disaster Risk*).

---

### 3.5 Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek RI)
* **Kategori**: Satuan Pendidikan, Profil Sekolah, dan Program SPAB.
* **Portal Resmi**: [https://referensi.data.kemdikbud.go.id/](https://referensi.data.kemdikbud.go.id/) dan [https://dapo.kemdikbud.go.id/](https://dapo.kemdikbud.go.id/).
* **Variabel Data yang Dimanfaatkan**:
  1. Basis Data 215.000+ Satuan Pendidikan Nasional: Mencakup Sekolah Dasar (SD), Sekolah Menengah Pertama (SMP), Sekolah Menengah Atas (SMA), Sekolah Menengah Kejuruan (SMK), dan Sekolah Luar Biasa (SLB) di 38 provinsi dan 514 kabupaten/kota.
  2. Nomor Pokok Sekolah Nasional (NPSN): Kunci identifikasi unik tunggal (*unique primary key*) setiap sekolah.
  3. Geolokasi Presisi: Koordinat lintang (*latitude*) dan bujur (*longitude*) gerbang utama/gedung sekolah.
  4. Profil Administratif: Alamat desa/kelurahan, kecamatan, status sekolah (Negeri/Swasta), serta jenjang pendidikan.
* **Landasan Hukum**:
  - Peraturan Menteri Pendidikan dan Kebudayaan Nomor 33 Tahun 2019 tentang Penyelenggaraan Program Satuan Pendidikan Aman Bencana (SPAB).
  - Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
  - Surat Edaran Sekretaris Jenderal Kemendikbudristek No. 13 Tahun 2023 tentang Peningkatan Kesiapsiagaan Bencana di Satuan Pendidikan.

---

### 3.6 European Space Agency (ESA) & Program Copernicus Uni Eropa
* **Kategori**: Penginderaan Jauh Satelit Optik Multispektral dan Radar Apertur Sintesis.
* **Portal Resmi**: [https://browser.dataspace.copernicus.eu/](https://browser.dataspace.copernicus.eu/).
* **Variabel Data yang Dimanfaatkan**:
  1. Konstelasi Satelit Sentinel-2 (Sentinel-2A & Sentinel-2B):
     - Resolusi spasial 10 meter (Band 2 Biru, Band 3 Hijau, Band 4 Merah, Band 8 Inframerah Dekat/NIR).
     - *Normalized Difference Vegetation Index* (NDVI): Kerapatan tutupan hijau kanopi di sekitar perimeter sekolah.
     - *Normalized Difference Water Index* (NDWI): Deteksi kebasahan tanah dan batas luapan genangan air banjir.
     - *Bare Soil Index* (BSI): Indeks lahan terbuka kering yang rentan erosi dan debu.
  2. Konstelasi Satelit Sentinel-1 (C-Band Synthetic Aperture Radar / SAR):
     - Pencitraan gelombang mikro tembus awan dan tembus malam (Level-1 Ground Range Detected / GRD).
     - Deteksi jejak banjir saat kondisi langit tertutup awan mendung lebat.
* **Landasan Hukum & Lisensi**:
  - Regulation (EU) No 377/2014 of the European Parliament and of the Council establishing the Copernicus Programme.
  - Kebijakan Akses Penuh, Terbuka, dan Bebas Biaya (*Copernicus Open Access Policy*).
  - Standar *Committee on Earth Observation Satellites* (CEOS) *Analysis Ready Data for Land* (CARD4L).

---

### 3.7 United States Geological Survey (USGS)
* **Kategori**: Seismisitas Global dan Karakteristik Sesar Tektonik Dunia.
* **Portal Resmi**: [https://earthquake.usgs.gov/fdsnws/event/1/](https://earthquake.usgs.gov/fdsnws/event/1/).
* **Endpoint Integrasi**: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson`.
* **Variabel Data yang Dimanfaatkan**:
  1. Katalog Gempa Global Real-Time (M ≥ 4.5 dan kejadian seismik di kawasan busur kepulauan Indonesia).
  2. Moment Magnitude ($M_w$), Body Wave Magnitude ($M_b$), Surface Wave Magnitude ($M_s$).
  3. Kedalaman Pusat Gempa (Hiposenter) dan Tingkat Ketidakpastian Koordinat (*Horizontal Error / Vertical Error*).
  4. Model Sesar Global (*Global Tectonic Plate Boundaries*): Penentuan batas penunjaman (*subduction zone*) Palung Jawa dan sesar geser (*strike-slip*) Sesar Besar Sumatra (Semangko), Palu-Koro, dan Sesar Sorong.
* **Landasan Hukum**:
  - *Earthquake Hazards Reduction Act of 1977* (U.S. Public Law 95-124).
  - *USGS Organic Act* (43 U.S.C. 31 et seq.).
  - Standar *International Federation of Digital Seismograph Networks* (FDSN).

---

### 3.8 European Centre for Medium-Range Weather Forecasts (ECMWF) & Open-Meteo
* **Kategori**: Prediksi Cuaca Numerik (*Numerical Weather Prediction* / NWP) dan Parameter Atmosferik.
* **Portal Resmi**: [https://open-meteo.com/](https://open-meteo.com/).
* **Endpoint Integrasi**: `https://api.open-meteo.com/v1/forecast`.
* **Variabel Data yang Dimanfaatkan**:
  1. *Integrated Forecasting System* (IFS ECMWF) dan Konsensus Multi-Model (ECMWF, GFS NOAA, ICON DWD Jerman, JMA Jepang).
  2. Vektor Kecepatan Angin ($m/s$ atau $km/jam$) dan Arah Angin Derajat (0°–360°).
  3. Kecepatan Hembusan Maksimum (*Wind Gusts*).
  4. Suhu Udara Permukaan (°C), Suhu Titik Embun (*Dew Point*), dan Suhu Terasa (*Apparent Temperature*).
  5. Tekanan Udara Permukaan (*Surface Pressure* dalam hPa).
  6. Presipitasi Aktual, Akumulasi Hujan, Peluang Presipitasi (%), dan Tutupan Awan (*Cloud Cover* %).
* **Landasan Hukum**:
  - *Convention establishing the European Centre for Medium-Range Weather Forecasts (1975)*.
  - World Meteorological Organization (WMO) Resolution 40 (Cg-XII) tentang Kebijakan Bebas Pertukaran Data Meteorologi Internasional.

---

### 3.9 National Aeronautics and Space Administration (NASA) & NOAA
* **Kategori**: Penginderaan Jauh Termal dan Deteksi Titik Panas (*Hotspot*) Karhutla.
* **Portal Resmi**: [https://firms.modaps.eosdis.nasa.gov/](https://firms.modaps.eosdis.nasa.gov/).
* **Variabel Data yang Dimanfaatkan**:
  1. Sensor VIIRS (*Visible Infrared Imaging Radiometer Suite*): Resolusi spasial 375 meter pada satelit Suomi-NPP dan NOAA-20.
  2. Sensor MODIS (*Moderate Resolution Imaging Spectroradiometer*): Resolusi spasial 1 km pada satelit Terra dan Aqua.
  3. *Fire Radiative Power* (FRP): Energi panas radiasi kebakaran dalam satuan Megawatt (MW).
  4. Tingkat Kepercayaan (*Confidence Level %*): Klasifikasi titik panas berisiko tinggi.
  5. Waktu Pelintasan Satelit (*Day/Night Satellite Overpass Time*).
* **Landasan Hukum**:
  - *National Aeronautics and Space Act of 1958* (U.S. Public Law 85-568).
  - *NASA Earth Science Data and Information System (ESDIS) Project Policy*.

---

### 3.10 OpenStreetMap Foundation (OSMF)
* **Kategori**: Peta Dasar Vektor, Jaringan Transportasi, dan Fasilitas Umum.
* **Portal Resmi**: [https://www.openstreetmap.org/](https://www.openstreetmap.org/).
* **Variabel Data yang Dimanfaatkan**:
  1. Jaringan Jalan: Hierarki jalan tol, jalan arteri primer, jalan kolektor, jalan lingkungan, serta jalur setapak evakuasi.
  2. Fasilitas Penting (*Critical Infrastructure*): Lokasi rumah sakit, puskesmas, kantor polisi, pos pemadam kebakaran, dan lapangan terbuka sebagai titik kumpul evakuasi aman.
  3. Jaringan Rel Kereta Api dan Jembatan.
  4. Hidrologi Garis Pantai dan Sungai.
* **Landasan Hukum & Lisensi**:
  - *Open Data Commons Open Database License* (ODbL) versi 1.0.
  - Standar Pemetaan *Open Geospatial Consortium* (OGC) *Slippy Map Tilename Specification*.

---

### 3.11 Google DeepMind / Google Cloud AI (Gemini AI Engine)
* **Kategori**: Kecerdasan Buatan Tingkat Lanjut (*Multimodal Generative AI*).
* **Portal Resmi**: [https://ai.google.dev/](https://ai.google.dev/).
* **Variabel Data yang Dimanfaatkan**:
  1. Pemrosesan Bahasa Alami (*Natural Language Processing*): Menyintesis data teknis BMKG dan PVMBG menjadi instruksi evakuasi darurat ramah anak (*child-friendly language*).
  2. Analisis Spasial Multivariabel: Menghitung skenario risiko komposit berdasarkan jarak sekolah ke kawah gunung api, sesar aktif, dan pantai.
  3. Generator Kuis & Skenario Simulasi: Menghasilkan materi pembelajaran interaktif kesiapsiagaan sekolah sesuai karakteristik ancaman daerah spesifik.
* **Landasan Hukum & Standar**:
  - *Google AI Principles* (Keamanan, Transparansi, dan Akuntabilitas).
  - Sertifikasi Keamanan Internasional ISO/IEC 27001 dan ISO/IEC 27701 (*Privacy Information Management*).
  - *Google Cloud Enterprise Terms of Service* (Jaminan nol penyimpanan data pelanggan untuk pelatihan publik).

---

## BAB IV: KERANGKA YURIDIS DAN REGULASI PERUNDANG-UNDANGAN

Pengembangan dan pengoperasian platform Harmony tunduk dan patuh pada ketentuan perundang-undangan nasional Republik Indonesia dan konvensi internasional berikut:

### 4.1 Regulasi Nasional Indonesia
1. **Undang-Undang Republik Indonesia Nomor 31 Tahun 2009 tentang Meteorologi, Klimatologi, dan Geofisika**:
   - *Pasal 21*: Pengaturan pelayanan informasi meteorologi dan peringatan dini cuaca ekstrem.
   - *Pasal 29*: Penegasan bahwa BMKG adalah instansi pemerintah pusat yang berwenang menetapkan informasi resmi gempa bumi dan peringatan tsunami nasional.
2. **Undang-Undang Republik Indonesia Nomor 24 Tahun 2007 tentang Penanggulangan Bencana**:
   - *Pasal 6*: Tanggung jawab pemerintah dalam pengurangan risiko bencana dan integrasi ke dalam program pembangunan.
   - *Pasal 35 ayat (2)*: Kewajiban pengkajian risiko, perencanaan penanggulangan bencana, dan tata ruang berbasis zonasi bahaya geologi.
3. **Undang-Undang Republik Indonesia Nomor 4 Tahun 2011 tentang Informasi Geospasial**:
   - *Pasal 22*: Pengaturan Informasi Geospasial Dasar (IGD) yang diselenggarakan secara tunggal oleh Badan Informasi Geospasial (BIG).
   - *Pasal 53*: Ketentuan standardisasi geospasial nasional (SNI ISO 19115).
4. **Undang-Undang Republik Indonesia Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik (KIP)**:
   - *Pasal 9 & 10*: Kewajiban badan publik untuk mengumumkan informasi yang berkaitan dengan hajat hidup orang banyak dan informasi keadaan bahaya/bencana secara serta-merta tanpa penundaan.
5. **Peraturan Menteri Pendidikan dan Kebudayaan Nomor 33 Tahun 2019 tentang Penyelenggaraan Program Satuan Pendidikan Aman Bencana (SPAB)**:
   - Mengatur 3 (tiga) pilar utama SPAB:
     - Pilar 1: Fasilitas Sekolah Aman (*Safe Learning Facilities*).
     - Pilar 2: Manajemen Bencana di Sekolah (*School Disaster Management*).
     - Pilar 3: Pendidikan Pencegahan dan Pengurangan Risiko Bencana (*Risk Reduction and Resilience Education*).
6. **Peraturan Presiden Nomor 9 Tahun 2016 juncto Peraturan Presiden Nomor 23 Tahun 2021 tentang Percepatan Pelaksanaan Kebijakan Satu Peta (One Map Policy)**:
   - Mengharuskan interoperabilitas data spasial lintas kementerian/lembaga dalam satu georeferensi tunggal (*one standard, one database, one geoportal*).
7. **Peraturan Presiden Nomor 93 Tahun 2019 tentang Penguatan dan Pengembangan Sistem Peringatan Dini Gempa Bumi dan Tsunami**:
   - Landasan penguatan transmisi peringatan dini InaTEWS ke seluruh instansi layanan publik.

### 4.2 Standar dan Kerangka Kerja Internasional
1. **Sendai Framework for Disaster Risk Reduction 2015–2030 (United Nations Office for Disaster Risk Reduction / UNDRR)**:
   - *Prioritas 1*: Memahami risiko bencana melalui pemanfaatan ilmu pengetahuan dan teknologi geospasial.
   - *Prioritas 4*: Meningkatkan kesiapsiagaan menghadapi bencana untuk respons yang efektif.
2. **WMO Technical Regulations No. 49 (World Meteorological Organization)**:
   - Standar global kodifikasi data meteorologi, radar cuaca, dan pengamatan sinoptik.
3. **Open Geospatial Consortium (OGC) Standards**:
   - Protokol standar pertukaran data spasial (WMS, WFS, WCS, GeoJSON, Slippy Tile Map).
4. **Open Data Commons Open Database License (ODbL 1.0)**:
   - Kerangka atribusi dan keterbukaan penggunaan data geospasial OpenStreetMap.

---

## BAB V: METODOLOGI INTEGRASI DAN PIPELINE PENGOLAHAN DATA

```
+-----------------------------------------------------------------------------------+
|                        SUMBER DATA RESMI & OTORITATIF                             |
|  [BMKG InaTEWS]  [PVMBG MAGMA]  [BIG DEMNAS]  [BNPB InaRISK]  [Kemendikbud Dapodik]  |
|  [ESA Sentinel]  [USGS Seismik] [Open-Meteo]  [NASA FIRMS]    [OpenStreetMap OSM]  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (HTTPS / REST API / GeoJSON / OGC Tile Stream)
+-----------------------------------------------------------------------------------+
|                     HARMONY INGESTION & DATA INTEGRITY LAYER                     |
|  - Validasi Skema JSON & Error Handling                                           |
|  - Caching Adaptif Cerdas (Bypass Cache Manual / TTL Terukur 3-10 Menit)          |
|  - Verifikasi Integritas Data Mentah (Zero Alteration of Seismic/Weather Fields)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                   HARMONY SPATIAL COMPUTATION & ENRICHMENT ENGINE                 |
|  - Algoritma Jarak Haversine (Sekolah ke Episentrum Gempa / Kawah Gunung Api)     |
|  - Spatial Intersection: Titik Sekolah vs Poligon Bahaya KRB & InaRISK           |
|  - Digital Slope Computation: Ekstraksi Kelerengan Medan dari Grid DEMNAS         |
|  - Indeks Spektral Satelit: Komputasi Rasio Band NDVI, NDWI, NDBI Sentinel-2       |
|  - AI Synthesis: DeepMind Gemini Model untuk Instruksi Evakuasi Bahasa Warga      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           PRESENTASI PENGGUNA (UI / UX)                           |
|  - Peta Interaktif OpenLayers & Dashboard Manajemen Risiko Sekolah                |
|  - Modal Transparansi Sumber Data & Landasan Hukum (Ikon Database Provenance)     |
|  - Studio Cuaca Konsensus Visual & Peringatan Dini Real-Time                      |
+-----------------------------------------------------------------------------------+
```

### 5.1 Pipeline Aliran Data
1. **Tahap Akuisisi Data (*Data Acquisition*)**:
   Sistem melakukan pengambilan data langsung (*direct fetch*) melalui antarmuka REST API dan feed GeoJSON terenkripsi TLS 1.3 dari server BMKG, PVMBG, USGS, Open-Meteo, NASA FIRMS, dan Dapodik.
2. **Tahap Verifikasi dan Penyeragaman (*Data Standardization*)**:
   Data yang masuk divalidasi skemanya dan distandarisasi ke dalam format koordinat geospasial WGS 84 (EPSG:4326) dan proyeksi Web Mercator (EPSG:3857).
3. **Tahap Analisis Spasial Terdistribusi (*Spatial Analytics Engine*)**:
   Menggunakan algoritma kalkulasi jarak geodetik (*Haversine Distance*) dan penapisan spasial (*bounding box & polygon point-in-polygon*), sistem secara instan memadankan posisi koordinat 215.000+ sekolah terhadap sumber ancaman (gempa bumi, kawah aktif, zona genangan banjir).
4. **Tahap Presentasi Transparan (*User Interface Layer*)**:
   Data disajikan kepada pengguna melalui peta interaktif responsif, dilengkapi tombol audit transparansi data (*Provenance Button*) di pojok kiri bawah peta agar pengguna, akademisi, dan instansi pengawas dapat memverifikasi keabsahan data setiap saat.

---

## BAB VI: DAFTAR PUSTAKA DAN REFERENSI SITASI ILMIAH

Bagi keperluan penulisan daftar pustaka pada makalah ilmiah, skripsi, atau laporan teknis, rujukan dapat disalin menggunakan format baku sitasi (APA 7th Edition / IEEE) di bawah ini:

### Format APA 7th Edition:
1. Badan Informasi Geospasial. (2018). *Model Elevasi Digital Nasional (DEMNAS) Resolusi 0.27 Arcsecond*. Ina-Geoportal. https://tanahair.indonesia.go.id/demnas/
2. Badan Meteorologi, Klimatologi, dan Geofisika. (2020). *Pedoman Teknis Pengoperasian Indonesia Tsunami Early Warning System (InaTEWS)*. Kedeputian Bidang Geofisika BMKG.
3. Badan Nasional Penanggulangan Bencana. (2021). *Indeks Risiko Bencana Indonesia (IRBI) Tahun 2021*. Direktorat Pengurangan Risiko Bencana BNPB. https://inarisk.bnpb.go.id/
4. European Space Agency. (2021). *Sentinel-2 User Handbook (Issue 2, Rev. 1)*. ESA Standard Document. https://sentinels.copernicus.eu/
5. Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi. (2019). *Peraturan Menteri Pendidikan dan Kebudayaan Republik Indonesia Nomor 33 Tahun 2019 tentang Penyelenggaraan Program Satuan Pendidikan Aman Bencana (SPAB)*. JDIH Kemendikbudristek.
6. OpenStreetMap Foundation. (2024). *OpenStreetMap Open Database License (ODbL)*. Open Data Commons. https://www.openstreetmap.org/copyright
7. Pusat Vulkanologi dan Mitigasi Bencana Geologi. (2022). *Tingkat Aktivitas Gunung Api di Indonesia dan Prosedur Standar Pemantauan Magma*. Badan Geologi Kementerian ESDM. https://magma.esdm.go.id/
8. United States Geological Survey. (2023). *Real-time Earthquake Hazards Program FDSN Web Services*. U.S. Department of the Interior. https://earthquake.usgs.gov/

### Format IEEE:
[1] BMKG, "Indonesia Tsunami Early Warning System (InaTEWS) Realtime Data Services," *Badan Meteorologi, Klimatologi, dan Geofisika*, 2024. [Online]. Tersedia: https://data.bmkg.go.id/.  
[2] PVMBG, "MAGMA Indonesia: Monitoring and Geospatial Volcanic Activity Platform," *Badan Geologi Kementerian ESDM*, 2024. [Online]. Tersedia: https://magma.esdm.go.id/.  
[3] Badan Informasi Geospasial, "Dokumentasi Teknis DEMNAS dan Kebijakan Satu Peta," *Ina-Geoportal BIG*, 2021. [Online]. Tersedia: https://tanahair.indonesia.go.id/.  
[4] BNPB, "Portal Risiko Bencana Nasional InaRISK," *Badan Nasional Penanggulangan Bencana*, 2023. [Online]. Tersedia: https://inarisk.bnpb.go.id/.  
[5] Kemendikbudristek, "Data Pokok Pendidikan dan Data Referensi Satuan Pendidikan," *Pusdatin Kemendikbudristek*, 2024. [Online]. Tersedia: https://referensi.data.kemdikbud.go.id/.  
[6] European Space Agency, "Copernicus Sentinel Data Access and Technical Specifications," *ESA Copernicus*, 2024. [Online]. Tersedia: https://browser.dataspace.copernicus.eu/.  
[7] USGS, "Worldwide Earthquake Catalog Real-Time Web Service," *U.S. Geological Survey*, 2024. [Online]. Tersedia: https://earthquake.usgs.gov/.  
[8] Open-Meteo & ECMWF, "Atmospheric Numerical Weather Prediction Model Integration," *Open-Meteo Documentation*, 2024. [Online]. Tersedia: https://open-meteo.com/.  
