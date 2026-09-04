# GEOSENSE PHASE 5 AUTH MATRIX

This document verifies the Authorization and Authentication rules for the integration phase, ensuring the backend endpoints enforce proper security boundaries.

## Endpoints

| Endpoint                      | Method | Role Requirement       | Status   | Notes                                                        |
|-------------------------------|--------|------------------------|----------|--------------------------------------------------------------|
| `/api/schools`                | GET    | Authenticated (Token)  | **PASS** | Valid JWT required. Unauthenticated returns 401 Unauthorized.|
| `/api/schools/search`         | GET    | Authenticated (Token)  | **PASS** | Valid JWT required.                                          |
| `/api/schools/:id`            | GET    | Authenticated (Token)  | **PASS** | Valid JWT required.                                          |
| `/api/digital-twin`           | POST   | `teacher` Only         | **PASS** | Enforced via `requireTeacher`. Students return 403.          |
| `/api/digital-twin/:schoolId` | GET    | Authenticated (Token)  | **PASS** | Both students and teachers can view DT configurations.       |
| `/api/auth/login`             | POST   | Public                 | **PASS** | Generates JWT and bcrypt validates hash.                     |
| `/api/profile`                | GET    | Authenticated (Token)  | **PASS** | Valid JWT required. Fetches context for the user.            |

## Verification Script
`test_phase5.js` was run against the backend, yielding the following results:
- **Login**: SUCCESS (JWT generated).
- **Profile Fetch**: SUCCESS (using JWT).
- **School Fetch**: SUCCESS (Fetched 263 records securely with JWT).
- **Digital Twin Mutation**: BLOCKED (Expected 403 Forbidden for Student accounts).
