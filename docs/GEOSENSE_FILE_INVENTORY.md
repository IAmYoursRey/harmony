# GEOSENSE_FILE_INVENTORY

This document provides a comprehensive classification of all files within the GeoSense repository to determine their purpose, owner, and whether they should be retained, refactored, or deleted.

## 1. Backend (`/backend`)

| File | Classification | Purpose | Owner | Notes |
|---|---|---|---|---|
| `database.json` | KEEP (Source of Truth) | Authoritative persistence layer for all domains. | Backend | Must never be accessed directly by frontend. |
| `server.js` | KEEP | Express entry point and middleware configuration. | Backend | Core application file. |
| `repository.js` | KEEP | Data access layer bridging logic to `database.json`. | Backend | |
| `test_security.js` | TEST | E2E API integration tests. | QA / Backend | Important for validating RBAC. |
| `routes/auth.js` | KEEP | Authentication endpoints (login/register). | Backend | |
| `routes/profile.js` | KEEP | User progress, scores, and analytics. | Backend | |
| `routes/digitalTwin.js` | KEEP | RBAC protected Digital Twin configuration endpoints. | Backend | |
| `routes/schools.js` | KEEP | School data retrieval endpoints. | Backend | |
| `routes/ai.js` | KEEP | Secure Gemini API wrapper. | Backend | |
| `middleware/authMiddleware.js` | KEEP | JWT verification. | Backend | |
| `.env` / `.env.example` | CONFIG | Environment variables. | DevOps | `.env.example` should not contain real secrets. |
| `package.json` | CONFIG | Backend dependencies. | DevOps | |

## 2. Frontend Source (`/frontend/src`)

| File / Folder | Classification | Purpose | Owner | Notes |
|---|---|---|---|---|
| `main.tsx`, `App.tsx` | KEEP | React application entry point and root layout. | Frontend | |
| `index.css` | KEEP | Global styles and Tailwind imports. | Frontend / UX | |
| `components/dashboard/views/AnalyticsViews.tsx` | REFACTOR | Leaderboard and user statistics. | Frontend | Giant component. Needs extraction if possible. |
| `components/dashboard/views/LearningViews.tsx` | REFACTOR | AI Quiz and Simulation engine. | Frontend | Giant component. |
| `components/dashboard/views/RoleDashboards.tsx` | REFACTOR | Role-specific dashboard views. | Frontend | Giant component. |
| `components/dashboard/views/SpatialViews.tsx` | REFACTOR | Digital Twin map builder. | Frontend | Giant component. |
| `context/*.tsx` | KEEP | Global state providers (Auth, School, Theme, I18n). | Frontend | |
| `data/accounts.ts` | KEEP | API wrapper for `/api/auth`. | Frontend / API | No mock data. |
| `data/userProfiles.ts` | KEEP | API wrapper for `/api/profile`. | Frontend / API | No mock data. |
| `data/schools.ts` | KEEP | API wrapper for `/api/schools`. | Frontend / API | No mock data. |
| `data/schoolsTypes.ts` | KEEP | Canonical TypeScript interfaces for Schools. | Frontend | |
| `services/geminiService.ts` | KEEP | Wrapper for `/api/ai/generate`. | Frontend / API | Mock failovers were removed in Phase 7. |
| `services/schoolService.ts` | KEEP | Orchestrates fetching active schools. | Frontend / API | |

## 3. Frontend Config & Root (`/frontend`)

| File | Classification | Purpose | Owner | Notes |
|---|---|---|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.*` | CONFIG | Build and TypeScript configuration. | DevOps | |
| `eslint.config.js`, `postcss.config.js`, `tailwind.config.js` | CONFIG | Linting and styling configuration. | DevOps | |
| `seed_schools.ts` | DELETE / LEGACY | Old migration script. | Unknown | Unused in production. Move to `scripts/` or delete. |
| `mergeViews.cjs` | DELETE / LEGACY | Old codebase refactoring script. | Unknown | Delete. |

## 4. Frontend Scratch / Dead Files (`/frontend/scratch`)

| File | Classification | Purpose | Owner | Notes |
|---|---|---|---|---|
| `convert-to-brand.cjs` | DELETE | Temporary CSS modification script. | None | Orphaned artifact. |
| `fix-all-colors.cjs` | DELETE | Temporary CSS modification script. | None | Orphaned artifact. |
| `format*.cjs` | DELETE | Temporary formatting scripts. | None | Orphaned artifact. |
| `generate*.cjs` | DELETE | Temporary CSS generation scripts. | None | Orphaned artifact. |
| `output.css`, `output2.css` | DELETE | Stale generated CSS output. | None | Orphaned artifact. |
| `test_agents.py` | DELETE | Irrelevant Python test script in a TS codebase. | None | Orphaned artifact. |

## 5. Documentation & Metadata

| File / Folder | Classification | Purpose | Owner | Notes |
|---|---|---|---|---|
| `.agents/` | DOCUMENTATION | Antigravity AI agent definitions. | DevOps | Keep as metadata. |
| `.vscode/` | CONFIG | Workspace settings. | DevOps | Keep. |
