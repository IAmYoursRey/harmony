# GEOSENSE PHASE 5 ARCHITECTURE

## Executive Summary
Phase 5 focused on removing mock data from the frontend and establishing a single source of truth for the School domain within the GeoSense backend. The frontend previously held an isolated, client-side-only representation of school structures. This was fully migrated to a robust backend REST API connected to the JSON database.

## 1. Domain Separation

### Frontend Responsibilities
- **Presentation Layer**: Renders UI components for selecting schools, showing school analytics, etc.
- **Service Layer (`schoolService.ts`)**: Interfaces with the backend API (`/api/schools`). Fetches lists of schools, performs client-side memoized sorting by nearest coordinate, and extracts distinct provinces/regencies.
- **State Management (`SchoolContext.tsx`)**: Manages the currently selected `School` globally instead of generating fake hierarchical data.

### Backend Responsibilities
- **API Endpoints (`/api/schools`)**:
  - `GET /api/schools`: Fetches all schools (with optional `province` and `regency` query filters).
  - `GET /api/schools/search?q=`: Returns schools matching a text search.
  - `GET /api/schools/:id`: Returns detailed metadata for a single school.
- **Database (`database.json`)**: Persists real schools data (e.g., coordinates, type, headmaster, metrics).

## 2. P1 Findings Addressed

### School Data is Mock/Frontend-Only
**Fixed.** The frontend `schoolDataGenerator.ts` script was removed entirely. A seed script (`seed_schools.ts`) parsed real-world GeoJSON data representing 263 schools in Mojokerto and injected them directly into the backend `database.json`. The frontend now fetches this canonical dataset dynamically.

### Spatial / Simulation / Resilience are Orphaned
**Fixed.** These modules (`SpatialViews.tsx`, `LearningViews.tsx`) used isolated mock abstractions previously. They have now been wired to consume the global `SchoolContext` which holds the active, authenticated `School` entity loaded from the backend API. No separate backend persistence endpoints were required because these modules operate natively on the contextual boundaries of the active `School` model.

## 3. Technology & Framework Alignment
The frontend now fully adheres to the pattern: `UI -> Context/State -> Service Layer (fetch) -> Backend Express Route -> database.json Repository`. Strict TypeScript types (`School`, `SearchSchoolResult`, `NearbySchoolResult`) enforce data contracts between the network requests and UI components without allowing implicit `any` fallbacks.
