# Graph notes

Results of the Day-1 Cypher syntax smoke tests (plan §4.4 "Syntax uncertainties"). Tested on Oct 15 2026
against FalkorDB module v4.18.3 locally and `falkordb/falkordb:latest` in CI. The checks live in
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
| Params in `LIMIT` | works on 4.18, but docs say unsupported | Still don't use them; inline constant limits |
