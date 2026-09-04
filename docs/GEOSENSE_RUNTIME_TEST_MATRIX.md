# GEOSENSE RUNTIME TEST MATRIX

Based on end-to-end integration mapping, automated API tests, and static codebase analysis, the following represents the brutal, actual truth about what is functional vs what is merely UI.

| Feature          | UI | API | DB | Auth | Role | Persistence | Runtime | Status |
| ---------------- | -- | --- | -- | ---- | ---- | ----------- | ------- | ------ |
| Register         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** |
| Login            | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** |
| Profile          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** |
| School Selection | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | **PARTIALLY CONNECTED** (Saves ID to profile, but school list is mock data) |
| Leaderboard      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** |
| Analytics        | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | **MOCK DATA** (User list is real, charts/scores are mock data) |
| AI Learning      | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | **PARTIALLY CONNECTED** (Gemini connects, but session history isn't saved) |
| Quiz             | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** (Evaluated by Gemini, score persists to Profile) |
| Digital Twin     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **FULLY CONNECTED** (Auth protected per schoolId) |
| Spatial Map      | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **FRONTEND ONLY** (UI state only) |
| Simulation       | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **FRONTEND ONLY** (UI state only) |
| Survey           | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **NOT IMPLEMENTED** (UI mockups only) |
| Resilience       | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **NOT IMPLEMENTED** (UI mockups only) |
