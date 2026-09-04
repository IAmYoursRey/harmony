# GEOSENSE DOMAIN OWNERSHIP FINAL
> Phase 8 Master Codebase Audit

## Canonical Domain Ownership Matrix

| Domain | Frontend Layer | Backend Layer | Database | Shared Types | Source of Truth |
|---|---|---|---|---|---|
| **Authentication** | `AuthContext`, `accounts.ts`, `LoginPage` | `routes/auth.js`, `authMiddleware.js` | `accounts[]` | `UserAccount` | **Backend (database.json)** |
| **Profile / Progress** | `AuthContext`, `userProfiles.ts` | `routes/profile.js` | `profiles[]` | `UserProfile`, `TopicScore` | **Backend (database.json)** |
| **Schools** | `SchoolContext`, `schoolService.ts`, `schools.ts` | `routes/schools.js` | `schools[]` | `School`, `SchoolLevel`, `RiskCategory` | **Backend (database.json)** |
| **School Selection (session)** | `SchoolContext` | — | — (memory only) | `SchoolSelection` | **Frontend (React state)** |
| **Digital Twin** | `SpatialViews.tsx` | `routes/digitalTwin.js` | `digitalTwins{}` | — | **Backend (database.json)** |
| **AI / Gemini** | `geminiService.ts`, `LearningViews.tsx` | `routes/ai.js` | — (external API) | `QuizQuestion`, `QuizEvaluation` | **Backend (Gemini API)** |
| **Analytics / Leaderboard** | `AnalyticsViews.tsx` | `routes/profile.js` (GET /all) | `profiles[]` + `accounts[]` | `LeaderboardEntry` | **Backend (database.json)** |
| **Survey** | `AnalyticsViews.tsx` | **MISSING** | **MISSING** | — | ⚠️ **NOT IMPLEMENTED — hardcoded fake data** |
| **Spatial / GeoRiskMap** | `SpatialViews.tsx` | — | — (school data from API) | — | **Frontend (computed from School)** |
| **Simulation (SmartSim)** | `LearningViews.tsx` | `routes/profile.js` (scores persist) | `profiles[]` | `SmartSimParams` | **Backend (profile persistence)** |
| **GeoSense Score (GSS)** | `AnalyticsViews.tsx` | — | — | — | ⚠️ **Frontend (hardcoded display values)** |
| **i18n / Locale** | `I18nContext` | — | `localStorage` (preference) | — | **Frontend (localStorage OK for preference)** |
| **Theme** | `ThemeContext`, `ThemeColorContext` | — | `localStorage` (preference) | — | **Frontend (localStorage OK for preference)** |
| **Notifications / Toast** | `ToastContext` | — | — (ephemeral) | — | **Frontend (ephemeral state)** |

---

## Boundary Violations Found

| Issue | Location | Priority | Action |
|---|---|---|---|
| Raw `fetch()` in `AuthContext.tsx` (line 63) | `frontend/src/context/AuthContext.tsx` | P1 | Migrate to `apiClient.get` |
| Raw `fetch()` in `SpatialViews.tsx` (lines 536, 622) | `frontend/src/components/dashboard/views/SpatialViews.tsx` | P1 | Migrate to `apiClient` |
| `API_URL` duplicated in `AuthContext.tsx` and `SpatialViews.tsx` | both | P1 | Remove; use `apiClient` |
| **Survey data is entirely hardcoded fake static constants** | `AnalyticsViews.tsx` lines 426-497 | P0 | Wire to real backend or mark NOT_IMPLEMENTED |
| **GSS (GeoSense Score) view displays hardcoded metrics** | `AnalyticsViews.tsx` lines 19-44 | P1 | Compute from real profile data |
| Leaderboard mock radar data in modal | `AnalyticsViews.tsx` lines 881-888 | P1 | Compute from real topicScores |
| RoleDashboards mock fallback for charts | `RoleDashboards.tsx` lines 568-586 | P2 | Acceptable empty state with real zeros |
| `GET /api/profile/all` has no auth | `routes/profile.js` line 32 | P0-Security | Add `verifyToken` |
| `GET /api/profile/accounts` has no auth | `routes/profile.js` line 39 | P0-Security | Add `verifyToken` |
| `GET /api/digital-twin/:schoolId` has no auth | `routes/digitalTwin.js` line 8 | P1 | Decide policy — currently public read |
