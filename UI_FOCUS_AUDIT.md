# UI FOCUS AUDIT — GeoSense

Scope: UI/UX and visible interaction behavior only. No backend/data architecture changes.

## Findings fixed

1. Topbar search looked functional but had no interaction logic.
   - Replaced misleading content-search placeholder with a lightweight menu search.
   - Search now filters navigation items, opens matching views, supports Enter, and shows a useful empty state.

2. Topbar notification bell was a misleading dead-end.
   - It previously navigated to AI Learning while presenting itself as notifications.
   - Replaced with a real notification popover and explicit empty state.

3. Survey “Unduh Laporan” was visually presented as a download action but only showed an informational toast.
   - Implemented an actual CSV download containing the available survey summary metrics.
   - Success/error states remain inside the existing toast system.

4. Digital Twin navigation fallback label was inconsistent with the intended product UI.
   - Updated nav fallback label to “Kembaran Digital”.
   - Internal route remains `digital-twin`.

## UI consistency checks

- Existing navigation routes were cross-checked against App.tsx routes.
- Existing interactive controls with real handlers were preserved.
- Existing Student Room/Game route was preserved.
- Existing `simulation` route/internal ID was preserved.
- No unrelated feature was removed.
- No backend/API/database/auth behavior was changed.

## Existing items intentionally not removed

Some controls are real stateful controls, modal controls, editor controls, upload controls, or navigation controls even when their implementation is local to the component. They were not treated as dead UI merely because they do not call an API.

## Verification limitation

The bundled frontend `node_modules` is incomplete/non-resolvable in the supplied archive, so a clean TypeScript/build verification could not be completed from the archive alone. The source changes themselves were applied to the project files.

## Modified UI files

- frontend/src/components/dashboard/Topbar.tsx
- frontend/src/components/dashboard/nav.ts
- frontend/src/components/dashboard/views/analytics/SurveyAnalyticsView.tsx
