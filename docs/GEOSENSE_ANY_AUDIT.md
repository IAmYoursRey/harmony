# GeoSense `any` Audit

Based on the forensic scan of `frontend/src`:

| File | Line | Why any exists | Actual Type | Replacement Type | Status |
|------|------|----------------|-------------|------------------|--------|
| `services/geminiService.ts` | 197 | `const essayQuestions: any[] = []` | Parsed JSON AI output | `ParsedQuestion[]` | Needs fix |
| `data/accounts.ts` | 36 | `catch (err: any)` | API Fetch Error | `unknown` | Needs fix |
| `data/accounts.ts` | 58 | `catch (err: any)` | API Fetch Error | `unknown` | Needs fix |
| `components/SchoolLocationSelector.tsx`| 247 | `handleGlobalSelect(result: any)` | Search result | `NearbySchoolResult` | Needs fix |
| `components/SchoolLocationSelector.tsx`| 256 | `handleNearSelect(sch: any, ...)` | Selected school | `School` | Needs fix |
| `views/RoleDashboards.tsx` | 140 | `const accountUpdates: any` | Form Data payload | `Partial<UserAccount>` | Needs fix |
| `views/RoleDashboards.tsx` | 549 | `Object.values(p.topicScores) as any[]`| Topic Scores | `TopicScore[]` | Needs fix |
| `views/RoleDashboards.tsx` | 550 | `reduce((sum, s: any)` | Topic Score iteration | `TopicScore` | Needs fix |
| `views/RoleDashboards.tsx` | 565 | `sort((a: any, b: any)` | Mapped student rank | `StudentRank` | Needs fix |
| `views/RoleDashboards.tsx` | 568 | `reduce((sum, s: any)` | Mapped student rank | `StudentRank` | Needs fix |
| `views/RoleDashboards.tsx` | 738 | `students.map((s: any)` | Students array | `StudentRank` | Needs fix |
| `views/RoleDashboards.tsx` | 960 | `const profileUpdates: any` | Form Data payload | `Partial<UserProfile>` | Needs fix |
| `views/RoleDashboards.tsx` | 973 | `catch (e: any)` | Network error | `unknown` | Needs fix |
| `views/AnalyticsViews.tsx` | 859 | `leaderboardData: any[]` | Leaderboard items | `LeaderboardEntry[]`| Needs fix |
| `views/LearningViews.tsx` | 1039| `const st = (opt as any).subTopic` | Option parsed from JSON | `ParsedOption` | Needs fix |

## Next Steps
All instances of `any` will be replaced with their correct TypeScript interfaces/types or `unknown`.
