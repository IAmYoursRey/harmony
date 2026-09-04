# GeoSense Storage Audit

The following keys are stored in the browser's `localStorage` / `sessionStorage`:

| Key | Purpose | Writer | Reader | Authoritative? | Legacy? | Security sensitivity |
|-----|---------|--------|--------|----------------|---------|----------------------|
| `geosense_token` | Stores JWT Auth Token | `data/accounts.ts` | `data/accounts.ts` | YES | No | HIGH (Should consider HttpOnly cookie for production, but acceptable for MVP) |
| `digitaltwin_[ID]` | Caches Digital Twin offline data | `SpatialViews.tsx` | `SpatialViews.tsx` | NO (cache only) | YES | LOW |
| `theme` | Stores dark/light mode preference | `ThemeContext.tsx` | `ThemeContext.tsx` | YES | No | NONE |
| `theme-preset` | Stores UI color preset | `ThemeColorContext.tsx`| `ThemeColorContext.tsx`| YES | No | NONE |
| `theme-custom` | Stores custom UI colors | `ThemeColorContext.tsx`| `ThemeColorContext.tsx`| YES | No | NONE |
| `language` | Stores locale preference | `I18nContext.tsx` | `I18nContext.tsx` | YES | No | NONE |

## Analysis
There is NO duplicate or hidden user identity/profile source in localStorage. 
The authentication token is stored in `localStorage`. 
The `digitaltwin_[ID]` key acts as a local cache but also syncs to the backend via POST API.
