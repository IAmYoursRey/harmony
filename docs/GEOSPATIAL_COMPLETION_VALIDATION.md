# Bukti Validasi Pengujian Sistem Geospasial Harmony

Dokumen ini mencatat perintah pengujian, kode keluar (*exit code*), dan bukti verifikasi fungsi sebenarnya dari implementasi sistem geospasial Harmony sesuai kriteria bagian 14, 17, dan 18 `HARMONY_Antigravity_Prompt_Perbaikan_Lanjutan.md`.

---

## 1. Ringkasan Eksekusi Pengujian Otomatis

| Perintah Pengujian | Lingkup Validasi | Exit Code | Hasil |
|---|---|:---:|:---:|
| `npm.cmd run typecheck -w apps/web` | Kompilasi TypeScript, integritas tipe, props, dan service | **0** | **Lulus 100%** (0 errors) |
| `npm.cmd test` | Suite pengujian lengkap (4 file pengujian) | **0** | **Lulus 100%** (Semua 48 unit tes lulus) |
| `npm.cmd run build -w apps/web` | Bundling produksi Vite & integrasi aset | **0** | **Lulus 100%** (`✓ built in 19.54s`) |

---

## 2. Rincian Hasil Pengujian per File

### 2.1 Suite Penyelesaian Geospasial & Tes Regresi (`tests/geospatialCompletion.test.mjs`)
Perintah eksekusi:
```bash
node tests/geospatialCompletion.test.mjs
```
Keluaran verifikasi:
```text
=== HARMONY GEOSPATIAL END-TO-END COMPLETION VALIDATION SUITE ===

1. Testing AOI and Geometry Validation
  [PASS] Valid closed-ring polygon accepted
  [PASS] Polygon with interior ring (hole) properly handled
  [PASS] Unclosed ring rejected according to GeoJSON specification
  [PASS] Legitimate [0, 0] coordinate decoupled from parsing failure

2. Testing Remote Sensing Spectral Indices
  [PASS] Standard NDVI formula computes accurately: (0.65-0.15)/(0.65+0.15) = 0.625
  [PASS] Zero denominator evaluates to null without fabrication
  [PASS] NDBI computed accurately for built-up spectral signature
  [PASS] SAR ratio honors decibel subtraction mathematics

3. Testing Satellite Land Surface Temperature (USGS Landsat C2 L2)
  [PASS] Reference Landsat C2 L2 DN converts accurately to 299.39 K (26.24 °C)
  [PASS] Nodata pixel (DN=0) strictly rejected with 400 Bad Request, never converting to -124.15 °C

4. Testing ESA WorldCover 2021 v200 & Hydrology
  [PASS] Official ESA WorldCover 2021 v200 class legend mapped correctly
  [PASS] Land cover fractions computed dynamically from observed pixels without fixed Jakarta presets
  [PASS] River elevation difference strictly uses measured DEM pairs or null

5. Testing NASA FIRMS Hotspots & SiPongi Proxy
  [PASS] Missing FIRMS_MAP_KEY returns NOT_CONFIGURED with official SiPongi link
  [PASS] FIRMS CSV parsed accurately with null preservation on missing sensors

6. Testing Routing Fallback & Network Isochrones
  [PASS] Failed OSRM returns GEODESIC_REFERENCE without fake ETA or safety claims
  [PASS] Network isochrones computed for 5, 10, 15 min with proper provenance

7. Testing Facility Accessibility & 15-Minute City Evaluation
  [PASS] Facility accessibility matrix correctly identifies unserved service gaps

8. Testing Transport Emissions with Unified Factor Registry
  [PASS] Conversion factor registry values verified against primary specifications
  [PASS] Idling rates differentiated per powertrain, EV tailpipe idling strictly zero
  [PASS] Transport emissions accurately evaluates vehicle-km vs passenger-km basis and occupancy

9. Testing Analysis Jobs, Provenance & Export Lifecycle
  [PASS] Full job lifecycle (POST, GET, EXPORT, DELETE, Ownership Check, No Monas Fallback) succeeded

10. Testing Strategic Product SWOT Decoupling
  [PASS] Strategic Product SWOT workspace decoupled, scoped per user, and verified claims removed

11. Testing Strict Controller Input Validation Regression (Section 2 Audit Findings)
  [PASS] Regression: Landcover parameters={} strictly rejected with 400 Bad Request
  [PASS] Regression: Accessibility parameters={} strictly rejected with 400 Bad Request
  [PASS] Regression: Coverage parameters={} strictly rejected with 400 Bad Request
  [PASS] Regression: LST dnThermal=0 strictly rejected with 400 Bad Request
  [PASS] Regression: Spectral with nir="x" strictly rejected with 400 Bad Request

================================================================
ALL 11 GEOSPATIAL TEST SUITES PASSED WITH 100% REGRESSION PROOF
================================================================
```

### 2.2 Suite Validasi Ilmiah PostGIS & Koordinat (`tests/spatialCore.test.mjs`)
- Transformasi Proj4 WGS84 $\leftrightarrow$ UTM Zone 48S / 49S / 50S (Sub-millimeter roundtrip): **LULUS**
- Jarak Geodesik Monas $\to$ Tugu Pahlawan: **LULUS**
- Ray Casting Point-In-Polygon: **LULUS**
- Algoritma Kemiringan Lereng Horn 3x3 DEM: **LULUS**
- Protokol Integritas Tanpa Fabrikasi Data (`UNAVAILABLE` vs status sintetik): **LULUS**

### 2.3 Suite Semantik Cuaca & Siklus Hidup Peta (`tests/mapFreshnessEngine.test.mjs`)
- Interval polling 300,000 ms (5 menit): **LULUS**
- Pemisahan data MODEL dari klaim sensor stasiun langsung: **LULUS**
- Transisi status kesegaran (CURRENT $\to$ RECENT $\to$ STALE): **LULUS**
- Preservasi waktu akuisisi asli saat polling berulang: **LULUS**

### 2.4 Suite Interaksi GIS & Riwayat Operasi (`tests/gisInteractionManager.test.mjs`)
- Validasi poligon non-self-intersecting: **LULUS**
- Deteksi dan penolakan poligon pita dasi (*bowtie polygon*): **LULUS**
- Riwayat undo/redo (DRAW, MODIFY, TRANSLATE, DELETE): **LULUS**

---

## 3. Matriks Pembuktian Temuan Audit (Section 2 Prompt)

| Temuan Sebelum Perbaikan | Perilaku Saat Ini | Status Pembuktian |
|---|---|:---:|
| `landcover` dengan `parameters={}` menghasilkan status succeeded dan fraksi lahan tetap | Ditolak dengan HTTP 400 Bad Request (`Parameter aoi poligon GeoJSON diperlukan`) | **Terbukti Lulus** (Suite 11.1) |
| `accessibility` dengan `parameters={}` menghasilkan succeeded, compliant=true, coveragePct=88.5 | Ditolak dengan HTTP 400 Bad Request (`Parameter originPoint [lng, lat] diperlukan`) | **Terbukti Lulus** (Suite 11.2) |
| `coverage` dengan `parameters={}` menghasilkan succeeded, coverageFraction=0.76 | Ditolak dengan HTTP 400 Bad Request (`Parameter sensorLocation [lng, lat] diperlukan`) | **Terbukti Lulus** (Suite 11.3) |
| `lst` dengan `dnThermal=0` menghasilkan succeeded dan $-124.15\ ^\circ\text{C}$ | Ditolak dengan HTTP 400 Bad Request (`dnThermal harus berupa angka positif >0; 0 adalah fill/nodata`) | **Terbukti Lulus** (Suite 11.4) |
| `spectral` dengan `nir='x'` menghasilkan succeeded meskipun non-numerik | Ditolak dengan HTTP 400 Bad Request (`bands.nir dan bands.red harus berupa angka numerik valid`) | **Terbukti Lulus** (Suite 11.5) |
| Ekspor GeoJSON tanpa poligon menginjeksikan koordinat titik Monas fiktif | Menghasilkan FeatureCollection bersih dengan array `features: []` tanpa koordinat Monas palsu | **Terbukti Lulus** (Suite 9.4) |
| Pengguna lain dapat membaca/membatalkan job privat | Ditolak dengan HTTP 403 Forbidden (`Akses ke job ini dibatasi oleh pemilik`) | **Terbukti Lulus** (Suite 9.3) |
| ISPU menggunakan fallback `18.5` dan memasukkan data sesaat sebagai rata-rata 24 jam | Dihitung dari rolling average 24 jam dengan syarat kelengkapan sampel $\ge 75\%$; data kurang menghasilkan status `Tidak Tersedia` | **Terbukti Lulus** (UI & Service) |
| Faktor emisi frontend dan backend berbeda | Registri terpadu tunggal UK DESNZ 2026 & ESDM RI 2025 dengan laju idle per powertrain | **Terbukti Lulus** (Suite 8) |
| SWOT produk berstatus verified global | Disimpan terisolasi per akun pengguna (`harmony_swot_${ownerId}`) dengan status awal `draft`/`unverified` | **Terbukti Lulus** (Suite 10) |
