# Harmony Project Agent & Master Skills Architecture Directive

This workspace enforces strict adherence to the **6-Phase Master Skill Lifecycle Pipeline** for all conversations, AI reasoning, coding, research, and debugging operations. Every agent and model must systematically traverse these phases to achieve optimal, verified, hallucination-free outcomes.

---

## 🏛️ Master Skills Taxonomy & Optimal Execution Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER AI AGENT EXECUTION PIPELINE                            │
├───────────────────┬──────────────────────────────────┬──────────────────────────────────┤
│ Phase 0           │ META & PROMPT OPTIMIZATION       │ • system-prompt-mastery          │
│ The Foundation    │ Ground personas, parse schemas,  │ • prompt-optimizer               │
│                   │ set negative constraints & tags. │ • skill-creator                  │
│                   │ Epistemic discernment & skills.  │ • discernment-nudge              │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 1           │ DISCOVERY & TEMPORAL INTEL       │ • last30days (temporal recency)  │
│ The Senses        │ Real-time trends, multi-source   │ • open-deep-research             │
│                   │ research, AAS skill discovery.   │ • aas-discover (2,638+ skills)   │
│                   │ Pedagogical curriculum intel.    │ • academy-guide                  │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 2           │ CONTEXT & MEMORY MANAGEMENT      │ • powercontext-manager           │
│ The Brain Memory  │ Isolate durable vs scratch state,│                                  │
│                   │ budget tokens, structure handoffs│                                  │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 3           │ ARCHITECTURE & BRAINSTORMING     │ • brainstorming                  │
│ The Strategy      │ Explore trade-offs, model graph, │ • architecture-review            │
│                   │ define component boundaries.     │ • frontend-design                │
│                   │ Non-templated UI & brand tokens. │ • brand-guidelines, theme-factory│
│                   │ Spatial canvas composition.      │ • canvas-design                  │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 4           │ IMPLEMENTATION & DEBUGGING       │ • clean-code                     │
│ The Hands         │ Idiomatic code, no AI narration, │ • systematic-debugging           │
│                   │ hypothesis-driven root cause.    │ • web-artifacts-builder          │
│                   │ Multi-component Web apps, docs.  │ • docx, pdf, pptx, xlsx          │
│                   │ Generative visual art & MCP.     │ • algorithmic-art, mcp-builder   │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 5           │ GUARDRAILS & QUALITY GATE        │ • anti-hallucination-guardrails  │
│ The Shield        │ Neurosymbolic assertions (tsc,   │ • code-review-excellence         │
│                   │ tests), Triad review & steering. │ • webapp-testing (Playwright)    │
│                   │ Stakeholder comms & coauthoring. │ • internal-comms, doc-coauthoring│
└───────────────────┴──────────────────────────────────┴──────────────────────────────────┘
```

---

## 📋 Phase-by-Phase Operational Execution Guidelines

### Phase 0: Meta & Prompt Optimization
- **`system-prompt-mastery`**: Apply architectural patterns derived from Claude 3.5, Cursor, OpenAI o1/o3, and Gemini. Use XML delimiters (`<tool_calling>`, `<making_code_changes>`, `<tone_and_style>`), prevent instruction leakage, enforce zero-fluff communication.
- **`prompt-optimizer`**: Transform open-ended or ambiguous requests into analytical, structured prompts. Preserve runtime variables (`{{var}}`) and enforce explicit output schemas.
- **`skill-creator`**: Author standardized, reproducible agent skills conforming to the Agent Skills open standard (`SKILL.md`, YAML frontmatter, self-contained scripts).
- **`discernment-nudge`**: Maintain rigorous epistemic grounding and objective discernment; resist sycophancy, premature agreement, or superficial compliance.

### Phase 1: Real-Time Intelligence & Knowledge Discovery
- **`last30days`**: For inquiries about current tech stacks, emerging libraries, community sentiment, or recent changes, execute temporal research across Reddit, X, YouTube, TikTok, GitHub, and HN to eliminate training cutoff blindness.
- **`open-deep-research`**: Perform recursive, multi-source deep investigations when tackling unfamiliar algorithms or multi-domain problems.
- **`aas-discover`**: Search the 2,638+ AAS catalog using:
  ```bash
  node C:/Users/raiha/.gemini/config/plugins/agentic-awesome-skills/skills/aas-discover/scripts/search_skills.mjs "<query>"
  ```
  Inspect matching `SKILL.md` playbooks using `view_file` before executing specialized workflows.
- **`academy-guide`**: Formulate clear educational curricula, pedagogical breakdowns, and multi-stage learning materials for technical domains.

### Phase 2: Context Budgeting, State Persistence & Memory Management
- **`powercontext-manager`**:
  - Separate durable project state (decisions, verified schemas, constraints) from ephemeral scratchpad dumps.
  - Never flood context with raw terminal dumps; filter outputs to prevent the 40% attention cliff.
  - Record task handoffs and milestone states to enable seamless continuation across agent turns.

### Phase 3: Conceptual Design & Architectural Blueprinting
- **`brainstorming`**: Transform vague feature ideas into validated technical specs before touching code. Present options and resolve architectural decisions collaboratively.
- **`architecture-review`**: Analyze module topologies, import hierarchies, dependency coupling, and service ownership.
- **`frontend-design`**: Approach UI craft with distinctive, intentional design. Reject cliché AI design tells (terracotta cream, uniform SaaS cards, monospace data tags everywhere). Make deliberate typographic and layout choices grounded in the subject matter.
- **`brand-guidelines` & `theme-factory`**: Define cohesive design tokens, palette harmonies, and contrast ratios compliant with accessibility standards.
- **`canvas-design`**: Structure spatial UI layouts, visual hierarchy, and diagrammatic presentations.

### Phase 4: Clean Implementation & Systematic Debugging
- **`clean-code`**: Write clean, human-like, maintainable code. **NEVER** write obvious AI-style narration comments (e.g., avoid `// Import dependencies`, `// Handle error`). Comments must explain *why*, not *what*.
- **`systematic-debugging`**: Whenever a bug or test failure occurs, form explicit testable hypotheses, isolate the root cause with telemetry, and verify fixes against actual code before proposing changes.
- **`web-artifacts-builder`**: Construct robust multi-component React, TypeScript, Vite, Tailwind CSS, and shadcn/ui interfaces.
- **`docx`, `pdf`, `pptx`, `xlsx`**: Native programmatic generation, manipulation, and validation of Word, PDF, PowerPoint, and Excel documents with strict schema fidelity.
- **`mcp-builder`**: Engineer high-utility Model Context Protocol (MCP) servers with clean tool schemas and defensive error boundaries.
- **`algorithmic-art`**: Create procedural mathematical visualizations, generative canvas designs, and dynamic shader-inspired scenes.

### Phase 5: Verification, Guardrails & Anti-Hallucination Quality Gate
- **`anti-hallucination-guardrails`**:
  - **No Assumptions / Verification First**: Never claim a feature or fix works without executing concrete verification commands (`npx tsc --noEmit`, `npm test`).
  - **Neurosymbolic Assertions**: Compilers, type-checkers, and test runners outrank natural language optimism.
  - **Triad Cross-Validation**: Execute the Executor $\rightarrow$ Validator $\rightarrow$ Critic consensus cycle for critical changes.
  - **Dynamic Steering**: When errors occur, adaptively steer toward resolution using error telemetry instead of repeating failed calls.
- **`code-review-excellence`**: Conduct an objective, multi-dimensional code quality review before closing any milestone.
- **`webapp-testing`**: Perform automated end-to-end browser testing with Playwright (`with_server.py`, DOM inspection, networkidle synchronization, visual screenshot captures).
- **`internal-comms` & `doc-coauthoring`**: Produce concise, executive-ready technical communication, release notes, and structured co-authored documentation.

---

---

## 🌌 Deepthink 3D Spatial & Mathematical Reasoning Engine (Celestial & Universe Directives)

For all 3D scene, WebGL, Three.js, React Three Fiber, Cesium, and spatial visualization workflows, every agent must think like a **Technical Artist + Graphics Programmer + Mathematical Simulation Engineer**.

### 1. Internal Reasoning Lifecycle
Never apply trial-and-error number bumping. Before proposing or writing 3D code, internally construct:
```
USER INPUT
↓
INTENT INTERPRETATION
↓
SPATIAL MODEL (Coordinates, vectors, reference frames, transforms)
↓
MATHEMATICAL MODEL (Power laws, AU transformations, Keplerian orbital mechanics)
↓
PHYSICAL CONSTRAINTS (NASA JPL ground-truth radii, periods, eccentricity, tilt)
↓
VISUAL CONSTRAINTS (Size & distance monotonicity, clear visual gaps, no overlaps)
↓
CAMERA CONSTRAINTS (Dynamic target, lookAt pivot, safe bounding distances, near/far planes)
↓
PERFORMANCE CONSTRAINTS (Vector reuse in render loops, delta-time damping, GPU draw calls)
↓
IMPLEMENTATION PLAN
↓
CODE
↓
VISUAL VALIDATION (Acceptance tests: Earth, Mars, Saturn, Sun, Overview)
↓
MATHEMATICAL VALIDATION (Monotonicity assertions, collision & clearance checks)
```

### 2. Dual-Scale Decoupling Principle
- **Physical Ground Truth**: Store real NASA JPL data (radius in km, semi-major axis in AU, orbital/rotational periods, eccentricity, inclination, tilt) as immutable truth.
- **Dual Visual Transformations**:
  1. `Body Visual Scale`: Monotonic power-law scaling $r_{render} = R_{base} \times (r_{phys} / r_{earth})^\alpha$ with $0.50 \le \alpha \le 0.60$.
     Stellar invariant: `SUN >>>>>>>> JUPITER >>> SATURN >> URANUS / NEPTUNE > EARTH / VENUS > MARS > MERCURY > MOON`.
     The Sun must feel monumentally larger ($> 3\times$ Jupiter radius, thousands of times Earth volume).
  2. `Orbit Visual Scale`: Monotonic distance compression $d_{render} = D_{base} \times (AU)^\beta$ with $0.65 \le \beta \le 0.80$.
     Distance invariant: $D_i > D_{i-1} + R_{render}(i-1) + R_{render}(i) + \text{safetyGap}_i$.
     Inner planets must have clear breathing room from the Sun; outer planets preserve vast cosmic depth; Asteroid Belt sits naturally between Mars and Jupiter.
- **NEVER** combine both into a single arbitrary `scaleFactor`.

### 3. Transform Hierarchy & Scenegraph Rigor
- Maintain clean separation between `WORLD TRANSFORM` and `VISUAL BODY SCALE`.
- The Sun is the heliocentric mathematical origin $(0, 0, 0)$.
- **NEVER** make planets transform children of the visual Sun mesh. The Sun's visual mesh scaling must never scale planetary orbits or other celestial bodies.
- **NEVER** scale the solar system root or scene root to simulate camera zoom. Zooming is strictly a camera translation along the optical/target ray.

### 4. Dynamic Camera Reference Frame & Moving Target Tracking
- **World Origin $\ne$ Camera Target**: Decouple heliocentric simulation origin $(0, 0, 0)$ from the camera's navigation pivot.
- **Active Focus Target**: When a planet is focused, the camera target and OrbitControls/lookAt pivot must lock to that planet's continuous world position, NOT the Sun.
- **Moving Target Follow**: Planets are in continuous orbital motion. The camera pivot must follow the planet's world position smoothly each frame using frame-rate independent damping ($1 - \exp(-\lambda \cdot \Delta t)$).
- **Zoom & Dolly**: Zooming when focused on Earth must dolly along the line `camera <-> Earth`, never towards $(0, 0, 0)$.
- **Framing & Collision Safety**:
  - Distance: $d = \frac{R_{bounding}}{\tan(FOV / 2)} \times \text{framingMultiplier}$.
  - Saturn's bounding radius strictly includes its outer rings ($R_{ring\_outer} \approx 2.45\times R_{planet}$).
  - Dynamic minimum zoom distance: $R_{bounding} \times 1.28$ (strictly preventing clipping into the mesh surface).
  - Dynamic near/far planes to prevent z-fighting and near-plane clipping across massive astronomical scales.
- **Cinematic Travel**: Transitions between bodies must have weight and inertia (distance-dependent duration, smooth quintic/cubic easing, never instant snapping). Overview pull-back returns smoothly to high elevation overlooking the system without teleporting into the Sun.

### 5. Anti-Superficial Fixes & Root Cause Directive
- **NO UI Toggles for Internal Bugs**: Never add scale toggle buttons ("Terkalibrasi", "Skala Nyata 1:1", "Fisika Jarak Nyata", "1x/5x/15x") to mask rendering or camera pivot bugs. Fix the underlying renderer and math. Provide ONE superior, verified default.
- **NO Random Magic Numbers**: Group and name all spatial constants (`BODY_SCALE_EXPONENT`, `ORBIT_BASE_DISTANCE`, etc.).
- **User Imagination Translation**: When the user provides qualitative or sensory descriptions (e.g., "planet terasa terlalu berdekatan", "zoom rasanya aneh"), translate the experience into spatial coordinates, hierarchy, vectors, scale formulas, and camera targets. Never ask the user for raw 3D vectors.

---

## 🔒 Mandatory Enforcement Protocol
1. Every conversation turn must actively evaluate which phase and skills are relevant to the user request.
2. Before modifying code, inspect relevant target lines with `view_file`.
3. After every change, execute verification commands and confirm zero regressions.

