# GEOSENSE PHASE 6 ROLE MATRIX

| Module | Role: `student` | Role: `teacher` | Role: `dev` | Validation |
|--------|-----------------|-----------------|-------------|------------|
| **Login** | Allowed | Allowed | Allowed | `test_runtime_apis.js` PASS (siti.x1 vs dev) |
| **View Profile** | Own Profile Only | Own Profile Only | Own Profile Only | `test_runtime_apis.js` PASS |
| **Edit Profile** | Own Profile Only | Own Profile Only | Own Profile Only | Code inspection |
| **School Selection** | Allowed | Allowed | Allowed | `test_runtime_apis.js` PASS (263 schools loaded via API) |
| **Digital Twin View** | Allowed (Read-only) | Allowed (Read-only) | Allowed (Read-only) | Code inspection |
| **Digital Twin Edit** | **Blocked (403)** | Allowed | Allowed | `test_runtime_apis.js` PASS |
| **Teacher Dashboard**| Hidden | Visible | Visible | `RoleDashboards.tsx` inspection |
| **Student Tools** | Visible | Hidden | Hidden | `RoleDashboards.tsx` inspection |

*Note: Dev accounts function as super-teachers with the ability to export user data and view debug UI overlays.*
