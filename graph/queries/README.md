# Cypher queries

Every query the product runs lives here as a `.cypher` file and is listed in the README "Cypher & algorithms" section.
Rules: parameters only (`$name`, never string concatenation; no params in `LIMIT`/`SKIP`), times are epoch-ms integers, reference relationship aliases when counting.

Draft queries from `RIPPLE_PLAN.md` §4.4 (untested until the smoke-test issue confirms syntax):

| File | Purpose |
|---|---|
| `impact.cypher` | (a) impact radius: multi-type variable-length traversal from an old FactVersion |
| `impact_bfs.cypher` | (a') impact radius with `algo.bfs` over materialised `FEEDS` edges |
| `who_holds.cypher` | (b) people and agents still holding a superseded version |
| `check_fresh.cypher` | (c) freshness guard for a plan; any row = stale |
| `explain_path.cypher` | (d) shortest "why" path between two entities |
| `coverage.cypher` | (e) impacted vs resolved per kind for a Change |
| `ingest_fact_version.cypher` | upsert a Fact + FactVersion (handbook ingest) |
| `ingest_change.cypher` | record a Change: SUPERSEDES, close old `valid_to`, FROM/TO (ingest + Sentinel replay) |

Load a query from Python with `graph.cypher.cypher("<name>")`.
