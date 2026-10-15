# WeMakeDevs × FalkorDB Graph Hacks: Official Project Submission

**Project Name:** Ripple  
**Tagline:** The company brain that remembers what it told you, and comes back to fix it when the truth changes. Built on FalkorDB.  
**Repository:** [https://github.com/sahil1330/ripple](https://github.com/sahil1330/ripple)  
**Live Application:** [https://ripple-brain.vercel.app](https://ripple-brain.vercel.app)  
**Demo Video (2:45):** [https://youtu.be/ripple-falkordb-demo](https://youtu.be/ripple-falkordb-demo)  
**Blog Post:** [`docs/blog/POST.md`](./blog/POST.md)  
**Team Members:** Sahil Mane ([@sahil1330](https://github.com/sahil1330)) & Harsh Gupta ([@harsh-gupta-10](https://github.com/harsh-gupta-10))

---

## 1. Tracks Entered

Per Rule R5, Ripple is formally submitted to **all three main hackathon tracks**:

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

## 2. Hackathon Rules Compliance Matrix

| Rule | Requirement | Ripple Compliance |
|:---:|---|---|
| **R1** | Team size $\le$ 4, one team per person | Exactly 2 team members (`@sahil1330` and `@harsh-gupta-10`). |
| **R2** | FalkorDB is primary graph database | All facts, versions, holder relationships, tasks, and memories reside in FalkorDB Cloud & Docker. |
| **R3** | Graph is not decoration (Rule 3) | If FalkorDB is removed, the product ceases to function: multi-hop dependency tracing, time-to-harm prioritization, and task handoffs depend entirely on FalkorDB GraphBLAS algorithms. |
| **R5** | Name every track entered | Track 01, Track 02, and Track 03 explicitly declared in submission form and documentation. |
| **R6** | Public / synthetic data only | Policy changes extracted from public GitLab Handbook (MIT/open license, © GitLab B.V.). Organization layer is clearly badged `synthetic: true`. |
| **R7/R8**| Commits after kickoff | Initial commit and repository creation timestamped after Oct 15, 2026 12:01 AM IST. |
| **R10**| Deliverables package | Public GitHub repository, comprehensive README with graph schema and Cypher list, 2:45 demo video, live deployed web URL. |
| **R11**| AI assistance disclosed | Comprehensive AI disclosure in README and PR templates naming Cursor editor, Cursor agents, and Antigravity. |
| **R12/13**| Human code understanding | Both human team members reviewed, understand, and can explain every merged line of code, schema, and query. |
| **R17**| No plagiarism | Original code and architecture; proper attribution to prior art (Graphiti, Lethe, PlanFence). |

---

## 3. Submission Timeline & Checkpoints

- **Code Freeze:** Saturday, Oct 17, 22:00 IST (Feature Freeze M3)
- **Documentation & Video Freeze:** Sunday, Oct 18, 18:00 IST
- **Target Submission Timestamp:** Sunday, Oct 18, 19:30 IST (Well before the 20:00 IST target and 23:59 IST deadline)
- **Submission Portal:** [wemakedevs.org/hackathons/falkordb](https://www.wemakedevs.org/hackathons/falkordb)
