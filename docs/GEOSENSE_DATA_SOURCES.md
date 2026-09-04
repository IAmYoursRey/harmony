# GeoSense Data Sources

| Dataset | Purpose | Owner | Consumers | Canonical? | Legacy? |
|---------|---------|-------|-----------|------------|---------|
| `frontend/src/data/schools.ts` | Search, filtering, querying all schools | Frontend | App components | YES | No |
| `frontend/src/data/schoolDataGenerator.ts` | Generates 38 provinces of pseudo-random but deterministic data | Frontend | `schools.ts` | YES | No |
| `frontend/src/data/realSchoolsMojokerto.ts` | Real school data for Mojokerto | Frontend | `schoolDataGenerator.ts` | YES | No |
| `backend/database.json` | Stores Accounts, Profiles, Digital Twins | Backend | API Routes | YES | No |
| `frontend/src/data/accounts.ts` | Frontend service fetching auth APIs | Frontend | AuthContext | YES | No |
| `frontend/src/data/userProfiles.ts`| Frontend service fetching profile APIs | Frontend | Dashboard | YES | No |

## Analysis
The school data source is completely canonicalized. `schools.ts` exports the unified `schoolData` array which correctly merges the procedural dataset with the real Mojokerto dataset.
The user identity data source is fully migrated to the MERN backend (`database.json`). `localStorage` is no longer used for authoritative storage of accounts or profiles.
