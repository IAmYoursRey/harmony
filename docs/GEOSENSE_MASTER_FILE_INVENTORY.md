# GEOSENSE MASTER FILE INVENTORY
> Generated: Phase 8 Forensic Structural Audit
> Date: 2026-09-04

## SUMMARY

| Category | Count |
|---|---|
| Total source files | 47 |
| Active / KEEP | 38 |
| DELETE / Orphan / Legacy | 4 |
| Configuration | 10 |
| Tests | 1 |
| Documentation | 1 |

---

## BACKEND FILES

| File | Domain | Layer | Owner | Status | Notes |
|---|---|---|---|---|---|
| `backend/server.js` | Core | backend-entry | backend | KEEP | Express bootstrap, CORS, routes |
| `backend/repository.js` | Core | database | backend | KEEP | Read/write `database.json` |
| `backend/database.json` | All | database | backend | KEEP | Single authoritative JSON store |
| `backend/routes/auth.js` | authentication | backend-route | backend | KEEP | Login, Register, Me |
| `backend/routes/profile.js` | profile | backend-route | backend | KEEP | Get/Post profile, all, accounts |
| `backend/routes/schools.js` | school | backend-route | backend | KEEP | List, Search, ById |
| `backend/routes/digitalTwin.js` | digital-twin | backend-route | backend | KEEP | Get/Post twin by schoolId |
| `backend/routes/ai.js` | ai | backend-route | backend | KEEP | Gemini proxy |
| `backend/middleware/authMiddleware.js` | authentication | backend-middleware | backend | KEEP | JWT verifyToken |
| `backend/test_security.js` | testing | test | testing | MOVE→tests/ | Move to `tests/test_security.js` |
| `backend/.env` | configuration | config | backend | KEEP | Secret — not committed |
| `backend/.env.example` | configuration | config | backend | KEEP | Template, no secrets |
| `backend/package.json` | configuration | config | backend | KEEP | deps: express, bcryptjs, jwt, dotenv, @google/genai |

---

## FRONTEND SOURCE FILES

| File | Domain | Layer | Owner | Status | Notes |
|---|---|---|---|---|---|
| `frontend/src/main.tsx` | Core | entry | frontend | KEEP | App bootstrap, providers |
| `frontend/src/App.tsx` | Core | routing | frontend | KEEP | Route definitions |
| `frontend/src/index.css` | UI | styling | frontend | KEEP | Tailwind base + custom design tokens |
| `frontend/src/vite-env.d.ts` | Core | config | frontend | KEEP | Vite types |
| **Components** | | | | | |
| `frontend/src/components/ErrorBoundary.tsx` | UI | component | frontend | KEEP | Error fallback |
| `frontend/src/components/Skeletons.tsx` | UI | component | frontend | KEEP | Loading states |
| `frontend/src/components/SmartReadinessIndex.tsx` | analytics | component | frontend | KEEP | Readiness visualization |
| `frontend/src/components/LogoSpinner.tsx` | UI | component | frontend | KEEP | Loading animation |
| `frontend/src/components/Navbar.tsx` | UI | component | frontend | KEEP | Landing page nav |
| `frontend/src/components/Footer.tsx` | UI | component | frontend | KEEP | Landing footer |
| `frontend/src/components/Hero.tsx` | UI | component | frontend | KEEP | Landing hero |
| `frontend/src/components/HeroIllustration.tsx` | UI | component | frontend | KEEP | Landing illustration |
| `frontend/src/components/AboutSection.tsx` | UI | component | frontend | KEEP | Landing about |
| `frontend/src/components/Features.tsx` | UI | component | frontend | KEEP | Landing features |
| `frontend/src/components/FeatureCards.tsx` | UI | component | frontend | KEEP | Landing feature cards |
| `frontend/src/components/CTA.tsx` | UI | component | frontend | KEEP | Landing CTA |
| `frontend/src/components/Stats.tsx` | UI | component | frontend | KEEP | Landing stats |
| `frontend/src/components/TeamSection.tsx` | UI | component | frontend | KEEP | Landing team |
| `frontend/src/components/SDGs.tsx` | UI | component | frontend | KEEP | Landing SDGs |
| `frontend/src/components/Technology.tsx` | UI | component | frontend | KEEP | Landing tech stack |
| `frontend/src/components/Logo.tsx` | UI | component | frontend | KEEP | Logo component |
| `frontend/src/components/Reveal.tsx` | UI | component | frontend | KEEP | Scroll reveal animation |
| `frontend/src/components/ThemePicker.tsx` | UI | component | frontend | KEEP | Theme color picker |
| `frontend/src/components/SchoolLocationSelector.tsx` | school | component | frontend | KEEP | School picker UI |
| `frontend/src/components/dashboard/Charts.tsx` | analytics | component | frontend | KEEP | Recharts wrappers |
| `frontend/src/components/dashboard/DashboardLayout.tsx` | UI | layout | frontend | KEEP | Dashboard shell |
| `frontend/src/components/dashboard/DashboardView.tsx` | UI | page | frontend | KEEP | Dashboard home |
| `frontend/src/components/dashboard/Sidebar.tsx` | UI | component | frontend | KEEP | Nav sidebar |
| `frontend/src/components/dashboard/Topbar.tsx` | UI | component | frontend | KEEP | Top header bar |
| `frontend/src/components/dashboard/nav.ts` | UI | config | frontend | KEEP | Navigation items |
| `frontend/src/components/dashboard/views/AnalyticsViews.tsx` | analytics/survey | page | frontend | REFACTOR | ~999 lines; contains GSSView+Survey+Leaderboard+SchoolResilienceIndex |
| `frontend/src/components/dashboard/views/LearningViews.tsx` | learning/ai | page | frontend | REFACTOR | ~1246 lines; AILearningView + DisasterQuestionView |
| `frontend/src/components/dashboard/views/RoleDashboards.tsx` | profile/teacher/dev | page | frontend | REFACTOR | ~1390 lines; ProfileView + TeacherDashboard + DevDashboard + RegisterForm |
| `frontend/src/components/dashboard/views/SpatialViews.tsx` | spatial/digital-twin | page | frontend | REFACTOR | ~1111 lines; GeoRiskMapView + DigitalTwinView |
| **Pages** | | | | | |
| `frontend/src/pages/LandingPage.tsx` | UI | page | frontend | KEEP | Landing page |
| `frontend/src/pages/LoginPage.tsx` | authentication | page | frontend | KEEP | Login + register flow |
| `frontend/src/pages/SchoolSelectionPage.tsx` | school | page | frontend | KEEP | School selector page |
| **Contexts** | | | | | |
| `frontend/src/context/AuthContext.tsx` | authentication | context | frontend | KEEP/FIX | Has raw fetch() — must migrate to apiClient |
| `frontend/src/context/SchoolContext.tsx` | school | context | frontend | KEEP | UI-only session state — correct |
| `frontend/src/context/I18nContext.tsx` | i18n | context | frontend | KEEP | Locale switching |
| `frontend/src/context/ThemeContext.tsx` | UI | context | frontend | KEEP | Dark/light mode |
| `frontend/src/context/ThemeColorContext.tsx` | UI | context | frontend | KEEP | Brand color presets |
| `frontend/src/context/ToastContext.tsx` | UI | context | frontend | KEEP | Toast notifications |
| **Services** | | | | | |
| `frontend/src/services/apiClient.ts` | Core | api-client | frontend | KEEP | Unified HTTP client — canonical |
| `frontend/src/services/geminiService.ts` | ai | service | frontend | KEEP | AI feature orchestration |
| `frontend/src/services/schoolService.ts` | school | service | frontend | KEEP | School API calls |
| **Data (API wrappers)** | | | | | |
| `frontend/src/data/accounts.ts` | authentication | api-client | frontend | KEEP | Login/register/token helpers |
| `frontend/src/data/userProfiles.ts` | profile | api-client | frontend | KEEP | Profile CRUD |
| `frontend/src/data/schools.ts` | school | api-client | frontend | KEEP | Re-exports from schoolsTypes + helpers |
| `frontend/src/data/schoolsTypes.ts` | school | type | shared | KEEP | Canonical School types |
| **Types** | | | | | |
| `frontend/src/types/floorplan.ts` | spatial | type | frontend | REVIEW | Check if used |
| **Hooks** | | | | | |
| `frontend/src/hooks/useReveal.ts` | UI | hook | frontend | KEEP | Intersection observer for animations |
| `frontend/src/hooks/useUserLocation.ts` | spatial | hook | frontend | KEEP | Browser geolocation |
| **Utils** | | | | | |
| `frontend/src/utils/geoUtils.ts` | spatial | utility | frontend | KEEP | Haversine distance |

---

## CONFIGURATION FILES

| File | Status | Notes |
|---|---|---|
| `frontend/package.json` | KEEP | Remove `@supabase/supabase-js` ✅ (done) |
| `frontend/vite.config.ts` | KEEP | |
| `frontend/tsconfig*.json` | KEEP | |
| `frontend/eslint.config.js` | KEEP | |
| `frontend/tailwind.config.js` | KEEP | |
| `frontend/postcss.config.js` | KEEP | |
| `frontend/.env` | KEEP | Not committed; only `VITE_API_BASE_URL` |
| `frontend/.env.example` | KEEP | Clean |
| `package.json` (root) | KEEP | Monorepo workspace scripts |

---

## DOCUMENTATION FILES (legacy)

| File | Status | Notes |
|---|---|---|
| `docs/GEOSENSE_*.md` (33 files) | REORGANIZE | Move to `docs/audits/` subdirectory |
