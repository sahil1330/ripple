# Ripple: Team Workflow

Team: **2 people**. **Person A** (`@sahil1330`) owns graph, data, agents, MCP and API. **Person B** (`@harsh-gupta-10`) owns web UI, deployment, docs and demo.
Repo: [`sahil1330/ripple`](https://github.com/sahil1330/ripple). Tracking: GitHub Projects board [`Ripple – Graph Hacks`](https://github.com/users/sahil1330/projects/5) (fields: Status, Day, Priority, Area).
Hackathon window: **Oct 15, 12:01 AM IST → Oct 18, 11:59 PM IST.** The repo was created and this file committed after the start.

## 1. Board columns

| Column | Meaning | Who moves it |
|---|---|---|
| **Backlog** | Captured, not yet ready (missing acceptance criteria or blocked by a dependency) | anyone |
| **Ready** | Has owner area, acceptance criteria, dependencies merged; can be started | owner / Cursor agent after triage |
| **In Progress** | Claimed by exactly one assignee with a branch open | the assignee |
| **In Review** | PR open, linked with `Closes #N`, CI running or green | automation (PR opened) or assignee |
| **Done** | PR merged → issue auto-closed | automation (built-in "Item closed" / "Pull request merged" workflows) |

Optional swimlane field **Day** (D1–D4) and **Priority** (P0 = never cut, P1, P2 = first to cut).

## 2. Issue lifecycle
1. **Create** from a template (`task` or `bug`) with labels: one `area:*`, one `type:*`, `day:*`, `priority:*`.
2. **Triage** (owner or review agent): check acceptance criteria and dependencies → move to **Ready**.
3. **Claim before start**: assign yourself (exactly **one assignee**), comment `claiming`, move to **In Progress**. Never start work on an unassigned or someone else's issue.
4. **Branch**: `<type>/<issue#>-<short-slug>` from latest `main`.
5. **PR**: open early as Draft if useful. Body must contain `Closes #N`. Use the PR template.
6. **Review & merge**: per `docs/AGENT_REVIEW.md`. Squash-merge only.
7. **Done**: merge auto-closes the issue; the board moves it to Done. Follow-ups become new issues (link them).

## 3. Ownership map (prevents collisions)

| Path | Owner | Rule |
|---|---|---|
| `graph/` (schema, indexes, Cypher), `ingest/`, `agents/`, `ripple_mcp/`, `api/`, root Python config (`pyproject.toml`, `requirements*.txt`) | **A** | B may open PRs only for typo/docs fixes |
| `fixtures/` | **A writes, B reviews** | fixtures are the mock contract for the UI |
| `web/` | **B** | A may open PRs only to fix API client types |
| `AGENTS.md`, `.cursor/rules/` | **shared** | both approve; this is the context every Cursor agent reads |
| `deploy/`, `.github/workflows/` | **B** | CI changes need human approval |
| `docs/` (README, blog, video notes) | **B** | A owns README sections "Data model" and "Cypher & algorithms", only between the `<!-- A:start -->` / `<!-- A:end -->` markers |
| `contracts/` (graph-model.md, openapi.yaml, events.md, mcp-tools.json) | **shared** | label `contract`; **both humans must approve** |

Enforced by: `.github/CODEOWNERS` (auto-requests the right reviewer) + the `gate-check` CI job, which fails when gated paths (`contracts/`, `graph/schema*`, `fixtures/`, `deploy/`, `.github/workflows/`) change without an approving review from a human team member (both humans for `contracts/`). We do **not** turn on GitHub's "Require review from Code Owners", because that would stop the review agent from auto-merging low-risk PRs. GitHub would also accept *any one* listed owner, so "both approve" is our own rule, enforced by `gate-check` and the agent.

## 4. Labels
- Area: `area:graph`, `area:ingest`, `area:agents`, `area:mcp`, `area:api`, `area:web`, `area:deploy`, `area:docs`, `area:demo`, `area:ci`
- Type: `type:task`, `type:bug`, `type:chore`, `type:spike`
- Planning: `day:1`…`day:4`, `priority:P0|P1|P2`, `cut-line`
- Gates: `contract` (shared contract change), `schema` (graph model/index change), `needs-human` (agent must not auto-merge), `blocked`

## 5. Branches & commits
- Branch: `feat/<issue#>-slug`, `fix/<issue#>-slug`, `chore/<issue#>-slug`, `docs/<issue#>-slug` (e.g. `feat/12-check-fresh-guard`).
- Commits: Conventional Commits with issue ref, e.g. `feat(agents): add freshness guard to ap-approver (#12)`.
- One issue ↔ one branch ↔ one PR. Keep PRs small (< ~400 changed lines, excluding fixtures).
- `main` is protected: no direct pushes, no force-push, linear history (squash merges), required status checks.

## 6. WIP limits
- **In Progress: max 2 per person** (one main task + one small fix).
- **In Review: max 3 total.** If exceeded, stop starting and start reviewing/fixing.
- Blocked > 1 hour → label `blocked`, mention the other person, pick the next Ready item.

## 7. Daily cadence (IST)
| Time | What |
|---|---|
| 09:00 | 15-min sync: board walk, today's milestone, cut-line check |
| 14:00 | 10-min check: blockers, contract questions, integration status |
| 21:00 | 15-min sync: demo the day's work end to end, update board, decide cuts |
| Milestones | M1 Oct 15 22:00 · M2 Oct 16 21:00 · **M3 feature freeze Oct 17 22:00** · code freeze Oct 18 18:00 · submit Oct 18 20:00 |

## 8. Working in parallel
- **Contracts first** (Day 1 morning, tag `contracts-v1`). B builds against `fixtures/` through a mock API; A's tests assert real responses match fixture shapes.
- Contract change → separate PR labelled `contract`, both approve, then both rebase.
- Integration is behind a flag (`NEXT_PUBLIC_API_MODE=mock|live`) so the UI never blocks on the backend.

## 9. Merge conflicts
1. Rebase your branch on `main` (`git fetch && git rebase origin/main`) **before** requesting review and again if `main` moved.
2. Conflicts inside your owned paths: resolve yourself. Conflicts in the other person's paths or `contracts/`: stop, ping them, resolve together (5-min call).
3. Never resolve a conflict by deleting the other side's changes without their OK. Never force-push `main`; force-push only your own feature branch (`--force-with-lease`).
4. Generated files (lockfiles): regenerate rather than hand-merge.

## 10. Definition of Done
- Acceptance criteria met; CI green; PR template complete (incl. AI-assist disclosure).
- For `area:graph`/`agents`: Cypher added/updated in `graph/queries/` and listed for the README "Cypher & algorithms" section.
- For `area:web`: screenshot or short GIF in the PR.
- The author can explain the change (hackathon rule: humans must understand the code).
