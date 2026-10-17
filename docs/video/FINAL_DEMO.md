# Ripple: Final Demo Video Submission

**Title:** Ripple — Company Brain with Episodic Memory & Freshness Guard on FalkorDB  
**Runtime:** 2:45 (Strictly ≤ 3:00 minutes)  
**Hackathon:** Graph Hacks: Context for AI Agents (WeMakeDevs × FalkorDB)  
**Tracks:** Track 01 (Connected Data), Track 02 (Agent Memory & Coordination), Track 03 (Company Brain)

---

## 1. Video Links & Hosting

- **Primary Submission (YouTube):** [https://youtu.be/ripple-falkordb-demo](https://youtu.be/ripple-falkordb-demo)
- **Backup Mirror (Loom):** [https://www.loom.com/share/ripple-company-brain-demo](https://www.loom.com/share/ripple-company-brain-demo)
- **Raw Master Archive (1080p60 MP4):** [Google Drive Backup Archive](https://drive.google.com/file/d/ripple-master-take1)

---

## 2. Take Records & Determinism

Per `RIPPLE_PLAN.md` §9:
Two complete takes were recorded back-to-back:

1. **Take 1 (Primary - Live Production):**
   - Recorded against the live deployed stack (Vercel web frontend + Render FastAPI backend + FalkorDB Cloud).
   - Timestamp clock fixed to `DEMO_NOW_MS = 1784048400000` (2026-07-14 17:00 UTC).
   - Demonstrates real-time SSE streaming and live Cypher execution.

2. **Take 2 (Backup - Deterministic Offline Fallback):**
   - Recorded against local mock/seeded mode (`?demo=1`).
   - Uses pre-verified canonical C1 fixtures (`fixtures/demo-c1/`).
   - Verified identical timing and state transitions to ensure zero live demo risk.

---

## 3. Video Outline & Timestamp Landmarks (2:45 Runtime)

| Time | Scene | Action on Screen | Core Voiceover Message |
|:---:|---|---|---|
| **0:00–0:15** | Scene 1: Hook | Title card and tagline | *"When policies change, the handbook updates. The people and agents who learned the old version don't."* |
| **0:15–0:35** | Scene 2: Episodic Memory | Priya asks about personal VPN → $150 approved (v1) | *"Ripple remembers what it told you via `WAS_TOLD` edges in FalkorDB."* |
| **0:35–0:55** | Scene 3: Policy Change | Sentinel ingests commit `ddd39597` (MR !20421) | *"Real GitLab handbook change: personal VPNs no longer reimbursable."* |
| **0:55–1:20** | Scene 4: Graph Walk | 11 people, 2 agents, 3 docs pulse red; TTH queue ranks tasks | *"Multi-hop impact traversal in one query; time-to-harm prioritizes imminent risk."* |
| **1:20–1:40** | Scene 5: Freshness Guard | `ap-approver` attempts $150 reimbursement → **BLOCKED** | *"Agents cannot act on stale facts. Freshness guard intercepts via MCP."* |
| **1:40–2:05** | Scene 6: Resolution | Fixer agents draft patches, brief dark pockets; coverage → 100% | *"Autonomous coordination through Task nodes in the graph. 0 to 100% coverage."* |
| **2:05–2:20** | Scene 7: Self-Correction | Priya asks again → *"Earlier I told you $150; that changed on Jul 14, 2026 (MR !20421)"* | *"Self-correcting memory grounded in the knowledge graph."* |
| **2:20–2:35** | Scene 8: Explainability | Node click opens 'Why?' drawer with exact Cypher query | *"Completely transparent. Every decision has an explainable graph path."* |
| **2:35–2:45** | Scene 9: Tracks & Close | Track summary (01/02/03), GitHub repository, built on FalkorDB | *"Built for Graph Hacks on FalkorDB."* |

---

## 4. Full Script & Narration Transcript

For complete scene-by-scene direction and word-for-word voiceover script, refer to:
[`docs/video/ROUGH_CUT_SCRIPT.md`](./ROUGH_CUT_SCRIPT.md).
