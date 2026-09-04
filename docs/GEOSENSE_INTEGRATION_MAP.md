# GEOSENSE INTEGRATION MAP

This map highlights the actual connections from React Components all the way to the JSON Database. Disconnected routes indicate "pretend" features.

## 1. Authentication (FULLY CONNECTED)
```text
LoginPage
    ↓
accounts.ts (login/register)
    ↓
POST /api/auth/login
    ↓
backend/routes/auth.js (bcrypt validation)
    ↓
database.json (accounts)
```

## 2. User Profile (FULLY CONNECTED)
```text
ProfileView / SchoolSelectionPage / DisasterQuestionView
    ↓
userProfiles.ts (updateProfile)
    ↓
POST /api/profile
    ↓
backend/routes/profile.js
    ↓
database.json (profiles)
```

## 3. Leaderboard (FULLY CONNECTED)
```text
AnalyticsViews (LeaderboardView)
    ↓
userProfiles.ts (getAllProfiles / getAccountMetadata)
    ↓
GET /api/profile/all
GET /api/profile/accounts
    ↓
backend/routes/profile.js
    ↓
database.json (profiles + accounts)
```

## 4. Digital Twin (FULLY CONNECTED)
```text
DigitalTwinView / SpatialViews
    ↓
fetch()
    ↓
GET/POST /api/digital-twin/:schoolId
    ↓
backend/routes/digitalTwin.js (Validates DEV/TEACHER role)
    ↓
database.json (digitalTwin)
```

## 5. AI Quiz (PARTIALLY CONNECTED - EXTERNAL ONLY)
```text
DisasterQuestionView
    ↓
geminiService.ts
    ↓
POST /api/ai/generate
    ↓
backend/routes/ai.js
    ↓
Gemini 1.5 API (External)
    ↓
(Score saved via Profile POST)
```

## 6. Schools (MOCK DATA)
```text
SchoolSelectionPage
    ↓
data/schools.ts
    ↓
schoolDataGenerator.ts (FRONTEND MOCK)
```

## 7. Spatial Map / Simulation / Survey / Resilience (ORPHANS)
```text
GeoRiskMapView / GSSView / SchoolResilienceIndexView
    ↓
(No Service)
    ↓
(No API)
    ↓
FRONTEND ONLY MOCK UI
```
