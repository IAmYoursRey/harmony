# GeoSense API Reference

| Method | Endpoint | Auth | Role | Request | Response | Status |
|--------|----------|------|------|---------|----------|--------|
| POST | `/api/auth/register` | Public | None | `{ name, email, password, role }` | `{ success, token, account }` | ACTIVE |
| POST | `/api/auth/login` | Public | None | `{ email, password }` | `{ success, token, account }` | ACTIVE |
| GET | `/api/auth/me` | Protected | Any | None | `{ account }` | ACTIVE |
| GET | `/api/profile/` | Protected | Any | None | `{ profile }` | ACTIVE |
| POST | `/api/profile/` | Protected | Any | `Partial<UserProfile>` | `{ profile }` | ACTIVE |
| GET | `/api/profile/all` | Public | None | None | `{ profiles }` | ACTIVE |
| GET | `/api/profile/accounts`| Public | None | None | `{ accounts }` | ACTIVE |
| POST | `/api/ai/generate` | Protected | Any | `{ contents, jsonMode }` | `{ text }` | ACTIVE |
| GET | `/api/digital-twin/:id`| Public | None | None | `{ data }` | ACTIVE |
| POST | `/api/digital-twin/:id`| Protected | None | `{ mapImage, nodes, edges }` | `{ success }` | ACTIVE |

## Security Flaws Discovered
- `GET /api/profile/all`: Publicly accessible. Exposes all profile data (scores, etc.).
- `GET /api/profile/accounts`: Publicly accessible. Exposes basic account data.
- `GET /api/digital-twin/:id`: Publicly accessible.
- `POST /api/digital-twin/:id`: Protected by token, but missing ownership check (any user can modify any school's digital twin).
