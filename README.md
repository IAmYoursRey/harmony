# Harmony

Platform web edukasi kebencanaan, pemetaan geospasial, dan simulasi evakuasi sekolah berbasis denah gedung.

Dibuat oleh **My Princessa Z. M.**

---

## Ruang Kerja Berdasarkan Pengguna

- **Warga & Publik**: Peta siaga bencana terbuka, pantauan gempa BMKG, cuaca, titik panas, serta penjelajah planet dan globe 3D tanpa login.
- **Murid**: Alur belajar bertahap dengan GeoBot, kuis kesiapsiagaan, simulasi evakuasi denah sekolah, ruang sesi kelas, dan Skor Harmony.
- **Guru & Sekolah**: Dasbor guru, pemantauan progres siswa, penyusunan denah Digital Twin, dan indeks ketahanan sekolah.
- **Peneliti & Ahli**: Mode WebGIS analitik, Studio Geospasial empat pilar, telemetri lahan sensor, dan validasi empiris.

---

## Struktur Repositori

```text
.
├── api/                 # Entry point serverless Vercel untuk rute /api/*
├── apps/
│   ├── server/          # Backend Express, layanan AI, proxy BMKG/FIRMS, dan akses database
│   └── web/             # Aplikasi frontend React, TypeScript, Vite, OpenLayers, Cesium, Three.js
├── database/            # Skema dan migrasi PostgreSQL / PostGIS
├── docs/
│   └── SUMBER_DATA.md   # Daftar sumber data resmi (BMKG, PVMBG, BIG, BNPB, ESA, NASA)
├── tests/               # Pengujian otomatis integritas data, rute, dan UI
├── .env.example         # Contoh variabel environment root/backend
├── package.json
└── vercel.json
```

---

## Menjalankan Secara Lokal

1. Pasang dependensi dari direktori root:

   ```bash
   npm install
   ```

2. Salin templat environment dan isi nilai masing-masing di file lokal:
   - Root atau backend: salin `.env.example` ke `.env` dan/atau `apps/server/.env.example` ke `apps/server/.env`
   - Frontend Vite: salin `apps/web/.env.example` ke `apps/web/.env.local`

3. Jalankan server backend dan frontend bersamaan:

   ```bash
   npm run dev
   ```

4. Bangun versi produksi frontend:

   ```bash
   npm run build
   ```

---

## Daftar Variabel Environment (Vercel / GitHub Deployment)

Repositori ini tidak menyertakan file `.env` asli. Tambahkan variabel berikut pada **Vercel Environment Variables** atau **GitHub Actions Secrets** sesuai kebutuhan deployment Anda:

| Variabel | Lokasi | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Server / Vercel | String koneksi PostgreSQL (Neon / Vercel Postgres) |
| `POSTGRES_URL` | Server / Vercel | Cadangan koneksi PostgreSQL |
| `JWT_SECRET` | Server / Vercel | Kunci acak penandatangan token autentikasi |
| `GOOGLE_CLIENT_ID` | Server / Vercel | Client ID OAuth Google untuk verifikasi login di server |
| `BLOB_STORE_ID` | Server / Vercel | ID Vercel Blob Storage |
| `BLOB_READ_WRITE_TOKEN` | Server / Vercel | Token baca/tulis Vercel Blob Storage |
| `GEMINI_QUIZ_KEY` | Server / Vercel | Kunci Gemini API untuk generator kuis |
| `GEMINI_CHAT_KEY` | Server / Vercel | Kunci Gemini API untuk chat pembelajaran |
| `GEMINI_CHATBOT_KEY` | Server / Vercel | Kunci Gemini API untuk asisten GeoBot |
| `GEMINI_WEATHER_KEY` | Server / Vercel | Kunci Gemini API untuk ringkasan cuaca |
| `GEMINI_MODEL` | Server / Vercel | Nama model Gemini (opsional) |
| `FIRMS_MAP_KEY` | Server / Vercel | Kunci API titik panas NASA FIRMS (opsional) |
| `TOMTOM_API_KEY` | Server / Vercel | Kunci API lalu lintas TomTom (opsional) |
| `ORS_API_KEY` | Server / Vercel | Kunci API rute OpenRouteService (opsional) |
| `PORT` | Lokal saja | Port backend lokal, default `3001` |
| `VITE_API_BASE_URL` | Frontend Vite | Kosongkan saat satu domain di Vercel, atau `http://localhost:3001` di lokal |
| `VITE_GOOGLE_CLIENT_ID` | Frontend Vite | Client ID OAuth Google untuk tombol masuk di web |

