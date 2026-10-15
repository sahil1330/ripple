# Your AI Told Me the Old Policy. Here's How We Made It Come Back and Fix It (FalkorDB + Agents)

**Authors:** Sahil Mane ([@sahil1330](https://github.com/sahil1330)) & Harsh Gupta ([@harsh-gupta-10](https://github.com/harsh-gupta-10))  
**Hackathon:** WeMakeDevs × FalkorDB *Graph Hacks: Context for AI Agents* (October 2026)  
**Track Submissions:** Track 01 (Connected Data), Track 02 (Agent Memory & Coordination), Track 03 (Company Brain)  
**Repository:** [github.com/sahil1330/ripple](https://github.com/sahil1330/ripple)  
**Live Demo:** [ripple-brain.vercel.app](https://ripple-brain.vercel.app) · **Demo Video:** [youtu.be/ripple-falkordb-demo](https://youtu.be/ripple-falkordb-demo)

---

## 1. The Bug Nobody Tracks: Stale Knowledge

In July 2026, GitLab updated its publicly accessible company handbook with commit `ddd39597` (Merge Request `!20421`): **Personal VPN services (like ExpressVPN) were no longer reimbursable up to $150/year**; team members had to transition to company-managed NordLayer.

When that handbook page updated, git committed the diff, markdown rendered cleanly, and the documentation team considered the job done.

**Except nobody informed:**
- **Priya**, an engineer who had asked the company AI Concierge two hours earlier: *"Can I expense my ExpressVPN?"* and received the answer: *"Yes, up to $150 per year."*
- **Alex**, who derived an annual team IT budget based on that $150 figure.
- **The Accounts Payable Approver Agent (`ap-approver`)**, an autonomous worker bot with cached rules set to automatically approve expense claims under $200.
- **Three internal wiki docs** citing the old reimbursement policy.

This is the silent failure mode of modern enterprise AI: **AI tools distribute knowledge without recording who holds it.** When reality changes, old answers linger in employee minds, vector embeddings, and autonomous agent memory caches—causing real financial leakage, compliance violations, and bad operational decisions.

We built **Ripple** to solve this.

---

## 2. Why a Graph? Knowledge Exposure is a Dependency Network

A relational database or vector index can store facts, but it cannot model propagation.

When a policy version changes, the blast radius isn't flat. It forms a directed multi-hop dependency cascade:
$$\text{Policy Version} \longrightarrow \text{Exposed People / Agent Memory} \longrightarrow \text{Derived Facts} \longrightarrow \text{Pending Plans} \longrightarrow \text{Executable Actions}$$

In **FalkorDB**, finding every affected entity across arbitrary hops is a single, lightning-fast graph traversal:

```cypher
// Discover all downstream entities impacted by the superseded version
MATCH (target:Entity)-[:FEEDS*1..6]->(fv:FactVersion {id: $superseded_version_id})
RETURN target.id AS id,
       target.kind AS kind,
       target.name AS name,
       length(shortestPath((target)-[:FEEDS*]-(fv))) AS hops
ORDER BY hops ASC;
```

Because FalkorDB runs GraphBLAS-accelerated sparse matrix operations directly in memory, traversing this multi-hop cascade takes **under 3 milliseconds**.

---

## 3. Data Model Walkthrough: Temporal Versions & Episodic Memory

Ripple establishes one isolated FalkorDB graph per tenant (`ripple:<tenant>`). Core organizational state lives strictly in the graph—there is no secondary database.

```mermaid
flowchart TD
    Fact["Fact (Topic: IT / Reimbursements)"] -->|HAS_VERSION| V1["FactVersion v1 ($150/yr)"]
    Fact -->|HAS_VERSION| V2["FactVersion v2 ($0 / NordLayer)"]
    V2 -->|SUPERSEDES| V1

    Person["Person (Priya Sharma)"] -->|WAS_TOLD {at: 1784048400000}| V1
    WorkerAgent["Worker Agent (ap-approver)"] -->|CACHED {at: 1784048400000}| V1
    WikiDoc["Doc (Finance FAQ)"] -->|CITES| V1

    Plan["Plan (Q3 IT Expenses)"] -->|DEPENDS_ON| V1
    Action["Action (Approve $150 VPN)"] -->|PART_OF| Plan
    Action -->|DEPENDS_ON| V1

    Change["Change (commit ddd39597)"] -->|FROM| V1
    Change -->|TO| V2
    Change -->|IMPACTS| Action
    Change -->|IMPACTS| Person
```

### Key Innovations:
1. **FactVersion & SUPERSEDES:** Facts are immutable temporal snapshots. When Sentinel ingests a policy change, it creates `FactVersion v2` and a `SUPERSEDES` edge pointing back to `v1`.
2. **Episodic Memory (`WAS_TOLD`):** When Ripple's Concierge answers a question, it writes a `(Person)-[:WAS_TOLD {at, channel, answer_id}]->(FactVersion)` edge. It remembers not just what it said, but *which version of reality* it said it with.
3. **Agent Memory (`CACHED`):** Worker agents log the specific fact version governing their operating assumptions.

---

## 4. Graph Algorithms as Autonomous Agent Tools

Ripple doesn't just display graphs—our autonomous agent loop calls **FalkorDB built-in graph algorithms** directly via Cypher to plan remediation:

| Algorithm | FalkorDB Procedure | Agent Decision & Use Case |
|---|---|---|
| **Breadth-First Search** | `algo.bfs` | Maps multi-hop blast radius across materialised `FEEDS` edges in a single traversal. |
| **Shortest Path** | `shortestPath` / `algo.SPpaths` | Computes the exact, human-explainable causal chain displayed in the **"Why?"** drawer. |
| **PageRank** | `algo.pageRank` | Measures documentation authority to prioritize which wiki pages need automated doc patches first. |
| **Betweenness Centrality** | `algo.betweenness` | Detects organizational "amplifiers"—people whose communication bridges multiple teams. |
| **Weakly Connected Components** | `algo.WCC` | Isolates "dark pockets": isolated teams with zero cross-department communication. |

When Fixer agents work the queue, they brief the highest-betweenness hub in each dark pocket, ensuring that tribal knowledge spreads to isolated subgroups without spamming the entire organization.

---

## 5. Agent Coordination: Zero Glue Code Through Task Nodes

How do multi-agent systems avoid race conditions, split-brain logic, and messy message queues?

**In Ripple, agents coordinate exclusively through `Task` nodes in FalkorDB:**

1. **Task Creation:** Tracer creates `Task` nodes linked to the `Change`:
   ```cypher
   CREATE (t:Task {
     id: $task_id,
     kind: 'reanswer',
     status: 'open',
     target_id: $person_id,
     created_at: $now_ms
   })-[:ABOUT]->(c:Change {id: $change_id})
   ```
2. **Atomic Claiming:** Multiple concurrent Fixer agents compete for work using FalkorDB's atomic transactional guarantees:
   ```cypher
   MATCH (t:Task {id: $task_id, status: 'open'})
   SET t.status = 'claimed',
       t.claimed_by = $agent_id,
       t.claimed_at = $now_ms
   RETURN t;
   ```
   If another agent claimed it in the same millisecond, zero rows return, and the losing agent gracefully moves to the next task.
3. **Resolution:** Upon completing the fix (drafting a PR or updating user memory), the agent updates `t.status = 'resolved'` and records a `RESOLVED` edge.

### The Hero Moment: MCP Freshness Guard
Autonomous workers (like Accounts Payable bots) must consult Ripple's freshness guard over the **Model Context Protocol (`check_fresh`)** before executing every financial or operational action:
```
Worker Agent ──► MCP: check_fresh(action_id='act:c1:ap:1')
                    │
                    ├──► FalkorDB checks DEPENDS_ON ──► fv:vpn:v1 (SUPERSEDED!)
                    │
Worker Agent ◄──────┴── Stale! Status: BLOCKED. Replan Task Opened.
```
Result: The bot's scheduled approval of the $150 VPN expense is **blocked 40 minutes before execution**.

---

## 6. What We Learned: FalkorDB Gotchas & Best Practices

Building Ripple in four intense hackathon days gave us deep respect for FalkorDB's speed and unique architecture. Here are key patterns we learned:

1. **Epoch-ms Integers for Time:** FalkorDB does not have native temporal arithmetic in Cypher. Store all timestamps as epoch milliseconds (`1784048400000`). Calculate time-to-harm differences (`tth_ms = due_at - detected_at`) using standard integer subtraction.
2. **Materialised `FEEDS` Edges for GraphBLAS:** FalkorDB graph algorithms like `algo.bfs` traverse a single relationship type. Rather than trying to union disparate edges (`DEPENDS_ON`, `WAS_TOLD`, `CITES`) inside the algorithm call, we materialise a lightweight `FEEDS {w:1}` edge during ingestion.
3. **Relationship Aliasing in Aggregations:** When counting relationships in Cypher, always alias the relationship (`MATCH (a)-[r:WAS_TOLD]->(b) RETURN count(r)`) to avoid known parser limitations with naked pattern counts.
4. **Parameterise Everything:** Pass all filters and entity IDs via query `$parameters` for maximum query cache hit rate and zero injection vulnerability.

---

## 7. Prior Art & Standing on Giants' Shoulders

Ripple builds upon ideas pioneered in academia and open source:
- **Graphiti ([getzep/graphiti](https://github.com/getzep/graphiti)):** Pioneered bi-temporal fact invalidation on FalkorDB. Ripple extends invalidation by tracking *downstream exposure* to people and autonomous agents.
- **Lethe ([WeMakeDevs Hangover](https://www.wemakedevs.org/blogs/hangover-wrap-up-blog)):** Demonstrated forgetting mechanisms within agent state. Ripple focuses on active remediation across organizational holders.
- **PlanFence & STALE Papers ([arXiv:2609.03340](https://arxiv.org/abs/2609.03340)):** Formalized safety barriers for planning agents operating in non-stationary environments.

---

## 8. Try It Yourself

- **Interactive Live Dashboard:** [ripple-brain.vercel.app](https://ripple-brain.vercel.app) (Run demo mode with `?demo=1`)
- **Code & Deploy:** [github.com/sahil1330/ripple](https://github.com/sahil1330/ripple) (Launch locally in `< 10 minutes` with Docker)
- **Watch the 2:45 Walkthrough:** [youtu.be/ripple-falkordb-demo](https://youtu.be/ripple-falkordb-demo)

---

## Disclosure & Team

Ripple was built collaboratively for the **WeMakeDevs × FalkorDB Graph Hacks Hackathon** by **Sahil Mane** (`@sahil1330`) and **Harsh Gupta** (`@harsh-gupta-10`).

In compliance with hackathon guidelines, we used **Cursor** (the Cursor IDE editor, Cursor agent, and Cursor cloud agents) alongside Antigravity pair programming for boilerplate, Cypher query optimization, Next.js UI integration, and CI automation. Every architecture choice, query pattern, and merged line of code was authored, reviewed, and verified by our human team.
