# GEOSENSE PHASE 6 FEATURE MATRIX

| Feature | UI | Service | API | Backend | DB | Auth | Runtime Status |
|---------|----|---------|-----|---------|----|------|----------------|
| **Auth** | Login Page | `login` | `POST /api/auth/login` | `auth.js` | `database.json` | Public | **PASS** |
| **Profile** | Profile View | `getProfile` | `GET /api/profile` | `profile.js` | `database.json` | JWT | **PASS** |
| **School** | School Selector | `getAllSchools` | `GET /api/schools` | `schools.js` | `database.json` | JWT | **PASS** |
| **Leaderboard** | Dashboard | `getAllProfiles` | `GET /api/profile/all` | `profile.js` | `database.json` | JWT | **PASS** |
| **Analytics** | Dashboard | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY / PARTIAL MOCK** |
| **Learning** | Learning View | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY** |
| **AI** | Chat/Quiz UI | `geminiService` | `POST /api/ai/chat` | `ai.js` | None | JWT | **PASS** (Protected route) |
| **Spatial** | Map View | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY** (Depends on School Context) |
| **Digital Twin** | Graph UI | `getTwin` | `GET /api/digital-twin/:id` | `digitalTwin.js`| `database.json` | JWT (Write: Teacher) | **PASS** |
| **Simulation** | Sim View | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY** (Depends on School Context) |
| **Resilience** | Score View | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY** (Pure client computation) |
| **Survey** | Form UI | N/A | N/A | N/A | N/A | JWT | **FRONTEND-ONLY** (Does not persist) |
