# Contributing to Ripple

Ripple is built by a two-person team during Graph Hacks (Oct 15–18, 2026, IST): **@sahil1330** (Person A: graph, data, agents, MCP, API) and **@harsh-gupta-10** (Person B: web, deploy, docs, demo, CI).

- **Process, board, branches, ownership, WIP limits:** [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
- **How Cursor agents review and merge PRs:** [`docs/AGENT_REVIEW.md`](docs/AGENT_REVIEW.md)
- **Backlog (issues #1–#42):** [`docs/BACKLOG.md`](docs/BACKLOG.md) · board: [Ripple – Graph Hacks](https://github.com/users/sahil1330/projects/5)
- **Context for Cursor agents:** [`AGENTS.md`](AGENTS.md) and [`.cursor/rules/`](.cursor/rules)
- **Project plan & graph model:** [`RIPPLE_PLAN.md`](RIPPLE_PLAN.md)

Quick rules
1. Every change starts from an issue (use a template). Claim it (single assignee) before starting.
2. Branch `feat/<issue#>-slug`; Conventional Commits; PR body includes `Closes #<issue#>`.
3. Changes to `contracts/`, graph schema/indexes, fixtures shapes, deploy or CI need human approval.
4. Disclose AI assistance in every PR (we use Cursor: the editor's agent and Cursor cloud agents). You must be able to explain what you merged.
5. Only public (GitLab handbook) or clearly labelled synthetic data. No secrets in the repo.
