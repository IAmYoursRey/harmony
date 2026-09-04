# GEOSENSE PHASE 5 INTEGRATION

This document summarizes the mapping of Frontend Modules to Backend Sources of Truth post-Phase 5.

## 1. School Selection (`SchoolSelectionPage.tsx`, `SchoolLocationSelector.tsx`)
- **Old Behavior**: Read from static array in `schoolDataGenerator.ts`.
- **New Behavior**: Calls `schoolService.getAllSchools()` -> Backend `GET /api/schools`.
- **Status**: **INTEGRATED**.

## 2. Auth Context & Profile (`AuthContext.tsx`)
- **Old Behavior**: Synced current profile to a locally generated static school object via `findSchool`.
- **New Behavior**: Upon user login, calls `schoolService.getSchoolById(schoolId)` -> Backend `GET /api/schools/:id` and populates the global `SchoolContext`.
- **Status**: **INTEGRATED**.

## 3. Administrative Dashboards (`RoleDashboards.tsx`)
- **Old Behavior**: Teacher registration loops iterated over a static mock graph of `schoolData`.
- **New Behavior**: React component state `allSchools` fetches from `GET /api/schools`. Dropdowns dynamically extract unique provinces and regencies from the live backend data.
- **Status**: **INTEGRATED**.

## 4. Dependent Modules (`SpatialViews.tsx`, `LearningViews.tsx`, `AnalyticsViews.tsx`)
- **Old Behavior**: Directly imported `findSchool` or `schoolData` to resolve dependencies.
- **New Behavior**: Inherits the `School` entity from `useSchool().selection.school`. No local fetching or hardcoded data manipulation required.
- **Status**: **INTEGRATED**.
