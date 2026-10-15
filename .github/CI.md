# CI Skeleton Verification

This document records the verification of the Continuous Integration (CI) skeleton configured in `.github/workflows/ci.yml`.

## Verified CI Jobs
1. **`backend`**:
   - Python 3.12 runtime with FalkorDB service container (`falkordb/falkordb:latest` on port 6379)
   - Lints & formats with `ruff`
   - Executes test suite with `pytest -q`
2. **`web`**:
   - Node.js 20 with cached dependencies
   - Executes `npm run lint`, `npm run typecheck`, and `npm run build` with `NEXT_PUBLIC_API_MODE=mock`
3. **`contracts`**:
   - Python 3.12 runtime
   - Runs `pytest -q tests/contracts` validating schema fixtures against `contracts/openapi.yaml`
4. **`pr-lint`**:
   - Requires PR title / body to reference `Closes #N`, `Fixes #N`, or `Resolves #N`
   - Requires an AI-assist disclosure checkbox selection
5. **`gate-check`**:
   - Evaluates modified files against gated paths (`contracts/`, `graph/schema*`, `fixtures/`, `deploy/`, `.github/workflows/`)
   - Requires peer approval from human team members (`HUMANS: sahil1330 harsh-gupta-10`)
   - Exits 0 when no gated paths are modified
