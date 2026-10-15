# Graph notes

Results of the Day-1 Cypher syntax smoke tests (plan §4.4 "Syntax uncertainties"). Tested on Oct 15 2026
against FalkorDB module v4.18.3 and v6.0.2 locally and `falkordb/falkordb:latest` (v6.0.2) in CI. The checks live in
`tests/graph/test_smoke.py`; rerun them after any FalkorDB upgrade.

| Item | Result | Decision |
|---|---|---|
| Multi-type variable-length `[:A\|B*1..6]` | ✅ works | Query (a) is usable as written |
| `algo.bfs` direction | ✅ **outgoing only**, start node **not** included in `nodes` | Keep `FEEDS` as dependency → dependent; start BFS at the old FactVersion |
| `algo.WCC` vs `algo.wcc` | ✅ both spellings work | Use `algo.WCC` (docs spelling) |
| SSpaths / SPpaths `weightProp` | ✅ works with `w: 1` | Keep `FEEDS {w:1}`. ⚠️ SSpaths `pathCount` caps the **total** paths returned, not paths per target: `pathCount:1` returns a single row. Use a big `pathCount` (e.g. 1000) or plain Cypher `min(length(p))` for hop distance |
| `*0..5` zero-length patterns | ✅ includes the start node | `check_fresh` can use `DERIVED_FROM*0..5` |
| `labels()` membership in WHERE | ✅ works | Use it. Label order follows creation order (`['Entity', 'Doc']`), but group by the `kind` property anyway |
| `shortestPath` with multiple types | ✅ works (endpoints bound first) | explain_path as drafted |
| `algo.pageRank(label, relType)` / `algo.betweenness({...})` | ✅ positional / map signatures work | As drafted |
| Atomic claim (`MATCH ... {status:'open'} SET ...`) | ✅ second identical claim returns no row | Writes are serialised per graph; Task claim needs no extra version check |
| `CREATE INDEX` run twice | raises `Attribute 'id' is already indexed` | `graph/schema.py` swallows errors containing "already" |
| Full-text index | `db.idx.fulltext.createNodeIndex(label, prop)` fails on `falkordb:latest` (expects 1 arg) | Use `CREATE FULLTEXT INDEX FOR (d:Doc) ON (d.title)` (works on both) |
| ⚠️ v6.0 planner bug | On `falkordb:latest` (v6.0.2) a `WHERE 'X' IN labels(s)` right after `MATCH (s {id:$id})` gets applied to a later scan, silently returning no rows | Put `WITH s` right after that WHERE (done in `check_fresh.cypher`). Local tests now run on both 4.18.3 and 6.0.2 |
| ⚠️ `algo.betweenness` across versions | Raw scores differ between v4.18 and v6 (e.g. 24 vs 4 for the top node), and on v6 `samplingSize: 64` gives a different ranking | Run it exact (no sampling, the graph is small), normalise scores, and only rely on the ranking order |
| Params in `LIMIT` | works on 4.18, but docs say unsupported | Still don't use them; inline constant limits |
