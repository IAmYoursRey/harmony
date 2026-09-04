# GEOSENSE_PHASE7_SIMULATION_DECISION

## Context
During the Phase 7 architectural audit, the user requested an explicit review of the **Simulation**, **Survey**, and **Resilience** modules to determine their persistence pathways and ensure compliance with the "no fake data" rule.

## Decisions

### 1. Simulation (`LearningViews.tsx` -> SmartSim)
- **Status:** **Fully Connected and Persistent**
- **Action:** The simulation engine historically used an offline `recordSmartSimulationAnswers` mutation that only acted on mock data. We have refactored `LearningViews.tsx` to automatically push earned simulation points (`totalPoints`) and flag topics as mastered (`topicScores[t].averageScore = 100`) directly back to the active user's backend profile via `updateUserProfile()`. This updates `database.json` and accurately reflects progress on the Analytics dashboard.

### 2. Survey & Resilience Modules
- **Status:** **Frontend Only Computations / Data Visualizations**
- **Action:** No actual "Survey Submission" forms exist within the codebase; rather, these modules are currently conceptual dashboard visualizations in the Teacher view demonstrating how survey metadata *would* be analyzed. 
- **Conclusion:** Because there are no backend user submission forms to capture, we did not architect a new `surveys` table. We recognize these components as localized frontend visual components meant for presentation. They are not mocking a broken request flow, they are purely visual presentation widgets.

## AI / Gemini Recovery
- **Status:** **Strict Fail-Fast Applied**
- **Action:** `geminiService.ts` previously caught AI timeouts or rate limits and silently injected predefined, hardcoded fallback quizzes. This was deemed deceptive under the Phase 7 mandate. The fallback mechanisms were entirely purged. If the API fails, the backend bubbles up a standard error to the UI, allowing it to render an honest failure state.
