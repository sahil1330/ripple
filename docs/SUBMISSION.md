# WeMakeDevs × FalkorDB Graph Hacks: Official Project Submission

**Project Name:** Ripple  
**Tagline:** The company brain that remembers what it told you, and comes back to fix it when the truth changes. Built on FalkorDB.  
**Repository:** [https://github.com/sahil1330/ripple](https://github.com/sahil1330/ripple)  
**Live Application:** [https://ripple-2.up.railway.app](https://ripple-2.up.railway.app)  
**Live API:** [https://ripple-production-be6b.up.railway.app](https://ripple-production-be6b.up.railway.app) (health: `/api/health`)  
**Demo Video:** **TODO: add the YouTube link once the demo video is recorded** (script: [`video/FINAL_DEMO.md`](./video/FINAL_DEMO.md))  
**Blog Post:** [`docs/blog/POST.md`](./blog/POST.md)  
**Team Members:** Sahil Mane ([@sahil1330](https://github.com/sahil1330)) & Harsh Gupta ([@harsh-gupta-10](https://github.com/harsh-gupta-10))

---

## 1. Tracks Entered

The hackathon allows entering one, two or all three tracks ([FAQ](https://www.wemakedevs.org/hackathons/falkordb)). Ripple is submitted to **all three tracks**:

### 🏆 Track 03: Company Brain (Priority Track)
- **Track Focus:** Knowledge from documentation, tickets, and communication in one graph; tracking who knows what; tracing decisions to source; **keeping knowledge current as things change**; providing grounded answers with verifiable provenance.
- **How Ripple Satisfies Track 03:**
  - Real handbook pages, hyperlinked documents (`LINKS_TO`), conversational Q&A answers, and execution plans reside in a single cohesive graph per tenant (`ripple:<tenant>`).
  - `who_holds()` tracks exactly which team members, agents, and wiki pages rely on which version of a policy.
  - Every `FactVersion` directly links to git commit SHAs (`ddd39597`) and merge request URLs (`!20421`) from GitLab's public handbook.
  - The core thesis of Ripple is **active knowledge currency**: when truth changes, Ripple does not wait for people to stumble upon stale facts—it traverses the graph, alerts holders, blocks stale agent actions, and drives coverage to 100%.

### 🏆 Track 01: Agents That Act on Connected Data
- **Track Focus:** Multi-hop reasoning, graph algorithms as agent tools, tool selection through MCP, actions based on connected data, explainable results.
- **How Ripple Satisfies Track 01:**
  - The Sentinel agent detects policy changes; Tracer maps multi-hop blast radius using FalkorDB traversals and ranks tasks by **time-to-harm** ($severity \times urgency \times reach$).
  - Built-in FalkorDB graph algorithms operate as autonomous tools: `algo.bfs` for blast radius, `algo.pageRank` for doc patching priority, `algo.betweenness` for organizational amplifiers, and `algo.WCC` for dark-pocket briefing.
  - The **Freshness Guard (`check_fresh`)** operates over MCP: worker agents (`ap-approver`) are intercepted and blocked when attempting to approve actions based on stale knowledge.
  - Every resolution step and blocked action provides an explainable path via `explain_path` and exact FalkorDB Cypher queries.

### 🏆 Track 02: Agent Memory & Coordination
- **Track Focus:** Episodic / semantic / procedural memory, persistent history, shared state and handoffs, high-concurrency execution, tenant isolation.
- **How Ripple Satisfies Track 02:**
  - **Episodic Memory:** Recorded via `(Person)-[:WAS_TOLD {at, channel, answer_id}]->(FactVersion)` edges. Ripple remembers historical interactions and self-corrects: *"Earlier I told you $150/year; that changed on July 15."*
  - **Agent Memory:** Cached worker facts are tracked via `(Agent)-[:CACHED {at}]->(FactVersion)`.
  - **Decoupled Coordination:** Multi-agent systems coordinate exclusively through `Task` nodes in FalkorDB (`CREATE Task{status:'open'}` $\rightarrow$ atomic conditional claim `MATCH ... {status:'open'} SET status='claimed'` $\rightarrow$ complete and write `RESOLVED`). No inter-agent RPCs or fragile middleware.
  - **Multi-Tenancy:** Complete tenant isolation (`ripple:handbook-demo`, `ripple:acme-synthetic`) with concurrent agent execution.

---

## 2. Requirements Check (from the [hackathon page](https://www.wemakedevs.org/hackathons/falkordb))

| Page requirement | Ripple |
|---|---|
| Solo or teams of up to 4 | 2 members (`@sahil1330`, `@harsh-gupta-10`). |
| FalkorDB must be the primary graph database and central to the product | All facts, versions, holders, tasks and memory live in FalkorDB; without it, impact tracing, the freshness guard and task handoffs stop working. |
| Main FalkorDB implementation must be new work during the event | Repository created and all commits made after Oct 15, 2026 12:01 AM IST. |
| Coding assistants allowed; team must be able to explain what was built | AI use disclosed in the README and every PR (Cursor, Antigravity); both members can explain the code. |
| Live deployment preferred (otherwise local setup + working demo video) | Live on Railway (links above) plus local setup in the README. Demo video: TODO. |
| Enter one, two or all three tracks | All three (section 1). |

---

## 3. Submission Timeline & Checkpoints

- **Code Freeze:** Saturday, Oct 17, 22:00 IST (Feature Freeze M3)
- **Documentation & Video Freeze:** Sunday, Oct 18, 18:00 IST
- **Target Submission Timestamp:** Sunday, Oct 18, 19:30 IST (Well before the 20:00 IST target and 23:59 IST deadline)
- **Submission Portal:** [wemakedevs.org/hackathons/falkordb](https://www.wemakedevs.org/hackathons/falkordb)
