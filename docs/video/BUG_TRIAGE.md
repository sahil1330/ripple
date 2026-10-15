# Video Dry-Run Bug Triage & Quality Assurance Log

Owner: `@harsh-gupta-10` (Person B). Area: `area:demo`. Reference: `RIPPLE_PLAN.md` §9.

This document logs bug triage, visual polish audits, and edge-case verifications conducted during rehearsal passes of the 2:45 demo video recording.

---

## 1. Triage Protocol & Ownership Routing

Per repo guidelines in `AGENTS.md` and `docs/WORKFLOW.md`:
- **Person A (`@sahil1330`):** Graph queries, Cypher syntax, agents (`sentinel`, `tracer`, `fixer`, `workers`), MCP server (`ripple_mcp`), FastAPI backend (`api/`), fixtures.
- **Person B (`@harsh-gupta-10`):** Next.js UI (`web/`), layout, canvas rendering, responsiveness, deploy manifests, docs, CI workflows.

When filing issues during video dry-runs, label with `type:bug` and assign strictly to the corresponding owner.

---

## 2. Dry-Run Verification Checklist

| Area | Check | Dry-Run Status | Notes |
|---|---|---|---|
| **Demo Stepper** | URL sync (`?demo=1`) loads step 1 automatically | PASS | Seamless query string parsing |
| **Demo Stepper** | Spacebar advances to next step | PASS | Keyboard event listener ignores inputs/textareas |
| **Demo Stepper** | 'R' key resets scenario to initial state | PASS | Resets step, active node, and coverage metrics |
| **Graph Canvas** | Nodes color-coded by kind | PASS | Person (sky), Agent (purple), Doc (emerald), etc. |
| **Graph Canvas** | Pulsing red halo appears on impacted nodes | PASS | Pulse radius scaled dynamically by node risk score |
| **Graph Canvas** | Resolved nodes render glowing green aura | PASS | Glow ring cleanly distinguishes resolved items |
| **Graph Canvas** | Node click opens 'Why?' explanation drawer | PASS | Displays traversal hops and exact Cypher query |
| **Ask Panel** | Persona selection switches identity | PASS | Priya, Alex, Marcus selectable |
| **Ask Panel** | Memory invalidation banner displays for Priya | PASS | Shows yellow warning and previous quote |
| **Before/After** | Commit link and MR link open public GitLab sources | PASS | Linked to commit `ddd39597` and MR !20421 |
| **TTH Queue** | Hovering over factors displays breakdown tooltip | PASS | Severity × Urgency × Reach multipliers explained |
| **Coverage Meter** | Progress bar transitions 0% → 100% | PASS | Smooth CSS width transitions |

---

## 3. Triaged Issues & Resolutions

### Issue T-01: Graph canvas resizing on drawer toggle
- **Symptom:** Opening the 'Why?' drawer previously caused canvas canvas element to flicker or reflow abruptly.
- **Owner:** Person B (`@harsh-gupta-10`)
- **Fix:** Positioned `WhyDrawer` as an absolute/fixed slide-over overlay with backdrop blur, preventing DOM reflow of the canvas element.
- **Status:** Resolved in PR #68.

### Issue T-02: Scoping collision with KIND_COLORS in node canvas paint
- **Symptom:** Variable `color` declaration collision in canvas renderer when resolving fallback colors.
- **Owner:** Person B (`@harsh-gupta-10`)
- **Fix:** Scoped fallback color resolution cleanly inside `nodeCanvasObject`.
- **Status:** Resolved in PR #71.

### Issue T-03: Dark-pocket WCC component isolation in demo mode
- **Symptom:** Dark pockets component needs clear visual indication in step 5 when Fixer briefs the hub.
- **Owner:** Person A (`@sahil1330`) / Person B (`@harsh-gupta-10`)
- **Resolution:** Stepper annotation in Step 5 calls out WCC component briefing for dark-pocket hub; graph reflects resolved status on completion.
- **Status:** Verified working.

---

## 4. Rehearsal Quality Checklist (Pre-Recording)

Before clicking 'Record':
1. [ ] Clear browser cache or use an Incognito window.
2. [ ] Ensure browser is at 100% zoom (1920×1080 native).
3. [ ] Check audio input level (peaks around -6 dB to -3 dB).
4. [ ] Run `npm run build` in `web/` to confirm zero client-side warnings or hydration errors.
5. [ ] Execute two complete uninterrupted practice runs with a stopwatch.
6. [ ] Record Take 1 (primary) and Take 2 (backup) back-to-back.
