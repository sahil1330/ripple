# GitHub Configuration & Workflows

This directory configures repository automation, pull request templates, issue templates, and continuous integration for Ripple.

## Branch Protection on `main`
- Require pull request before merging
- Require linear history
- Do not allow force pushes
- Required status checks:
  - `backend` (ruff lint & format, pytest with FalkorDB service)
  - `web` (eslint, TypeScript typecheck, Next.js build)
  - `contracts` (fixture validation against `contracts/openapi.yaml`)
  - `pr-lint` (validates `Closes #N` reference and AI-assist disclosure checkbox)
  - `gate-check` (enforces peer human approval on gated paths: `contracts/`, `graph/schema*`, `fixtures/`, `deploy/`, `.github/workflows/`)

## Board Automation
Project board: [https://github.com/users/sahil1330/projects/5](https://github.com/users/sahil1330/projects/5)
- **Auto-add to project**: Built-in project workflow or fallback via `.github/workflows/project-automation.yml` (activated by `ENABLE_ADD_TO_PROJECT=true` with `ADD_TO_PROJECT_PAT`).
- **Item status progression**:
  - `Ready` -> `In Progress` when development starts
  - `In Progress` -> `In Review` when a PR is opened
  - `In Review` -> `Done` when PR merges / issue closes
