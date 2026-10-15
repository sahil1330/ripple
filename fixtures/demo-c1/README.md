# fixtures/demo-c1

Canonical responses for the C1 scenario (personal VPN, real GitLab handbook commit `ddd39597`,
MR !20421), **generated from the real API** against FalkorDB, not hand-written:

```bash
python fixtures/demo-c1/generate.py   # needs FalkorDB on FALKORDB_HOST/PORT
```

It runs reset + the 9 demo steps (plan §9) and snapshots each endpoint at the moment the UI shows it.

| File | Endpoint | Snapshot taken |
|---|---|---|
| `health.json`, `tenants.json` | `GET /api/health`, `GET /api/tenants` | any time |
| `graph.json` | `GET /api/graph?tenant&change_id=chg:c1` | after step 5 (impact lit, hero blocked) |
| `impact-chg-c1.json` | `GET /api/changes/chg:c1/impact` | after step 5 |
| `coverage-chg-c1-before.json` / `coverage-chg-c1.json` | `GET /api/changes/chg:c1/coverage` | after step 5 (0%) / step 6 (100%) |
| `explain-chg-c1-priya.json` | `GET /api/explain?from=chg:c1&to=person:priya` | after step 5 |
| `changes.json`, `change-chg-c1.json` | `GET /api/changes`, `GET /api/changes/chg:c1` | after step 6 (resolved) |
| `ask-before.json` / `ask-after.json` | `POST /api/ask` (Priya, ExpressVPN) | step 2 (v1) / step 7 (v2 + "Earlier I told you") |
| `demo-steps.json` | `POST /api/demo/step` ×9 | full run |
| `demo-reset.json` | `POST /api/demo/reset` | |
| `events.jsonl` | `GET /api/stream` | every event of the 9 steps, in order |

Times use the fixed demo clock (`DEMO_NOW_MS` = 2026-07-14 17:00 UTC, plus 1 s per step). Answer ids
are random per run. `tests/contracts/test_fixtures.py` validates every file against
`contracts/openapi.yaml` in CI.
