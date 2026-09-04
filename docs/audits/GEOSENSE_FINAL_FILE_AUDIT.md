# GEOSENSE FINAL FILE AUDIT
> Phase 8 Master Structural Cleanup

## Summary Counts

| Category | Count |
|---|---|
| Total source files audited | 56 |
| Active / KEEP | 51 |
| Moved to new location | 1 |
| Deleted (dead constants) | 72 lines |
| Created (new) | 2 |

---

## File Actions Table

| File | Old Location | New Location | Action | Reason |
|---|---|---|---|---|
| `test_security.js` | `backend/test_security.js` | `tests/test_security.js` | MOVED | Tests belong in `tests/` root directory |
| `surveys.js` | — | `backend/routes/surveys.js` | CREATED | Survey backend route (POST/GET) |
| `surveyService.ts` | — | `frontend/src/services/surveyService.ts` | CREATED | Survey API client |
| Static survey constants | `AnalyticsViews.tsx` lines 427-498 | DELETED | Dead code replaced by real API | Hardcoded `topicData`, `pieData`, `radarData`, `donutData`, `summaryStats`, `recommendations` removed |
| Raw `fetch()` in `AuthContext.tsx` | Line 63 | Replaced with `apiClient.get()` | FIXED | All HTTP must go through `apiClient` |
| Raw `fetch()` in `SpatialViews.tsx` | Lines 536, 622 | Replaced with `apiClient.get/post()` | FIXED | All HTTP must go through `apiClient` |
| `API_URL` in `AuthContext.tsx` | Line 20 | DELETED | Duplicate, `apiClient` handles it |
| `API_URL` in `SpatialViews.tsx` | Line 9 | DELETED | Duplicate, `apiClient` handles it |
| `getToken` in `SpatialViews.tsx` | Line 8 | DELETED | No longer needed; `apiClient` injects auth |
| Unprotected `GET /api/profile/all` | `routes/profile.js` line 32 | `verifyToken` added | SECURED | Was exposing all user profiles without auth |
| Unprotected `GET /api/profile/accounts` | `routes/profile.js` line 39 | `verifyToken` added | SECURED | Was exposing all account names without auth |
| `DEFAULT_DB.surveys` | `backend/repository.js` | `surveys: []` added | FIXED | New surveys domain needs initialization |

---

## Remaining Known Issues (Not Implemented)

| Issue | Location | Priority | Reason Not Fixed |
|---|---|---|---|
| GSS view uses hardcoded metrics (88, 82, 76...) | `AnalyticsViews.tsx` lines 19-25 | P1 | Would require a dedicated scoring engine; not a P0 |
| Leaderboard modal radar chart uses `Math.min(100, 40 + (totalPoints % 60))` | `AnalyticsViews.tsx` lines 882-888 | P2 | Visual approximation acceptable; not domain data |
| RoleDashboards fallback chart shows zeros with `classAverage` | `RoleDashboards.tsx` lines 568-586 | P2 | Acceptable empty state; not fake domain data |
| `updateUserAccount` stub returns `Not implemented` | `AuthContext.tsx` | P3 | No backend endpoint exists; documented honestly |
| Giant component extraction (>1000 lines) | 4 view files | P3 | In scope for next session per plan |
| Digital twin GET has no auth | `routes/digitalTwin.js` line 8 | P2 | Public read is by design (school floor plans are public) |
