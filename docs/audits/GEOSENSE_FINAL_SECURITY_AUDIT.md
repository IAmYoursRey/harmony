# GEOSENSE FINAL SECURITY AUDIT
> Phase 8 — Authorization & Boundary Validation

## P0 Security Findings — Fixed

### 1. Unauthenticated Profile Data Endpoints
**Severity:** HIGH  
**Status:** FIXED ✅

`GET /api/profile/all` and `GET /api/profile/accounts` both lacked auth middleware. Any unauthenticated request could enumerate all user profiles and account names.

**Fix:** Added `verifyToken` to both routes.

### 2. Raw fetch() calls bypassing apiClient
**Severity:** MEDIUM  
**Status:** FIXED ✅

`AuthContext.tsx` line 63 and `SpatialViews.tsx` lines 536, 622 were using direct `fetch()` with manual token injection instead of the centralized `apiClient`. This created fragile auth header management.

**Fix:** All calls migrated to `apiClient.get()` / `apiClient.post()`.

### 3. Gemini API key in frontend
**Severity:** CRITICAL (was present in Phase 5)  
**Status:** ALREADY FIXED ✅  

No `VITE_GEMINI_API_KEY` reference in any frontend file. Key is backend-only.

---

## Remaining Authorization Matrix

| Route | Auth Required | Role Required | IDOR Check | Status |
|---|---|---|---|---|
| `POST /api/auth/register` | ❌ (public) | — | N/A | ✅ OK |
| `POST /api/auth/login` | ❌ (public) | — | N/A | ✅ OK |
| `GET /api/auth/me` | ✅ JWT | any | Self-only | ✅ OK |
| `GET /api/profile` | ✅ JWT | any | Self-only (by userId from token) | ✅ OK |
| `POST /api/profile` | ✅ JWT | any | Self-only | ✅ OK |
| `GET /api/profile/all` | ✅ JWT | any | No IDOR (returns all, no user-specific data) | ✅ Fixed |
| `GET /api/profile/accounts` | ✅ JWT | any | No IDOR (safe public fields only) | ✅ Fixed |
| `GET /api/schools` | ✅ JWT | any | Public school data | ✅ OK |
| `GET /api/schools/search` | ✅ JWT | any | Public school data | ✅ OK |
| `GET /api/schools/:id` | ✅ JWT | any | Public school data | ✅ OK |
| `GET /api/digital-twin/:schoolId` | ❌ (public) | — | No personal data | ⚠️ By design — school floor plans public |
| `POST /api/digital-twin/:schoolId` | ✅ JWT | `dev` or `teacher` | Role-check enforced | ✅ OK |
| `POST /api/ai/generate` | ✅ JWT | any | No user data stored | ✅ OK |
| `GET /api/surveys` | ✅ JWT | any | Filtered by schoolId query | ✅ OK |
| `POST /api/surveys` | ✅ JWT | any | Prevents duplicate per userId+schoolId | ✅ OK |

---

## Storage Audit

| Storage | Usage | Classification | Status |
|---|---|---|---|
| `localStorage['geosense_token']` | JWT Bearer token | AUTH | ✅ Correct |
| `localStorage['geosense_locale']` | Language preference | PREFERENCE | ✅ Correct |
| `localStorage['theme']` | Dark/light mode | PREFERENCE | ✅ Correct |
| No other localStorage found | — | — | ✅ Clean |

## Environment Variables Audit

| Variable | Location | Secret? | Status |
|---|---|---|---|
| `GEMINI_API_KEY` | `backend/.env` | ✅ Yes | ✅ Backend-only |
| `JWT_SECRET` | `backend/.env` | ✅ Yes | ✅ Backend-only |
| `PORT` | `backend/.env` | No | ✅ OK |
| `VITE_API_BASE_URL` | `frontend/.env` | No | ✅ OK (public config) |

**No secrets found in frontend .env files.**
