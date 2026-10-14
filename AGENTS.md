# AGENTS.md: context for Cursor agents working on Ripple

This file is read by the Cursor editor's agent and by Cursor cloud agents. Read it fully before changing anything. Deeper detail: `RIPPLE_PLAN.md` (design), `docs/WORKFLOW.md` (process), `docs/AGENT_REVIEW.md` (review + merge), `docs/BACKLOG.md` (issues).

## 1. What Ripple is
A **company brain on FalkorDB that records every fact version it hands out** (to people, docs and other agents). When a fact changes, Ripple walks the graph to find everyone and everything still relying on the old version, ranks them by **time-to-harm**, then acts: blocks stale actions (freshness guard), re-answers people, drafts doc fixes, replans dependent work, and tracks coverage to 100%. Every step has an explainable path.

- Hackathon: WeMakeDevs × FalkorDB **Graph Hacks**, Oct 15 12:01 AM → Oct 18 11:59 PM IST. Entering Tracks 01, 02 and 03 (Company Brain is the priority).
- Demo data: **real** policy changes from the public GitLab handbook git history (hero: C1 personal VPN no longer reimbursable, commit `ddd39597`, MR !20421) + a clearly labelled **synthetic** layer of people, chats, plans and worker agents.
- **Rule 3 of the hackathon:** if the product still works without FalkorDB, the graph is decoration. All core state (facts, versions, holders, tasks, agent memory) lives in FalkorDB. **Never add a secondary datastore for core state.**

## 2. Team and ownership
| Person | GitHub | Owns |
|---|---|---|
| A | `@sahil1330` | `graph/`, `ingest/`, `agents/`, `ripple_mcp/`, `api/`, Python config; writes `fixtures/` |
| B | `@harsh-gupta-10` | `web/`, `deploy/`, `docs/`, `.github/`, README (except A's marked sections), demo video |
| Both | | `contracts/`, `AGENTS.md`, `.cursor/rules/` (both humans approve) |

Only edit files inside the area of the issue you are working on. If you find a bug in someone else's area, open an issue for that owner instead of fixing it.

## 3. Architecture
```
GitLab handbook diffs ─► Sentinel ─┐
synthetic chats/plans ─► Concierge ┤                 ┌─► FastAPI + SSE (api/) ─► Next.js UI (web/)
                         Tracer   ─┼─► FalkorDB ◄────┤
                         Fixer    ─┤  ripple:<tenant>└─► ripple-mcp (ripple_mcp/) ◄─ worker agents (check_fresh)
                         Workers  ─┘                 └─► FalkorDB-MCPServer (read-only, judges/explorers)
```
- **Agents coordinate only through `Task` nodes** in the graph: create `Task{status:'open'}` → atomic claim (`MATCH ... {status:'open'} SET status='claimed'`; no row = someone else won) → complete + write `RESOLVED`. Agents never call each other directly.
- **Worker agents must call `check_fresh` before every action.** Stale → mark the action `blocked` and open a `replan` task.
- Demo path is deterministic: seeded fixtures, fixed `now` in demo mode, templated fallback text when no LLM key.

## 4. Repo layout
| Path | What |
|---|---|
| `graph/` | FalkorDB client (`client.py`), schema/indexes (`schema.py`), Cypher in `graph/queries/*.cypher`, `NOTES.md` smoke-test results |
| `ingest/` | Real handbook changes C1–C5, handbook docs + `LINKS_TO`, seeded synthetic generator |
| `agents/` | Sentinel, Tracer (+ time-to-harm ranking), Fixer, Concierge, worker agents |
| `ripple_mcp/` | Ripple's MCP server (named so it never shadows the `mcp` SDK package) |
| `api/` | FastAPI app + SSE stream, implements `contracts/openapi.yaml` |
| `web/` | Next.js (App Router, TypeScript, Tailwind), `NEXT_PUBLIC_API_MODE=mock|live` |
| `contracts/` | Shared contracts: graph model, openapi, SSE events, MCP tool schemas |
| `fixtures/demo-c1/` | Canonical C1 responses + scripted SSE log + demo steps (UI mock source, backend contract tests) |
| `deploy/` | Dockerfiles and deploy notes (Vercel web, Render/Fly API, FalkorDB Cloud) |
| `tests/` | pytest: unit, `tests/contracts`, `tests/graph` (needs FalkorDB) |

## 5. Graph model (summary; full table in `contracts/graph-model.md`)
- One graph per tenant: `ripple:<tenant>` (`handbook-demo`, `acme-synthetic`).
- Every node: label `:Entity` + main label, unique `id`, `kind` property, `synthetic` flag.
- Nodes: `Fact`, `FactVersion`, `Change`, `Doc`, `DerivedFact`, `Plan`, `Action`, `Person`, `Team`, `Agent`, `Task`, `Answer`.
- Key edges: `HAS_VERSION`, `SUPERSEDES` (new→old), `STATES`/`CITES`, `LINKS_TO`, `DERIVED_FROM`, `DEPENDS_ON`, `PART_OF`, `WAS_TOLD {at, channel, answer_id}` (episodic memory), `CACHED {at}` (agent memory), `OWNS`, `MEMBER_OF`, `TALKS_WITH`, `FROM`/`TO`, `IMPACTS {hops, risk, tth_ms}`, `RESOLVED {at, by, how}`, `FEEDS {w:1}` (materialised dependency→dependent edge for `algo.*`), `ABOUT`/`TARGETS`, `CREATED`/`CLAIMED`.
- Algorithms used: `algo.bfs`, `algo.SSpaths`/`SPpaths`, `shortestPath`, `algo.pageRank`, `algo.betweenness`, `algo.WCC`.

## 6. Cypher rules (FalkorDB)
- **Parameters only** (`$name`); never build Cypher with string formatting. FalkorDB does not allow params in `LIMIT`/`SKIP`.
- **Times are epoch-ms integers** (no temporal arithmetic).
- Use `labels()` checks in `WHERE` instead of label expressions; alias and reference relationships when counting (known limitation).
- `algo.bfs` takes one relationship type: traverse `FEEDS`.
- Every query the product runs lives in `graph/queries/` and is listed in the README "Cypher & algorithms" section.
- Check `graph/NOTES.md` for which syntax was confirmed by the Day-1 smoke tests before relying on it.

## 7. Shared contracts
`contracts/` + `fixtures/` shapes + MCP tool schemas are the seams between the two people. Any change: separate PR, label `contract`, **both humans approve**, then both rebase. Don't change response shapes inside a feature PR.

## 8. Issues, branches, PRs
- Work only on an issue that is **assigned to the human you're working for**, and is in Ready / In Progress on the [board](https://github.com/users/sahil1330/projects/5).
- Branch: `<type>/<issue#>-<slug>` (e.g. `feat/14-check-fresh-guard`) from latest `main`. `main` is protected; never push to it directly.
- Commits: Conventional Commits with the issue number, e.g. `feat(agents): add freshness guard to ap-approver (#28)`.
- PR body: `Closes #N`, the PR template filled in, a **human-written "What & why"**, and the AI-assist disclosure ticked naming the Cursor tool used (editor agent or cloud agent).
- Keep PRs small (< ~400 changed lines, fixtures excluded). One issue ↔ one branch ↔ one PR.

## 9. Review and merge (full rules in `docs/AGENT_REVIEW.md`)
- A Cursor agent may **auto-merge (squash)** only when CI is green, it approved, and the change is in the author's own area with no gate labels.
- **Human approval required** for `contracts/`, `graph/schema*`, `fixtures/` shapes, MCP tool schemas, `deploy/`, `.github/workflows/`, secrets/auth config, or labels `contract`/`schema`/`needs-human`.
- After **M3 feature freeze (Oct 17 22:00 IST)**: only bugs, docs and demo fixes. After **code freeze (Oct 18 18:00 IST)**: docs/README/video links only.
- Agents must never: push or force-push `main`, bypass checks, merge their own unreviewed gated changes, close issues without a merged PR, reassign issues, touch another person's branch, commit secrets or non-public data, or remove AI disclosure.

## 10. Commands
```bash
docker compose up -d falkordb                 # FalkorDB on :6379, browser on :3000
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
ruff check . && ruff format --check . && pytest -q
uvicorn api.main:app --reload                 # http://localhost:8000/api/health
cd web && npm install && npm run dev          # http://localhost:3000 (mock mode by default)
```

## 11. Data rules
Only public GitLab handbook data (excerpts + links, attributed to GitLab B.V., no internal/login links) or synthetic data marked `synthetic: true`. No secrets in code, fixtures or logs; document env vars in `.env.example`.

## 12. AI disclosure
Ripple is built with **Cursor** (the Cursor editor and its agent, plus Cursor cloud agents) for scaffolding, coding, tests and PR review. Both humans review and must be able to explain every merged change.
