# Cypher queries

Every query the product runs lives here as a `.cypher` file and is listed in the README "Cypher & algorithms" section.
Rules: parameters only (`$name`, never string concatenation; no params in `LIMIT`/`SKIP`), times are epoch-ms integers, reference relationship aliases when counting.

Draft queries from `RIPPLE_PLAN.md` §4.4 (untested until the smoke-test issue confirms syntax):

| File | Purpose |
|---|---|
| `impact.cypher` | (a) impact radius: multi-type variable-length traversal from an old FactVersion |
| `impact_bfs.cypher` | (a') impact radius: `algo.bfs` over `FEEDS` + hop count (used by `graph/impact.py`) |
| `who_holds.cypher` | (b) people and agents still holding a superseded version |
| `check_fresh.cypher` | (c) freshness guard for a plan; any row = stale |
| `explain_path.cypher` | (d) shortest "why" path between two entities |
| `coverage.cypher` | (e) impacted vs resolved per kind for a Change |
| `ingest_fact_version.cypher` | upsert a Fact + FactVersion (handbook ingest) |
| `ingest_change.cypher` | record a Change: SUPERSEDES, close old `valid_to`, FROM/TO (ingest + Sentinel replay) |

| `current_versions.cypher` | current FactVersion id per fact key (doc ingest) |
| `algo_pagerank_docs.cypher` | (f) PageRank over real handbook `LINKS_TO` (doc authority) |
| `change_versions.cypher` | old (FROM) and new (TO) version of a Change |
| `write_impacts.cypher` | Tracer output: MERGE `IMPACTS {hops, risk, tth_ms, severity, urgency, reach}` |
| `tth_due.cypher` | time-to-harm: soonest deadline per impacted entity (own or inherited via OWNS) |
| `algo_betweenness_feeds.cypher` | (f) betweenness over `FEEDS` (reach factor, amplifiers) |

Load a query from Python with `graph.cypher.cypher("<name>")`.
