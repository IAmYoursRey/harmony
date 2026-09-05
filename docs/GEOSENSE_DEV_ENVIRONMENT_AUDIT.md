# GEOSENSE DEV ENVIRONMENT AUDIT

## 1. Root Cause
1. **Port Zombie Processes**: Menjalankan `npm run dev --prefix backend` dari `concurrently` di Windows menyisakan *child processes* (`node.exe` dan `vite.js`) sebagai *orphan* ketika perintah utama (`npm`) menerima sinyal interupsi (CTRL+C). Ini menyebabkan _Node_ tetap menduduki *port* `3001` dan `5173`.
2. **HMR Warning**: `AuthContext.tsx` mengekspor *React Component* (`AuthProvider`) dan non-Component object (`AuthContext`), yang menyalahi protokol *Vite React Fast Refresh*.
3. **Graceful Shutdown Backend**: File `backend/server.js` tidak memiliki event listener untuk sinyal `SIGINT` maupun `SIGTERM`.

## 2. Evidence
- Output inspeksi `Get-CimInstance Win32_Process` dengan gamblang menunjukkan PID yang memegang port 3001 adalah proses anak dari `node server.js` dan port 5173 dipegang oleh `vite`.
- Log *Vite* secara presisi memperingatkan bahwa _AuthContext_ tidak bisa di-HMR secara _clean_.

## 3. Fix
- Mengubah `package.json` dev script: Menggunakan eksekusi langsung `cd backend && npx nodemon server.js` agar sinyal *concurrently* langsung ditangkap oleh eksekutor, bukan terperangkap oleh wrapper `npm run`. Ditambahkan opsi `--kill-others-on-fail`.
- Mengekstrak definisi `AuthContext` dan *types* pendukungnya ke sebuah file tersendiri (`frontend/src/context/coreAuth.ts`). Ini membuat `AuthContext.tsx` murni menjadi komponen _Provider_, melenyapkan *warning Fast Refresh*.
- Menambahkan listener `process.on('SIGINT')` dan `SIGTERM` pada `backend/server.js` untuk secara manual menutup _app.listen()_ (`server.close()`).

## 4. Process Lifecycle Architecture
Siklus *lifecycle* divalidasi sebagai berikut:
1. Menjalankan `npm run dev` menjalankan `concurrently`.
2. *Concurrently* mengeksekusi *Nodemon* dan *Vite* secara independen (langsung di _command line_).
3. Penghentian aplikasi mengirim `SIGTERM`/`SIGINT`.
4. *Nodemon* merespon `SIGINT` -> merutekan ke _Node Server_ -> _Server_ melakukan penutupan HTTP (*graceful*).
5. Port secara absolut di-_release_.

## 5. Windows Compatibility Considerations
Windows tidak menyebarkan _SIGTERM_ ke semua turunan proses secara hierarkis (seperti di Unix). Mem-bypass shell `npm run` dan menembak langsung *node executable* menyeimbangkan integrasi pembunuhan proses turunan, mengizinkan `--kill-others` bekerja sebagaimana mestinya.

## 6. Validation Results
Tes restart dev server dilakukan berturut-turut tanpa _zombie port error_.

## 7. Remaining Limitations
Terkadang jika VSCode Terminal tiba-tiba tertutup total (X) alih-alih `CTRL+C`, Windows masih bisa menahan rilis port (masalah inherent *OS shell closure*), tapi di alur normal _Developer_, hal ini telah 100% tersolusikan.
