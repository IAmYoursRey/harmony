# GEOSENSE SOURCE OF TRUTH

This document identifies which layer of the application is the actual owner/authority over specific domain entities.

| Entity | Canonical Owner | Frontend Cache | Backend Source | Database Source | Notes |
| ------ | --------------- | -------------- | -------------- | --------------- | ----- |
| **User Account** | Backend | `AuthContext` state | `auth.js` | `database.json` (`accounts`) | Backend handles all hashing and JWT minting. |
| **Profile** | Backend | `AuthContext` state | `profile.js` | `database.json` (`profiles`) | User progress, avatar, totalPoints, and selected schoolId are strictly governed here. |
| **School Data** | Frontend | `data/schools.ts` | **NONE** | **NONE** | Massive flaw. 100% of schools are generated via a frontend mock factory. |
| **Leaderboard** | Backend | `AnalyticsViews` memo | `profile.js` | `database.json` (`profiles`) | The backend sends all profiles; frontend currently handles sorting. |
| **Analytics Charts**| Frontend | Component state | **NONE** | **NONE** | Hardcoded arrays (e.g. `mockActivity`) pretend to be real analytics. |
| **Digital Twin** | Backend | Component state | `digitalTwin.js`| `database.json` (`digitalTwin`) | Backend successfully governs write permissions based on JWT roles. |
| **AI Quizzes** | External | `geminiService.ts` | `ai.js` | **NONE** | The backend is a transparent proxy to Gemini. The questions themselves are never saved. |
| **Quiz Scores** | Frontend | `DisasterQuestionView` | `profile.js` | `database.json` (`profiles`) | The frontend calculates the final score and sends the aggregate total to the Profile API. |

## DATABASE UPDATES
- `accounts`
- `profiles`
- `schools` (Migrated in Phase 5)

## 6. PHASE 5 MIGRATIONS
- **`schoolDataGenerator.ts`** is fully deprecated and deleted.
- **Frontend Source of Truth for Schools**: `SchoolContext` via `schoolService.ts` -> Backend API.
- **Backend Source of Truth for Schools**: `/api/schools` mapping to `database.json -> "schools"`.

## STRICT RULES
1. NEVER use implicit `any`.
2. NEVER skip typescript/eslint validations.
3. NEVER mock an API response on the frontend if a real endpoint is required.
4. If a feature needs data, create a backend domain for it in `database.json`.
