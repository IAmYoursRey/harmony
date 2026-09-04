# GEOSENSE FINAL ARCHITECTURE
> Phase 8 Master Structural Audit — Canonical Reference

## System Architecture

```
User Browser
     │
     ▼
Frontend (Vite + React + TypeScript)
  ├── main.tsx           → App bootstrap, Provider tree
  ├── App.tsx            → React Router routes
  │
  ├── Pages              → LandingPage, LoginPage, SchoolSelectionPage
  ├── Components         → Dashboard, Charts, Landing sections
  ├── Contexts           → Auth, School (session), Theme, i18n, Toast
  ├── Services           → apiClient (canonical HTTP), schoolService, geminiService, surveyService
  └── Data               → accounts.ts, userProfiles.ts (API wrappers), schools.ts (types+helpers)
          │
          │ HTTP (JWT Bearer via apiClient)
          ▼
Backend (Node.js + Express)
  ├── server.js          → Express entry, routes registration
  ├── repository.js      → Read/write database.json
  ├── middleware/
  │   └── authMiddleware.js  → JWT verifyToken
  └── routes/
      ├── auth.js        → /api/auth/*
      ├── profile.js     → /api/profile/*
      ├── schools.js     → /api/schools/*
      ├── digitalTwin.js → /api/digital-twin/*
      ├── ai.js          → /api/ai/* → Gemini API
      └── surveys.js     → /api/surveys/*
          │
          ▼
database.json (JSON flat file persistence)
  ├── accounts[]         → id, email, passwordHash, name, role, createdAt
  ├── profiles[]         → userId, gender, grade, classSection, schoolId, totalPoints, quizHistory, topicScores, ...
  ├── schools[]          → id, name, lat, lng, level, risk, earthquake, flood, ..., province, regency
  ├── digitalTwins{}     → schoolId → { mapImage, nodes, edges, lastUpdated }
  └── surveys[]          → id, userId, schoolId, answers, score, completed, submittedAt
```

---

## Domain Source of Truth

| Data | Source of Truth | Status |
|---|---|---|
| User account | `database.json:accounts[]` | ✅ Verified |
| User profile / progress | `database.json:profiles[]` | ✅ Verified |
| Schools + coordinates | `database.json:schools[]` | ✅ Verified |
| School selection (session) | `SchoolContext` (React state) | ✅ Correct (UI-only session) |
| Digital Twin canvas | `database.json:digitalTwins{}` | ✅ Verified |
| AI responses | Gemini API (external) | ✅ Proxied via backend |
| Survey responses | `database.json:surveys[]` | ✅ Now implemented |
| JWT session | `localStorage['geosense_token']` | ✅ Auth-only, correct |
| Theme/Locale | `localStorage` (preference) | ✅ UI preference, correct |

---

## API Reference (Full)

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| POST | /api/auth/register | ❌ | any | Register new account |
| POST | /api/auth/login | ❌ | any | Login, get JWT |
| GET | /api/auth/me | ✅ | any | Get current user |
| GET | /api/profile | ✅ | any | Get own profile |
| POST | /api/profile | ✅ | any | Create/update own profile |
| GET | /api/profile/all | ✅ | any | Get all profiles (for leaderboard) |
| GET | /api/profile/accounts | ✅ | any | Get all accounts (safe: id/name/role only) |
| GET | /api/schools | ✅ | any | List schools (optional ?province, ?regency) |
| GET | /api/schools/search | ✅ | any | Search schools by name/regency/province |
| GET | /api/schools/:id | ✅ | any | Get school by ID |
| GET | /api/digital-twin/:schoolId | ❌ | — | Get digital twin canvas (public read) |
| POST | /api/digital-twin/:schoolId | ✅ | dev/teacher | Save digital twin canvas |
| POST | /api/ai/generate | ✅ | any | Gemini AI proxy |
| GET | /api/surveys | ✅ | any | Get survey stats (optional ?schoolId) |
| POST | /api/surveys | ✅ | any | Submit survey response |

---

## Frontend Data Flow

```
User Action (click, input)
    │
    ▼
React Component (UI)
    │
    ▼
Context Hook (useAuth / useSchool) or direct Service call
    │
    ▼
Service Layer (accounts.ts / userProfiles.ts / schoolService.ts / geminiService.ts / surveyService.ts)
    │
    ▼
apiClient.ts (HTTP + JWT injection + error normalization)
    │
    ▼
Backend Route → authMiddleware → Handler → repository.js → database.json
```

**RULE: No component may call `fetch()` directly for domain logic.**

---

## Authentication Flow

```
1. User submits login form (LoginPage.tsx)
2. authenticateAccount() in accounts.ts calls apiClient.post('/api/auth/login')
3. Backend verifies bcrypt hash, issues JWT (7d expiry)
4. Token stored in localStorage['geosense_token']
5. AuthContext loads profile from /api/profile
6. SchoolContext is populated from profile.schoolId via /api/schools/:id
7. All subsequent requests automatically include Bearer token via apiClient
```

---

## Remaining Open Items (Not Implemented / Not Verified)

| Item | Status | Priority |
|---|---|---|
| Giant component extraction (>1000 line files) | NOT DONE | P3 |
| GSS View score computed from real profile data | STATIC DISPLAY | P1 |
| Leaderboard radar chart computed from topicScores | VISUAL APPROXIMATION | P2 |
| Browser E2E runtime verification | NOT VERIFIED | P2 |
| AI API configured in production (.env populated) | NOT VERIFIED | P1 |
| Survey form (UI for submitting answers) | NOT IMPLEMENTED | P2 |
