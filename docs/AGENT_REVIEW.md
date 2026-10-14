# Ripple: Cursor Agent Review & Merge Policy

Our AI tool is **Cursor**: the Cursor editor's agent and Cursor cloud agents write code, review PRs, merge eligible ones, and keep the board and issues in sync. They read `AGENTS.md` and `.cursor/rules/` for project context. **Humans stay accountable.** Hackathon rules: AI coding assistants are allowed **but must be disclosed**, participants must **understand the submitted code** and be able to explain the graph model, queries, architecture and decisions, and fully AI-generated projects without meaningful contribution may be rejected.

## 1. Required CI checks (branch protection on `main`)
- `backend`: ruff lint + format check, pytest (unit + Cypher smoke tests against a FalkorDB service container)
- `web`: eslint, typecheck, `next build`
- `contracts`: fixture shape test (real API responses / fixtures validate against `contracts/openapi.yaml`)
- PR body lint: contains `Closes #<n>` and the AI-assist disclosure section is filled
- `gate-check`: if gated paths changed, requires an approving review from a human (`@sahil1330`/`@harsh-gupta-10`, not the PR author); `contracts/` requires both

Branch protection: required checks above + **1 approving review** (a Cursor agent review counts only if it posts as an account with write access; otherwise the other human approves; verify on Day 1) + up-to-date branch + linear history + no force-push.

## 2. Agent review checklist
1. **Linkage:** PR body has `Closes #N`; the issue exists, is assigned to the PR author, and is in *In Progress/In Review*.
2. **Scope:** changes match the issue's acceptance criteria; no unrelated files; PR < ~400 changed lines (fixtures excluded) or justified.
3. **Ownership:** files changed are in the author's area per `CODEOWNERS`; cross-area edits flagged for the other human.
4. **Contracts:** if `contracts/`, `fixtures/` shapes, MCP tool schemas or API response types change → label `contract` + `needs-human`.
5. **Graph:** any new/changed Cypher is parameterised (`$params`, no string concatenation), uses epoch-ms integers for time, references relationship aliases when counting (FalkorDB known limitation), and is added to `graph/queries/` + README list. Schema/index changes → label `schema` + `needs-human`.
6. **Rule 3 sanity:** no new secondary datastore for core state (facts, versions, holders, tasks).
7. **Data:** only public (GitLab handbook, no internal/login links) or synthetic data; synthetic records carry `synthetic: true`.
8. **Security:** no secrets/keys/tokens in code, fixtures or logs; env vars documented in `.env.example`.
9. **Tests/evidence:** tests added or updated; UI PRs include a screenshot/GIF; demo-path changes re-run the demo stepper.
10. **Disclosure:** AI-assist checkbox + short note of which Cursor tools (editor agent, cloud agent) did what.
11. **Explainability:** PR description has a human-written "What & why" (2–5 sentences). Agent asks the author to add one if missing.

Agent leaves a review: **Approve**, **Request changes** (with a checklist of fixes), or **Comment + `needs-human`**.

## 3. Merge rules
| Situation | Who may merge |
|---|---|
| CI green + agent approval + changes only in `web/` styling/components, `docs/`, tests, or the author's own area with no gate labels | **Agent may auto-merge** (squash) |
| Touches `contracts/`, `graph/schema*`/indexes, `fixtures/` shapes, MCP tool schemas, `deploy/`, `.github/workflows/`, auth/secrets config, or labelled `contract`/`schema`/`needs-human` | **Human approval required** (the *other* person; both for `contract`), then agent or human merges |
| After M3 feature freeze (Oct 17 22:00 IST) | Only `type:bug`, docs and demo fixes; any merge to backend logic needs human approval |
| After code freeze (Oct 18 18:00 IST) | Docs/README/video links only, human-approved |

- **Squash merge only**; squash title = Conventional Commit + `(#PR)`; body keeps `Closes #N`.
- Delete the branch after merge.

## 4. Issue & board automation
- `Closes #N` in the PR auto-closes the issue on merge (GitHub default keyword linking).
- Project built-in workflows enabled: *Auto-add to project* (this repo, issues + PRs), *Item closed → Done*, *Pull request merged → Done*, *Item reopened → In Progress*, *Code changes requested → In Progress*, *Code review approved → In Review* (keep).
- Agents may move cards (e.g. `gh project item-edit`) to keep the board truthful: Ready → In Progress when a branch/PR appears for an assigned issue; In Progress → In Review when a PR is opened.
- Fallback auto-add via `actions/add-to-project` (see `.github/workflows/project-automation.yml` note in `docs/BACKLOG.md`).

## 5. Agents must never
- Push or force-push to `main`, rewrite published history, or disable/bypass branch protection or required checks.
- Merge with failing, pending or skipped required checks, or merge their own unreviewed changes into gated areas.
- Merge anything labelled `contract`, `schema` or `needs-human` without the required human approval.
- Close an issue without a merged linked PR (except duplicates, and only with a human's comment).
- Reassign issues, push to another person's branch, or resolve conflicts in another owner's area without asking.
- Commit secrets, real personal data, or login-protected/internal content (rule 6).
- Remove AI-assist disclosure or rewrite a human's "What & why" section.
- Delete branches other than the merged PR's branch, delete releases/tags, or change repo settings/visibility.

## 6. Disclosure record
The README section **"AI assistance"** lists: tools used (Cursor editor, Cursor agents and Cursor cloud agents for coding and review; any LLM used inside the product), what they did (scaffolding, review, tests, copy), and confirms both team members reviewed and understand all merged code. PR checkboxes are the audit trail.
