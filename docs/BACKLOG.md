# Ripple: Backlog (created as GitHub issues at kickoff, Oct 15 2026)

Owners: **A = @sahil1330** (graph, data, agents, MCP, API) · **B = @harsh-gupta-10** (web, deploy, docs, demo, CI).
Issue numbers below are the real GitHub issue numbers. Board: [Ripple – Graph Hacks](https://github.com/users/sahil1330/projects/5).

## How this backlog keeps two people parallel

1. **Contracts first, split in two.** #3 (graph model + MCP tools, A) and #4 (openapi + SSE events, B) start at the same time. Both need both approvals; tag `contracts-v1` when both merge.
2. **B never waits on A's code.** B builds against `fixtures/demo-c1/` through `NEXT_PUBLIC_API_MODE=mock`; until #5 lands, B uses a placeholder fixture in the same shape.
3. **One issue, one owner, one path set.** Each issue lists the files it may touch. A never edits `web/`; B never edits `graph/`, `ingest/`, `agents/`, `ripple_mcp/`, `api/` (bugs there become issues for A).
4. **README split by markers.** A writes only between `<!-- A:start -->` and `<!-- A:end -->` (data model, Cypher); B owns everything else.
5. **Integration points are explicit:** #25 (UI on live API) and #33 (deploy backend) are the only B issues that depend on A's code.

Columns at kickoff: issues with no open dependency start in **Ready**, the rest in **Backlog**. Labels: `area:*`, `type:task`, `day:*`, `priority:*`, `owner:*`, plus `contract` / `schema` / `cut-line` gates.

## Day 1: Thu Oct 15 (M1, 22:00 IST: real graph loaded locally; deployed UI renders the mock graph)

| # | Title | Area | Owner | Pri | Depends on | Touches | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| 1 | Repo bootstrap: branch protection, required checks, board workflows | ci | B · @harsh-gupta-10 | P0 | none | repo settings, `.github/` | Kickoff already done: public repo, docs, templates, CODEOWNERS, labels, board columns, scaffold, backlog issues; `main` protected: PRs only, linear history, no force-push, required checks `backend`, `web`, `contracts`, `pr-lint`, `gate-check` (add once they pass on a PR); Board built-in workflows on: Auto-add (this repo, issues + PRs), Item closed → Done, PR merged → Done, Item reopened → In Progress; If built-in auto-add can't be used: add `ADD_TO_PROJECT_PAT` secret (fine-grained, Projects read/write) and set repo variable `ENABLE_ADD_TO_PROJECT=true` |
| 2 | CI skeleton green on a PR (backend, web, contracts, pr-lint, gate-check) | ci | B · @harsh-gupta-10 | P0 | none | `.github/workflows/` | All jobs run on a PR and pass on the current scaffold; `gate-check` fails when a gated path changes without a human approval (test with a throwaway PR); `HUMANS` in `gate-check` is `sahil1330 harsh-gupta-10` |
| 3 | contracts-v1 (part 1): graph-model.md + mcp-tools.json | api | A · @sahil1330 (+ both) | P0 | none | `contracts/graph-model.md`, `contracts/mcp-tools.json` | Labels, relationship types and properties match plan §4 (adjust if the Day-1 smoke tests force changes); MCP tool names, params and return shapes match plan §6; Approved by both people (label `contract`) |
| 4 | contracts-v1 (part 2): openapi.yaml + events.md | api | B · @harsh-gupta-10 (+ both) | P0 | none | `contracts/openapi.yaml`, `contracts/events.md` | Every endpoint in plan §10.2 has request/response schemas (graph, changes, impact, coverage, explain, ask, demo step/reset, tenants); SSE event types and envelope `{type, at, tenant, payload}` documented in events.md; Approved by both people (label `contract`); tag `contracts-v1` after both contract PRs merge |
| 5 | Demo fixtures C1: every endpoint response + scripted SSE log + demo steps | api | A · @sahil1330 | P0 | #3, #4 | `fixtures/demo-c1/` | One JSON file per endpoint response for the C1 (VPN) scenario, validating against `contracts/openapi.yaml`; `events.jsonl` scripted SSE log and `demo-steps.json` (9 steps from plan §9); `tests/contracts` validates all fixtures in CI; B can render the whole demo from fixtures alone |
| 6 | FalkorDB local + Cypher syntax smoke tests for §4.4 uncertainties | graph | A · @sahil1330 | P0 | none | `tests/graph/`, `graph/NOTES.md` | `docker compose up falkordb` works (compose file is in the scaffold); Tests confirm or refute: multi-type var-length, `algo.bfs` direction, `algo.WCC` vs `algo.wcc`, SSpaths `weightProp`, `*0..n`, `labels()` in WHERE; Results and chosen fallbacks written in `graph/NOTES.md` |
| 7 | Schema + indexes script for tenant graphs `ripple:<tenant>` | graph | A · @sahil1330 | P0 | #3, #6 | `graph/schema.py` | Idempotent (safe to run twice); Creates the §4.3 indexes; `python -m graph.schema --tenant handbook-demo` works |
| 8 | Ingest real handbook changes C1–C5 → Fact / FactVersion / Change | ingest | A · @sahil1330 | P0 | #7 | `ingest/handbook_changes.py`, `ingest/data/` | Each FactVersion has commit SHA, MR URL, source URL, valid_from/valid_to (epoch ms); Human-verified extraction committed as data, no live LLM needed; No internal or login-protected links ingested |
| 9 | Ingest handbook Docs + LINKS_TO + STATES/CITES for finance pages | ingest | A · @sahil1330 | P1 | #8 | `ingest/handbook_docs.py` | ≥ 30 Doc nodes with real handbook URLs; `algo.pageRank('Doc','LINKS_TO')` runs on the result; Excerpts + links only, GitLab B.V. attributed |
| 10 | Synthetic layer generator (seeded): people, teams, answers, plans, actions, worker agents, FEEDS edges | ingest | A · @sahil1330 | P0 | #7 | `ingest/synthetic.py` | Deterministic for a given seed; Every synthetic node has `synthetic: true`; C1 scenario has ≥ 10 holders, ≥ 2 agents and ≥ 1 plan with a pending action; `FEEDS {w:1}` written alongside each dependency edge |
| 11 | Next.js app shell + mock API mode | web | B · @harsh-gupta-10 | P0 | none | `web/` | Scaffold in `web/` already builds; add layout regions and the mock data layer; Typed API client from `contracts/openapi.yaml` (draft now, update when #4 merges); `NEXT_PUBLIC_API_MODE=mock` serves every endpoint from `fixtures/demo-c1/` (use a placeholder until the fixtures issue merges); `npm run lint && npm run typecheck && npm run build` pass |
| 12 | Graph canvas (react-force-graph-2d) rendering `/api/graph` | web | B · @harsh-gupta-10 | P0 | #11 | `web/src/components/graph/` | Nodes coloured by kind, synthetic badge, click selects a node; Works from fixtures in mock mode; Screenshot in the PR |
| 13 | First deploy: Vercel (web) + create FalkorDB Cloud instance | deploy | B · @harsh-gupta-10 | P0 | #11 | `deploy/`, Vercel project | Public URL renders the mock graph; FalkorDB Cloud credentials only in secrets / env, documented in `.env.example` |

## Day 2: Fri Oct 16 (M2, 21:00 IST: C1 end-to-end on localhost from the real API)

| # | Title | Area | Owner | Pri | Depends on | Touches | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| 14 | Impact radius (Cypher + algo.bfs / SSpaths) + IMPACTS writer | graph | A · @sahil1330 | P0 | #8, #10 | `graph/queries/impact*.cypher`, `graph/impact.py` | Returns the C1 impact set matching the fixture; < 200 ms locally; Cypher saved in `graph/queries/` |
| 15 | who_holds, check_fresh, explain_path, coverage queries | graph | A · @sahil1330 | P0 | #14 | `graph/queries/`, `graph/*.py` | Unit test per query on the seeded graph; Parameterised Cypher only, epoch-ms times |
| 16 | Time-to-harm ranking (severity × urgency × reach) | agents | A · @sahil1330 | P0 | #14 | `agents/ranking.py` | Ranked list with factor breakdown; ap-approver action ranks first in C1 |
| 17 | FastAPI endpoints per openapi + SSE emitter | api | A · @sahil1330 | P0 | #15, #5 | `api/` | All openapi endpoints implemented; Contract tests: real responses match fixture shapes; SSE `/api/stream` emits events.md types |
| 18 | Concierge: answers from the current version + logs Answer / WAS_TOLD | agents | A · @sahil1330 | P0 | #15 | `agents/concierge.py` | Every answer cites version + source URL; `WAS_TOLD {at, channel, answer_id}` written; Templated fallback text when no LLM key |
| 19 | ripple-mcp server: read-only tools (impact_of, who_holds, check_fresh, explain_path, coverage) | mcp | A · @sahil1330 | P0 | #15 | `ripple_mcp/` | Tools callable from an MCP client over stdio; Schemas match `contracts/mcp-tools.json` |
| 20 | Before/after panel (diff + commit/MR source) | web | B · @harsh-gupta-10 | P0 | #12 | `web/src/components/before-after/` | Renders C1 from fixtures and from the live API |
| 21 | Time-to-harm queue with factor tooltips | web | B · @harsh-gupta-10 | P0 | #12 | `web/src/components/tth-queue/` | Sorted list, statuses update from SSE (scripted log in mock mode) |
| 22 | Coverage meter + live agents ticker (SSE client) | web | B · @harsh-gupta-10 | P0 | #12 | `web/src/components/coverage/`, `web/src/lib/sse.ts` | Animates 0 → 100% from the scripted event log |
| 23 | "Why?" drawer (explain_path + Cypher shown) | web | B · @harsh-gupta-10 | P1 | #12 | `web/src/components/why-drawer/` | Shows path hops, relationship types and the query text |
| 24 | Ask panel (Concierge) with "earlier I told you" memory line | web | B · @harsh-gupta-10 | P0 | #12 | `web/src/components/ask/` | Works in mock and live modes |
| 25 | Switch UI to the live API behind a flag; integration fixes | web | B · @harsh-gupta-10 | P0 | #17, #20, #21, #22, #23, #24 | `web/src/lib/api*` | C1 runs end-to-end locally from the real API (milestone M2); Backend bugs found are filed as issues for Sahil, not fixed in `api/` |

## Day 3: Sat Oct 17 (M3 feature freeze, 22:00 IST: full demo on the deployed URL)

| # | Title | Area | Owner | Pri | Depends on | Touches | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| 26 | Task handoff model (create / claim / complete, atomic claim) | agents | A · @sahil1330 | P0 | #17 | `agents/tasks.py` | Two agents never claim the same task (concurrency test) |
| 27 | Sentinel (replay commit → Change / FactVersion / Task trace) + Tracer loop | agents | A · @sahil1330 | P0 | #26 | `agents/sentinel.py`, `agents/tracer.py` | Replaying C1 produces IMPACTS + prioritised tasks |
| 28 | Worker agents + freshness guard (check_fresh via MCP; block + replan task) | agents | A · @sahil1330 | P0 | #19, #26 | `agents/workers.py` | ap-approver's $150 VPN approval is BLOCKED with path + source |
| 29 | Fixer: reanswer, doc patch draft, replan, RESOLVED | agents | A · @sahil1330 | P0 | #27, #28 | `agents/fixer.py` | C1 coverage reaches 100% |
| 30 | Algorithms as tools: PageRank (docs), betweenness (amplifiers), WCC dark pockets | graph | A · @sahil1330 | P1 | #14 | `graph/queries/algos*.cypher`, `ripple_mcp/` | `rank_amplifiers` and `dark_pockets` return deterministic results (fixed seed) |
| 31 | Demo stepper `/api/demo/step` + reset, fixed `now` | api | A · @sahil1330 | P0 | #27, #28, #29 | `api/demo.py` | 9 steps from plan §9 reproducible 3× in a row; Responses match `fixtures/demo-c1/demo-steps.json` shapes |
| 32 | Second tenant + concurrent agent run | agents | A · @sahil1330 | P2 `cut-line` | #26 | `ingest/synthetic.py` (tenant param), `agents/` | Two tenants isolated; Concurrent run visible in the ticker |
| 33 | Deploy API + agents (Render / Fly) + seed FalkorDB Cloud | deploy | B · @harsh-gupta-10 | P0 | #17, #13 | `deploy/` | Live URL runs C1 from the deployed backend; Seed command documented |
| 34 | Demo mode UI (`?demo=1`, Next ▶, reset) + visual polish (pulse, red → green) | web | B · @harsh-gupta-10 | P0 | #5 | `web/src/components/demo/` | Built against `demo-steps.json` first, then the live stepper once it merges; Smooth at 1080p screen recording |
| 35 | Rough-cut video recording + bug triage → issues | demo | B · @harsh-gupta-10 | P1 | #34, #33 | `docs/video/` | Rough cut ≤ 3 min; Bugs filed with `type:bug` and the right owner |
| 36 | FalkorDB-MCPServer (read-only) client config + docs | mcp | B · @harsh-gupta-10 | P2 | #7 | `deploy/falkordb-mcp/`, `docs/MCP.md` | Documented client config with `FALKORDB_DEFAULT_READONLY=true`; Demo query "who still believes the old VPN policy" works |

## Day 4: Sun Oct 18 (code freeze 18:00 · submit 20:00 · deadline 23:59 IST)

| # | Title | Area | Owner | Pri | Depends on | Touches | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| 37 | README: Data model + Cypher & algorithms + "What breaks without FalkorDB" | docs | A · @sahil1330 | P0 | #15, #30 | `README.md` sections between `<!-- A:start -->` / `<!-- A:end -->` markers only | Every query used by the product listed with its purpose; Graph data model diagram up to date |
| 38 | README: pitch, architecture, setup, data sources & licence, synthetic disclosure, AI assistance | docs | B · @harsh-gupta-10 | P0 | #33 | `README.md` outside the A markers | A newcomer can run locally in < 10 min; AI assistance section names Cursor (editor, agents, cloud agents) and what they did |
| 39 | Final demo video (2 takes + backup) uploaded | demo | B · @harsh-gupta-10 | P0 | #34 | `docs/video/` | ≤ 3 min, follows plan §9; Link in README |
| 40 | Blog post (AirPods side prize) | docs | B · @harsh-gupta-10 | P1 | #39 | `docs/blog/` | Published; follows plan §12 outline |
| 41 | Rehearsal Q&A: both explain graph model, queries, architecture | docs | A · @sahil1330 (+ both) | P0 | #37 | none (meeting) | 20-min dry run done with both people; Gaps fixed in README |
| 42 | Submit on wemakedevs.org naming Tracks 01, 02, 03 | docs | B · @harsh-gupta-10 | P0 | #37, #38, #39 | none | Submission confirmed before 20:00 IST Oct 18; All three tracks named |

## Project automation

- Board columns (Status): Backlog, Ready, In Progress, In Review, Done. Extra fields: Day, Priority, Area.
- Built-in workflows to keep on: Auto-add (this repo), Item closed → Done, Pull request merged → Done, Item reopened → In Progress.
- Fallback: `.github/workflows/project-automation.yml` (`actions/add-to-project`) runs only when repo variable `ENABLE_ADD_TO_PROJECT=true` and secret `ADD_TO_PROJECT_PAT` (fine-grained, Projects read/write) exist.
