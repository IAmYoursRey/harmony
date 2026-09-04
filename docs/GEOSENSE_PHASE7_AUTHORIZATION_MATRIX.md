# GEOSENSE_PHASE7_AUTHORIZATION_MATRIX

This matrix verifies the explicit access controls implemented across all active Node.js API routes.

## Route Definitions

| Endpoint | Method | Required Role | Enforcement Mechanism | Status |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | None (Public) | Route skips `verifyToken`. | PASSED |
| `/api/auth/register` | POST | None (Public) | Route skips `verifyToken`. | PASSED |
| `/api/auth/me` | GET | `student`, `teacher`, `dev` | `verifyToken` decodes JWT. | PASSED |
| `/api/profile` | GET / POST | `student`, `teacher`, `dev` | Operations act locally on `req.user.id`. | PASSED |
| `/api/profile/all` | GET | `student`, `teacher`, `dev` | Required for Analytics/Leaderboard. | PASSED |
| `/api/schools` | GET | `student`, `teacher`, `dev` | Global read access required. | PASSED |
| `/api/schools/:id` | GET | `student`, `teacher`, `dev` | Global read access required. | PASSED |
| `/api/digital-twin/:id` | GET | `student`, `teacher`, `dev` | Global read access required. | PASSED |
| `/api/digital-twin/:id` | POST | `teacher`, `dev` | Hardcoded block: `req.user.role !== 'teacher' && req.user.role !== 'dev'` throws 403. | PASSED |
| `/api/ai/generate` | POST | `student`, `teacher`, `dev` | Token required. | PASSED |

## Validation
These constraints were successfully verified using the custom `test_security.js` integration suite executed directly against the live backend daemon.
