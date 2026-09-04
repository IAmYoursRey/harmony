# GEOSENSE_PHASE7_CODEBASE_INVENTORY

## 1. Overview
The GeoSense repository has been fully audited and cleaned up in Phase 7. The primary goal was to eradicate frontend-only mock dependencies (`localStorage`, hardcoded mock objects) and ensure a robust, single source of truth originating from the Node.js backend.

## 2. Directory Structure

### Backend (`d:\vscode\GeoSense\backend`)
* `server.js` - Main entry point and Express configuration.
* `repository.js` - Data access layer interfacing directly with `database.json`.
* `database.json` - The absolute single source of truth for Accounts, Profiles, DigitalTwins, and Schools.
* `middleware/authMiddleware.js` - JWT parsing and route protection middleware.
* `routes/`
  * `auth.js` - Login and registration.
  * `profile.js` - Fetch and update `topicScores`, `totalPoints`, and `masteredConcepts`.
  * `schools.js` - Access to the 263 real schools imported from Mojokerto.
  * `digitalTwin.js` - RBAC-protected endpoints for graph-based digital twin map configs.
  * `ai.js` - Proxy wrapper for Google Gemini generation tasks.

### Frontend (`d:\vscode\GeoSense\frontend\src`)
* `context/`
  * `AuthContext.tsx` - Interacts with `profile.js` and `auth.js`.
  * `SchoolContext.tsx` - Manages the globally selected active school instance.
* `services/`
  * `schoolService.ts` - Data bridge fetching real schools from `/api/schools`.
  * `geminiService.ts` - Cleaned service that throws real errors on AI failure instead of returning mocked responses.
* `data/` (API Wrappers, NO mock data)
  * `userProfiles.ts` - Abstractions for fetching and posting to `/api/profile`.
  * `accounts.ts` - Token management and `/api/auth` wrappers.
  * `schoolsTypes.ts` - Interfaces for the domain models.
* `components/dashboard/views/`
  * `AnalyticsViews.tsx` - Dynamically fetches `profiles`, `accounts`, and `schools` from the backend to construct leaderboard and statistics.
  * `LearningViews.tsx` - Quiz and simulation executor; securely persists earned points and mastery flags via `userProfiles.ts` API wrappers.
  * `SpatialViews.tsx` - The Digital Twin builder and viewer. Purely dependent on `SchoolContext` and `/api/digital-twin/:id` endpoints.
  * `RoleDashboards.tsx` - Central hub rendering respective metrics for dev/teacher/student roles based on secure backend profiles.

## 3. Notable Deletions
* **`frontend/src/data/realSchoolsMojokerto.ts`**: Permanently deleted. All spatial, analytics, and dashboard components now query the active `SchoolContext` or resolve names against dynamically fetched backend data.
* **`frontend/src/services/geminiService.ts` mocks**: Hardcoded fallback quizzes removed. Errors gracefully throw.

## 4. Source of Truth
The exact and only location for state persistence is **`backend/database.json`**. LocalStorage is strictly limited to ephemeral visual preferences (`theme`, `language`) and the JWT token (`geosense_token`).
