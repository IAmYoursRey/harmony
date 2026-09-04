# GEOSENSE_DOMAIN_OWNERSHIP

This document establishes the authoritative source of truth for every domain within the GeoSense architecture.

| DOMAIN | Canonical Source | Frontend Reader | Backend Endpoint | Persistence | Mutation Authority | Authorization |
|---|---|---|---|---|---|---|
| **Authentication** | `backend` | `AuthContext`, `accounts.ts` | `/api/auth/login`, `/api/auth/me` | `database.json` (accounts) | Backend | JWT / BCrypt |
| **Users / Accounts** | `backend` | `AuthContext` | `/api/auth/*` | `database.json` (accounts) | Backend | Backend (`verifyToken`) |
| **Profiles (Stats)** | `backend` | `userProfiles.ts` | `/api/profile` | `database.json` (profiles) | Backend | JWT required |
| **Schools** | `backend` | `schoolService.ts` | `/api/schools` | `database.json` (schools) | Backend (Read-only for users) | None (Public data) |
| **School Selection** | `frontend` | `SchoolContext.tsx` | N/A | Memory / LocalStorage (App State) | Frontend | N/A |
| **Leaderboard** | `backend` | `AnalyticsViews.tsx` | `/api/profile/all` | `database.json` (profiles) | Computed from Profiles | JWT required |
| **AI / Gemini Config** | `backend` | `geminiService.ts` | `/api/ai/generate` | External API (Gemini) | Backend | JWT required |
| **Digital Twin** | `backend` | `SpatialViews.tsx` | `/api/digital-twin/:id` | `database.json` (digitalTwins) | Backend | JWT (`teacher`, `dev`) |
| **Spatial / Map State**| `frontend` | `SpatialViews.tsx` | N/A | React State | Frontend | JWT |
| **Simulation** | `backend` | `LearningViews.tsx` | `/api/profile` | `database.json` (profiles -> totalPoints) | Backend | JWT required |
| **Resilience** | `frontend` | `SchoolResilienceIndexView.tsx`| Computed | N/A (Visual Only) | N/A | N/A |
| **Survey** | `frontend` | `SurveyAnalyticsView.tsx` | Computed | N/A (Visual Only) | N/A | N/A |
| **Localization** | `frontend` | `I18nContext.tsx` | N/A | LocalStorage | Frontend | None |
| **Theme** | `frontend` | `ThemeContext.tsx` | N/A | LocalStorage | Frontend | None |

## Key Boundary Enforcement Principles

1. **No Duplicate Datasets:** The frontend must NEVER define local arrays of Schools (e.g., `realSchoolsMojokerto.ts` has been permanently deleted).
2. **No Secret Leakage:** The Gemini API key must NEVER be included in frontend environments (`.env`). It is strictly isolated to the backend proxy wrapper.
3. **No Direct File Access:** The frontend CANNOT directly read `database.json`.
4. **No Fake Persistence:** `localStorage` is exclusively restricted to ephemeral UI preferences (Theme, Locale) and JWT tokens. All authoritative application data modifications MUST transit through the backend API.
