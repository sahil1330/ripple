# Ripple: Rough-Cut Video Recording Script

**Target Duration:** 2:45 (Hard Limit: ≤ 3:00)  
**Scenario:** C1 (Personal VPN No Longer Reimbursable, GitLab Handbook commit `ddd39597`, MR !20421)  
**URL:** `http://localhost:3000/?demo=1`  
**Keyboard shortcuts:** `Space` (Next Step), `R` (Reset Demo)

---

## 1. Recording Setup & Technical Requirements
- **Resolution:** 1920 × 1080 (1080p), 60 fps.
- **Audio:** High-quality microphone, clean noise floor, no background music.
- **Browser:** Chrome or Chromium in full screen, clean profile (no bookmark bar or browser extensions).
- **Theme:** Default dark theme (`bg-slate-950`).
- **Mode:** `?demo=1` with deterministic fixture fallback for 100% reliability.

---

## 2. Scene-by-Scene Storyboard & Voiceover

### Scene 1: Hook & Core Problem (0:00 – 0:15)
- **Visual:** Clean Ripple dashboard title banner: *"Ripple: Company Brain with Episodic Memory & Freshness Guard"*.
- **Voiceover:**
  > *"When a company policy changes, the handbook gets updated. But the people, documents, and autonomous AI agents who already learned the old version don't. They keep acting on stale facts—approving outdated claims, answering wrong answers, and executing invalid plans."*

### Scene 2: Initial State & Episodic Memory (0:15 – 0:35)
- **Visual:** Demo Stepper on Step 1. In the Ask Panel at the bottom, select **Priya Sharma**. Ask: *"Can I expense my ExpressVPN?"* Concierge answers: *"Yes, personal VPN services are reimbursable up to $150 per year."* (cites `fv:vpn:v1`). The graph canvas updates showing Priya connected to the Answer and `fv:vpn:v1` via `WAS_TOLD`.
- **Voiceover:**
  > *"Meet Priya. She asks Ripple's Concierge whether she can expense her personal VPN. Ripple answers 'Yes, up to $150 a year,' citing the active policy. Crucially, Ripple doesn't just answer and forget—it records an episodic memory edge in FalkorDB: `WAS_TOLD` at this exact timestamp."*

### Scene 3: Policy Change Replay (0:35 – 0:55)
- **Visual:** Press `Space` to advance to Step 2. Sentinel replays real commit `ddd39597` (GitLab MR !20421). The Before/After panel on the right highlights the diff: `+$0` / `-$150`, effective July 15, 2026.
- **Voiceover:**
  > *"Now, finance updates the policy. This is a real change from GitLab's public handbook: personal VPNs are no longer reimbursable; employees must use company-managed NordLayer. Sentinel ingests the diff, writes FactVersion 2, and creates a Change node in FalkorDB."*

### Scene 4: Graph Walk & Time-to-Harm Ranking (0:55 – 1:20)
- **Visual:** Press `Space` to advance to Step 3. The center graph canvas lights up: 11 people, 2 worker agents, 3 docs, and 1 pending plan pulse red with halos scaled by risk. The Time-to-Harm (TTH) queue ranks `ap-approver`'s pending $150 reimbursement task at the top (Urgency: 40 minutes).
- **Voiceover:**
  > *"In a single FalkorDB graph traversal, Ripple walks outward from the superseded version to find everything downstream. 11 people, 2 agents, 3 wiki docs, and an active expense plan are instantly flagged. The Time-to-Harm queue sorts them by imminent business risk. At the top: an Accounts Payable worker bot scheduled to auto-approve a $150 claim in forty minutes."*

### Scene 5: Hero Moment – Freshness Guard Blocks Worker (1:20 – 1:40)
- **Visual:** Press `Space` to advance to Step 4. Worker agent `ap-approver` attempts to execute action `act:c1:ap:1`. Freshness guard intercepts via MCP `check_fresh`. Action status turns red `BLOCKED`. A `replan` task is opened.
- **Voiceover:**
  > *"Here is the hero moment. The AP approver agent attempts to execute the $150 reimbursement. But before every action, agents must consult Ripple's freshness guard over MCP. Ripple detects that the action depends on stale version 1, immediately blocks the action, and opens a replan task in the graph. Zero financial leakage."*

### Scene 6: Multi-Agent Resolution & 100% Coverage (1:40 – 2:05)
- **Visual:** Press `Space` to advance to Step 5. Fixer agent claims tasks. The nodes in the graph shift from pulsing red to glowing emerald green. Coverage meter sweeps from 0% to 100%. The SSE ticker streams real-time task completions.
- **Voiceover:**
  > *"Autonomous Fixer agents pick up tasks from the graph. They draft doc patch pull requests, alert community hubs identified via betweenness centrality, and notify impacted holders. As each task resolves, the node turns green, driving the company-wide coverage meter to 100%."*

### Scene 7: Self-Correcting Memory (2:05 – 2:20)
- **Visual:** Press `Space` to advance to Step 6. Ask panel opens as Priya again. The Concierge answers: *"No, personal VPNs are no longer reimbursable. Earlier I told you $150/year, but that policy was superseded on Jul 14, 2026 (effective Jul 15) (MR !20421)."*
- **Voiceover:**
  > *"When Priya returns to ask about her VPN, Ripple doesn't give a generic response. It recognizes that it previously gave her obsolete information, explicitly acknowledging the previous answer and explaining the change. Memory that corrects itself."*

### Scene 8: Explainability & Graph Deep Dive (2:20 – 2:35)
- **Visual:** Click on the `ap-approver` node in the center graph canvas. The 'Why?' drawer slides out from the right, displaying the complete 3-hop traversal path and the exact parameterised FalkorDB Cypher query with copy button.
- **Voiceover:**
  > *"Every decision and block is completely explainable. Clicking any node reveals its multi-hop dependency path and the exact Cypher query executed against FalkorDB. No hallucinations, no black boxes."*

### Scene 9: Wrap-up & Track Summary (2:35 – 2:45)
- **Visual:** Track summary card:
  - Track 01: Company Brain (FalkorDB as sole brain, MCP freshness guard)
  - Track 02: Multi-Agent Systems (Task node coordination, Sentinel/Tracer/Fixer)
  - Track 03: Temporal Knowledge Graphs (FactVersion supersedes, episodic memory)
  - GitHub repo URL + *"Built with FalkorDB & Cursor"*.
- **Voiceover:**
  > *"Ripple: transforming static documentation into an active, self-correcting company brain. Built on FalkorDB for the Graph Hacks hackathon."*

---

## 3. Rehearsal Timing Benchmarks

| Milestone | Target Timestamp | Acceptable Range |
|---|---|---|
| Priya Initial Question | 0:25 | 0:20 – 0:30 |
| Handbook Diff Flip | 0:45 | 0:40 – 0:50 |
| Graph Red Halos & TTH Queue | 1:05 | 1:00 – 1:15 |
| AP-Approver Action Blocked | 1:30 | 1:25 – 1:35 |
| Green Resolution & 100% Coverage | 1:55 | 1:50 – 2:05 |
| Priya Corrected Answer | 2:15 | 2:10 – 2:20 |
| 'Why?' Drawer & Cypher Query | 2:30 | 2:25 – 2:35 |
| Track Badges & Conclusion | 2:45 | 2:40 – 2:50 |
