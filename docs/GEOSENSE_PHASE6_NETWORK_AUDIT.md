# GEOSENSE PHASE 6 NETWORK AUDIT

*Note: Due to a failure in the Chromium/Playwright browser driver environment, dynamic browser-level network tab interception could not be captured. This audit was constructed from static analysis of the frontend Service Layer and `fetch` calls.*

## 1. Authentication
- **Select School**: 
  - `POST /api/auth/login`
  - Expected Status: `200` (Success), `401` (Invalid credentials).
  - Consumer: `AuthContext.tsx`.

## 2. Profile & Dashboard
- **Fetch Profile**: 
  - `GET /api/profile`
  - Expected Status: `200`.
  - Headers: `Authorization: Bearer <jwt>`.
  - Consumer: `AuthContext.tsx`.

## 3. School Selection
- **Fetch All Schools**:
  - `GET /api/schools`
  - Expected Status: `200`.
  - Consumer: `schoolService.ts` -> `RoleDashboards.tsx`, `SchoolSelectionPage.tsx`.
- **Search School**:
  - `GET /api/schools/search?q=<query>`
  - Expected Status: `200`.
  - Consumer: `schoolService.ts` -> `SchoolLocationSelector.tsx`.

## 4. Digital Twin
- **Fetch Configuration**:
  - `GET /api/digital-twin/:schoolId`
  - Expected Status: `200`.
  - Consumer: `SpatialViews.tsx`.
- **Save Configuration**:
  - `POST /api/digital-twin/:schoolId`
  - Expected Status: `200` (Teacher/Dev), `403` (Student).
  - Payload: `{ configurations: [...] }`.

## 5. AI Learning
- **Chat/Quiz**:
  - `POST /api/ai/chat`
  - Expected Status: `200`.
  - Payload: `{ message: string, history: array }`.
  - Consumer: `geminiService.ts`.
