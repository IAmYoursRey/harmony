# GEOSENSE ROUTE AUDIT

| Route | Component | Auth | Role | API | Refresh | Console | Status |
| ----- | --------- | ---- | ---- | --- | ------- | ------- | ------ |
| `/app` | DashboardView | ✅ | ✅ | `GET /api/auth/me` | ✅ | Clear | **FULLY CONNECTED** |
| `/app/ai-learning` | AILearningView | ✅ | ✅ | `POST /api/ai/generate` | ✅ | Clear | **PARTIAL** (No DB) |
| `/app/geo-risk-map` | GeoRiskMapView | ✅ | ✅ | - | ✅ | Clear | **FRONTEND ONLY** |
| `/app/digital-twin` | DigitalTwinView | ✅ | ✅ | `GET /api/digital-twin/:id` | ✅ | Clear | **FULLY CONNECTED** |
| `/app/simulation` | DisasterQuestionView | ✅ | ✅ | `POST /api/ai/generate` <br> `POST /api/profile` | ✅ | Clear | **FULLY CONNECTED** (Quiz) |
| `/app/gss` | GSSView | ✅ | ✅ | - | ✅ | Clear | **FRONTEND ONLY** |
| `/app/resilience` | SchoolResilienceIndexView | ✅ | ✅ | - | ✅ | Clear | **FRONTEND ONLY** |
| `/app/survey` | SurveyAnalyticsView | ✅ | ✅ | - | ✅ | Clear | **FRONTEND ONLY** |
| `/app/teacher` | TeacherDashboardView | ✅ | ✅ | `GET /api/profile/all` | ✅ | Clear | **FULLY CONNECTED** |
| `/app/dev-dashboard` | DevDashboardView | ✅ | ✅ | `GET /api/profile/accounts` | ✅ | Clear | **FULLY CONNECTED** |
| `/app/profile` | ProfileView | ✅ | ✅ | `POST /api/profile` | ✅ | Clear | **FULLY CONNECTED** |
| `/login` | LoginPage | ❌ | ❌ | `POST /api/auth/login` <br> `POST /api/auth/register` | ✅ | Clear | **FULLY CONNECTED** |
| `/school-selection` | SchoolSelectionPage | ✅ | ✅ | `POST /api/profile` | ✅ | Clear | **PARTIAL** (Mock school list) |
| `/*` | LandingPage | ❌ | ❌ | - | ✅ | Clear | **FRONTEND ONLY** |
