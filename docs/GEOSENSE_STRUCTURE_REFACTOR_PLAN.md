# GEOSENSE_STRUCTURE_REFACTOR_PLAN

Based on the Phase 1 architectural and repository audits, the following structured refactoring plan will be executed.

## P0 — Security & Data Boundaries (Critical)
* **Secret Leakage Prevention:** `LearningViews.tsx` currently contains code referencing `import.meta.env.VITE_GEMINI_API_KEY`. This must be removed. Gemini keys must only reside in the backend `.env`.
* **Database Access Verification:** Ensure no frontend services attempt to import or fetch `database.json` locally. (Verified: Phase 7 fixed this, but will double-check `import` statements).

## P1 — Broken Architecture & API Integration
* **API Client Normalization:** Currently, `fetch(API_URL + '/api/...')` is scattered across `userProfiles.ts`, `accounts.ts`, `schoolService.ts`, `geminiService.ts`, and component files. We will create a unified `frontend/src/services/apiClient.ts` to manage base URLs, JSON parsing, error handling, and automatically attach the JWT token from `localStorage`.
* **Async Flow Repair:** Ensure that data fetching in giant components (e.g., `AnalyticsViews.tsx`, `RoleDashboards.tsx`) properly handles Loading / Error / Empty states without throwing `TypeError: undefined is not a function`.

## P2 — Maintainability & Dead Code
* **Unused Dependencies:** Remove `@supabase/supabase-js` from `frontend/package.json` since persistence has been migrated entirely to the custom Node/Express backend.
* **Component Extraction:** Break down `LearningViews.tsx` (1246 lines), `RoleDashboards.tsx` (1389 lines), `SpatialViews.tsx` (1110 lines), and `AnalyticsViews.tsx` (998 lines) where simple extractions can reduce cognitive load (e.g., moving charts or sub-views into separate files).
* **Dead Files:** Delete orphaned scripts in `/frontend/scratch` (`convert-to-brand.cjs`, `fix-all-colors.cjs`, etc.), old CSS outputs (`output.css`), and obsolete migration scripts (`seed_schools.ts`, `mergeViews.cjs`).

## P3 — Cosmetic Organization & Types
* **Type Consolidation:** Ensure domains like `School`, `UserAccount`, and `UserProfile` use canonical definitions, preventing duplicate TS errors.
* **Directory Structure Alignment:** Create a `/docs/` folder at the project root and move all temporary Markdown artifacts (like `GEOSENSE_PHASE*`, `GEOSENSE_ANY_AUDIT.md`, `audit_report.md`) out of the root directory to declutter the repository.
