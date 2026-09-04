# GEOSENSE_PHASE7_CLEANUP_REPORT

## Removals and Refactors

### 1. Hardcoded School Arrays
* **Deleted File:** `frontend/src/data/realSchoolsMojokerto.ts`
* **Reason:** Violated the Phase 5/7 rule against frontend state for the domain layer. All components (Dashboards, Analytics, Spatial) that statically imported this file were refactored to consume the `getAllSchools()` service which hits `/api/schools`, or directly utilize `SchoolContext`.

### 2. Mock Analytics
* **Deleted Variable:** `mockActivity` within `AnalyticsViews.tsx`.
* **Reason:** Artificially generated chart variance based on modulus operators. This was removed entirely. The application now displays a graceful empty state ("Belum ada data aktivitas") for new users.

### 3. Gemini "Silent Failure" Shims
* **Deleted Code:** `getMockQuizQuestions` and the `generateQuiz` legacy wrapper within `geminiService.ts`.
* **Reason:** Swallowed actual Gemini API timeouts or rate limits and blindly returned hardcoded pre-test and post-test questions. We now propagate actual errors up the chain for honest UI handling.

### 4. Local Storage Caching Anti-Pattern
* **Deleted Logic:** `localStorage.setItem('digitaltwin_...')` inside `SpatialViews.tsx`.
* **Reason:** Digital Twin configurations for map nodes and edges were saving to the browser even if the backend `POST` failed or the role was unauthorized, creating a deceptive state. This caching layer was excised.

## API Wrapping Services
Note: `src/data/userProfiles.ts` and `src/data/accounts.ts` were strictly inspected. They are **NOT** mock files. They successfully act as isomorphic frontend abstractions bridging to `/api/profile` and `/api/auth`. They have been kept intact.
