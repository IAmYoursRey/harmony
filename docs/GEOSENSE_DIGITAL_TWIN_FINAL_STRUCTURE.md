# GEOSENSE DIGITAL TWIN - FINAL STRUCTURE AUDIT

## 1. Final Directory Tree
```
spatial/digital-twin/
├── DigitalTwinCanvas.tsx       (Legacy SVG Map System - REQUIRED)
├── DigitalTwinEditor.tsx       (Legacy Config - REQUIRED)
├── types.ts                    (Shared Types & Interfaces)
├── ...
├── game/                       (Shared Engine & Components)
│   ├── gameEngine.ts
│   ├── GameGrid.tsx
│   ├── GameHUD.tsx
│   ├── GameResult.tsx
│   └── VirtualJoystick.tsx
├── student/                    (Student Flow)
│   ├── GameView.tsx
│   └── StudentDTView.tsx
└── teacher/                    (Teacher Flow)
    ├── GridCanvas.tsx
    ├── MapEditor.tsx
    ├── MapList.tsx
    ├── RoomManager.tsx
    ├── SimulationCreator.tsx
    └── TeacherDTView.tsx
```

## 2. Component Ownership
- **Legacy SVG Map**: `DigitalTwinCanvas` dan `DigitalTwinEditor`. Dipertahankan khusus fitur "Upload Map Image" terdahulu.
- **Grid Simulation (Core)**: `GameGrid`, `GridCanvas`, dan `gameEngine` menangani koordinat _tile-based_.
- **Controls & UI**: `VirtualJoystick` untuk sentuhan mobile (touchAction ditangani), `GameHUD` untuk indikator HP.
- **Role Interfaces**: `StudentDTView` untuk *client session* dan `TeacherDTView` untuk *management session*.

## 3. Frontend/Backend Boundary
Semua state persisten tidak lagi bersandar pada localStorage. Seluruh perubahan state menggunakan endpoint:
- `/api/digital-twin/maps`
- `/api/digital-twin/simulations`
- `/api/digital-twin/rooms`
  
Pemisahan contract antara data transien (game render UI) dan data persisten (koordinat sinkron ke database) sangat tegas.

## 4. API Dependency
Frontend hanya menggunakan wrapper `apiClient` tersentralisasi (`frontend/src/services/apiClient.ts`). Tidak ada `fetch()` manual yang tercerai-berai. Error code HTTP 400/401/403/500 tertangani dengan standar _toast notifications_.

## 5. Teacher Flow
*Dashboard -> Spatial -> Digital Twin (Teacher Role)*
1. Membuat Peta Grid (`MapList`, `MapEditor`) -> Disimpan di DB.
2. Membuat Konfigurasi Bencana (`SimulationCreator`) -> Disimpan di DB.
3. Membuat Room dan Memulai (`RoomManager`) -> Merubah `room.status` di DB.
4. Memonitor Pergerakan Siswa (`RoomManager` -> `GridCanvas` Live Monitor) via sinkronisasi polling.

## 6. Student Flow
*Dashboard -> Spatial -> Digital Twin (Student Role)*
1. Gabung Room (`StudentDTView` -> `Join Room`).
2. Masuk ke Layar Bermain (`GameView` memuat `GameGrid` & `gameEngine`).
3. Bergerak dengan Keyboard/Virtual Joystick.
4. Mendapat Damage/Evakuasi, sinkronisasi posisi setiap 1 detik.
5. Selesai dan mengirim _Result_.

## 7. Legacy Map Flow
Fitur SVG lawas tetap bekerja seperti semula tanpa konflik, tidak dihapus dari _routing_ utama Spatial Views.

## 8. Grid Simulation Flow
Simulasi Grid mendukung 9 tipe sel, bahaya (*hazard*), *door locks*, koordinat _safe points_ yang dihitung bobot jaraknya oleh *Dijkstra's shortest path*.

## 9. Authentication Flow
Siswa dan Guru hanya dapat berinteraksi dengan API jika JSON Web Token (JWT) diotorisasi valid oleh middleware.

## 10. Data Persistence
Hanya menyimpan cache session authentication. State simulasi sepenuhnya divalidasi oleh database backend (MongoDB/JSON db). Tidak ada *mock data*.

## 11. Real-time Synchronization
Dilakukan via HTTP Long-Polling tersinkron di `GameView.tsx` dan `RoomManager.tsx`. Endpoint `/rooms/:roomId/sync` secara masif memvalidasi HP, lokasi x/y siswa dengan delay latensi ~1000ms. Solusi *stateless* tanpa _WebSocket connection overhead_.

## 12. Removed Files
- Skrip testing debugging temporer di folder `scratch/`.
- File `backend/reset.cjs` yang sempat digunakan dalam debugging.

## 13. Remaining Legacy Files
- Komponen `DigitalTwinCanvas` tetap dipertahankan.

## 14. Known Limitations
- Tidak terdapat WebSocket untuk koneksi real-time < 50ms, namun polling 1000ms dinilai efisien untuk skala _turn-based / grid-movement simulation_ di sekolah.
